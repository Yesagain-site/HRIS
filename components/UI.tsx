import React from 'react';
import { ExclamationTriangleIcon } from './Icons';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

// FIX: Refactor Button component props for better polymorphic typing.
type ButtonProps<C extends React.ElementType> = {
  as?: C;
  // FIX: Made children optional to resolve widespread incorrect "missing property" errors.
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & Omit<React.ComponentPropsWithoutRef<C>, "as" | "children" | "className" | "variant" | "size">;


export const Button = <C extends React.ElementType = 'button'>({
  children,
  className,
  variant = 'primary',
  size = 'md',
  as,
  ...rest
}: ButtonProps<C>) => {
  const Component = as || 'button';
  const baseClasses = "rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantClasses = {
    primary: "bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] focus:ring-[var(--color-primary-500)]",
    secondary: "bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-opacity-80 focus:ring-[var(--color-primary-500)]",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };


  return React.createElement(
    Component,
    {
      className: `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ''}`.trim(),
      ...rest,
    },
    children
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title }) => (
  <div className={`bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-md rounded-lg overflow-hidden ${className}`}>
    {title && <h2 className="text-lg font-bold p-4 border-b border-[var(--color-border)]">{title}</h2>}
    <div className="p-4">{children}</div>
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
    <input
      id={id}
      className="block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] rounded-md shadow-sm placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    children: React.ReactNode;
}
  
export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
        <select
            id={id}
            className="block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
            {...props}
        >
            {children}
        </select>
    </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
    <textarea
      id={id}
      className="block w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] rounded-md shadow-sm placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      {...props}
    />
  </div>
);


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--color-modal-overlay)] z-50 flex justify-center items-center p-4">
            <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="flex justify-end items-center p-4 border-t border-[var(--color-border)] bg-opacity-50 rounded-b-lg">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--color-modal-overlay)] z-50 flex justify-center items-center p-4">
            <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-100 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="ml-4 text-left">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
                        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end items-center px-6 py-4 border-t border-[var(--color-border)] bg-opacity-50 rounded-b-lg space-x-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={onConfirm} variant="danger">Confirm</Button>
                </div>
            </div>
        </div>
    );
};

export const ToggleSwitch: React.FC<{
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, enabled, onChange }) => (
  <label htmlFor={`toggle-${label}`} className="flex items-center justify-between cursor-pointer">
    <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
    <div className="relative">
      <input 
        id={`toggle-${label}`} 
        type="checkbox" 
        className="sr-only" 
        checked={enabled} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className={`block w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-[var(--color-primary-600)]' : 'bg-gray-400'}`}></div>
      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
  </label>
);
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useHRData } from '../hooks/useHRData';

const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457.168-.928.23-1.405C5.116 15.64 3 13.968 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.085.658V8.25m0 0H9m-1.512 3.996a7.5 7.5 0 01-2.98-1.591M15.75 7.5l.415-.207a.75.75 0 00-1.085.658V8.25m0 0H15m.012 3.996a7.5 7.5 0 00-2.98-1.591M12 6a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 6zm-3 9a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 019 15zm6 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0115 15z" />
  </svg>
);

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: "Hello! I'm your YesPeople AI assistant, powered by Gemini. How can I help you with your HR inquiries today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { chatbotContext } = useHRData();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (!process.env.API_KEY) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Chatbot configuration error: Missing API Key." }]);
      return;
    }

    const userMessage: Message = { sender: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const systemInstruction = `You are the 'YesPeople' AI HR Assistant, a world-class professional expert in HR operations and company policies.
You are powered by Gemini 3 Pro and have access to real-time company HR data.

CORE GUIDELINES:
1. DATA INTEGRITY: Answer questions based EXCLUSIVELY on the provided JSON data. If the data is missing, politely say you don't have that specific information.
2. SCOPE: Focus only on HR-related topics: employees, departments, designations, joining dates, work status, policies, and public holidays.
3. PRIVACY: While you can provide general employee info found in the context (like department), always maintain a professional boundary.
4. CALCULATIONS: You can count employees, calculate tenures, or identify trends (e.g., "How many people are in IT?").
5. TONE: Helpful, efficient, professional, and slightly corporate.
6. NO EXTERNAL SEARCH: Do not use external knowledge outside of the provided HR context unless it's for general language processing.

DATA CONTEXT:
${chatbotContext}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: trimmedInput,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const botMessage: Message = { sender: 'bot', text: response.text || "I'm sorry, I couldn't generate a response." };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorText = error instanceof Error && error.message.includes("Requested entity was not found") 
        ? "The AI model is currently unavailable. Please check your configuration."
        : "I'm experiencing a technical hiccup. Please try again in a moment.";
      setMessages(prev => [...prev, { sender: 'bot', text: errorText }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-[var(--color-primary-600)] text-white p-4 rounded-full shadow-2xl hover:bg-[var(--color-primary-700)] hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
        aria-label="Open HR Assistant"
      >
        <ChatIcon className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-[400px] h-[600px] bg-[var(--color-card)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[var(--color-border)] flex flex-col z-50 overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-[var(--color-primary-600)] text-white">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white bg-opacity-20 rounded-lg">
            <BotIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">HR AI Assistant</h3>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Powered by Gemini 3 Pro</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-[var(--color-background)] scrollbar-hide">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-[var(--color-primary-100)]' : 'bg-gray-200'}`}>
                {msg.sender === 'user' ? <UserIcon className="h-5 w-5 text-[var(--color-primary-600)]" /> : <BotIcon className="h-5 w-5 text-gray-600" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[80%] ${
                msg.sender === 'user' 
                  ? 'bg-[var(--color-primary-600)] text-white rounded-tr-none' 
                  : 'bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <BotIcon className="h-5 w-5 text-gray-600 animate-pulse" />
              </div>
              <div className="p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl rounded-tl-none flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          )}
        </div>
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything about HR..."
            className="flex-1 px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-all text-[var(--color-text-primary)]"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className="p-3 bg-[var(--color-primary-600)] text-white rounded-xl hover:bg-[var(--color-primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-[var(--color-text-secondary)] mt-3">
          AI-generated responses can be inaccurate. Always verify against official policies.
        </p>
      </div>
    </div>
  );
};

export default Chatbot;
import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formKey, setFormKey] = useState(Date.now()); // Add a key to force re-render

  const { login, isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();

  // Reset form when component mounts
  useEffect(() => {
    setUsername('');
    setPassword('');
    setFormKey(Date.now());
  }, []);

  // Clear fields after logout
  useEffect(() => {
    if (!isAuthenticated) {
      setUsername('');
      setPassword('');
      setFormKey(Date.now());
    }
  }, [isAuthenticated]);

  // Only redirect if already authenticated
  useEffect(() => {
    if (authReady && isAuthenticated) {
      console.log('✅ Already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  // Always show login page while checking auth
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show nothing (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        console.log('✅ Login successful, redirecting...');
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-primary-600)]">YesPeople</h1>
          <p className="text-[var(--color-text-secondary)] mt-2">Your Integrated HR Information System</p>
          <p className="text-sm text-gray-500 mt-1">Please login to continue</p>
        </div>
        <Card>
          <form 
            key={formKey} 
            onSubmit={handleSubmit} 
            className="space-y-6"
            autoComplete="off"
          >
            <div style={{ display: 'none' }}>
              <input type="text" name="fakeusername" />
              <input type="password" name="fakepassword" />
            </div>
            <Input
              label="Username"
              id={`username-${formKey}`}
              name="username"
              type="text"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={isLoading}
            />
            <Input
              label="Password"
              id={`password-${formKey}`}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
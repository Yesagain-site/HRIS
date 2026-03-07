import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formKey, setFormKey] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  const { login, isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setFormKey(Date.now());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsername('');
      setPassword('');
      setFormKey(Date.now());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authReady && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  if (!authReady) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

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
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className={`relative z-10 h-full w-full flex flex-col items-center justify-center px-4 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* FULL WIDTH HEADER */}
        <div className="w-full text-center mb-12">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-yellow-400 bg-clip-text text-transparent tracking-tight leading-[1.2] pb-3">
            Welcome to YesAgain
          </h1>

          <p className="text-slate-400 text-base md:text-lg mt-6">
            Sign in to access your workspace
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 overflow-hidden">

            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-yellow-600/10 px-8 py-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Sign In</h2>
              <p className="text-blue-200/60 text-sm mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="p-8 space-y-6"
              autoComplete="off"
            >

              <div style={{ display: 'none' }}>
                <input type="text" name="fakeusername" />
                <input type="password" name="fakepassword" />
              </div>

              {/* USERNAME */}
              <div className="space-y-2">
                <label className="text-sm text-blue-100">Username</label>

                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" />

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm text-blue-100">Password</label>

                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-blue-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-yellow-600 hover:from-blue-700 hover:to-yellow-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 transition"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-white/10 text-center text-slate-400 text-sm">
                Need help? Contact your administrator
              </div>

            </form>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} YesAgain. All rights reserved.
        </div>

      </div>
    </div>
  );
};

export default LoginPage;

// import React, { useState, useEffect } from 'react';
// import { Button, Input, Card } from '../components/UI';
// import { useAuth } from '../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';

// const LoginPage: React.FC = () => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [formKey, setFormKey] = useState(Date.now()); // Add a key to force re-render

//   const { login, isAuthenticated, authReady } = useAuth();
//   const navigate = useNavigate();

//   // Reset form when component mounts
//   useEffect(() => {
//     setUsername('');
//     setPassword('');
//     setFormKey(Date.now());
//   }, []);

//   // Clear fields after logout
//   useEffect(() => {
//     if (!isAuthenticated) {
//       setUsername('');
//       setPassword('');
//       setFormKey(Date.now());
//     }
//   }, [isAuthenticated]);

//   // Only redirect if already authenticated
//   useEffect(() => {
//     if (authReady && isAuthenticated) {
//       console.log('✅ Already authenticated, redirecting to dashboard');
//       navigate('/dashboard', { replace: true });
//     }
//   }, [authReady, isAuthenticated, navigate]);

//   // Always show login page while checking auth
//   if (!authReady) {
//     return (
//       <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // If authenticated, show nothing (will redirect)
//   if (isAuthenticated) {
//     return null;
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setIsLoading(true);

//     try {
//       const success = await login(username, password);
//       if (success) {
//         console.log('✅ Login successful, redirecting...');
//         navigate('/dashboard', { replace: true });
//       } else {
//         setError('Invalid username or password');
//       }
//     } catch (err) {
//       setError('An unexpected error occurred.');
//       console.error('Login error:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold text-[var(--color-primary-600)]">YesPeople</h1>
//           <p className="text-[var(--color-text-secondary)] mt-2">Your Integrated HR Information System</p>
//           <p className="text-sm text-gray-500 mt-1">Please login to continue</p>
//         </div>
//         <Card>
//           <form 
//             key={formKey} 
//             onSubmit={handleSubmit} 
//             className="space-y-6"
//             autoComplete="off"
//           >
//             <div style={{ display: 'none' }}>
//               <input type="text" name="fakeusername" />
//               <input type="password" name="fakepassword" />
//             </div>
//             <Input
//               label="Username"
//               id={`username-${formKey}`}
//               name="username"
//               type="text"
//               autoComplete="off"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               placeholder="Enter your username"
//               required
//               disabled={isLoading}
//             />
//             <Input
//               label="Password"
//               id={`password-${formKey}`}
//               name="password"
//               type="password"
//               autoComplete="new-password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="••••••••"
//               required
//               disabled={isLoading}
//             />
//             {error && <p className="text-red-500 text-sm text-center">{error}</p>}
//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading ? 'Logging in...' : 'Login'}
//             </Button>
//           </form>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
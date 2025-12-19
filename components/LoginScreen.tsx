import React, { useState, useEffect } from 'react';
import { api } from '../services/gas';
import { User } from '../types';
import { APP_CONFIG } from '../constants';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize Google Button
  useEffect(() => {
    const handleGoogleResponse = async (response: any) => {
      try {
        setLoading(true);
        // Decode JWT
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        
        // Use Google data to register/login
        const user = await api.createUser(payload.email, payload.name);
        localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        onLogin(user);
      } catch (error) {
        console.error("Google Auth Error", error);
        alert("Failed to authenticate with Google");
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (typeof window.google === 'undefined' || !window.google.accounts) {
        // Retry if script hasn't loaded yet
        setTimeout(initializeGoogle, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnContainer = document.getElementById("googleSignInBtn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: "outline", size: "large", width: "100%", text: "continue_with" } 
          );
        }
      } catch (e) {
        console.error("GSI Init Error", e);
      }
    };

    initializeGoogle();
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    
    setLoading(true);
    try {
      const user = await api.createUser(email, name);
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      onLogin(user);
    } catch (error) {
      console.error(error);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Mini Landing */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute left-0 bottom-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="z-10">
            <div className="flex items-center gap-3 mb-8">
                 <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">L</div>
                 <span className="text-xl font-bold tracking-tight">Lax</span>
            </div>
            
            <h1 className="text-5xl font-bold leading-tight mb-6">
                Communication for <br/>
                <span className="text-blue-500">Sovereign Operators</span>.
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                No servers. No monthly seat costs. Just you, your team, and a Google Sheet.
                The broke-proof architecture for resilient operations.
            </p>
        </div>

        <div className="z-10 space-y-4">
             <div className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Owned Data Infrastructure</span>
             </div>
             <div className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Zero-Cost Scaling</span>
             </div>
             <div className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Auditable History</span>
             </div>
        </div>
        
        <div className="z-10 text-xs text-slate-600 mt-12">
            v1.0.0 • System Operational
        </div>
      </div>

      {/* Right Panel - Sign In */}
      <div className="flex-1 bg-white flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24">
        <div className="w-full max-w-sm space-y-8">
            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Join the Uplink</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Enter your credentials to access the secure channel.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Display Name</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pl-3 pr-3 py-2 border focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                                placeholder="Maverick"
                            />
                        </div>
                    </div>
                    <div>
                         <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                         <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pl-3 pr-3 py-2 border focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                                placeholder="operator@base.com"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Establishing Connection...' : 'Authenticate'}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6">
                    {/* Google Button Container */}
                    <div id="googleSignInBtn" className="w-full flex justify-center h-[40px]"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
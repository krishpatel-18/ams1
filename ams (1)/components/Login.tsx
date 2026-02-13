import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../constants';
import { Lock, LogIn, GraduationCap, Sun, Moon, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ darkMode, setDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Success will trigger onAuthStateChange in App.tsx
    } catch (err: any) {
      if (isMounted.current) {
         setError(err.message || 'Login failed. Please verify credentials.');
         setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans transition-colors duration-500 animate-in fade-in zoom-in-95">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-varsity-navy via-varsity-red to-varsity-gold"></div>
      
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-6 right-6 p-3 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-400 hover:text-varsity-navy dark:hover:text-varsity-gold rounded-2xl transition-all border border-slate-100 dark:border-slate-800 shadow-xl"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black p-10 relative overflow-hidden transition-colors duration-300">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-50 dark:bg-slate-800 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-varsity-navy rounded-2xl shadow-xl shadow-navy-100 dark:shadow-black mb-6 rotate-3">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">AMS <span className="text-varsity-red">2026</span></h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2">Enter your credentials to access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Institutional Email</label>
            <div className="relative group">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 focus:border-varsity-navy dark:focus:border-varsity-gold outline-none transition-all duration-300"
                placeholder="id@college.edu"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Secure Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 focus:border-varsity-navy dark:focus:border-varsity-gold outline-none transition-all duration-300 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-varsity-navy dark:hover:text-varsity-gold transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 px-4 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-varsity-navy dark:bg-varsity-navy hover:bg-slate-800 dark:hover:bg-slate-950 text-white font-bold py-5 rounded-2xl shadow-2xl shadow-navy-100 dark:shadow-black transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                Access Dashboard <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 grayscale opacity-50">
             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">Server Ready</span>
          </div>
          <div className="flex items-center gap-2 grayscale opacity-50">
             <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">Auth Secured</span>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 text-slate-300 dark:text-slate-700 text-[10px] font-bold uppercase tracking-widest text-center">
        © 2026 TY-BCA Academic Management
      </div>
    </div>
  );
};
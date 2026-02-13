import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './constants';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const lastFetchedId = useRef<string | null>(null);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const getFallbackProfile = (user: any): UserProfile => ({
    id: user.id,
    role: 'student', 
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest',
    email: user.email,
    status: 'active',
    roll_no: 99999, 
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString()
  });

  // Reduced Safety Timeout to 4s for snappier feel on slow nets
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && session?.user) {
        console.warn("Profile fetch timed out - applying emergency fallback.");
        setUserProfile(getFallbackProfile(session.user));
        setLoading(false);
      } else if (loading && !session) {
         setLoading(false);
      }
    }, 4000); 
    return () => clearTimeout(timer);
  }, [loading, session]);

  const fetchUserProfile = async (userId: string) => {
    if (lastFetchedId.current === userId && userProfile) {
      setLoading(false);
      return;
    }
    
    lastFetchedId.current = userId;

    try {
      // Optimized query: select specific columns if possible, but * is fine for small tables.
      // We keep * here for simplicity with types, but maybeSingle is crucial.
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data as UserProfile);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user found.");

        const newProfile = {
           id: userId,
           email: user.email,
           role: 'student',
           full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
           status: 'active',
           roll_no: Math.floor(10000 + Math.random() * 90000),
           created_at: new Date().toISOString(),
           last_login: new Date().toISOString(),
           last_active_at: new Date().toISOString()
        };
        
        // @ts-ignore
        const { error: insertError } = await supabase.from('users').insert(newProfile);
        
        if (insertError) {
           console.error("Auto-create failed (likely RLS), using memory profile:", insertError);
           setUserProfile(newProfile as unknown as UserProfile);
        } else {
           setUserProfile(newProfile as unknown as UserProfile);
        }
      }
    } catch (error: any) {
      console.error('Critical profile error, using fallback:', error);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserProfile(getFallbackProfile(user));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
       if (initialSession?.user) {
          fetchUserProfile(initialSession.user.id);
       } else {
          setLoading(false);
       }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setLoading(true);
          supabase.from('users').update({ 
              last_login: new Date().toISOString(),
              last_active_at: new Date().toISOString()
          }).eq('id', currentSession.user.id).then(() => {});
          
          await fetchUserProfile(currentSession.user.id);
        } else if (event === 'SIGNED_OUT') {
           setUserProfile(null);
           setLoading(false);
           lastFetchedId.current = null;
        }
      } else {
        lastFetchedId.current = null;
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
       presenceInterval.current = setInterval(async () => {
         try {
            await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', session.user.id);
         } catch(e) {}
       }, 60000);
    }
    return () => {
       if (presenceInterval.current) clearInterval(presenceInterval.current);
    };
  }, [session?.user?.id]);

  const handleLogout = async () => {
    setUserProfile(null);
    setSession(null);
    lastFetchedId.current = null;
    try { await supabase.auth.signOut(); } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500 animate-in fade-in">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-varsity-navy dark:text-varsity-gold mx-auto" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Securing Session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  if (!userProfile) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
           <div className="text-center space-y-4">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-slate-500">Session state invalid. Please sign in again.</p>
              <button onClick={handleLogout} className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-bold">Return to Login</button>
           </div>
        </div>
     );
  }

  if (userProfile.status === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center transition-colors duration-300 animate-in fade-in zoom-in">
        <div className="max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
             <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 uppercase">Access Restricted</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Your account has been deactivated. Please contact the administrator for assistance.</p>
          <button onClick={handleLogout} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-xs">Logout Session</button>
        </div>
      </div>
    );
  }

  return <Dashboard user={userProfile} darkMode={darkMode} setDarkMode={setDarkMode} onLogout={handleLogout} />;
}
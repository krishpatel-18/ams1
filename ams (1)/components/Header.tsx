
import React from 'react';
import { UserProfile } from '../types';
import { LogOut, GraduationCap, Calendar, User, Bell, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  title: string;
  date?: string;
  setDate?: (date: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, title, date, setDate, darkMode, setDarkMode }) => {
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[60] px-4 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-varsity-navy dark:bg-varsity-navy rounded-xl flex items-center justify-center shadow-lg shadow-navy-100 dark:shadow-black">
             <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">{title}</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-varsity-red uppercase tracking-tight">{user.role}</span>
               <span className="text-slate-300 dark:text-slate-700">•</span>
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{user.full_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-varsity-navy dark:hover:text-varsity-gold rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm flex items-center justify-center"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {date && setDate && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-varsity-navy dark:focus-within:ring-varsity-gold shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>

          <button 
            type="button"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-varsity-navy dark:hover:text-varsity-gold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all hidden sm:block"
          >
            <Bell className="w-5 h-5" />
          </button>

          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-varsity-red dark:hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-4 py-2.5 rounded-xl transition-all font-bold text-xs uppercase shadow-sm border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50 pointer-events-auto touch-manipulation cursor-pointer"
          >
            <span className="hidden sm:inline">Logout</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
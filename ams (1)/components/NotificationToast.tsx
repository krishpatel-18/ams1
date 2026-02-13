
import React, { useEffect, useState } from 'react';
import { NotificationItem } from '../types';
import { CheckCircle2, X, AlertTriangle, Info, BellRing, History } from 'lucide-react';

interface NotificationToastProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 pointer-events-none px-4 w-full max-w-lg">
      {notifications.map((n) => (
        <ToastItem key={n.id} item={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ item, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => handleDismiss(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(item.id), 400);
  };

  const getTheme = () => {
    switch (item.type) {
      case 'success': return { 
        bg: 'bg-emerald-600/90', 
        border: 'border-emerald-400/30', 
        icon: <CheckCircle2 className="w-5 h-5" />,
        shadow: 'shadow-emerald-500/20'
      };
      case 'error': return { 
        bg: 'bg-rose-600/90', 
        border: 'border-rose-400/30', 
        icon: <AlertTriangle className="w-5 h-5" />,
        shadow: 'shadow-rose-500/20'
      };
      default: return { 
        bg: 'bg-slate-900/90', 
        border: 'border-slate-700/30', 
        icon: <BellRing className="w-5 h-5" />,
        shadow: 'shadow-slate-900/20'
      };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`
        pointer-events-auto relative overflow-hidden backdrop-blur-xl
        ${isExiting ? 'animate-out fade-out zoom-out slide-out-to-top-8 duration-500' : 'animate-in fade-in zoom-in slide-in-from-top-8 duration-500'}
        ${theme.bg} ${theme.border} ${theme.shadow}
        border rounded-[1.5rem] p-4 shadow-2xl
        flex gap-4 items-center select-none w-full
      `}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
        {theme.icon}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-display font-bold text-xs uppercase tracking-widest text-white/70 mb-0.5">{item.title}</h4>
        <p className="text-sm font-semibold text-white truncate leading-snug">{item.message}</p>
      </div>
      
      <button 
        onClick={handleDismiss} 
        className="flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Expiry Progress Line */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/20 animate-[toast-progress_5s_linear_forwards]"></div>
    </div>
  );
};

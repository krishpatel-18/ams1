import React from 'react';
import { PANEL_KEYS } from '../constants';
import { Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';

interface AdminPanelProps {
  hiddenPanels: Record<string, boolean>;
  onToggle: (key: string, isHidden: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ hiddenPanels, onToggle }) => {
  const panels = [
    { key: PANEL_KEYS.ANALYTICS, label: 'Analytics & Leaderboard' },
    { key: PANEL_KEYS.REPORTS, label: 'Student Visualization Reports' },
    { key: PANEL_KEYS.FACULTY_REPORTS, label: 'Faculty Performance Reports' },
    { key: PANEL_KEYS.REGULAR_SUMMARY, label: 'Student Summary List' },
    { key: PANEL_KEYS.HEATBAR, label: 'Daily Heatbar' },
    { key: PANEL_KEYS.MONTHLY_HEATMAP, label: 'Attendance Heatmap & Peaks' },
    { key: PANEL_KEYS.RECORDS, label: 'Records Table' },
  ];

  return (
    <div className="bg-slate-800 text-slate-200 rounded-[2rem] p-8 shadow-2xl mb-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative">
        <div>
          <h3 className="font-display font-bold text-xl text-white tracking-tight uppercase flex items-center gap-3">
             <ShieldCheck className="w-6 h-6 text-indigo-400" />
             Command Center
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">Configure portal visibility for non-admin profiles</p>
        </div>
        <div className="bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-600/50">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Override Active</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
        {panels.map(p => {
          const isHidden = !!hiddenPanels[p.key];
          return (
            <button
              key={p.key}
              onClick={() => onToggle(p.key, !isHidden)}
              className={`flex items-center justify-between p-4 rounded-2xl text-xs font-bold border transition-all uppercase tracking-tight
                ${isHidden 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'}
              `}
            >
              <span>{p.label}</span>
              <div className={`p-2 rounded-lg ${isHidden ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
                {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
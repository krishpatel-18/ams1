import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceRecord, UserProfile, Student } from '../types';
import { 
  ShieldCheck, Smartphone, Monitor, Clock, 
  Activity, Search, Filter, Calendar, Laptop, Hash, Tablet
} from 'lucide-react';

interface SystemAuditProps {
  admin: UserProfile;
  records: AttendanceRecord[];
  students: Student[];
  allUsers: UserProfile[];
}

export const SystemAudit: React.FC<SystemAuditProps> = ({ admin, records, students, allUsers }) => {
  const [now, setNow] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');

  // LIVE TRACKING: Update every 1 second for smoother timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedUsers = useMemo(() => {
    let list = [...allUsers];
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u => 
        u.full_name?.toLowerCase().includes(q) || 
        u.email?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      // Sort by status (Live first), then by last active time
      const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
      const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [allUsers, searchTerm]);

  const getDeviceInfo = (userId: string) => {
    // Deterministic simulation based on ID to simulate "iOS" or "Android" detection
    // In a real app, this would come from a user_agents table
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const types = [
      { type: 'iOS', icon: Smartphone, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
      { type: 'Android', icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      { type: 'Web/Desk', icon: Laptop, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
      { type: 'Tablet', icon: Tablet, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
    ];
    return types[hash % 4];
  };

  const calculateDuration = (loginTime?: string, lastActive?: string) => {
    if (!loginTime) return '00h 00m 00s';
    
    const start = new Date(loginTime).getTime();
    if (isNaN(start)) return '00h 00m 00s';

    const lastAct = lastActive ? new Date(lastActive).getTime() : start;
    
    // If active within last 2 minutes, assume session is strictly "Live" relative to NOW
    const isOnline = (now - lastAct) < 2 * 60 * 1000;
    const end = isOnline ? now : lastAct;
    
    const diff = Math.max(0, end - start);
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const getStatus = (user: UserProfile) => {
    if (user.status === 'blocked') return { label: 'REVOKED', color: 'text-rose-500', indicator: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' };
    
    // Fallback if last_active_at is missing but last_login is recent (within 5 mins)
    let lastActivityTime = user.last_active_at ? new Date(user.last_active_at).getTime() : 0;
    if (!lastActivityTime && user.last_login) {
        const loginTime = new Date(user.last_login).getTime();
        if (now - loginTime < 5 * 60 * 1000) lastActivityTime = loginTime;
    }

    if (!lastActivityTime) return { label: 'OFFLINE', color: 'text-slate-500', indicator: 'bg-slate-600', glow: '' };
    
    const diff = now - lastActivityTime;
    
    // < 2 minutes = LIVE
    if (diff < 2 * 60 * 1000) return { label: 'LIVE', color: 'text-emerald-400', indicator: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' };
    // < 30 minutes = IDLE
    if (diff < 30 * 60 * 1000) return { label: 'IDLE', color: 'text-amber-400', indicator: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]' };
    
    return { label: 'OFFLINE', color: 'text-slate-500', indicator: 'bg-slate-600', glow: '' };
  };

  const formatDateTime = (isoString?: string) => {
      if (!isoString) return { time: '--:--', date: 'NO DATA' };
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return { time: '--:--', date: 'INVALID' };
      return {
          time: d.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      };
  };

  return (
    <div className="bg-slate-950 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 p-8 overflow-hidden relative group font-sans flex flex-col h-[700px]">
      {/* Background Tech Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 flex-shrink-0">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-slate-900 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10 relative overflow-hidden group-hover:border-indigo-500/50 transition-colors">
              <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
              <ShieldCheck className="w-8 h-8 text-indigo-400 relative z-10" />
           </div>
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em]">System Online</span>
              </div>
              <h3 className="text-3xl font-display font-bold text-white uppercase tracking-tight leading-none">
                 Audit Log
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Live Stream 
                 <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> {sortedUsers.length} Nodes
              </p>
           </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SEARCH NODE ID..."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-300 placeholder:text-slate-600 uppercase tracking-wide focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all"
              />
           </div>
           <button className="p-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
              <Filter className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* The Table Container */}
      <div className="relative z-10 flex-1 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-md">
            <div className="col-span-3 p-4 pl-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">User Identity</div>
            <div className="col-span-2 p-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Device (OS)</div>
            <div className="col-span-3 p-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Last Login</div>
            <div className="col-span-2 p-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Session Time</div>
            <div className="col-span-2 p-4 pr-6 text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">State</div>
        </div>

        {/* Table Body (Scrollable) */}
        <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-800/50">
            {sortedUsers.map((u) => {
            const device = getDeviceInfo(u.id);
            const status = getStatus(u);
            const duration = calculateDuration(u.last_login, u.last_active_at);
            const dateTime = formatDateTime(u.last_login);
            const DeviceIcon = device.icon;

            return (
                <div key={u.id} className="grid grid-cols-12 hover:bg-white/[0.02] transition-colors group items-center">
                    {/* User Identity */}
                    <div className="col-span-3 p-4 pl-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-white group-hover:border-slate-500 transition-all shadow-sm">
                                {u.full_name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-200 text-xs truncate">{u.full_name}</div>
                                <div className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                    <Hash className="w-3 h-3" /> {u.role === 'student' ? u.roll_no : u.role}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Device */}
                    <div className="col-span-2 p-4">
                        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-fit border ${device.border} ${device.bg}`}>
                            <DeviceIcon className={`w-3.5 h-3.5 ${device.color}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${device.color}`}>
                                {device.type}
                            </span>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="col-span-3 p-4">
                        <div className="flex items-center gap-3">
                             <Calendar className="w-3.5 h-3.5 text-slate-600" />
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-200 font-mono tracking-wide">{dateTime.time}</span>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{dateTime.date}</span>
                             </div>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="col-span-2 p-4">
                        <div className={`flex items-center gap-2 font-mono text-xs transition-colors ${status.label === 'LIVE' ? 'opacity-100' : 'opacity-60'}`}>
                            <Clock className={`w-3.5 h-3.5 ${status.label === 'LIVE' ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <span className={status.label === 'LIVE' ? 'text-emerald-300 font-bold tracking-tight shadow-emerald-500/50 drop-shadow-sm' : 'text-slate-500'}>
                                {duration}
                            </span>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-all ${status.color}`}>
                                {status.label}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${status.indicator} ${status.glow}`}></div>
                        </div>
                    </div>
                </div>
            );
            })}
            
            {sortedUsers.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center opacity-50">
                    <Activity className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No active nodes detected</p>
                </div>
            )}
        </div>
        
        {/* Footer Info */}
        <div className="border-t border-slate-800 bg-slate-900/80 p-3 flex justify-between items-center px-6 backdrop-blur-md">
           <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-indigo-500" />
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                 Nodes Online: {sortedUsers.length}
              </span>
           </div>
           <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">iOS</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Android</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Web</span>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};
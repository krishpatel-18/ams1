import React, { useMemo } from 'react';
import { AttendanceRecord, Student, Faculty } from '../types';
import { PANEL_KEYS } from '../constants';
import { TrendingUp, Activity, Zap, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface AttendanceReportsProps {
  records: AttendanceRecord[];
  students: Student[];
  faculty: Faculty[];
  hiddenPanels: Record<string, boolean>;
  userRole: string;
  userRoll?: number;
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
  records, students, hiddenPanels, userRole, userRoll
}) => {
  const safeStudents = students || [];
  const safeRecords = records || [];

  // Calculate stats per student
  const studentStats = useMemo(() => {
    // Initialize with 0
    const stats: Record<number, { present: number, total: number }> = {};
    safeStudents.forEach(s => stats[s.roll_no] = { present: 0, total: 0 });
    
    // Iterate RECORDS first (The truth source of sessions)
    safeRecords.forEach(r => {
       // For every record, increment TOTAL for every student (Assuming class-wide session)
       
       const presentRolls = new Set();
       if(r.attendance_details) {
          r.attendance_details.forEach(d => {
             if(d.status === 'P') presentRolls.add(Number(d.student_roll));
          });
       }

       safeStudents.forEach(s => {
          if (!stats[s.roll_no]) return;
          
          stats[s.roll_no].total += 1;
          
          if (presentRolls.has(s.roll_no)) {
             stats[s.roll_no].present += 1;
          }
       });
    });

    return stats;
  }, [safeRecords, safeStudents]);

  // Project Health Metrics
  const projectHealth = useMemo(() => {
    let totalP = 0;
    let totalC = 0;
    
    safeRecords.forEach(r => {
       // 1. Unique Present Count
       const uniquePresent = new Set<number>();
       if(r.attendance_details) {
          r.attendance_details.forEach(d => {
             if(d.status === 'P') uniquePresent.add(Number(d.student_roll));
          });
       }
       const pCount = uniquePresent.size > 0 ? uniquePresent.size : (r.present_count || 0);

       // 2. Capacity: Priority to Saved Total, fallback to current students list length
       let cCount = r.total_count || safeStudents.length;

       // Filter based on user view if needed (student sees their own stats contribution)
       if (userRole === 'student' && userRoll) {
          // If viewing as student, we only care about their specific attendance
          totalC++;
          if(uniquePresent.has(Number(userRoll))) totalP++;
       } else {
          totalP += pCount;
          totalC += cCount;
       }
    });

    const score = totalC > 0 ? Math.round((totalP / totalC) * 100) : 0;
    
    let status = 'Stable';
    let color = 'text-indigo-500';
    let bg = 'from-indigo-500/10';

    if(score >= 80) { status = 'Optimal'; color = 'text-emerald-500'; bg = 'from-emerald-500/10'; }
    else if(score >= 60) { status = 'Good'; color = 'text-amber-500'; bg = 'from-amber-500/10'; }
    else if(score > 0) { status = 'Critical'; color = 'text-rose-500'; bg = 'from-rose-500/10'; }
    else { status = 'No Data'; color = 'text-slate-400'; bg = 'from-slate-500/10'; }

    return { score, status, color, bg };
  }, [safeRecords, safeStudents, userRole, userRoll]);

  // System Updates Feed
  const systemUpdates = useMemo(() => {
    const updates: { id: string, type: 'success' | 'warning' | 'info', msg: string, time: string }[] = [];
    
    const getRelativeTime = (dateStr: string) => {
        if(!dateStr) return 'Recently';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if(mins < 1) return 'Just now';
        if(mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if(hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    // 1. Latest Sessions Analysis
    const recentRecords = [...safeRecords].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    
    recentRecords.forEach(r => {
      // Recalculate accurate percentage for the feed
      const uniquePresent = new Set<number>();
      if(r.attendance_details) {
         r.attendance_details.forEach(d => {
            if(d.status === 'P') uniquePresent.add(Number(d.student_roll));
         });
      }
      const p = uniquePresent.size > 0 ? uniquePresent.size : (r.present_count || 0);
      
      const cap = r.total_count || safeStudents.length;
      const pct = cap > 0 ? (p / cap) * 100 : 0;
      
      if(pct >= 90) {
         updates.push({ 
           id: `high-${r.id}`, 
           type: 'success', 
           msg: `High engagement in ${r.lecture_name}`, 
           time: getRelativeTime(r.created_at)
         });
      } else if (pct < 40) {
         updates.push({ 
           id: `low-${r.id}`, 
           type: 'warning', 
           msg: `Low turnout for ${r.lecture_name}`, 
           time: getRelativeTime(r.created_at)
         });
      } else {
         updates.push({
            id: `reg-${r.id}`,
            type: 'info',
            msg: `Session recorded: ${r.lecture_name}`,
            time: getRelativeTime(r.created_at)
         });
      }
    });

    // 2. Fallback updates if empty
    if(updates.length === 0) {
       updates.push({ id: 'sys-1', type: 'info', msg: 'System initialized successfully', time: 'Now' });
       updates.push({ id: 'sys-2', type: 'success', msg: 'Database connection secure', time: 'Now' });
    }

    return updates.slice(0, 4);
  }, [safeRecords, safeStudents.length]);

  return (
    <div className="space-y-6">
      {/* Student Summary Table - Only visible to Admin */}
      {userRole === 'admin' && (
      <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 ${hiddenPanels[PANEL_KEYS.REGULAR_SUMMARY] ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Student Summary</h3>
            <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
               Admin View
            </span>
          </div>
          <div className="max-h-[350px] overflow-auto rounded-xl border border-slate-50 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest z-10">
                 <tr>
                   <th className="px-6 py-4">Roll</th>
                   <th className="px-6 py-4">Name</th>
                   <th className="px-6 py-4 text-right">Total Present</th>
                   <th className="px-6 py-4 text-right">%</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                 {safeStudents.map(s => {
                   const st = studentStats[s.roll_no] || { present: 0, total: 0 };
                   const pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0;
                   return (
                     <tr key={s.roll_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                       <td className="px-6 py-4 font-display font-bold text-slate-500 dark:text-slate-400">{s.roll_no}</td>
                       <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{s.name}</td>
                       <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{st.present}</td>
                       <td className="px-6 py-4 text-right">
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight 
                           ${pct >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                             pct >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                             'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                           {pct}%
                         </span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
      </div>
      )}

      {/* Project Health & Updates (Replaces Old Heatbar) */}
      {userRole === 'admin' && (
      <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 ${hiddenPanels[PANEL_KEYS.HEATBAR] ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
               <Activity className="w-5 h-5 text-indigo-500" />
               Project Health & Updates
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 animate-pulse">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
               System Nominal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Health Score */}
             <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="relative z-10">
                   <div className="text-6xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">{projectHealth.score}<span className="text-2xl text-slate-400">%</span></div>
                   <div className={`text-sm font-bold uppercase tracking-[0.2em] mb-1 ${projectHealth.color}`}>{projectHealth.status}</div>
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Overall Attendance Efficiency</p>
                </div>
                {/* Background Decor */}
                <div className={`absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t ${projectHealth.bg} to-transparent opacity-50 transition-all group-hover:h-2/3`}></div>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <TrendingUp className={`w-12 h-12 ${projectHealth.color}`} />
                </div>
             </div>

             {/* Updates Feed */}
             <div className="flex flex-col h-full justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Live System Feed</h4>
                    </div>
                    
                    {systemUpdates.map((update) => (
                    <div key={update.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                            update.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 
                            update.type === 'warning' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 
                            'bg-sky-50 dark:bg-sky-900/20 text-sky-500'
                        }`}>
                            {update.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
                            {update.type === 'warning' && <AlertTriangle className="w-3 h-3" />}
                            {update.type === 'info' && <Info className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{update.msg}</p>
                            <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">{update.time}</p>
                        </div>
                    </div>
                    ))}
                </div>
             </div>
          </div>
      </div>
      )}
    </div>
  );
};
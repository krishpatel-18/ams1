import React, { useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { Calendar } from 'lucide-react';

interface AttendanceHeatmapProps {
  records: AttendanceRecord[];
  students: Student[];
  isHidden: boolean;
}

export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ records, students, isHidden }) => {
  if (isHidden) return null;

  const { calendarGrid, currentMonthLabel } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 1. Calendar Grid Logic
    const grid = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayRecords = records.filter(r => r.date === dateStr);
      let totalPresent = 0;
      let totalCapacity = 0;
      
      dayRecords.forEach(r => {
        totalPresent += r.present_count;
        totalCapacity += r.total_count || students.length;
      });

      const percentage = totalCapacity > 0 ? Math.round((totalPresent / totalCapacity) * 100) : 0;
      const intensity = totalCapacity === 0 ? 0 : percentage;
      
      return { day, dateStr, intensity, sessionCount: dayRecords.length };
    });

    return {
      calendarGrid: grid,
      currentMonthLabel: now.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [records, students]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Monthly Heatmap Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
         <div className="flex justify-between items-center mb-8">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
               <Calendar className="w-5 h-5 text-indigo-500" />
               Attendance Heatmap
            </h3>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
               {currentMonthLabel}
            </span>
         </div>

         <div className="grid grid-cols-7 sm:grid-cols-7 md:grid-cols-7 lg:grid-cols-10 gap-2">
            {calendarGrid.map((day) => (
               <div 
                 key={day.day} 
                 className={`aspect-square rounded-xl p-2 flex flex-col justify-between transition-all hover:scale-105 border ${
                    day.sessionCount === 0 
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-300 dark:text-slate-700' 
                      : day.intensity >= 75 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                        : day.intensity >= 50 
                          ? 'bg-amber-400 border-amber-300 text-white shadow-lg shadow-amber-400/20' 
                          : 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                 }`}
               >
                  <span className="text-[10px] font-bold">{day.day}</span>
                  {day.sessionCount > 0 && (
                     <div className="text-right">
                        <span className="text-[10px] font-bold opacity-90">{day.intensity}%</span>
                     </div>
                  )}
               </div>
            ))}
         </div>
         
         <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High (&gt;75%)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg (50-75%)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-rose-500"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low (&lt;50%)</span>
            </div>
         </div>
      </div>
    </div>
  );
};
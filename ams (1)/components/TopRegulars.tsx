import React, { useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { Crown, Medal, Trophy, Star, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TopRegularsProps {
  records: AttendanceRecord[];
  students: Student[];
}

export const TopRegulars: React.FC<TopRegularsProps> = ({ records, students }) => {
  const topList = useMemo(() => {
    // Initialize stats
    const stats: Record<number, { present: number; total: number }> = {};
    students.forEach(s => {
      stats[s.roll_no] = { present: 0, total: 0 };
    });

    // Iterate RECORDS first to establish the Total Sessions for everyone
    records.forEach(r => {
      // Create a set of present student rolls for this record
      const presentRolls = new Set();
      if(r.attendance_details) {
         r.attendance_details.forEach(d => {
            if(d.status === 'P') presentRolls.add(Number(d.student_roll));
         });
      }

      // For every student, increment total (assuming class-wide attendance)
      // And check if they were present
      students.forEach(s => {
         if (!stats[s.roll_no]) return;
         
         stats[s.roll_no].total += 1;
         
         if (presentRolls.has(s.roll_no)) {
            stats[s.roll_no].present += 1;
         }
      });
    });

    const sorted = students
      .map(s => {
        const { present, total } = stats[s.roll_no] || { present: 0, total: 0 };
        const pct = total === 0 ? 0 : Math.round((present / total) * 100);
        return { ...s, present, total, pct };
      })
      .sort((a, b) => b.pct - a.pct || b.present - a.present);

    return sorted.slice(0, 6); // Show Top 6
  }, [records, students]);

  const { chartData, todayDate, hasData } = useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const today = new Date(d.getTime() - offset).toISOString().slice(0, 10);

    const todayRecords = records.filter(r => r.date === today);
    
    let totalPresent = 0;
    let totalAbsent = 0;

    todayRecords.forEach(r => {
        // ACCURATE: Use details for Present, and (Total - Present) for Absent
        let p = 0;
        if(r.attendance_details && r.attendance_details.length > 0) {
           p = r.attendance_details.filter(d => d.status === 'P').length;
        } else {
           p = r.present_count || 0;
        }

        const capacity = r.total_count || students.length;
        
        totalPresent += p;
        totalAbsent += Math.max(0, capacity - p);
    });

    const hasData = totalPresent > 0 || totalAbsent > 0;

    return {
        chartData: hasData ? [
          { name: 'Present', value: totalPresent, color: '#10b981' }, // Emerald-500
          { name: 'Absent', value: totalAbsent, color: '#f43f5e' }   // Rose-500
        ] : [
          { name: 'No Data', value: 1, color: '#e2e8f0' } // Slate-200 placeholder
        ],
        todayDate: today,
        hasData
    };
  }, [records, students.length]);

  if (topList.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
             <Crown className="w-6 h-6 text-varsity-gold" />
             Elite Attendance Squad
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Consistent Performers</p>
        </div>
        <div className="px-3 py-1 bg-varsity-gold/10 text-varsity-gold rounded-lg border border-varsity-gold/20 text-[10px] font-bold uppercase">
           Live Ranking
        </div>
      </div>

      <div className="mb-10 w-full relative z-10 animate-in fade-in zoom-in duration-500 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
           <div className="flex items-center justify-center gap-2 mb-6">
              <PieChartIcon className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Presence ({todayDate})</span>
           </div>
           <div className="h-[250px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={hasData ? 5 : 0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                     content={({ active, payload }) => {
                        if (active && payload && payload.length && hasData) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl">
                              <p className="text-xs font-bold uppercase tracking-widest mb-1 text-slate-400">{data.name}</p>
                              <div className="text-sm font-bold flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
                                {data.value} Students
                              </div>
                            </div>
                          );
                        }
                        return null;
                     }}
                  />
                  {hasData && (
                    <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                  )}
                </PieChart>
             </ResponsiveContainer>
             
             {!hasData && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No Active Sessions</span>
                     <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-wide mt-1">Today</span>
                 </div>
             )}
           </div>
      </div>

      {/* Top Regulars Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top 6 Regulars</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {topList.map((student, idx) => {
            let badgeColor = "bg-slate-100 text-slate-500";
            let borderColor = "border-slate-100 dark:border-slate-800";
            
            if (idx === 0) {
                badgeColor = "bg-amber-100 text-amber-700";
                borderColor = "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10";
            } else if (idx === 1) {
                badgeColor = "bg-slate-200 text-slate-600";
                borderColor = "border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50";
            } else if (idx === 2) {
                badgeColor = "bg-orange-100 text-orange-700";
                borderColor = "border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10";
            } else {
                // Default style for 4th, 5th, 6th
                badgeColor = "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400";
            }

            return (
                <div key={student.id} className={`p-5 rounded-[1.5rem] border ${borderColor} transition-all hover:scale-[1.02] flex flex-col justify-between group`}>
                <div className="flex justify-between items-start mb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${badgeColor} shadow-sm`}>
                        #{idx + 1}
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">{student.pct}%</div>
                    </div>
                </div>
                
                <div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{student.name}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-mono text-[10px] text-slate-400">ID: {student.roll_no}</span>
                    </div>
                </div>
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};
import React, { useMemo } from 'react';
import { AttendanceRecord, Faculty } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Award, BookOpen, Activity, Percent } from 'lucide-react';

interface FacultySummaryProps {
  records: AttendanceRecord[];
  faculty: Faculty[];
}

export const FacultySummary: React.FC<FacultySummaryProps> = ({ records, faculty }) => {
  const { facultyStats, pieData, top3, hasData } = useMemo(() => {
    // 1. Aggregate Data
    const stats = faculty.map(f => {
      // Normalize comparison to avoid mismatch issues (Case insensitive)
      const targetName = (f.name || '').toLowerCase().trim();
      
      const mySessions = records.filter(r => {
        const recordName = (r.faculty_name || '').toLowerCase().trim();
        return recordName === targetName;
      });

      const totalSessions = mySessions.length;
      
      let totalPresent = 0;
      let totalCapacity = 0;

      mySessions.forEach(r => {
        // ACCURATE CALCULATION LOGIC:
        // 1. Deduplicate Present students
        const uniquePresent = new Set<number>();
        const uniqueTotal = new Set<number>();
        
        if (r.attendance_details) {
           r.attendance_details.forEach(d => {
              uniqueTotal.add(Number(d.student_roll));
              if(d.status === 'P') uniquePresent.add(Number(d.student_roll));
           });
        }

        const present = uniquePresent.size > 0 ? uniquePresent.size : (r.present_count || 0);
        
        // 2. Determine Capacity (Saved Total > Details Count)
        let capacity = r.total_count || 0;
        if(capacity === 0 && uniqueTotal.size > 0) capacity = uniqueTotal.size;
        
        // Integrity check
        if (present > capacity) capacity = present; 

        totalPresent += present;
        totalCapacity += capacity;
      });

      let avgAttendance = 0;
      if (totalCapacity > 0) {
        avgAttendance = Math.round((totalPresent / totalCapacity) * 100);
      }
      
      // Strict clamp to 100%
      if (avgAttendance > 100) avgAttendance = 100;

      return {
        id: f.id,
        name: f.name,
        totalSessions,
        totalPresent,
        avgAttendance,
        // Score for sorting: primarily avg attendance, tie-break with session count
        score: avgAttendance + (totalSessions * 0.1) 
      };
    });

    // 2. Sort for Top 3 (Filter out 0 sessions)
    const activeFaculty = stats.filter(s => s.totalSessions > 0);
    const sortedByPerformance = [...activeFaculty].sort((a, b) => b.avgAttendance - a.avgAttendance);
    const top3 = sortedByPerformance.slice(0, 3);

    // 3. Prepare Pie Chart Data (Session Distribution)
    const sortedBySessions = [...activeFaculty].sort((a, b) => b.totalSessions - a.totalSessions);
    const top5Sessions = sortedBySessions.slice(0, 5);
    const othersCount = sortedBySessions.slice(5).reduce((acc, curr) => acc + curr.totalSessions, 0);
    
    // Defined colors for the chart slices
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    let chartData = top5Sessions.map((s, index) => ({
      name: s.name,
      value: s.totalSessions,
      color: COLORS[index % COLORS.length]
    }));
    
    if (othersCount > 0) {
      chartData.push({ name: 'Others', value: othersCount, color: '#94a3b8' });
    }

    const hasData = chartData.length > 0;

    // Placeholder for empty state
    if (!hasData) {
        chartData = [{ name: 'No Data', value: 1, color: '#e2e8f0' }];
    }

    return {
      facultyStats: stats.sort((a, b) => b.totalSessions - a.totalSessions),
      pieData: chartData,
      top3,
      hasData
    };
  }, [records, faculty]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
           <Award className="w-6 h-6" />
        </div>
        <div>
           <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Faculty Analytics</h3>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance & Workload Distribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Top 3 Podium */}
         <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 relative">
            <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
               <Trophy className="w-4 h-4 text-amber-500" /> Top Performing Instructors
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* 2nd Place */}
               {top3[1] && (
                 <div className="order-2 md:order-1 mt-0 md:mt-8 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center relative group">
                    <div className="absolute -top-4 w-10 h-10 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-bold border-4 border-slate-50 dark:border-slate-800 shadow-sm z-10">2</div>
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-3 flex items-center justify-center text-2xl font-bold text-slate-400">
                       {top3[1].name.charAt(0)}
                    </div>
                    <div className="text-center">
                       <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{top3[1].name}</h5>
                       <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                          <Percent className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{top3[1].avgAttendance}%</span>
                       </div>
                    </div>
                 </div>
               )}

               {/* 1st Place */}
               {top3[0] ? (
                 <div className="order-1 md:order-2 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-500/30 shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col items-center relative z-10 transform md:-translate-y-4">
                    <div className="absolute -top-5 w-12 h-12 bg-amber-400 text-white rounded-full flex items-center justify-center font-bold border-4 border-white dark:border-slate-900 shadow-lg z-10 text-xl">
                       <Trophy className="w-5 h-5" />
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-indigo-500 text-white mb-4 flex items-center justify-center text-3xl font-display font-bold shadow-lg shadow-indigo-500/30">
                       {top3[0].name.charAt(0)}
                    </div>
                    <div className="text-center">
                       <h5 className="font-bold text-slate-900 dark:text-white text-lg">{top3[0].name}</h5>
                       <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{top3[0].avgAttendance}% Avg</span>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="col-span-3 text-center py-10 text-slate-400 text-xs font-bold uppercase">No data available</div>
               )}

               {/* 3rd Place */}
               {top3[2] && (
                 <div className="order-3 md:order-3 mt-0 md:mt-12 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center relative">
                    <div className="absolute -top-4 w-10 h-10 bg-amber-700 text-amber-100 rounded-full flex items-center justify-center font-bold border-4 border-slate-50 dark:border-slate-800 shadow-sm z-10">3</div>
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-3 flex items-center justify-center text-2xl font-bold text-slate-400">
                       {top3[2].name.charAt(0)}
                    </div>
                    <div className="text-center">
                       <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{top3[2].name}</h5>
                       <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                          <Percent className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{top3[2].avgAttendance}%</span>
                       </div>
                    </div>
                 </div>
               )}
            </div>
         </div>

         {/* Pie Chart */}
         <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
            <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
               <BookOpen className="w-4 h-4 text-indigo-500" /> Session Distribution
            </h4>
            <div className="flex-1 min-h-[250px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={hasData ? 5 : 0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                     >
                        {pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                     </Pie>
                     {hasData && (
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                     )}
                     {hasData && (
                        <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                        />
                     )}
                  </PieChart>
               </ResponsiveContainer>
               
               {!hasData && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Sessions</span>
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* Summary Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
         <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
               <tr>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4 text-center">Sessions Taken</th>
                  <th className="px-6 py-4 text-right">Avg. Attendance</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm">
               {facultyStats.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                     <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                        {f.name}
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                           <BookOpen className="w-3 h-3 mr-1" /> {f.totalSessions} Sessions
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                 className={`h-full rounded-full ${f.avgAttendance >= 75 ? 'bg-emerald-500' : f.avgAttendance >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                 style={{ width: `${f.avgAttendance}%` }}
                              ></div>
                           </div>
                           <span className={`text-xs font-bold ${f.avgAttendance >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                              {f.avgAttendance}%
                           </span>
                        </div>
                     </td>
                  </tr>
               ))}
               {facultyStats.length === 0 && (
                  <tr>
                     <td colSpan={3} className="py-8 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
                        Registry Empty
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
};
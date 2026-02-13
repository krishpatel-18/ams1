import React, { useMemo } from 'react';
import { AttendanceRecord, Faculty } from '../types';
import { PANEL_KEYS } from '../constants';
import { Award, BookOpen, TrendingUp, Users, Star, Medal } from 'lucide-react';

interface FacultyReportsProps {
  records: AttendanceRecord[];
  faculty: Faculty[];
  hiddenPanels: Record<string, boolean>;
}

export const FacultyReports: React.FC<FacultyReportsProps> = ({ records, faculty, hiddenPanels }) => {
  if (hiddenPanels[PANEL_KEYS.FACULTY_REPORTS]) return null;

  const stats = useMemo(() => {
    const facultyStats: Record<string, { 
      name: string, 
      sessions: number, 
      totalPresent: number, 
      totalCapacity: number,
      avgAttendance: number 
    }> = {};

    // Initialize with all faculty to ensure even those with 0 sessions appear
    faculty.forEach(f => {
      facultyStats[f.name] = { 
        name: f.name, 
        sessions: 0, 
        totalPresent: 0, 
        totalCapacity: 0, 
        avgAttendance: 0 
      };
    });

    records.forEach(r => {
      const name = r.faculty_name;
      if (!facultyStats[name]) {
        facultyStats[name] = { 
            name, 
            sessions: 0, 
            totalPresent: 0, 
            totalCapacity: 0, 
            avgAttendance: 0 
        };
      }
      
      facultyStats[name].sessions += 1;
      
      // Calculate actual present from details if available, else fallback to count
      let present = r.present_count;
      if(r.attendance_details && r.attendance_details.length > 0) {
         present = r.attendance_details.filter(d => d.status === 'P').length;
      }
      
      facultyStats[name].totalPresent += present;
      facultyStats[name].totalCapacity += r.total_count || 0;
    });

    // Calculate Averages
    Object.values(facultyStats).forEach(stat => {
      if (stat.totalCapacity > 0) {
        stat.avgAttendance = Math.round((stat.totalPresent / stat.totalCapacity) * 100);
      }
    });

    return Object.values(facultyStats).sort((a, b) => b.sessions - a.sessions);
  }, [records, faculty]);

  const topFaculty = stats.length > 0 ? stats[0] : null;
  const mostConsistent = [...stats].sort((a,b) => b.avgAttendance - a.avgAttendance)[0];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topFaculty && topFaculty.sessions > 0 && (
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200 dark:shadow-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-indigo-200" />
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">Most Active Faculty</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold">{topFaculty.name}</h3>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-md">
                                <span className="text-xl font-bold">{topFaculty.sessions}</span>
                                <span className="text-[10px] font-bold uppercase ml-1 opacity-70">Sessions</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-display font-bold backdrop-blur-md">
                        1st
                    </div>
                </div>
            </div>
        )}

        {mostConsistent && mostConsistent.sessions > 0 && (
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Highest Engagement</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100">{mostConsistent.name}</h3>
                         <div className="mt-4 flex items-center gap-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{mostConsistent.avgAttendance}%</span>
                                <span className="text-[10px] font-bold uppercase ml-1 text-amber-500/70">Avg. Presence</span>
                            </div>
                        </div>
                    </div>
                     <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-3xl font-display font-bold text-amber-500">
                        <Medal className="w-8 h-8" />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Faculty Performance Summary</h3>
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {stats.length} Instructors
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                        <th className="px-6 py-4 rounded-l-xl">Faculty Name</th>
                        <th className="px-6 py-4 text-center">Sessions</th>
                        <th className="px-6 py-4 text-center">Total Students</th>
                        <th className="px-6 py-4 rounded-r-xl text-right">Avg. Attendance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {stats.map((s, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{s.name}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                    <BookOpen className="w-3 h-3 mr-1" /> {s.sessions}
                                </span>
                            </td>
                             <td className="px-6 py-4 text-center">
                                <span className="font-bold text-slate-600 dark:text-slate-400 text-xs">
                                    {s.totalPresent}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${s.avgAttendance > 75 ? 'bg-emerald-500' : s.avgAttendance > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                            style={{ width: `${s.avgAttendance}%` }}
                                        ></div>
                                    </div>
                                    <span className={`text-xs font-bold ${s.avgAttendance > 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                        {s.avgAttendance}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {stats.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                No session data available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
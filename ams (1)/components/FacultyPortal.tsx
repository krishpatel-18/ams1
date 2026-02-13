import React, { useMemo } from 'react';
import { AttendanceRecord, Lecture, UserProfile, Student } from '../types';
import { 
  BookOpen, TrendingUp, BarChart3
} from 'lucide-react';

interface FacultyPortalProps {
  user: UserProfile;
  records: AttendanceRecord[];
  lectures: Lecture[];
  students: Student[];
  onRefresh: () => void;
  onDeleteRecord: (id: number) => void;
  onEditRecord: (r: AttendanceRecord) => void;
  totalClassStrength?: number;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({ 
  user, records, lectures, students, onRefresh, onDeleteRecord, onEditRecord, totalClassStrength 
}) => {
  const safeRecords = records || [];

  const myClasses = useMemo(() => {
    return safeRecords.filter(r => {
      return (r.created_by === user.id) || (r.faculty_name === user.full_name);
    });
  }, [safeRecords, user]);

  const stats = useMemo(() => {
    const totalSessions = myClasses.length;
    const totalPresent = myClasses.reduce((acc, curr) => {
      const rollSet = new Set<number>();
      curr.attendance_details?.forEach(d => {
        if(d.status === 'P') rollSet.add(d.student_roll);
      });
      return acc + (rollSet.size || curr.present_count);
    }, 0);
    
    const totalPossible = totalSessions * (totalClassStrength || 45);
    const avgAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
    
    return { totalSessions, totalPresent, avgAttendance };
  }, [myClasses, totalClassStrength]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700"></div>
          <BookOpen className="w-8 h-8 text-indigo-300 mb-6" />
          <div className="text-4xl font-display font-bold tracking-tight">{stats.totalSessions}</div>
          <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mt-2">Classes Conducted</div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <TrendingUp className="w-8 h-8 text-emerald-500 mb-6" />
          <div className="text-4xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stats.avgAttendance}%</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Avg. Session Presence</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <BarChart3 className="w-8 h-8 text-indigo-500 mb-6" />
          <div className="text-4xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stats.totalPresent}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Total Student Logs</div>
        </div>
      </div>
    </div>
  );
};
import React, { useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy } from 'lucide-react';

interface AnalyticsProps {
  records: AttendanceRecord[];
  students: Student[];
  date: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ records, students, date }) => {
  // 1. Efficient Student List Mapping
  const effectiveStudents = useMemo(() => {
    if (students && students.length > 0) return students;
    const uniqueMap = new Map<number, string>();
    records?.forEach(r => {
      r.attendance_details?.forEach(d => {
        const rNo = Number(d.student_roll);
        if (!uniqueMap.has(rNo)) uniqueMap.set(rNo, d.student_name);
      });
    });
    return Array.from(uniqueMap.entries()).map(([roll, name]) => ({
      id: roll, roll_no: roll, name
    } as Student));
  }, [students, records]);

  // 2. Consistency Leaderboard (Top 5)
  const leaderboard = useMemo(() => {
    if (effectiveStudents.length === 0) return [];
    const stats: Record<number, { name: string, present: number, total: number }> = {};
    effectiveStudents.forEach(s => stats[s.roll_no] = { name: s.name, present: 0, total: 0 });

    records?.forEach(r => {
      r.attendance_details?.forEach(d => {
        const roll = Number(d.student_roll);
        if (stats[roll]) {
          stats[roll].total++;
          if (d.status === 'P') stats[roll].present++;
        }
      });
    });

    return Object.entries(stats)
      .map(([roll, val]) => ({
        roll: Number(roll),
        ...val,
        percentage: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.percentage - a.percentage || a.roll - b.roll)
      .slice(0, 5);
  }, [records, effectiveStudents]);

  // 3. Chart Logic
  const pieData = useMemo(() => {
    const todays = (records || []).filter(r => r.date === date);
    const presentRolls = new Set<number>();
    
    todays.forEach(r => {
      r.attendance_details?.forEach(d => {
        if (d.status === 'P') presentRolls.add(Number(d.student_roll));
      });
    });
    
    const presentCount = presentRolls.size;
    const totalCount = effectiveStudents.length || presentCount;
    const absentCount = Math.max(0, totalCount - presentCount);

    if (totalCount === 0) return [{ name: 'Empty', value: 1, color: '#334155' }];

    // Matching colors from image: Absent (Redish), Present (Greenish)
    return [
      { name: 'Absent', value: absentCount, color: '#f43f5e' }, // Rose-500
      { name: 'Present', value: presentCount, color: '#10b981' } // Emerald-500
    ];
  }, [records, effectiveStudents, date]);

  const hasData = pieData.length > 0 && pieData[0].name !== 'Empty';

  return (
    <div className="bg-slate-900 rounded-[2rem] shadow-xl border border-slate-800 p-8 flex flex-col h-full">
      {/* Header */}
      <h2 className="text-white font-display font-bold text-xl uppercase tracking-wider mb-8">Analytics</h2>

      {/* Date Subheader */}
      <div className="text-center mb-2">
         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Presence ({date})</span>
      </div>

      {/* Chart Section */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="h-[220px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={hasData ? 5 : 0}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={true}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />}
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-8 mt-2">
           <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-[#f43f5e]"></div>
              <span className="text-sm font-medium text-[#f43f5e]">Absent</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-[#10b981]"></div>
              <span className="text-sm font-medium text-[#10b981]">Present</span>
           </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Top Regulars</span>
        </div>
        
        <div className="space-y-3">
          {leaderboard.length > 0 ? leaderboard.map((item, idx) => (
            <div key={item.roll} className="flex items-center p-4 bg-slate-800/50 rounded-2xl border border-slate-800 transition-transform hover:scale-[1.02]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-4 shadow-sm
                ${idx === 0 ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-slate-700 text-slate-400'}
              `}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-200 truncate">{item.name}</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">ID #{item.roll}</div>
              </div>
            </div>
          )) : (
             <div className="text-center py-6 text-slate-600 text-xs uppercase font-bold tracking-widest">
               No data available
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
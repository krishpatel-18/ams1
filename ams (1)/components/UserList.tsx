import React, { useState, useMemo } from 'react';
import { Student, Faculty, SortOption } from '../types';
import { Search, CheckSquare, Square, QrCode, Filter, MoreVertical, CheckCircle2, X, Trash2, Circle } from 'lucide-react';

interface UserListProps {
  students: Student[];
  faculty: Faculty[];
  selectedRolls: Set<number>;
  onSelectionChange: (rolls: Set<number>) => void;
  onScan: (roll: number) => void;
  canEdit: boolean;
}

export const UserList: React.FC<UserListProps> = ({ 
  students, faculty, selectedRolls, onSelectionChange, onScan, canEdit 
}) => {
  const [userType, setUserType] = useState<'student' | 'faculty'>('student');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('roll-asc');
  const [scanInput, setScanInput] = useState('');

  const safeStudents = students || [];
  const safeFaculty = faculty || [];
  const currentList = userType === 'student' ? safeStudents : safeFaculty;

  const filteredList = useMemo(() => {
    let list = [...currentList];
    const q = search.toLowerCase();
    
    if (q) {
      list = list.filter(u => 
        u.name.toLowerCase().includes(q) || 
        String(u.roll_no).includes(q)
      );
    }
    
    if (sort === 'roll-asc') list.sort((a, b) => Number(a.roll_no) - Number(b.roll_no));
    if (sort === 'roll-desc') list.sort((a, b) => Number(b.roll_no) - Number(a.roll_no));
    if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'present') list = list.filter(u => selectedRolls.has(Number(u.roll_no)));
    if (sort === 'absent') list = list.filter(u => !selectedRolls.has(Number(u.roll_no)));
    
    return list;
  }, [currentList, search, sort, selectedRolls]);

  const toggleSelection = (roll: number) => {
    if (!canEdit) return;
    const rollNum = Number(roll);
    const newSet = new Set(selectedRolls);
    if (newSet.has(rollNum)) newSet.delete(rollNum);
    else newSet.add(rollNum);
    onSelectionChange(newSet);
  };

  const handleSelectAll = () => {
    if (!canEdit) return;
    const newSet = new Set(selectedRolls);
    filteredList.forEach(u => {
      if (u.status !== 'blocked') newSet.add(Number(u.roll_no));
    });
    onSelectionChange(newSet);
  };

  const handleClearAll = () => {
    if (!canEdit) return;
    onSelectionChange(new Set());
  };

  const handleClearInputAndSelection = () => {
    setScanInput('');
    if (canEdit) {
      onSelectionChange(new Set());
    }
  };

  const handleScanSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const roll = parseInt(scanInput.trim(), 10);
      if (!isNaN(roll)) {
        onScan(Number(roll));
        setScanInput('');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[500px] lg:h-[700px] overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-50 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Directory</h3>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-[10px] font-bold uppercase tracking-widest w-fit">
            <button 
              onClick={() => setUserType('student')}
              className={`px-4 py-2 rounded-lg transition-all ${userType === 'student' ? 'bg-white dark:bg-slate-700 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Students
            </button>
            <button 
              onClick={() => setUserType('faculty')}
              className={`px-4 py-2 rounded-lg transition-all ${userType === 'faculty' ? 'bg-white dark:bg-slate-700 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Faculty
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-medium dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-varsity-navy dark:hover:text-varsity-gold transition-all hidden sm:block">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {canEdit && (
          <div className="flex flex-col sm:flex-row items-center gap-2">
             <div className="relative flex-1 w-full">
               <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
               <input 
                 className="w-full pl-10 pr-10 py-3 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-50 dark:border-emerald-900/30 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 outline-none transition-all placeholder:text-emerald-300 dark:placeholder:text-emerald-800"
                 placeholder="Manual Roll Code"
                 value={scanInput}
                 onChange={e => setScanInput(e.target.value)}
                 onKeyDown={handleScanSubmit}
               />
               {scanInput && (
                 <button 
                    onClick={() => setScanInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                 >
                    <X className="w-4 h-4" />
                 </button>
               )}
             </div>
             <div className="flex gap-1 w-full sm:w-auto justify-end">
                <button 
                  onClick={handleClearInputAndSelection} 
                  title="Clear Selection & Input"
                  className="px-3 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={handleSelectAll} className="px-3 py-3 bg-varsity-navy text-white rounded-2xl text-[10px] font-bold uppercase hover:bg-slate-800 transition-all">All</button>
                <button onClick={handleClearAll} className="px-3 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-bold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Reset</button>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
        {filteredList.map(u => {
          const rollNum = Number(u.roll_no);
          const isSelected = selectedRolls.has(rollNum);
          const isBlocked = u.status === 'blocked';
          
          return (
            <div 
              key={u.id}
              onClick={() => !isBlocked && toggleSelection(rollNum)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group select-none ${
                isSelected 
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 dark:border-emerald-500 shadow-md shadow-emerald-50 dark:shadow-none translate-x-1' 
                  : isBlocked 
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 border-transparent dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm transition-all ${
                  isSelected ? 'bg-emerald-500 text-white scale-110 rotate-3' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:bg-white dark:group-hover:bg-slate-700'
                }`}>
                  {u.roll_no}
                </div>
                <div>
                  <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>{u.name}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                    {isSelected ? 'Marked Present' : isBlocked ? 'Access Restricted' : 'Mark as Absent'}
                  </div>
                </div>
              </div>
              <div className={`transition-all duration-300 ${isSelected ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-200 dark:text-slate-800 group-hover:text-slate-300 dark:group-hover:text-slate-700'}`}>
                 {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Square className="w-6 h-6" />}
              </div>
            </div>
          );
        })}
        {filteredList.length === 0 && (
          <div className="text-center py-20">
             <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-slate-200 dark:text-slate-700" />
             </div>
             <p className="text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">No matching records</p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-100 dark:bg-slate-800/40 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex justify-between items-center transition-colors">
        <span>Selected: {selectedRolls.size} / {filteredList.length}</span>
        <span>Registry Capacity: {currentList.length}</span>
      </div>
    </div>
  );
};
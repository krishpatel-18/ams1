
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../constants';
import { UserProfile, AttendanceRecord } from '../types';
import { Modal } from './Modal';
import { 
  Users, Search, Plus, Edit2, ShieldAlert, ShieldCheck, 
  Trash2, UserX, UserCheck, Loader2, Save, X, MoreVertical,
  Mail, Hash, BadgeCheck, GraduationCap, Settings2,
  CheckSquare, Square, Check, Ban, AlertCircle, FileBarChart
} from 'lucide-react';

interface UserManagementProps {
  onUpdate: () => void;
  addNotification: (title: string, message: string, type: 'success' | 'update' | 'error') => void;
  records: AttendanceRecord[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUpdate, addNotification, records }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<Partial<UserProfile> | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
    } catch (err: any) {
      addNotification('Error', err.message, 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const studentStats = useMemo(() => {
    const stats: Record<number, { present: number, absent: number, pct: number }> = {};
    if (!records) return stats;
    
    records.forEach(r => {
      r.attendance_details?.forEach(d => {
         const roll = Number(d.student_roll);
         if(!stats[roll]) stats[roll] = {present: 0, absent: 0, pct: 0};
         if(d.status === 'P') stats[roll].present++;
         else stats[roll].absent++;
      });
    });
    Object.keys(stats).forEach(k => {
      const roll = Number(k);
      const total = stats[roll].present + stats[roll].absent;
      stats[roll].pct = total ? Math.round((stats[roll].present / total) * 100) : 0;
    });
    return stats;
  }, [records]);

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser({
      role: 'student',
      status: 'active',
      full_name: '',
      email: '',
      roll_no: 0
    });
    setIsModalOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setModalMode('edit');
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const toggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id);
      
      if (error) throw error;
      
      addNotification(
        'User Updated', 
        `${user.full_name} is now ${newStatus}`, 
        newStatus === 'active' ? 'success' : 'update'
      );
      fetchUsers();
    } catch (err: any) {
      addNotification('Status Error', err.message, 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);

    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from('users').insert({
          ...selectedUser,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        addNotification('User Created', `${selectedUser.full_name} added to database`, 'success');
      } else {
        const { error } = await supabase
          .from('users')
          .update(selectedUser)
          .eq('id', selectedUser.id);
        if (error) throw error;
        addNotification('User Updated', `Profile saved for ${selectedUser.full_name}`, 'success');
      }
      
      setIsModalOpen(false);
      fetchUsers();
      onUpdate();
    } catch (err: any) {
      addNotification('Form Error', err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = (users || []).filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.roll_no?.toString().includes(searchTerm)
  );

  const toggleUserSelection = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUserIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'blocked') => {
    if (selectedUserIds.size === 0) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .in('id', Array.from(selectedUserIds));
      
      if (error) throw error;
      
      addNotification(
        'Bulk Update Success',
        `${selectedUserIds.size} users marked as ${newStatus}`,
        'success'
      );
      setSelectedUserIds(new Set());
      await fetchUsers();
      onUpdate();
    } catch (err: any) {
      addNotification('Bulk Update Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px] transition-colors relative">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-3">
             <FileBarChart className="w-6 h-6 text-indigo-500" />
             Student Attendance Report
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Comprehensive academic performance & access control</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
             <input 
               type="text" 
               placeholder="Search directory..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
             />
          </div>
          <button 
            onClick={handleCreateUser}
            className="px-6 py-3 bg-varsity-navy text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-navy-100 dark:shadow-black"
          >
            <Plus className="w-4 h-4" /> New Account
          </button>
        </div>
      </div>

      {selectedUserIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-8 py-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
             <div className="flex items-center justify-center w-8 h-8 bg-indigo-500 text-white rounded-lg text-xs font-bold">
               {selectedUserIds.size}
             </div>
             <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Users Selected for Bulk Action</span>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => handleBulkStatusChange('active')}
               className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm"
             >
               <Check className="w-3.5 h-3.5" /> Activate
             </button>
             <button 
               onClick={() => handleBulkStatusChange('blocked')}
               className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 shadow-sm"
             >
               <Ban className="w-3.5 h-3.5" /> Block
             </button>
             <button 
               onClick={() => setSelectedUserIds(new Set())}
               className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
             >
               Cancel
             </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] sticky top-0 z-10">
            <tr>
              <th className="px-8 py-4 w-12">
                <button 
                  onClick={toggleAllSelection}
                  className="flex items-center justify-center p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4">Roll No</th>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-4 py-4 text-center text-emerald-600 dark:text-emerald-400">Pres</th>
              <th className="px-4 py-4 text-center">%</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-8 py-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                   <Loader2 className="w-10 h-10 text-slate-200 dark:text-slate-800 animate-spin mx-auto mb-4" />
                   <span className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Accessing Directory...</span>
                </td>
              </tr>
            ) : filteredUsers.map(u => {
              const isStudent = u.role === 'student';
              const stats = isStudent && u.roll_no ? studentStats[u.roll_no] : null;

              return (
              <tr 
                key={u.id} 
                className={`group transition-colors ${selectedUserIds.has(u.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}
              >
                <td className="px-8 py-5">
                  <button 
                    onClick={() => toggleUserSelection(u.id)}
                    className="flex items-center justify-center p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {selectedUserIds.has(u.id) ? (
                      <CheckSquare className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-5">
                   <div className="flex flex-col gap-1">
                      {isStudent ? (
                        <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">#{u.roll_no}</span>
                      ) : (
                        <span className={`w-fit px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                           u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                           'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                          {u.role}
                        </span>
                      )}
                   </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shadow-sm border ${
                      u.status === 'blocked' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-300 border-rose-100 dark:border-rose-900/30' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 group-hover:text-indigo-500'
                    }`}>
                      {u.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${u.status === 'blocked' ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>{u.full_name}</div>
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                  {stats ? stats.present : '-'}
                </td>
                <td className="px-4 py-5 text-center">
                   {stats ? (
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight ${
                        stats.pct >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                        stats.pct >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                        'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                         {stats.pct}%
                      </span>
                   ) : '-'}
                </td>
                <td className="px-6 py-5">
                   <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                      {u.status}
                   </div>
                </td>
                <td className="px-8 py-5 text-right">
                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditUser(u)}
                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:border-indigo-100 dark:hover:border-indigo-900 rounded-xl transition-all shadow-sm"
                      >
                         <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u)}
                        className={`p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm ${
                          u.status === 'active' ? 'text-rose-400 hover:text-rose-600 hover:border-rose-100 dark:hover:border-rose-900' : 'text-emerald-400 hover:text-emerald-600 hover:border-emerald-100 dark:hover:border-emerald-900'
                        }`}
                        title={u.status === 'active' ? 'Block Access' : 'Unblock Access'}
                      >
                         {u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                   </div>
                </td>
              </tr>
            );
            })}
            {!loading && filteredUsers.length === 0 && (
               <tr>
                 <td colSpan={8} className="py-20 text-center">
                    <p className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">No matching profiles found</p>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
         <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Secure Admin Control Panel</span>
         <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{filteredUsers.length} Users Listed</span>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Institutional Profile' : 'Edit Access Profile'}
      >
        <form onSubmit={handleSave} className="p-8 space-y-6 dark:bg-slate-900 transition-colors">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Access Role</label>
                 <select 
                   required
                   value={selectedUser?.role || 'student'}
                   onChange={e => setSelectedUser({...selectedUser!, role: e.target.value as any})}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all appearance-none"
                 >
                   <option value="student">Student</option>
                   <option value="faculty">Faculty</option>
                   <option value="admin">Administrator</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Initial Status</label>
                 <select 
                   required
                   value={selectedUser?.status || 'active'}
                   onChange={e => setSelectedUser({...selectedUser!, status: e.target.value as any})}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all appearance-none"
                 >
                   <option value="active">Active</option>
                   <option value="blocked">Blocked</option>
                 </select>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Full Legal Name</label>
              <div className="relative group">
                 <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                 <input 
                   type="text" 
                   required
                   value={selectedUser?.full_name || ''}
                   onChange={e => setSelectedUser({...selectedUser!, full_name: e.target.value})}
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                   placeholder="John Doe"
                 />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Institutional Email</label>
              <div className="relative group">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                 <input 
                   type="email" 
                   required
                   value={selectedUser?.email || ''}
                   onChange={e => setSelectedUser({...selectedUser!, email: e.target.value})}
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                   placeholder="id@university.edu"
                 />
              </div>
           </div>

           {selectedUser?.role === 'student' && (
             <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Registry Roll Number</label>
                <div className="relative group">
                   <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                   <input 
                     type="number" 
                     required
                     value={selectedUser?.roll_no || ''}
                     onChange={e => setSelectedUser({...selectedUser!, roll_no: parseInt(e.target.value)})}
                     className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                     placeholder="2025001"
                   />
                </div>
             </div>
           )}

           <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex gap-4">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Discard
              </button>
              <button 
                type="submit" 
                disabled={formLoading}
                className="flex-[2] py-4 bg-varsity-navy dark:bg-varsity-navy text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 dark:hover:bg-slate-950 shadow-xl shadow-navy-100 dark:shadow-black transition-all flex items-center justify-center gap-2"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Registry
              </button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

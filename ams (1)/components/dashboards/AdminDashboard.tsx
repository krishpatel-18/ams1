import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, Student } from '../../types';
import { supabase } from '../../constants';
import { Header } from '../Header';
import { Users, Shield, BookOpen, Search, UserX, CheckCircle, Plus, Edit, Save } from 'lucide-react';
import { RecordsTable } from '../RecordsTable';
import { Modal } from '../Modal';

interface Props {
  user: UserProfile;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const AdminDashboard: React.FC<Props> = ({ user, onLogout, darkMode, setDarkMode }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all users for management
    const { data: uData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (uData) setUsers(uData as UserProfile[]);

    // Fetch records for overview
    const { data: rData } = await supabase
      .from('attendance_records')
      .select('*, attendance_details(*)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (rData) setRecords(rData as any);

    // Fetch students for RecordsTable
    const { data: sData } = await supabase.from('students').select('*').order('roll_no');
    if (sData) setStudents(sData);
  };

  const handleCreateUser = () => {
    setEditingUser({ role: 'student', status: 'active', full_name: '', email: '', roll_no: 0 });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (modalMode === 'create') {
        // Create new user profile
        // Note: This only creates the profile record. Auth user creation should happen separately or via trigger.
        const newUser = {
          ...editingUser,
          id: crypto.randomUUID(), // In a real app, this ID comes from Auth
          created_at: new Date().toISOString()
        };
        
        const { error } = await supabase.from('users').insert(newUser);
        if (error) throw error;
        alert('User profile created successfully. (Ensure Auth account exists)');
      } else {
        // Update existing
        const { error } = await supabase
          .from('users')
          .update(editingUser)
          .eq('id', editingUser.id);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Error saving user: ' + err.message);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (error) {
      alert('Error updating status');
    } else {
      fetchData();
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.roll_no?.toString().includes(searchTerm))
  );

  const studentsCount = users.filter(u => u.role === 'student').length;
  const facultyCount = users.filter(u => u.role === 'faculty').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        title="Admin Console" 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'overview' ? 'border-b-2 border-varsity-red text-varsity-red' : 'text-slate-400'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'users' ? 'border-b-2 border-varsity-red text-varsity-red' : 'text-slate-400'}`}
          >
            User Management
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-varsity-navy">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Students</p>
                    <h2 className="text-3xl font-display font-bold text-slate-800">{studentsCount}</h2>
                  </div>
                  <Users className="w-8 h-8 text-slate-200" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-varsity-red">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Faculty</p>
                    <h2 className="text-3xl font-display font-bold text-slate-800">{facultyCount}</h2>
                  </div>
                  <BookOpen className="w-8 h-8 text-slate-200" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-varsity-gold">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">System Status</p>
                    <h2 className="text-xl font-display font-bold text-emerald-600">Active</h2>
                  </div>
                  <Shield className="w-8 h-8 text-slate-200" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-display font-bold text-lg mb-4">Recent Class Records</h3>
              <RecordsTable 
                records={records} 
                students={students}
                userRole="admin" 
                onDelete={fetchData} 
                onEdit={() => {}} 
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-display font-bold text-lg">User Directory</h3>
              
              <div className="flex w-full md:w-auto gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-varsity-navy outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleCreateUser}
                  className="bg-varsity-navy text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Name / Email</th>
                    <th className="px-4 py-3 text-left">Roll No</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase 
                          ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                            u.role === 'faculty' ? 'bg-amber-100 text-amber-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">{u.full_name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {u.role === 'student' ? u.roll_no : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {u.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleEditUser(u)}
                                className="p-2 rounded hover:bg-slate-200 text-slate-500 hover:text-varsity-navy"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => toggleUserStatus(u)}
                                className={`p-2 rounded hover:bg-slate-200 ${u.status === 'blocked' ? 'text-emerald-600' : 'text-red-500'}`}
                                title={u.status === 'blocked' ? 'Activate' : 'Block'}
                            >
                                {u.status === 'blocked' ? <CheckCircle className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add New User' : 'Edit User'}
      >
        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                    <select 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        value={editingUser?.role}
                        onChange={e => setEditingUser(prev => ({ ...prev!, role: e.target.value as any }))}
                    >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        value={editingUser?.status}
                        onChange={e => setEditingUser(prev => ({ ...prev!, status: e.target.value as any }))}
                    >
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input 
                    type="text" 
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    value={editingUser?.full_name || ''}
                    onChange={e => setEditingUser(prev => ({ ...prev!, full_name: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input 
                    type="email" 
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    value={editingUser?.email || ''}
                    onChange={e => setEditingUser(prev => ({ ...prev!, email: e.target.value }))}
                />
            </div>

            {editingUser?.role === 'student' && (
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Roll Number</label>
                    <input 
                        type="number" 
                        required
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        value={editingUser?.roll_no || ''}
                        onChange={e => setEditingUser(prev => ({ ...prev!, roll_no: parseInt(e.target.value) }))}
                    />
                </div>
            )}

            <div className="pt-4 flex gap-3">
                <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="flex-1 py-2 bg-varsity-navy text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" /> Save User
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};
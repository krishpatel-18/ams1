
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Faculty, AttendanceRecord, UserProfile } from '../types';
import { UserPlus, ClipboardList, Send, Loader2 } from 'lucide-react';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  faculty: Faculty[]; // List of potential assignees
  currentUser: UserProfile;
  onSubmit: (taskData: { assignedTo: string, description: string, assigneeName: string }) => Promise<void>;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({ 
  isOpen, onClose, record, faculty, currentUser, onSubmit 
}) => {
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || !description) return;

    const selectedFaculty = faculty.find(f => f.name === assignedTo); // Matching by name since faculty ID in UserProfile might differ, normally we match by ID
    // Note: In a real app we'd map Faculty ID to User ID. Here we pass the name for UI purposes.
    
    setLoading(true);
    try {
      await onSubmit({
        assignedTo, // Using name/ID logic handled by parent
        assigneeName: assignedTo,
        description
      });
      setDescription('');
      setAssignedTo('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Review Task">
      <div className="p-6 bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="flex items-start gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
           <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500">
             <ClipboardList className="w-5 h-5" />
           </div>
           <div>
             <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{record.lecture_name}</h4>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{record.date} • {record.time_slot}</p>
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Record ID: #{record.id}</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Assign To</label>
            <div className="relative">
               <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <select
                 className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                 value={assignedTo}
                 onChange={(e) => setAssignedTo(e.target.value)}
                 required
               >
                 <option value="">Select Faculty / Admin</option>
                 {faculty.filter(f => f.name !== currentUser.full_name).map(f => (
                   <option key={f.id} value={f.name}>{f.name}</option> // Using name as ID proxy for this demo
                 ))}
               </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Instructions / Reason</label>
            <textarea
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px]"
              placeholder="e.g., Please verify the student count for this session..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={loading}
               className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               Create Task
             </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

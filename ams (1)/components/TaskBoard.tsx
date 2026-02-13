
import React from 'react';
import { ReviewTask } from '../types';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, User } from 'lucide-react';

interface TaskBoardProps {
  tasks: ReviewTask[];
  currentUserId: string;
  onUpdateStatus: (taskId: string, newStatus: ReviewTask['status']) => void;
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'in_progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'rejected': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
};

const getStatusIcon = (status: string) => {
  switch(status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'in_progress': return <Clock className="w-3.5 h-3.5" />;
    case 'rejected': return <AlertCircle className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

interface TaskCardProps {
  task: ReviewTask;
  isOutbound?: boolean;
  onUpdateStatus: (taskId: string, newStatus: ReviewTask['status']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isOutbound, onUpdateStatus }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-3">
      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${getStatusColor(task.status)}`}>
         {getStatusIcon(task.status)}
         {task.status.replace('_', ' ')}
      </div>
      <div className="text-[10px] font-mono text-slate-400">{new Date(task.created_at).toLocaleDateString()}</div>
    </div>
    
    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">{task.record_summary || `Record #${task.record_id}`}</h4>
    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{task.description}</p>
    
    <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
      <div className="flex items-center gap-2">
         <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
           <User className="w-3 h-3" />
         </div>
         <div className="flex flex-col">
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
             {isOutbound ? 'Assigned To' : 'From'}
           </span>
           <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
             {isOutbound ? task.assignee_name : task.creator_name}
           </span>
         </div>
      </div>

      {!isOutbound && task.status !== 'completed' && (
        <div className="flex gap-1">
           <button 
             onClick={() => onUpdateStatus(task.id, 'in_progress')}
             className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-500 rounded-lg transition-colors"
             title="Mark In Progress"
           >
             <Clock className="w-4 h-4" />
           </button>
           <button 
             onClick={() => onUpdateStatus(task.id, 'completed')}
             className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
             title="Mark Complete"
           >
             <CheckCircle2 className="w-4 h-4" />
           </button>
        </div>
      )}
    </div>
  </div>
);

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, currentUserId, onUpdateStatus }) => {
  const myTasks = tasks.filter(t => t.assigned_to === currentUserId || t.assignee_name === currentUserId);
  const outboundTasks = tasks.filter(t => t.assigned_by === currentUserId || t.creator_name === currentUserId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            Tasks for Me
          </h3>
          <span className="text-xs font-bold text-slate-400">{myTasks.length} Pending</span>
        </div>
        <div className="space-y-3">
          {myTasks.length > 0 ? myTasks.map(t => (
            <TaskCard key={t.id} task={t} onUpdateStatus={onUpdateStatus} />
          )) : (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No tasks assigned to you</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-slate-400" />
            Outbound Requests
          </h3>
          <span className="text-xs font-bold text-slate-400">{outboundTasks.length} Active</span>
        </div>
        <div className="space-y-3">
          {outboundTasks.length > 0 ? outboundTasks.map(t => (
            <TaskCard key={t.id} task={t} isOutbound onUpdateStatus={onUpdateStatus} />
          )) : (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active requests sent</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { Edit2, Trash2, Eye, AlertTriangle, CheckCircle2, X, ClipboardList, Flag, ChevronLeft, ChevronRight, UserX, CheckSquare } from 'lucide-react';
import { Modal } from './Modal';

interface RecordsTableProps {
  records: AttendanceRecord[];
  students: Student[];
  userRole: string;
  userRoll?: number;
  onDelete: (id: number) => void;
  onEdit: (r: AttendanceRecord) => void;
  onAssign?: (r: AttendanceRecord) => void;
  totalClassStrength?: number;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({ 
  records, students, userRole, userRoll, onDelete, onEdit, onAssign, totalClassStrength 
}) => {
  const [viewRecordId, setViewRecordId] = useState<number | null>(null);
  const [confirmEditRecord, setConfirmEditRecord] = useState<AttendanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const canEdit = userRole === 'admin' || userRole === 'faculty';
  const canDelete = userRole === 'admin';
  const canAssign = (userRole === 'admin' || userRole === 'faculty') && onAssign;
  const isStudent = userRole === 'student';

  const safeRecords = records || [];
  const safeStudents = students || [];

  const totalPages = Math.ceil(safeRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = safeRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const viewRecord = useMemo(() => {
    return safeRecords.find(r => r.id === viewRecordId) || null;
  }, [safeRecords, viewRecordId]);

  const handleProceedEdit = () => {
    if (confirmEditRecord) {
      onEdit(confirmEditRecord);
      setConfirmEditRecord(null);
    }
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      onDelete(recordToDelete.id);
      setRecordToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const derivedDetails = useMemo(() => {
    if (!viewRecord) return [];
    
    // Deduplicate details by student_roll for display
    const statusMap = new Map<number, string>();
    viewRecord.attendance_details?.forEach(d => {
      statusMap.set(Number(d.student_roll), d.status);
    });

    return safeStudents.map(s => {
      const status = statusMap.get(Number(s.roll_no)) || 'A';
      return {
        student_roll: Number(s.roll_no),
        student_name: s.name,
        status: status as 'P' | 'A'
      };
    }).sort((a, b) => a.student_roll - b.student_roll);
  }, [viewRecord, safeStudents]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-indigo-500" />
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Session History</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{safeRecords.length} Logs Found</span>
      </div>
      
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left min-w-[600px] sm:min-w-0">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-3 py-3 sm:px-6 sm:py-4">Session Info</th>
              <th className="px-3 py-3 sm:px-6 sm:py-4">Topic / Faculty</th>
              <th className="px-3 py-3 sm:px-6 sm:py-4 text-center">Presence</th>
              <th className="px-3 py-3 sm:px-6 sm:py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {paginatedRecords.map(r => {
              const uniquePresent = new Set<number>();
              const uniqueTotalDetails = new Set<number>();
              
              r.attendance_details?.forEach(d => {
                uniqueTotalDetails.add(Number(d.student_roll));
                if (d.status === 'P') uniquePresent.add(Number(d.student_roll));
              });

              const actualPresentCount = uniquePresent.size > 0 ? uniquePresent.size : (r.present_count || 0);
              let actualTotalCount = r.total_count || 0;
              if (actualTotalCount === 0) actualTotalCount = totalClassStrength || safeStudents.length;
              if (uniqueTotalDetails.size > actualTotalCount) actualTotalCount = uniqueTotalDetails.size;
              
              const presencePercentage = actualTotalCount > 0 ? (actualPresentCount / actualTotalCount) * 100 : 0;

              return (
                <tr key={r.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{formatDate(r.date)}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">{r.time_slot || 'Live Session'}</div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-[180px]" title={r.lecture_name}>{r.lecture_name}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[120px] sm:max-w-none">{r.faculty_name}</div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">
                        {actualPresentCount}/{actualTotalCount}
                      </span>
                      <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                         <div className="h-full bg-indigo-400 dark:bg-indigo-500" style={{ width: `${Math.min(100, presencePercentage)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {isStudent ? (
                        <button onClick={() => setViewRecordId(r.id)} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40">
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setViewRecordId(r.id)} className="p-2 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canAssign && (
                            <button onClick={() => onAssign && onAssign(r)} className="p-2 text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 transition-colors" title="Flag for Review">
                              <Flag className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => setConfirmEditRecord(r)} className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors" title="Edit Record">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setRecordToDelete(r)} className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors" title="Delete Record">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {safeRecords.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-50 dark:border-slate-800">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Details Modal */}
      <Modal 
        isOpen={!!viewRecordId} 
        onClose={() => setViewRecordId(null)}
        title="Attendance Details"
      >
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar dark:bg-slate-900 transition-colors">
          {viewRecord && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{viewRecord.lecture_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatDate(viewRecord.date)} • {viewRecord.faculty_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {derivedDetails.filter(d => d.status === 'P').length}
                    <span className="text-slate-400 dark:text-slate-600 text-sm">/{derivedDetails.length}</span>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Present</div>
                </div>
              </div>

              <div className="space-y-2">
                {derivedDetails.map((detail) => (
                  <div key={detail.student_roll} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        detail.status === 'P' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        {detail.student_roll}
                      </div>
                      <span className={`text-sm font-medium ${
                         userRole === 'student' && userRoll === detail.student_roll ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {detail.student_name} {userRole === 'student' && userRoll === detail.student_roll && '(You)'}
                      </span>
                    </div>
                    {detail.status === 'P' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <UserX className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Confirmation Modal */}
      <Modal
        isOpen={!!confirmEditRecord}
        onClose={() => setConfirmEditRecord(null)}
        title="Edit Record?"
      >
        <div className="p-6 text-center space-y-4 dark:bg-slate-900 transition-colors">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <Edit2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You are about to edit the attendance for <strong>{confirmEditRecord?.lecture_name}</strong>.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Current data will be loaded into the form. Unsaved changes in the form will be lost.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setConfirmEditRecord(null)}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleProceedEdit}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              Proceed
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        title="Delete Record?"
      >
        <div className="p-6 text-center space-y-4 dark:bg-slate-900 transition-colors">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete the record for <strong>{recordToDelete?.lecture_name}</strong>?
            </p>
            <p className="text-xs text-rose-500 font-bold mt-2 uppercase tracking-wide">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setRecordToDelete(null)}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmDelete}
              className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
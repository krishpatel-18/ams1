import React, { useState, useEffect, useRef } from 'react';
import { Lecture, Faculty, AttendanceRecord, Student, UserProfile } from '../types';
import { supabase } from '../constants';
import { 
  Save, X, AlertCircle, QrCode as QrIcon, Timer, StopCircle, 
  RefreshCw, CheckCircle2, Users, Loader2, PlayCircle, 
  ShieldCheck, Edit2, Clock, Calendar, CheckSquare, BookOpen,
  Share2
} from 'lucide-react';
import * as QRCode from 'qrcode';
import { Modal } from './Modal';

interface LectureFormProps {
  lectures: Lecture[];
  faculty: Faculty[];
  selectedRolls: Set<number>;
  totalStudents: number;
  students: Student[];
  date: string;
  user: UserProfile;
  onSuccess: () => void;
  editRecord: AttendanceRecord | null;
  onCancelEdit: () => void;
}

export const LectureForm: React.FC<LectureFormProps> = ({
  lectures, faculty, selectedRolls, totalStudents, students, date, user, onSuccess, editRecord, onCancelEdit
}) => {
  const [mode, setMode] = useState<'manual' | 'qr'>('manual');
  const [formData, setFormData] = useState({
    lecture: '',
    type: 'Regular',
    startTime: '',
    endTime: '',
    day: 'Monday',
    facultyName: '',
    isProxy: false,
    originalFaculty: '',
    date: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [batchQrUrl, setBatchQrUrl] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); 
  const [liveCount, setLiveCount] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const countRef = useRef<number | null>(null);

  const TOTAL_SESSION_TIME = 300;

  const safeLectures = lectures || [];
  const safeFaculty = faculty || [];

  useEffect(() => {
    if (editRecord) {
      setFormData({
        lecture: editRecord.lecture_name,
        type: editRecord.lecture_type || 'Regular',
        startTime: editRecord.start_time || '',
        endTime: editRecord.end_time || '',
        day: editRecord.day || 'Monday',
        facultyName: editRecord.faculty_name || '',
        isProxy: editRecord.is_proxy || false,
        originalFaculty: editRecord.original_faculty_name || '',
        date: editRecord.date 
      });
    } else {
      setFormData(prev => ({
        ...prev,
        lecture: safeLectures[0]?.name || '',
        facultyName: user.full_name || safeFaculty[0]?.name || '',
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        date: date 
      }));
    }
  }, [editRecord, safeLectures, safeFaculty, user, date]);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      countRef.current = window.setInterval(async () => {
        const { count } = await supabase
          .from('attendance_details')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_record_id', activeSession.id)
          .eq('status', 'P');
        setLiveCount(count || 0);
      }, 3000);

      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (countRef.current) window.clearInterval(countRef.current);
      };
    }
  }, [activeSession]);

  const handleAutoExpire = async () => {
    setIsExpired(true);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (countRef.current) window.clearInterval(countRef.current);
    if (activeSession) {
      await supabase.from('attendance_records').update({ 
        is_active: false,
        present_count: liveCount,
        end_time: new Date().toLocaleTimeString()
      }).eq('id', activeSession.id);
    }
  };

  const startQrSession = async () => {
    if (!formData.lecture || !formData.facultyName) {
      alert("Please select Lecture and Faculty first.");
      return;
    }

    setLoading(true);
    setIsExpired(false);
    try {
      const token = Math.random().toString(36).substring(2, 15);
      const payload = {
        date: formData.date,
        day: formData.day,
        lecture_name: formData.lecture,
        lecture_type: formData.type,
        faculty_name: formData.facultyName,
        start_time: new Date().toLocaleTimeString(),
        created_by: user.id,
        session_token: token,
        is_active: true,
        present_count: 0,
        total_count: totalStudents,
        is_proxy: formData.isProxy,
        original_faculty_name: formData.isProxy ? formData.originalFaculty : null
      };

      const { data, error } = await supabase.from('attendance_records').insert(payload).select().single();
      if (error) throw error;

      const qrPayload = JSON.stringify({
        rid: data.id,
        t: token,
        l: formData.lecture,
        f: formData.facultyName,
        s_id: user.roll_no,
        exp: Date.now() + (TOTAL_SESSION_TIME * 1000)
      });

      const url = await QRCode.toDataURL(qrPayload, { 
        width: 800, 
        margin: 0, 
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H' 
      });
      
      setQrDataUrl(url);
      setActiveSession(data);
      setTimeLeft(TOTAL_SESSION_TIME);
      setLiveCount(0);
    } catch (err: any) {
      alert(`Error starting session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBatchQr = async () => {
    if (!activeSession) return;
    if (selectedRolls.size === 0) {
      alert("Please select students in the directory first for batch marking.");
      return;
    }

    setLoading(true);
    try {
      const batchPayload = JSON.stringify({
        type: 'batch',
        rid: activeSession.id,
        t: activeSession.session_token,
        l: activeSession.lecture_name,
        rolls: Array.from(selectedRolls),
        ts: Date.now()
      });

      const url = await QRCode.toDataURL(batchPayload, {
        width: 800,
        margin: 1,
        color: { dark: '#059669', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });

      setBatchQrUrl(url);
      setShowBatchModal(true);
    } catch (err: any) {
      alert("Failed to generate Batch QR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    
    setLoading(true);
    try {
      await supabase.from('attendance_records').update({
        is_active: false,
        end_time: new Date().toLocaleTimeString(),
        present_count: liveCount
      }).eq('id', activeSession.id);
      
      setActiveSession(null);
      setQrDataUrl(null);
      setBatchQrUrl(null);
      setIsEnding(false);
      setIsExpired(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error ending session:", err);
    } finally {
      setLoading(false);
    }
  };

  const renewSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    setIsExpired(false);
    try {
      const newToken = Math.random().toString(36).substring(2, 15);
      await supabase.from('attendance_records').update({
        session_token: newToken,
        is_active: true
      }).eq('id', activeSession.id);

      const qrPayload = JSON.stringify({
        rid: activeSession.id,
        t: newToken,
        l: formData.lecture,
        f: formData.facultyName,
        s_id: user.roll_no,
        exp: Date.now() + (TOTAL_SESSION_TIME * 1000)
      });
      const url = await QRCode.toDataURL(qrPayload, { 
        width: 800, 
        margin: 0,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      });
      
      setQrDataUrl(url);
      setTimeLeft(TOTAL_SESSION_TIME);
      
      // Update the activeSession state locally
      setActiveSession({ ...activeSession, session_token: newToken, is_active: true });
    } catch (err) {
      console.error("Renew failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const attendees = students.map(s => ({
        roll: s.roll_no,
        name: s.name,
        status: selectedRolls.has(s.roll_no) ? 'P' : 'A'
      }));
      
      const timeSlot = formData.startTime && formData.endTime ? `${formData.startTime} to ${formData.endTime}` : '';
      const recordPayload = {
        date: formData.date, 
        day: formData.day,
        time_slot: timeSlot,
        start_time: formData.startTime,
        end_time: formData.endTime,
        lecture_name: formData.lecture,
        lecture_type: formData.type,
        faculty_name: formData.facultyName,
        is_proxy: formData.isProxy,
        original_faculty_name: formData.isProxy ? formData.originalFaculty : null,
        present_count: selectedRolls.size,
        total_count: attendees.length,
        created_by: user.id
      };

      let recordId = editRecord?.id;
      if (editRecord) {
        const { error: deleteError } = await supabase.from('attendance_details').delete().eq('attendance_record_id', recordId);
        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase.from('attendance_records').update(recordPayload).eq('id', recordId);
        if (updateError) throw updateError;
      } else {
        const { data, error } = await supabase.from('attendance_records').insert(recordPayload).select().single();
        if (error) throw error;
        recordId = data.id;
      }

      const details = attendees.map(a => ({
        attendance_record_id: recordId,
        student_roll: a.roll,
        student_name: a.name,
        status: a.status
      }));

      const { error: insertError } = await supabase.from('attendance_details').insert(details);
      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      alert(`Error Processing Registry: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (activeSession && qrDataUrl) {
    const progress = (timeLeft / TOTAL_SESSION_TIME) * 100;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-black border border-slate-100 dark:border-slate-800 p-8 text-center animate-in zoom-in duration-500 flex flex-col items-center min-h-[500px]">
        <div className="w-full flex justify-between items-center mb-8 px-2">
          <div className="text-left">
            <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight uppercase">{formData.lecture}</h3>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
               <span className={`text-[10px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                 {isExpired ? 'Security Token Expired' : 'Active QR Protocol'}
               </span>
            </div>
          </div>
          <div className={`p-2 rounded-2xl transition-colors ${isExpired ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
             <ShieldCheck className={`w-6 h-6 ${isExpired ? 'text-rose-500' : 'text-indigo-500 dark:text-indigo-400'}`} />
          </div>
        </div>

        <div className="relative group mb-8 w-full max-w-[320px]">
           <div className={`absolute -inset-4 rounded-[3rem] opacity-10 transition-all duration-700 ${isExpired ? 'bg-rose-500 scale-105' : 'bg-indigo-500 scale-100 dark:bg-indigo-400'}`}></div>
           <div className="relative bg-white p-4 rounded-[2.5rem] shadow-inner border border-slate-50 dark:border-slate-800 overflow-hidden">
             {isExpired ? (
               <div className="w-64 h-64 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500 dark:bg-slate-900">
                  <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 p-6 rounded-full">
                    <StopCircle className="w-12 h-12" />
                  </div>
                  <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocol Timed Out</div>
               </div>
             ) : (
               <img src={qrDataUrl} alt="Session QR" className="w-64 h-64 object-contain mx-auto" />
             )}
             
             <div className="mt-4 flex flex-col gap-1 items-center border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-widest uppercase">NODE_REF: {activeSession.id}</span>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-widest uppercase">FACULTY: {activeSession.faculty_name}</span>
             </div>
           </div>
           
           {!isExpired && (
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${timeLeft < 60 ? 'bg-rose-500' : 'bg-varsity-navy dark:bg-varsity-gold'}`} 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
           )}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className={`bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all ${timeLeft < 60 && !isExpired ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20' : ''}`}>
             <div className="text-slate-400 dark:text-slate-500 mb-2 flex justify-center">
                {isExpired ? <X className="w-5 h-5 text-rose-500" /> : <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'text-rose-500' : ''}`} />}
             </div>
             <div className={`text-3xl font-display font-bold ${isExpired ? 'text-slate-300 dark:text-slate-700' : timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-slate-100'}`}>
               {isExpired ? '00:00' : `${mins}:${secs.toString().padStart(2, '0')}`}
             </div>
             <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-tighter">Remaining Window</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
             <div className="text-slate-400 dark:text-slate-500 mb-2 flex justify-center"><Users className="w-5 h-5" /></div>
             <div className="text-3xl font-display font-bold text-emerald-500 dark:text-emerald-400">{liveCount}</div>
             <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-tighter">Live Attendance</div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3 mt-auto">
          <div className="flex gap-3">
            <button 
              onClick={renewSession}
              disabled={loading}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {isExpired ? 'Restart' : 'Renew'}
            </button>
            <button 
              onClick={generateBatchQr}
              disabled={loading || isExpired}
              className="flex-1 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2"
            >
              <CheckSquare className="w-4 h-4" /> Batch QR
            </button>
          </div>
          <button 
            onClick={() => isEnding ? endSession() : setIsEnding(true)}
            disabled={loading}
            className={`w-full py-4.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xl ${
              isEnding ? 'bg-rose-600 text-white animate-bounce' : 'bg-varsity-navy dark:bg-varsity-navy text-white hover:bg-slate-800 dark:hover:bg-slate-950'
            }`}
          >
            {isEnding ? (
              <><StopCircle className="w-4 h-4" /> Confirm End</>
            ) : (
              <><StopCircle className="w-4 h-4" /> Stop Session</>
            )}
          </button>
        </div>
        
        {isEnding && (
          <button 
            onClick={() => setIsEnding(false)}
            className="mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest"
          >
            Cancel
          </button>
        )}

        <Modal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} title="Batch Marking Protocol">
          <div className="p-8 text-center space-y-6 dark:bg-slate-900 transition-colors">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800 inline-block shadow-inner">
               {batchQrUrl && <img src={batchQrUrl} alt="Batch QR" className="w-64 h-64 rounded-xl" />}
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Sync {selectedRolls.size} Students</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium px-4">
                This QR code encodes the manual selection from your directory. Scan with a master device to update records in bulk.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
               <button 
                 onClick={() => setShowBatchModal(false)}
                 className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
               >
                 Close
               </button>
               <button 
                 onClick={() => {
                   if(batchQrUrl) {
                      const link = document.createElement('a');
                      link.href = batchQrUrl;
                      link.download = `batch-qr-${activeSession.id}.png`;
                      link.click();
                   }
                 }}
                 className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none"
               >
                 <Share2 className="w-3.5 h-3.5" /> Save Image
               </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 flex flex-col h-fit sticky top-24 transition-colors ${editRecord ? 'ring-4 ring-indigo-50 dark:ring-indigo-900/30 border-indigo-200 dark:border-indigo-800' : ''}`}>
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
            {editRecord ? <Edit2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> : mode === 'manual' ? <Save className="w-5 h-5 text-slate-400 dark:text-slate-500" /> : <QrIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
            {editRecord ? 'Update Registry' : mode === 'manual' ? 'Standard Log' : 'Secure QR'}
          </h3>
          
          {!editRecord && (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button 
                onClick={() => setMode('manual')}
                className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-white dark:bg-slate-700 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Manual
              </button>
              <button 
                onClick={() => setMode('qr')}
                className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'qr' ? 'bg-white dark:bg-slate-700 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Live
              </button>
            </div>
          )}
        </div>
        
        {editRecord && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-500 flex items-center gap-1.5 shadow-sm">
              <Calendar className="w-3 h-3" />
              Modifying: {editRecord.date}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">({editRecord.day})</span>
          </div>
        )}
      </div>

      <form onSubmit={mode === 'manual' ? handleSubmitManual : (e) => e.preventDefault()} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Session Date</label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="date"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Course / Topic</label>
          <div className="relative group">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all appearance-none" 
              required
              value={formData.lecture}
              onChange={e => {
                const lec = safeLectures.find(l => l.name === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  lecture: e.target.value,
                  startTime: lec?.default_start_time || prev.startTime,
                  endTime: lec?.default_end_time || prev.endTime
                }));
              }}
            >
              <option value="">Select Lecture</option>
              {safeLectures.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Faculty</label>
            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all appearance-none" required
                value={formData.facultyName} onChange={e => setFormData({...formData, facultyName: e.target.value})}>
                <option value="">Select Faculty</option>
                {safeFaculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Session Type</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all appearance-none"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="Regular">Regular Class</option>
              <option value="Proxy">Proxy Session</option>
              <option value="Lab">Practical Lab</option>
            </select>
          </div>
        </div>

        {mode === 'manual' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Start</label>
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-varsity-navy outline-none transition-all" 
                value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">End</label>
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-varsity-navy outline-none transition-all" 
                value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Day</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-varsity-navy outline-none appearance-none transition-all"
                value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} >
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-50 dark:border-slate-700 group transition-all hover:bg-rose-50/30 dark:hover:bg-rose-900/10">
          <CheckSquare className={`w-5 h-5 transition-colors ${formData.isProxy ? 'text-rose-500 dark:text-rose-400' : 'text-slate-200 dark:text-slate-700'}`} />
          <div className="flex-1">
             <label htmlFor="proxyCheck" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight cursor-pointer select-none">Mark as Proxy Lecture</label>
             <input 
               type="checkbox" 
               id="proxyCheck"
               checked={formData.isProxy}
               onChange={e => setFormData({...formData, isProxy: e.target.checked})}
               className="hidden"
             />
          </div>
          <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${formData.isProxy ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`} onClick={() => setFormData({...formData, isProxy: !formData.isProxy})}>
             <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.isProxy ? 'left-6' : 'left-1'}`}></div>
          </div>
        </div>

        {formData.isProxy && (
           <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Original Assignee</label>
            <select className="w-full bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl px-4 py-4 text-sm font-bold text-rose-700 dark:text-rose-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 outline-none transition-all appearance-none" required={formData.isProxy}
                value={formData.originalFaculty} onChange={e => setFormData({...formData, originalFaculty: e.target.value})}>
                <option value="">Select Original Faculty...</option>
                {safeFaculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
        )}

        <div className="pt-8 border-t border-slate-50 dark:border-slate-800 mt-auto space-y-4">
          {mode === 'manual' ? (
            <>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-50 dark:border-slate-700">
                 <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manual Registry</div>
                 <div className="font-display font-bold text-slate-900 dark:text-slate-100 text-2xl">{selectedRolls.size} <span className="text-slate-300 dark:text-slate-600">/</span> {totalStudents}</div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-varsity-navy dark:bg-varsity-navy text-white rounded-[1.5rem] font-bold uppercase tracking-widest shadow-2xl shadow-navy-100 dark:shadow-black hover:bg-slate-800 dark:hover:bg-slate-950 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />} 
                 {editRecord ? 'Save Changes' : 'Process Entry'}
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={startQrSession}
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-varsity-navy to-slate-800 dark:from-varsity-navy dark:to-slate-900 text-white rounded-[1.5rem] font-bold uppercase tracking-widest shadow-2xl shadow-navy-100 dark:shadow-black hover:shadow-navy-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrIcon className="w-5 h-5" />} 
              Start Secure Session
            </button>
          )}
          
          {editRecord && (
            <button 
              type="button" 
              onClick={onCancelEdit}
              className="w-full text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              Discard Changes
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
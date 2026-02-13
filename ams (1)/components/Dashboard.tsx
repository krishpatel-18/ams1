import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, PANEL_KEYS, ADMIN_TABLE, ADMIN_SETTINGS_KEY } from '../constants';
import { UserProfile, Student, Faculty, Lecture, AttendanceRecord, NotificationItem, ReviewTask } from '../types';
import { Header } from './Header';
import { UserList } from './UserList';
import { LectureForm } from './LectureForm';
import { AttendanceReports } from './AttendanceReports';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import { TopRegulars } from './TopRegulars';
import { StatsSummary } from './StatsSummary';
import { ScanLog } from './ScanLog';
import { RecordsTable } from './RecordsTable';
import { NotificationToast } from './NotificationToast';
import { TaskBoard } from './TaskBoard';
import { AssignTaskModal } from './AssignTaskModal';
import { FacultySummary } from './FacultySummary';
import { SystemAudit } from './SystemAudit';
import { 
  Scan, X, Smartphone, AlertTriangle, 
  CheckCircle2, Loader2, Settings2, BookOpen, BarChart3, ClipboardList, Activity,
  ListTodo, ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DashboardProps {
  user: UserProfile;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onLogout: () => void;
}

type TabType = 'attendance' | 'history' | 'tasks' | 'audit';

const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

// Skeleton Component for Content Area
const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="grid grid-cols-2 gap-3">
       <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
       <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
    </div>
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, darkMode, setDarkMode, onLogout }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Split loading states for better UX
  const [isShellLoading, setIsShellLoading] = useState(true); // Blocks Sidebar/Header
  const [isContentLoading, setIsContentLoading] = useState(true); // Blocks Widgets
  
  const [date, setDate] = useState(getLocalDate());
  const [hiddenPanels, setHiddenPanels] = useState<Record<string, boolean>>({});
  
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | 'loading', msg: string } | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<{ lecture: string, faculty: string } | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedRecordForTask, setSelectedRecordForTask] = useState<AttendanceRecord | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isMounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedRolls, setSelectedRolls] = useState<Set<number>>(new Set());
  const [currentEditRecord, setCurrentEditRecord] = useState<AttendanceRecord | null>(null);
  const [scanLog, setScanLog] = useState<{time: string, roll: number, name: string}[]>([]);

  const todaysRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(r => r.date === date);
  }, [records, date]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const addNotification = useCallback((title: string, message: string, type: 'success' | 'update' | 'error') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type }, ...prev].slice(0, 5));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [sRes, fRes, lRes] = await Promise.all([
        supabase.from('students').select('*').order('roll_no', { ascending: true }).limit(500),
        supabase.from('faculty').select('*').order('name', { ascending: true }),
        supabase.from('lectures').select('*').order('name', { ascending: true })
      ]);
        
      if (!isMounted.current) return;

      if (sRes.data) {
        // Dedup students by roll number just in case
        const seen = new Set();
        const uniqueStudents = sRes.data.filter(s => {
          if (seen.has(s.roll_no)) return false;
          seen.add(s.roll_no);
          return true;
        });
        setStudents(uniqueStudents);
      }
      
      if (fRes.data) setFaculty(fRes.data);
      if (lRes.data) setLectures(lRes.data);

    } catch (err: any) {
      console.error("Error fetching initial data:", err.message || err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    if (user.role !== 'admin') return;
    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .order('last_active_at', { ascending: false })
        .limit(100);
      
      if (error || !data) {
          const syntheticUsers: UserProfile[] = [{ ...user, last_active_at: new Date().toISOString() }];
          setAllUsers(syntheticUsers);
          return;
      }
      
      if (isMounted.current) {
        setAllUsers(data as UserProfile[]);
      }
    } catch (err) {
      console.error("Error fetching system audit users:", err);
    }
  }, [user]);

  const fetchRecords = useCallback(async (mode: 'initial' | 'full' = 'full') => {
    if (!isMounted.current) return;
    // We don't set loading state here for 'full' to avoid UI flickering on refreshes
    // 'initial' mode is handled by the Dashboard init logic

    try {
      const query = supabase
        .from('attendance_records')
        .select(`*, attendance_details (student_roll, student_name, status)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (mode === 'initial') {
        query.limit(20); // Slightly larger initial fetch
      } else {
        query.limit(200); 
      }
      
      const { data, error } = await query;
      
      if (!isMounted.current) return;

      if (error) {
         console.warn("Deep fetch failed, trying shallow fetch", error);
         const { data: simpleData } = await supabase
          .from('attendance_records')
          .select('*')
          .order('date', { ascending: false })
          .limit(20);
         if (simpleData && isMounted.current) setRecords(simpleData as AttendanceRecord[]);
      } else if (data) {
        setRecords(data as AttendanceRecord[]);
      }
    } catch (err: any) {
      console.error("Error fetching records:", err.message || err);
    }
  }, []);
  
  const fetchTasks = useCallback(async () => {
    if (user.role === 'student') return;
    try {
      const { data, error } = await supabase
        .from('review_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data && isMounted.current) {
        setTasks(data as ReviewTask[]);
      }
    } catch (err) {
      console.error("Error fetching tasks", err);
    }
  }, [user.role]);

  const loadAdminSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from(ADMIN_TABLE).select('value').eq('key', ADMIN_SETTINGS_KEY).single();
      if (data?.value && isMounted.current) setHiddenPanels(data.value);
    } catch {
      const ls = localStorage.getItem('admin_hidden_panels');
      if (ls && isMounted.current) setHiddenPanels(JSON.parse(ls));
    }
  }, []);

  // Optimized Initialization Sequence
  useEffect(() => {
    const init = async () => {
      try {
        setIsShellLoading(true);
        setIsContentLoading(true);

        // 1. Critical Static Data (Fastest) - Unblocks Header/Sidebar
        await fetchInitialData();
        
        if (isMounted.current) setIsShellLoading(false);

        // 2. Heavy Data (Background)
        const fetchPromises = [
          fetchTasks(),
          loadAdminSettings(),
          fetchRecords('initial')
        ];

        await Promise.all(fetchPromises);
        
        if (isMounted.current) {
          setIsContentLoading(false);
          // 3. Defer Full History Fetch
          setTimeout(() => fetchRecords('full'), 1500);
        }
      } catch (e: any) {
        console.error("Dashboard init error:", e);
        if (isMounted.current) {
            setIsShellLoading(false);
            setIsContentLoading(false);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
     if (user.role === 'admin' && !isShellLoading) {
         fetchAllUsers();
     }
  }, [user.role, isShellLoading]);

  // Realtime Subscriptions
  useEffect(() => {
    const handleRealtimeUpdate = async () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            if (isMounted.current) {
              fetchRecords('full'); 
              fetchTasks();
            }
        }, 1500);
    };

    const channel = supabase
      .channel('ams_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_details' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_tasks' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      stopScanner();
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssignTask = (r: AttendanceRecord) => {
    setSelectedRecordForTask(r);
    setIsTaskModalOpen(true);
  };
  
  const handleCreateTask = async (taskData: { assignedTo: string, assigneeName: string, description: string }) => {
    if (!selectedRecordForTask) return;
    try {
      const payload = {
        record_id: selectedRecordForTask.id,
        assigned_by: user.full_name || user.id, 
        assigned_to: taskData.assigneeName, 
        creator_name: user.full_name,
        assignee_name: taskData.assigneeName,
        status: 'pending',
        description: taskData.description,
        record_summary: `${selectedRecordForTask.lecture_name} (${selectedRecordForTask.date})`,
        created_at: new Date().toISOString()
      };
      // @ts-ignore
      const { error } = await supabase.from('review_tasks').insert(payload);
      if (error) throw error;
      addNotification('Task Assigned', `Review requested from ${taskData.assigneeName}`, 'success');
      fetchTasks();
    } catch (err: any) {
       addNotification('Assignment Failed', err.message, 'error');
    }
  };
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: ReviewTask['status']) => {
    try {
      const { error } = await supabase
        .from('review_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      addNotification('Status Updated', `Task marked as ${newStatus.replace('_', ' ')}`, 'update');
      fetchTasks();
    } catch (err: any) {
      addNotification('Update Failed', err.message, 'error');
    }
  };

  const stopScanner = useCallback(async () => {
    if (isStartingRef.current) {
        isStartingRef.current = false;
        setIsScanning(false);
        return;
    }

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e: any) {
        if (!e?.message?.includes("not running")) {
            console.warn("Scanner stop warning:", e);
        }
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (user.role !== 'student' || !user.roll_no) {
      setScanStatus({ type: 'error', msg: "Only students can scan." });
      return;
    }
    try {
      setScanStatus({ type: 'loading', msg: "Verifying session..." });
      if (scannerRef.current) {
         try { await scannerRef.current.pause(true); } catch(e){}
      }

      let payload;
      try { payload = JSON.parse(decodedText); } catch (e) { throw new Error("Invalid QR Code."); }
      
      const { rid, t, l, f, exp } = payload;
      
      if (exp && Date.now() > exp) throw new Error("QR Code Expired.");

      const { data: record, error: recordErr } = await supabase.from('attendance_records').select('*').eq('id', rid).single();
      
      if (recordErr || !record) throw new Error("Session not found.");
      if (!record.is_active) throw new Error("Session Closed.");
      if (record.session_token !== t) throw new Error("Security Token Mismatch.");

      const { error: insertErr } = await supabase.from('attendance_details').insert({
        attendance_record_id: record.id,
        student_roll: user.roll_no,
        student_name: user.full_name,
        status: 'P',
        timestamp: new Date().toISOString()
      });

      if (insertErr) {
        if (insertErr.code === '23505') throw new Error("Already Checked In!");
        throw insertErr;
      }

      setScanStatus({ type: 'success', msg: `Present: ${l}` });
      setShowSuccessOverlay({ lecture: l, faculty: f });
      fetchRecords('full');
      
      setTimeout(() => stopScanner(), 1500);
    } catch (err: any) {
      setScanStatus({ type: 'error', msg: err.message || "Scan Failed." });
      if (scannerRef.current) {
        try { await scannerRef.current.resume(); } catch(e){}
      }
    }
  }, [user, stopScanner, fetchRecords]);

  const startScanner = async () => {
    if (isStartingRef.current || isScanning) return;
    
    setIsScanning(true);
    setScanStatus(null);
    isStartingRef.current = true;

    setTimeout(async () => {
      if (!isStartingRef.current) return;
      
      try {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            try { await scannerRef.current.clear(); } catch {}
            scannerRef.current = null;
        }

        const newScanner = new Html5Qrcode("scanner-region");
        scannerRef.current = newScanner;

        await newScanner.start(
          { facingMode: "environment" },
          { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0 
          },
          onScanSuccess,
          () => {} 
        );
      } catch (err: any) {
        console.error("Scanner Start Error:", err);
        let errorMsg = "Camera unavailable.";
        if (err?.name === 'NotAllowedError') errorMsg = "Permission Denied.";
        if (err?.name === 'NotFoundError') errorMsg = "No Camera Found.";
        
        setScanStatus({ type: 'error', msg: errorMsg });
        setIsScanning(false);
      } finally {
        isStartingRef.current = false;
      }
    }, 300);
  };

  const handleScan = (roll: number) => {
    if (user.role === 'student') return; 
    const student = students.find(s => Number(s.roll_no) === Number(roll));
    if (student) {
      setSelectedRolls(prev => {
         const next = new Set(prev);
         next.add(Number(roll));
         return next;
      });
      setScanLog(prev => [{ time: new Date().toLocaleTimeString(), roll, name: student.name }, ...prev].slice(0, 50));
    }
  };

  const handleNewSessionClick = () => {
    setCurrentEditRecord(null);
    setSelectedRolls(new Set());
    setActiveTab('attendance');
  };

  const isVisible = (key: string) => user.role === 'admin' || !hiddenPanels[key];

  const handleEditRequest = (r: AttendanceRecord) => {
    if (user.role === 'student') return;
    setCurrentEditRecord(r); 
    const present = new Set<number>(); 
    if (r.attendance_details) {
      r.attendance_details.forEach(d => {
        if (d.status === 'P') present.add(Number(d.student_roll));
      });
    }
    setSelectedRolls(present); 
    setActiveTab('attendance'); 
    window.scrollTo({top: 0, behavior:'smooth'});
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      const { error: dError } = await supabase.from('attendance_details').delete().eq('attendance_record_id', id);
      if (dError) throw dError;
      const { error: rError } = await supabase.from('attendance_records').delete().eq('id', id);
      if (rError) throw rError;
      addNotification('Deleted', 'Record removed successfully.', 'success');
      fetchRecords('full');
    } catch (err: any) {
      addNotification('Error', err.message, 'error');
    }
  };

  // 1. Initial Shell Loading State
  if (isShellLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-varsity-navy dark:text-varsity-gold mx-auto" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading AMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col font-sans transition-colors duration-500 animate-in fade-in slide-in-from-bottom-4">
      <Header 
        user={user} 
        title="AMS PORTAL" 
        date={date} 
        setDate={setDate} 
        onLogout={onLogout} 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
      
      <AssignTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        record={selectedRecordForTask}
        faculty={faculty}
        currentUser={user}
        onSubmit={handleCreateTask}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 relative">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-varsity-navy dark:bg-varsity-navy rounded-2xl flex items-center justify-center shadow-lg shadow-navy-100 dark:shadow-black mb-6 rotate-3 transition-transform group-hover:rotate-6">
                 {user.role === 'student' && <Smartphone className="w-7 h-7 text-white" />}
                 {user.role === 'faculty' && <BookOpen className="w-7 h-7 text-white" />}
                 {user.role === 'admin' && <Settings2 className="w-7 h-7 text-white" />}
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase leading-none mb-2">
                {user.role === 'student' ? 'Student' : user.role === 'faculty' ? 'Faculty' : 'Admin'}
                <br/>
                <span className="text-varsity-red">Panel</span>
              </h2>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-8 leading-relaxed">
                {user.role === 'student' 
                  ? 'Scan secure QR codes or view your attendance history.' 
                  : user.role === 'faculty' 
                    ? 'Manage sessions, generate QR codes & track students.' 
                    : 'System administration, user management & audit logs.'}
              </p>
              {user.role === 'student' ? (
                 <div className="space-y-3">
                    <button 
                      onClick={() => { setActiveTab('attendance'); startScanner(); }}
                      disabled={isScanning && activeTab === 'attendance'}
                      className={`w-full py-5 bg-varsity-red text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-100 dark:shadow-none hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-[0.95] ${activeTab !== 'attendance' ? 'opacity-50 hover:opacity-100' : ''}`}
                    >
                      <Scan className="w-5 h-5" /> {isScanning && activeTab === 'attendance' ? 'Camera Active' : 'Scan QR'}
                    </button>
                    <button 
                      onClick={() => { stopScanner(); setActiveTab('history'); }}
                      className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${activeTab === 'history' ? 'bg-varsity-navy text-white shadow-xl shadow-navy-100 dark:shadow-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      <ClipboardList className="w-4 h-4" /> Session Archive
                    </button>
                 </div>
              ) : (
                <div className="space-y-3">
                  <button 
                    onClick={handleNewSessionClick}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${activeTab === 'attendance' ? 'bg-varsity-navy text-white shadow-xl shadow-navy-100 dark:shadow-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <BookOpen className="w-4 h-4" /> New Session
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${activeTab === 'history' ? 'bg-varsity-navy text-white shadow-xl shadow-navy-100 dark:shadow-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <BarChart3 className="w-4 h-4" /> View Records
                  </button>
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${activeTab === 'tasks' ? 'bg-varsity-navy text-white shadow-xl shadow-navy-100 dark:shadow-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <ListTodo className="w-4 h-4" /> Review Tasks
                  </button>
                  {user.role === 'admin' && (
                    <button 
                        onClick={() => setActiveTab('audit')}
                        className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${activeTab === 'audit' ? 'bg-varsity-navy text-white shadow-xl shadow-navy-100 dark:shadow-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> System Audit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
             {/* Show Stats Summary immediately even if empty, it updates when records arrive */}
             <StatsSummary date={date} records={records} studentsCount={students.length} />
          </div>
          {user.role !== 'student' && <ScanLog log={scanLog} />}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* 2. Skeleton Loading State for Widgets */}
          {isContentLoading ? (
             <DashboardSkeleton />
          ) : (
            <>
            {user.role === 'student' ? (
              <div className="space-y-6">
                {activeTab === 'attendance' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="max-w-xl mx-auto space-y-6">
                        {isScanning && (
                          <div className="bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-900 relative aspect-square w-full animate-in zoom-in duration-300">
                             <div id="scanner-region" className="w-full h-full"></div>
                             <button 
                               onClick={stopScanner} 
                               className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all z-20"
                               aria-label="Close Scanner"
                             >
                               <X className="w-6 h-6" />
                             </button>
                          </div>
                        )}

                        {!isScanning && !scanStatus && (
                           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 text-center space-y-4 shadow-sm animate-in fade-in duration-500">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
                                 <Scan className="w-8 h-8" />
                              </div>
                              <div>
                                 <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Protocol Ready</h3>
                                 <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Initiate scan to mark presence</p>
                              </div>
                           </div>
                        )}
                        
                        {scanStatus && (
                          <div className={`p-6 rounded-[2rem] text-center animate-in fade-in slide-in-from-bottom-4 ${
                            scanStatus.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' : 
                            scanStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                            'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'
                          }`}>
                             <div className="flex flex-col items-center gap-2">
                                {scanStatus.type === 'loading' && <Loader2 className="w-6 h-6 animate-spin" />}
                                {scanStatus.type === 'error' && <AlertTriangle className="w-6 h-6" />}
                                {scanStatus.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                                <span className="font-bold uppercase tracking-widest text-xs">{scanStatus.msg}</span>
                             </div>
                          </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-4">
                       <div className="flex items-center gap-3 px-2">
                          <Activity className="w-5 h-5 text-varsity-red" />
                          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Today's Pulse</h3>
                       </div>
                       <RecordsTable 
                          records={todaysRecords} 
                          students={students}
                          userRole={user.role}
                          userRoll={user.roll_no}
                          onDelete={handleDeleteRecord}
                          onEdit={handleEditRequest}
                          onAssign={handleAssignTask}
                       />
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex items-center gap-3 px-2">
                        <ClipboardList className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Session Archive</h3>
                     </div>

                     <TopRegulars records={records} students={students} />
                     <AttendanceHeatmap records={records} students={students} isHidden={false} />
                     <FacultySummary records={records} faculty={faculty} />

                     <RecordsTable 
                        records={records} 
                        students={students}
                        userRole={user.role}
                        userRoll={user.roll_no}
                        onDelete={handleDeleteRecord}
                        onEdit={handleEditRequest}
                        onAssign={handleAssignTask}
                     />
                  </div>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'tasks' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <TaskBoard tasks={tasks} currentUserId={user.full_name || user.id} onUpdateStatus={handleUpdateTaskStatus} />
                  </div>
                )}
                {activeTab === 'attendance' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                      <UserList 
                        students={students} faculty={faculty}
                        selectedRolls={selectedRolls} onSelectionChange={setSelectedRolls}
                        onScan={handleScan} canEdit={true}
                      />
                      <div className="space-y-8">
                         <LectureForm 
                           lectures={lectures} faculty={faculty}
                           selectedRolls={selectedRolls} totalStudents={students.length}
                           students={students} date={date} user={user}
                           onSuccess={() => { addNotification('Registry Updated', 'Attendance recorded.', 'success'); handleNewSessionClick(); fetchRecords('full'); }}
                           editRecord={currentEditRecord} onCancelEdit={handleNewSessionClick}
                         />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                         <Activity className="w-5 h-5 text-varsity-red" />
                         <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Today's Sessions</h3>
                      </div>
                      <RecordsTable records={todaysRecords} students={students} userRole={user.role} userRoll={user.roll_no} onDelete={handleDeleteRecord} onEdit={handleEditRequest} onAssign={handleAssignTask} />
                    </div>
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                     <FacultySummary records={records} faculty={faculty} />
                     <TopRegulars records={records} students={students} />
                     <AttendanceHeatmap records={records} students={students} isHidden={false} />

                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                       {isVisible(PANEL_KEYS.REPORTS) && <AttendanceReports records={records} students={students} faculty={faculty} hiddenPanels={hiddenPanels} userRole={user.role} />}
                     </div>
                     {isVisible(PANEL_KEYS.RECORDS) && (
                        <div className="space-y-4 mt-8">
                           <div className="flex items-center gap-3 px-2">
                              <ClipboardList className="w-5 h-5 text-indigo-500" />
                              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Full Session Archive</h3>
                           </div>
                           <RecordsTable records={records} students={students} userRole={user.role} userRoll={user.roll_no} onDelete={handleDeleteRecord} onEdit={handleEditRequest} onAssign={handleAssignTask} />
                        </div>
                     )}
                  </div>
                )}
                {activeTab === 'audit' && user.role === 'admin' && (
                   <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <SystemAudit 
                         admin={user} 
                         records={records} 
                         students={students} 
                         allUsers={allUsers}
                      />
                   </div>
                )}
              </>
            )}
            </>
          )}
        </div>
      </main>

      {showSuccessOverlay && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 border border-slate-100 dark:border-slate-800">
              <div className="p-10 text-center space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/20 rounded-full animate-ping opacity-20 scale-150"></div>
                  <div className="relative bg-emerald-50 dark:bg-emerald-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-transform hover:rotate-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Confirmed</h4>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{showSuccessOverlay.lecture}</p>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{showSuccessOverlay.faculty}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSuccessOverlay(null)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
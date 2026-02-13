import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AttendanceRecord, QRPayload } from '../../types';
import { supabase } from '../../constants';
import { Header } from '../Header';
import { Scan, X, RotateCcw, CheckCircle, Smartphone, Loader2, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  user: UserProfile;
  onLogout: () => void;
  addNotification: (t: string, m: string, type: 'success' | 'update' | 'error') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, onLogout, addNotification, darkMode, setDarkMode }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanRegionId = "reader";

  useEffect(() => {
    fetchHistory();
    // Cleanup scanner on unmount
    return () => {
       cleanupScanner();
    };
  }, []);

  // Handle Scanner Lifecycle
  useEffect(() => {
    let mounted = true;

    if (isScanning) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(async () => {
        if (!mounted) return;
        
        // Ensure clean state before starting
        await cleanupScanner();

        try {
          const html5QrCode = new Html5Qrcode(scanRegionId);
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
            onScanSuccess,
            (errorMessage) => {
              // Ignore standard scanning errors until code is found
            }
          );
        } catch (err: any) {
          console.error("Scanner Error:", err);
          let msg = "Could not start camera.";
          if (err?.name === "NotAllowedError") msg = "Camera permission denied.";
          addNotification("Camera Error", msg, "error");
          setIsScanning(false);
        }
      }, 300);

      return () => {
        mounted = false;
        clearTimeout(timer);
        cleanupScanner();
      };
    }
  }, [isScanning]);

  const cleanupScanner = async () => {
      if (scannerRef.current) {
         try {
             if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
             }
             await scannerRef.current.clear();
         } catch (e) {
             console.warn("Cleanup warning:", e);
         }
         scannerRef.current = null;
      }
  };

  const fetchHistory = async () => {
    if (!user.roll_no) return;

    // Get stats
    const { data: details } = await supabase
      .from('attendance_details')
      .select('status, attendance_records(lecture_name, date)')
      .eq('student_roll', user.roll_no)
      .order('id', { ascending: false });

    if (details) {
      setRecentAttendance(details.slice(0, 5));
      const p = details.filter(d => d.status === 'P').length;
      setStats({ present: p, total: details.length });
    }
  };

  const startScanner = () => {
    setIsScanning(true);
  };

  const stopScanner = () => {
    setIsScanning(false); // useEffect cleanup handles the stop logic
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      // Pause scanner immediately upon success
      if(scannerRef.current) {
        try { await scannerRef.current.pause(true); } catch(e){}
      }
      
      let payload; 
      try { payload = JSON.parse(decodedText); } catch { throw new Error("Invalid QR Format"); }
      
      // Verify session validity
      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('id', payload.rid)
        .single();

      if (recordError || !record) throw new Error("Invalid Session");
      if (!record.is_active) throw new Error("Session Expired");
      if (record.session_token !== payload.t) throw new Error("Invalid Token");

      // Mark Attendance
      const { error: insertError } = await supabase
        .from('attendance_details')
        .insert({
          attendance_record_id: record.id,
          student_roll: user.roll_no,
          student_name: user.full_name,
          status: 'P',
          timestamp: new Date().toISOString()
        });

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Already Marked!");
        throw insertError;
      }

      addNotification("Success!", `Marked Present for ${payload.l}`, "success");
      fetchHistory(); // Refresh UI
      setIsScanning(false);

    } catch (err: any) {
      addNotification("Failed", err.message || "Invalid QR Code", "error");
      // Resume if failed
      if(scannerRef.current) {
         try { await scannerRef.current.resume(); } catch(e){}
      }
    }
  };

  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <Header 
        user={user} 
        onLogout={onLogout} 
        title="My Attendance" 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm aspect-square bg-black border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
             <div id={scanRegionId} className="w-full h-full"></div>
             {/* Scanner Overlay UI */}
             <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse pointer-events-none"></div>
          </div>
          <p className="text-white mt-8 font-mono text-xs animate-pulse font-bold tracking-widest uppercase">Align QR Code within frame</p>
          <button 
            onClick={stopScanner}
            className="mt-8 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full backdrop-blur-md flex items-center gap-2 transition-all font-bold uppercase text-xs tracking-widest border border-white/20"
          >
            <X className="w-5 h-5" /> Cancel Scan
          </button>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ID Card Style Header */}
        <div className="bg-varsity-navy dark:bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-navy-200 dark:shadow-black relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-bold uppercase">{user.full_name}</h2>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">Roll No: {user.roll_no}</p>
            
            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-display font-bold">{percentage}%</span>
              <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Attendance</span>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${percentage > 75 ? 'bg-emerald-500' : 'bg-varsity-gold'}`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <button 
          onClick={startScanner}
          className="w-full bg-varsity-red text-white py-5 rounded-2xl font-bold text-lg uppercase tracking-widest shadow-xl shadow-red-100 dark:shadow-black hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Scan className="w-6 h-6" /> Scan QR Code
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
            <RotateCcw className="w-4 h-4 text-slate-400" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {recentAttendance.length === 0 ? (
              <p className="text-center text-slate-400 text-xs font-bold uppercase py-8">No records found.</p>
            ) : (
              recentAttendance.map((rec, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">{rec.attendance_records?.lecture_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{rec.attendance_records?.date}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    <CheckCircle className="w-3 h-3" /> Present
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, Lecture } from '../../types';
import { supabase } from '../../constants';
import { Header } from '../Header';
// Added Loader2 to the imports
import { QrCode, StopCircle, RefreshCw, Users, Clock, Loader2 } from 'lucide-react';
import * as QRCode from 'qrcode';

interface Props {
  user: UserProfile;
  onLogout: () => void;
  addNotification: (t: string, m: string, type: 'success' | 'update') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const FacultyDashboard: React.FC<Props> = ({ user, onLogout, addNotification, darkMode, setDarkMode }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [selectedLecture, setSelectedLecture] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Load lectures
  useEffect(() => {
    supabase.from('lectures').select('*').then(({ data }) => {
      if(data) setLectures(data);
    });
  }, []);

  // Poll for live attendance count when session is active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSession) {
      interval = setInterval(async () => {
        const { count } = await supabase
          .from('attendance_details')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_record_id', activeSession.id)
          .eq('status', 'P');
        setLiveCount(count || 0);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const startSession = async () => {
    if (!selectedLecture) return;
    
    // Generate a unique token for this session
    const token = Math.random().toString(36).substring(2, 15);
    
    const { data, error } = await supabase.from('attendance_records').insert({
      date: new Date().toISOString().slice(0, 10),
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      lecture_name: selectedLecture,
      faculty_name: user.full_name || 'Faculty',
      start_time: new Date().toLocaleTimeString(),
      created_by: user.id,
      session_token: token,
      is_active: true,
      present_count: 0,
      total_count: 0,
      time_slot: 'Live',
      lecture_type: 'Regular',
      is_proxy: false
    }).select().single();

    if (error) {
      addNotification('Error', error.message, 'update');
    } else {
      setActiveSession(data);
      addNotification('Session Started', 'QR Code is now active', 'success');
      generateQR(data.id, token, selectedLecture);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    await supabase.from('attendance_records').update({
      end_time: new Date().toLocaleTimeString(),
      is_active: false,
      present_count: liveCount
    }).eq('id', activeSession.id);

    setActiveSession(null);
    setLiveCount(0);
    setQrDataUrl(null);
    addNotification('Session Ended', `Total Present: ${liveCount}`, 'success');
  };

  const generateQR = async (recordId: number, token: string, lecture: string) => {
    try {
      const payload = JSON.stringify({
        rid: recordId,
        t: token,
        l: lecture,
        f: user.full_name
      });
      
      const url = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("QR Generation failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        title="Faculty Portal" 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="max-w-md mx-auto p-4 mt-6">
        {!activeSession ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-2xl font-display font-bold text-varsity-navy mb-2">Start Attendance</h2>
            <p className="text-slate-500 mb-6 text-sm">Select a subject to generate a secure QR code.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Subject</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-varsity-red"
                  value={selectedLecture}
                  onChange={(e) => setSelectedLecture(e.target.value)}
                >
                  <option value="">Choose Course...</option>
                  {lectures.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              </div>

              <button 
                onClick={startSession}
                disabled={!selectedLecture}
                className="w-full bg-varsity-navy text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" /> Generate QR
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-varsity-red text-center">
            <div className="flex justify-between items-center mb-6">
              <div className="text-left">
                <p className="text-xs text-slate-400 uppercase font-bold">Current Session</p>
                <h2 className="text-xl font-display font-bold text-varsity-navy">{activeSession.lecture_name}</h2>
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> LIVE
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-200 inline-block mb-6 relative">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Session QR" className="mx-auto w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-300">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>
              )}
              <div className="mt-2 text-xs text-slate-400 font-mono">Scan with Student App</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-lg">
                <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-800">{liveCount}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Marked Present</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-800 pt-1">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Start Time</div>
              </div>
            </div>

            <button 
              onClick={endSession}
              className="w-full bg-varsity-red text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              <StopCircle className="w-5 h-5" /> End Session
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
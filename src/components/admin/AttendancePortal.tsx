"use client";

import { useState, useEffect } from "react";
import { ScanLine, Clock, StopCircle, Users, CheckCircle2, Play, Database, ChevronLeft, History, Search, FileText, QrCode, Trash2 } from "lucide-react";
import { createAttendanceSession, getLiveAdminSession, stopSession, getPastSessions, getSessionRecords, deleteSession, reactivateSession } from "@/actions/attendance";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendancePortal({ onClose }: { onClose: () => void }) {
  // --- LIVE SESSION STATES ---
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MANUAL" | "TIMER">("MANUAL");
  const [mode, setMode] = useState<"QR" | "CODE">("CODE");
  const [durationMins, setDurationMins] = useState(10);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // --- HISTORY STATES ---
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchLiveSession();
    fetchHistory();
    // Live poll only if not viewing history
    const interval = setInterval(() => {
      if (!viewingHistory) fetchLiveSession();
    }, 3000); 
    return () => clearInterval(interval);
  }, [viewingHistory]);

  // Timer Math
  useEffect(() => {
    if (activeSession?.type === "TIMER" && activeSession?.deadline) {
      const timer = setInterval(() => {
        const diff = new Date(activeSession.deadline).getTime() - new Date().getTime();
        if (diff <= 0) {
          setTimeLeft("EXPIRED");
          clearInterval(timer);
        } else {
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeSession]);

  async function fetchLiveSession() {
    const res = await getLiveAdminSession();
    if (res.success) setActiveSession(res.data);
  }

  async function fetchHistory() {
    const res = await getPastSessions();
    if (res.success && res.data) setPastSessions(res.data);
  }

  async function handleStart() {
    if (!title) return alert("Enter session title.");
    setLoading(true);
    await createAttendanceSession({ title, date: new Date(), type, mode, durationMins });
    await fetchLiveSession();
    setTitle("");
    setLoading(false);
  }

  async function handleStop() {
    if (activeSession) {
      setLoading(true);
      await stopSession(activeSession.id);
      setActiveSession(null);
      await fetchHistory(); // Refresh history list immediately
      setLoading(false);
    }
  }

  async function openHistoryDetail(sess: any) {
    setViewingHistory(sess);
    setHistoryLoading(true);
    const res = await getSessionRecords(sess.id);
    if (res.success && res.data) setHistoryRecords(res.data);
    setHistoryLoading(false);
  }

  const filteredSessions = pastSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in fade-in pb-20 space-y-8 min-h-[85vh]">
      
      {/* GLOBAL HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-[#0F2547] flex items-center gap-2">
            <ScanLine className="w-7 h-7 text-purple-600"/> Secure Attendance Portal
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1.5">Manage live sessions, timers, and view real-time or past entry logs.</p>
        </div>
        <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
          Close Portal
        </button>
      </div>

      {viewingHistory ? (
        /* ========================================================= */
        /* SPA VIEW: HISTORY DETAIL TABLE                            */
        /* ========================================================= */
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4">
              <button onClick={() => setViewingHistory(null)} className="mt-1 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5"/>
              </button>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-600 px-2.5 py-1 rounded-md mb-2 inline-block">Archived Session</span>
                <h3 className="text-xl font-extrabold text-[#0F2547]">{viewingHistory.title}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5"/> Conducted on {new Date(viewingHistory.date).toLocaleString()}
                  </p>
                  {/* Reactivate Button */}
                  {!activeSession && (
                     <button 
                        onClick={async () => {
                          if(confirm("Reactivate this session? It will become live again for students.")) {
                            setLoading(true);
                            await reactivateSession(viewingHistory.id);
                            setViewingHistory(null);
                            await fetchLiveSession();
                            setLoading(false);
                          }
                        }}
                        className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1"
                     >
                        <Play className="w-3 h-3" /> Reactivate Session
                     </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-6 min-w-[250px] justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mode: {viewingHistory.mode}</p>
                {viewingHistory.mode === "CODE" ? (
                  <p className="text-lg font-black text-slate-700 line-through opacity-70 tracking-widest">{viewingHistory.secretCode}</p>
                ) : (
                  <p className="text-xs font-mono text-slate-700 opacity-70 flex items-center gap-1"><QrCode className="w-4 h-4"/> Expired QR</p>
                )}
              </div>
              <div className="text-center border-l border-slate-200 pl-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendees</p>
                <p className="text-xl font-black text-emerald-600">{historyRecords.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="flex-1 overflow-auto rounded-2xl">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                  <Clock className="w-5 h-5 animate-spin mr-2"/> Decrypting Records...
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="p-4 pl-6">S.No</th>
                      <th className="p-4">Student Profile</th>
                      <th className="p-4">Roll Number</th>
                      <th className="p-4">Branch & Year</th>
                      <th className="p-4 pr-6 text-right">Verified Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold text-slate-600">
                    {historyRecords.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3 opacity-20"/>No attendance records found for this session.</td></tr>
                    ) : (
                      historyRecords.map((rec: any, idx: number) => (
                        <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 pl-6 text-slate-400 font-black">#{idx + 1}</td>
                          <td className="p-4">
                            <p className="font-extrabold text-[#0F2547]">{rec.user.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{rec.user.email}</p>
                          </td>
                          <td className="p-4">{rec.user.rollNumber || "-"}</td>
                          <td className="p-4">{rec.user.department || "-"} • {rec.user.college || "-"}</td>
                          <td className="p-4 pr-6 text-right text-slate-400">{new Date(rec.markedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* ========================================================= */
        /* MAIN VIEW: LAUNCH / LIVE & ALL SESSIONS LIST              */
        /* ========================================================= */
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
          
          {/* TOP SECTION: LAUNCH OR LIVE SESSION */}
          {!activeSession ? (
            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <h3 className="text-xl font-extrabold text-[#0F2547]">Launch New Session</h3>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Session / Event Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="clay-input w-full px-5 py-4 text-sm font-bold shadow-sm" placeholder="e.g. Day 1: Linux Basics" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Verification Mode</label>
                  <select value={mode} onChange={(e: any) => setMode(e.target.value)} className="clay-input w-full px-5 py-4 text-sm font-bold bg-white cursor-pointer shadow-sm">
                    <option value="CODE">Secret Code Based</option>
                    <option value="QR">QR Code Scanning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Session Type</label>
                  <select value={type} onChange={(e: any) => setType(e.target.value)} className="clay-input w-full px-5 py-4 text-sm font-bold bg-white cursor-pointer shadow-sm">
                    <option value="MANUAL">Manual Stop</option>
                    <option value="TIMER">Countdown Timer</option>
                  </select>
                </div>
              </div>

              {type === "TIMER" && (
                <div className="animate-in zoom-in-95">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Duration (Minutes)</label>
                  <input type="number" value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} className="clay-input w-full px-5 py-4 text-sm font-bold border-amber-200 bg-amber-50/30 text-amber-900" min="1" />
                </div>
              )}

              <button onClick={handleStart} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl text-sm font-extrabold uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-transform hover:scale-[1.01] mt-4">
                <Play className="w-4 h-4"/> {loading ? "Launching..." : "Launch Live Session"}
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-purple-200 shadow-xl max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-purple-500 animate-pulse"></div>
              
              <div className="flex-1 space-y-6 w-full text-center md:text-left">
                <div>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3 border border-purple-200">LIVE SESSION ACTIVE</span>
                  <h3 className="text-2xl font-extrabold text-[#0F2547]">{activeSession.title}</h3>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl min-w-[200px] text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Total Attendees</p>
                    <p className="text-4xl font-black text-emerald-600">{activeSession.records.length}</p>
                  </div>
                  {activeSession.type === "TIMER" && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl min-w-[200px] text-center">
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 tracking-widest">Time Remaining</p>
                      <p className="text-3xl font-black text-amber-700">{timeLeft}</p>
                    </div>
                  )}
                </div>

                <button onClick={handleStop} disabled={loading} className="w-full sm:w-auto bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-8 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                  <StopCircle className="w-4 h-4"/> Terminate Session
                </button>
              </div>

              <div className="w-full md:w-auto flex flex-col items-center shrink-0">
                {activeSession.mode === "CODE" ? (
                  <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Secret Code</p>
                    <h1 className="text-5xl font-black text-purple-700 tracking-[0.2em]">{activeSession.secretCode}</h1>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Scan QR Code</p>
                    <div className="w-48 h-48 bg-white border-4 border-slate-800 rounded-xl flex items-center justify-center p-2 overflow-hidden">
  {/* Using a fast public API to generate Dynamic QR based on secure payload */}
  <img 
    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeSession.qrPayload)}`} 
    alt="Secure Session QR" 
    className="w-full h-full object-contain"
  />
</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BOTTOM SECTION: ALL PAST SESSIONS */}
          <div className="border-t border-slate-200 pt-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F2547] flex items-center gap-2"><History className="w-5 h-5 text-blue-500"/> Sessions Archive</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">Review data and export records of past sessions.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by title..." 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                  <p className="text-sm font-bold">No historical sessions found.</p>
                </div>
              ) : (
                filteredSessions.map(sess => (
                  <div key={sess.id} className="relative group h-full">
                    {/* Delete Empty Session Button */}
                    {(sess._count?.records || 0) === 0 && (
                      <button 
                        onClick={async (e) => {
                           e.stopPropagation();
                           if(confirm("Delete this empty session permanently?")) {
                             setLoading(true);
                             await deleteSession(sess.id);
                             await fetchHistory();
                             setLoading(false);
                           }
                        }}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all shadow-sm"
                        title="Delete empty session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={() => openHistoryDetail(sess)}
                      className="w-full text-left clay-card p-6 bg-white border border-slate-100 hover:border-blue-300 hover:shadow-xl transition-all flex flex-col justify-between h-full"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                          <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md tracking-widest">{sess.mode}</span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(sess.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-base font-extrabold text-[#0F2547] group-hover:text-blue-600 transition-colors leading-tight">{sess.title}</h4>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                         <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-500"/> {sess._count?.records || 0} Attended</span>
                         <span className="text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Data &rarr;</span>
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </motion.div>
      )}

    </div>
  );
}
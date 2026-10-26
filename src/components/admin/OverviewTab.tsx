"use client";

import { useState, useEffect } from "react";
import { Users, FileText, Database, Calendar as CalendarIcon, Plus, ScanLine, Video, Send, Settings as SettingsIcon, ChevronLeft, ChevronRight, MapPin, Clock, ListPlus, ArrowRight } from "lucide-react";
import { getOverviewMetrics, getClubEvents, createClubEvent } from "@/actions/admin";
import AttendancePortal from "./AttendancePortal";
import { motion, AnimatePresence } from "framer-motion";

export default function OverviewTab({ navigateTo }: { navigateTo: (tab: any) => void }) {
  const [metrics, setMetrics] = useState({ totalUsers: 0, activeForms: 0, totalSubmissions: 0, todayEvents: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar States
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  
  // Event Form State
  const [newEvent, setNewEvent] = useState({ title: "", type: "WORKSHOP", time: "16:00" });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const mRes = await getOverviewMetrics();
    if (mRes.success) setMetrics(mRes.data);
    const eRes = await getClubEvents();
    if (eRes.success) setEvents(eRes.data);
    setLoading(false);
  }

  // Calendar Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  // Get events for selected date
  const selectedDateFull = new Date(currentYear, currentMonth, selectedDay || 1);
  const eventsOnSelectedDate = events.filter(ev => {
    const evDate = new Date(ev.eventDate);
    return evDate.getDate() === selectedDay && evDate.getMonth() === currentMonth && evDate.getFullYear() === currentYear;
  });

  async function handleCreateEvent() {
    if (!newEvent.title) return alert("Please enter event title");
    setLoading(true);
    
    // Combine selected date and time
    const [hours, minutes] = newEvent.time.split(":");
    const eventDateTime = new Date(currentYear, currentMonth, selectedDay || 1, parseInt(hours), parseInt(minutes));
    
    await createClubEvent(newEvent.title, "", newEvent.type, eventDateTime);
    
    setNewEvent({ title: "", type: "WORKSHOP", time: "16:00" });
    setIsAddingEvent(false);
    await loadDashboard();
  }

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    else if (newMonth > 11) { newMonth = 0; newYear++; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(null);
    setIsAddingEvent(false);
  };

  if (loading && !events.length) return <div className="p-10 text-center font-bold text-slate-500 flex flex-col items-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>Initializing Command Center...</div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* 1. TOP METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clay-card p-5 bg-white border border-slate-100 flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner"><Users className="w-6 h-6"/></div>
          <div><h4 className="text-2xl font-black text-[#0F2547] leading-none">{metrics.totalUsers}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Users</p></div>
        </div>
        <div className="clay-card p-5 bg-white border border-slate-100 flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><FileText className="w-6 h-6"/></div>
          <div><h4 className="text-2xl font-black text-[#0F2547] leading-none">{metrics.activeForms}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Forms</p></div>
        </div>
        <div className="clay-card p-5 bg-white border border-slate-100 flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner"><Database className="w-6 h-6"/></div>
          <div><h4 className="text-2xl font-black text-[#0F2547] leading-none">{metrics.totalSubmissions}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vault Entries</p></div>
        </div>
        <div className="clay-card p-5 bg-white border border-slate-100 flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner"><CalendarIcon className="w-6 h-6"/></div>
          <div><h4 className="text-2xl font-black text-[#0F2547] leading-none">{metrics.todayEvents}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Events Today</p></div>
        </div>
      </div>

      {/* 2. DASHBOARD ROUTING HUB */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button onClick={() => navigateTo("WORKFLOW")} className="bg-slate-800 text-white p-5 rounded-2xl flex flex-col justify-between items-start h-32 hover:bg-slate-700 transition-colors shadow-lg group relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/3"></div>
          <Video className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform"/>
          <div className="text-left"><h4 className="font-extrabold text-sm">Presenter Workflow</h4><p className="text-[10px] text-slate-400">Queue & Approvals</p></div>
        </button>
        <button onClick={() => navigateTo("TEAM")} className="bg-white border-2 border-slate-100 p-5 rounded-2xl flex flex-col justify-between items-start h-32 hover:border-blue-300 transition-colors shadow-sm group">
          <Users className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform"/>
          <div className="text-left"><h4 className="font-extrabold text-[#0F2547] text-sm">Team Management</h4><p className="text-[10px] text-slate-500">Access & Roles</p></div>
        </button>
        <button onClick={() => navigateTo("COMMUNICATION")} className="bg-white border-2 border-slate-100 p-5 rounded-2xl flex flex-col justify-between items-start h-32 hover:border-blue-300 transition-colors shadow-sm group">
          <Send className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform"/>
          <div className="text-left"><h4 className="font-extrabold text-[#0F2547] text-sm">Communication</h4><p className="text-[10px] text-slate-500">Emails & Broadcast</p></div>
        </button>
        <button onClick={() => navigateTo("SETTINGS")} className="bg-white border-2 border-slate-100 p-5 rounded-2xl flex flex-col justify-between items-start h-32 hover:border-blue-300 transition-colors shadow-sm group">
          <SettingsIcon className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform"/>
          <div className="text-left"><h4 className="font-extrabold text-[#0F2547] text-sm">System Settings</h4><p className="text-[10px] text-slate-500">Forms & Database</p></div>
        </button>
      </div>

      {/* 3. CALENDAR & ATTENDANCE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* INTERACTIVE CALENDAR SECTION */}
        <div className="lg:col-span-8 clay-card border border-slate-200 overflow-hidden flex flex-col md:flex-row h-auto md:h-[450px]">
          
          {/* Left: The Calendar Grid */}
          <div className="w-full md:w-[60%] p-6 md:p-8 bg-slate-50/50 flex flex-col border-r border-slate-100">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-amber-500"/> Schedule</h3>
               <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                 <button onClick={() => changeMonth(-1)} className="p-1 text-slate-400 hover:text-slate-800"><ChevronLeft className="w-4 h-4"/></button>
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#0F2547] min-w-[90px] text-center">{monthName} {currentYear}</span>
                 <button onClick={() => changeMonth(1)} className="p-1 text-slate-400 hover:text-slate-800"><ChevronRight className="w-4 h-4"/></button>
               </div>
             </div>

             <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-[10px] font-black text-slate-400 py-1">{day}</div>
                ))}
             </div>
             
             <div className="grid grid-cols-7 gap-2 flex-1 items-start">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isToday = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                  const isSelected = selectedDay === dayNum;
                  
                  // Check if this date has events
                  const hasEvents = events.some(ev => {
                    const d = new Date(ev.eventDate);
                    return d.getDate() === dayNum && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                  });

                  return (
                    <button 
                      key={dayNum}
                      onClick={() => { setSelectedDay(dayNum); setIsAddingEvent(false); }}
                      className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all
                        ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 z-10' : 
                          isToday ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 
                          'bg-white text-slate-600 border border-slate-100 hover:bg-slate-100 hover:border-slate-300'}
                      `}
                    >
                      {dayNum}
                      {hasEvents && <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`}></span>}
                    </button>
                  )
                })}
             </div>
          </div>

          {/* Right: Date Context Panel (Events List or Add Event Form) */}
          <div className="w-full md:w-[40%] bg-white p-6 relative flex flex-col h-[400px] md:h-full">
            {!selectedDay ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                <CalendarIcon className="w-12 h-12 mb-3 opacity-20"/>
                <p className="text-xs font-bold uppercase tracking-widest">Select a date</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Timeline</p>
                    <h4 className="text-base font-extrabold text-[#0F2547]">{selectedDay} {monthName} {currentYear}</h4>
                  </div>
                  {!isAddingEvent && (
                    <button onClick={() => setIsAddingEvent(true)} className="p-2 bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence mode="wait">
                    {isAddingEvent ? (
                      <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Event Title</label>
                          <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="clay-input w-full px-3 py-2 text-xs font-bold" placeholder="e.g. Linux Workshop" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Event Category</label>
                          <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="clay-input w-full px-3 py-2 text-xs font-bold bg-white">
                            <option value="WORKSHOP">Workshop Session</option>
                            <option value="MEETING">Team Meeting</option>
                            <option value="SHOOT">Video Shoot</option>
                            <option value="DEADLINE">Submission Deadline</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Time</label>
                          <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="clay-input w-full px-3 py-2 text-xs font-bold bg-white" />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <button onClick={() => setIsAddingEvent(false)} className="flex-1 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                          <button onClick={handleCreateEvent} className="flex-1 py-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md">Save Event</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                        {eventsOnSelectedDate.length === 0 ? (
                          <div className="text-center py-12">
                            <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2"/>
                            <p className="text-[11px] font-bold text-slate-400">No events scheduled.</p>
                          </div>
                        ) : (
                          eventsOnSelectedDate.map(ev => (
                            <div key={ev.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-200 transition-colors group cursor-default">
                              <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded tracking-widest">{ev.eventType}</span>
                              <h5 className="font-extrabold text-sm text-[#0F2547] mt-1.5">{ev.title}</h5>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(ev.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ATTENDANCE ROUTER CARD */}
        <div className="lg:col-span-4 clay-card border-2 border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-6 sm:p-8 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-200/50 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          
          <div className="relative z-10">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner mb-6 group-hover:-translate-y-2 transition-transform duration-300">
              <ScanLine className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-[#0F2547] leading-tight">Live Attendance System</h3>
            <p className="text-xs font-medium text-slate-500 mt-3 leading-relaxed">
              Launch sessions, generate QR codes, and monitor live check-ins for active events securely from the Command Center.
            </p>
          </div>
          
          <div className="relative z-10 mt-8 pt-6 border-t border-purple-100/50">
            <button onClick={() => navigateTo("ATTENDANCE")} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]">
              Open Attendance Portal <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
        
      </div>

      </div>
  );
}
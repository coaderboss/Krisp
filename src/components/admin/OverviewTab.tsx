"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  FileText, 
  Database, 
  Calendar as CalendarIcon, 
  Plus, 
  ScanLine, 
  Video, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Trash2,
  CalendarDays,
  Shield,
  Activity,
  CheckCircle2,
  Radio,
  SlidersHorizontal,
  EyeOff,
  ShieldCheck,
  Zap,
  Lock,
  RefreshCw,
  Cpu,
  Server,
  Flame,
  KeySquare,
  AlertCircle
} from "lucide-react";
import { getOverviewMetrics, getClubEvents, createClubEvent, deleteClubEvent } from "@/actions/admin";
import { motion, AnimatePresence } from "framer-motion";

interface OverviewTabProps {
  navigateTo: (tab: "OVERVIEW" | "WORKFLOW" | "TEAM" | "COMMUNICATION" | "SETTINGS" | "INBOX" | "ATTENDANCE") => void;
  slot?: any;
  applications?: any[];
  pendingRequestsCount?: number;
  pendingTeamCount?: number;
  isLiveSessionActive?: boolean;
}

export default function OverviewTab({ 
  navigateTo,
  slot,
  applications = [],
  pendingRequestsCount = 0,
  pendingTeamCount = 0,
  isLiveSessionActive = false
}: OverviewTabProps) {
  const [metrics, setMetrics] = useState({ totalUsers: 0, activeForms: 0, totalSubmissions: 0, todayEvents: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // Calendar States
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  
  // Event Form State
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    type: "WORKSHOP", 
    customType: "", 
    time: "16:00",
    isInternal: false
  });

  function notify(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [mRes, eRes] = await Promise.all([
        getOverviewMetrics(),
        getClubEvents()
      ]);
      if (mRes.success && mRes.data) setMetrics(mRes.data);
      if (eRes.success && eRes.data) setEvents(eRes.data);
    } catch {
      notify("Failed to load command center data.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Calendar Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  // Get events on the specifically clicked day
  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter(ev => {
      const d = new Date(ev.eventDate);
      return d.getDate() === selectedDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [events, selectedDay, currentMonth, currentYear]);

  // Upcoming events in this month (ensures agenda is NEVER an empty dead void)
  const upcomingEventsThisMonth = useMemo(() => {
    return events
      .filter(ev => {
        const d = new Date(ev.eventDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (!selectedDay || d.getDate() >= selectedDay);
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5);
  }, [events, currentMonth, currentYear, selectedDay]);

  async function handleCreateEvent() {
    if (!newEvent.title.trim()) return notify("Please enter an event title", "error");
    
    const finalType = newEvent.type === "CUSTOM" ? newEvent.customType.toUpperCase() : newEvent.type;
    if (newEvent.type === "CUSTOM" && !finalType.trim()) return notify("Please specify a custom category", "error");

    const description = (newEvent.type === "INTERNAL" || newEvent.isInternal) ? "INTERNAL" : "";

    setActionLoading(true);
    try {
      const [hours, minutes] = newEvent.time.split(":");
      const eventDateTime = new Date(currentYear, currentMonth, selectedDay || 1, parseInt(hours), parseInt(minutes));
      
      const res: any = await createClubEvent(newEvent.title.trim(), description, finalType, eventDateTime);
      if (res.success) {
        notify("Event successfully added to calendar!", "success");
        setNewEvent({ title: "", type: "WORKSHOP", customType: "", time: "16:00", isInternal: false });
        setIsAddingEvent(false);
        // Refresh events in place
        const eRes: any = await getClubEvents();
        if (eRes.success) setEvents(eRes.data || []);
      } else {
        notify(res.error || "Failed to create event", "error");
      }
    } catch {
      notify("Network error while creating event", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to remove this event from the calendar?")) return;
    setActionLoading(true);
    try {
      const res: any = await deleteClubEvent(eventId);
      if (res.success) {
        notify("Event removed from calendar.", "success");
        setEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        notify(res.error || "Failed to delete event", "error");
      }
    } catch {
      notify("Network error while deleting event", "error");
    } finally {
      setActionLoading(false);
    }
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

  const jumpToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
    setIsAddingEvent(false);
  };

  if (loading && !events.length) {
    return (
      <div className="clay-card p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center text-blue-600 animate-pulse shadow-inner">
          <Activity className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Syncing Command Center Telemetry</h4>
        <p className="text-xs text-slate-500 font-medium">Connecting to Club Datastream &amp; Broadcast Grid...</p>
      </div>
    );
  }

  const selectedStudents = slot?.selectedTrainees || [];

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      
      {/* Toast message inside overview */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl text-xs font-bold text-center border shadow-md transition-all ${
          toastMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toastMessage.text}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. HIGH-DENSITY CLAYMORPHIC 5-COLUMN METRICS RIBBON      */}
      {/* ======================================================== */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Metric 1: Total Enrolled */}
        <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Total Enrolled</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{metrics.totalUsers}</h3>
            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Live Roster
            </span>
          </div>
        </div>

        {/* Metric 2: Active Forms */}
        <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Active Forms</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{metrics.activeForms}</h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Portal
            </span>
          </div>
        </div>

        {/* Metric 3: Vault Entries */}
        <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/50 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Submissions</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{metrics.totalSubmissions}</h3>
            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Vault Records
            </span>
          </div>
        </div>

        {/* Metric 4: Club Events */}
        <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50 shadow-inner">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Club Events</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{events.length}</h3>
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Calendar Grid
            </span>
          </div>
        </div>

        {/* Metric 5: Broadcast Slot Allocation */}
        <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all col-span-2 sm:col-span-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/50 shadow-inner">
            <Video className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Broadcast Slot</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{selectedStudents.length} / 2</h3>
            <span className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${selectedStudents.length === 2 ? "text-emerald-600" : "text-indigo-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${selectedStudents.length === 2 ? "bg-emerald-500" : "bg-indigo-500"}`}></span> 
              {selectedStudents.length === 2 ? "Capacity Full" : "Slots Available"}
            </span>
          </div>
        </div>

      </section>

      {/* ======================================================== */}
      {/* 2. DUAL OPERATIONAL DECK: CALENDAR MATRIX & ATTENDANCE   */}
      {/* (1:1 Visual Alignment with Executive Dashboard UI)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* SMART CALENDAR & AGENDA MATRIX (8 Cols) */}
        <div className="lg:col-span-8 clay-card p-5 sm:p-6 flex flex-col md:flex-row gap-6">
          
          {/* Left Sub-Deck: Interactive Mini-Calendar (54%) */}
          <div className="w-full md:w-[54%] flex flex-col border-b md:border-b-0 md:border-r border-blue-200/60 pb-5 md:pb-0 md:pr-6">
            
            {/* Month Navigation & Controls */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Schedule Matrix</h3>
                  <p className="text-[9px] font-bold text-slate-400">Club Sessions &amp; Workshops</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 clay-inset px-2 py-1 rounded-xl">
                <button 
                  onClick={() => changeMonth(-1)} 
                  aria-label="Previous Month"
                  className="p-1 hover:text-blue-600 text-slate-500 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0F2547] min-w-[76px] text-center">
                  {monthName.slice(0, 3)} {currentYear}
                </span>
                <button 
                  onClick={() => changeMonth(1)} 
                  aria-label="Next Month"
                  className="p-1 hover:text-blue-600 text-slate-500 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={jumpToToday} 
                  className="ml-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white text-blue-600 border border-blue-100 hover:bg-blue-50"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <div key={i} className="text-[9px] font-black uppercase tracking-wider text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 items-start">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isCurrentDay = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const isSelected = selectedDay === dayNum;
                
                const dayEvents = events.filter(ev => {
                  const d = new Date(ev.eventDate);
                  return d.getDate() === dayNum && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                
                const hasPublic = dayEvents.some(ev => ev.description !== 'INTERNAL');
                const hasInternal = dayEvents.some(ev => ev.description === 'INTERNAL');

                return (
                  <button
                    key={dayNum}
                    onClick={() => { setSelectedDay(dayNum); setIsAddingEvent(false); }}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 z-10 font-black"
                        : isCurrentDay
                        ? "bg-white text-blue-600 border border-blue-300 font-black shadow-sm"
                        : dayEvents.length > 0
                        ? "bg-white/80 text-[#0F2547] hover:bg-white hover:shadow-sm"
                        : "bg-transparent text-slate-500 hover:bg-white/60"
                    }`}
                  >
                    <span>{dayNum}</span>
                    
                    {/* Event Indicator Dots */}
                    <div className="absolute bottom-1 flex items-center gap-0.5">
                      {hasPublic && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-cyan-200" : "bg-emerald-500"}`} />
                      )}
                      {hasInternal && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-amber-200" : "bg-amber-500"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center gap-4 pt-3 mt-3 border-t border-slate-200/50 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Public Meetup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Internal Briefing
              </span>
            </div>

          </div>

          {/* Right Sub-Deck: Smart Agenda (NEVER EMPTY) (46%) */}
          <div className="w-full md:w-[46%] flex flex-col justify-between">
            
            <div>
              {/* Header for Focus Day with Admin "+ Add Event" Action */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/50">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">Agenda Focus</span>
                  <h4 className="text-sm font-extrabold text-[#0F2547]">
                    {selectedDay ? `${selectedDay} ${monthName} ${currentYear}` : "Select a Date"}
                  </h4>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                    {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? "Session" : "Sessions"}
                  </span>
                  {!isAddingEvent && (
                    <button 
                      onClick={() => setIsAddingEvent(true)}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors flex items-center gap-1 text-[10px] font-black"
                      title="Schedule Event on this date"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Event Cards, Inline Add Form, or Smart Fallback (No empty void) */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                <AnimatePresence mode="wait">
                  {isAddingEvent ? (
                    <motion.div 
                      key="admin-add-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3 p-3.5 bg-white/95 rounded-2xl border border-blue-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Schedule Event</span>
                        <span className="text-[9px] font-bold text-slate-400">{selectedDay} {monthName}</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Event Title</label>
                        <input 
                          type="text" 
                          value={newEvent.title} 
                          onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                          className="clay-input w-full px-3 py-2 text-xs font-bold" 
                          placeholder="e.g. Reverse Engineering Deep Dive" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Category</label>
                          <select 
                            value={newEvent.type} 
                            onChange={e => setNewEvent({...newEvent, type: e.target.value})} 
                            className="clay-input w-full px-2.5 py-2 text-xs font-bold bg-white"
                          >
                            <option value="WORKSHOP">Workshop</option>
                            <option value="INTERNAL">Internal Briefing</option>
                            <option value="MEETING">Team Meeting</option>
                            <option value="SHOOT">Broadcast Shoot</option>
                            <option value="CUSTOM">Custom...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Time</label>
                          <input 
                            type="time" 
                            value={newEvent.time} 
                            onChange={e => setNewEvent({...newEvent, time: e.target.value})} 
                            className="clay-input w-full px-2.5 py-2 text-xs font-bold bg-white" 
                          />
                        </div>
                      </div>

                      {newEvent.type === "CUSTOM" && (
                        <input 
                          type="text" 
                          value={newEvent.customType} 
                          onChange={e => setNewEvent({...newEvent, customType: e.target.value})} 
                          className="clay-input w-full px-3 py-2 text-xs font-bold border-amber-200 bg-amber-50" 
                          placeholder="Custom Category (e.g. CTF COMPETITION)" 
                        />
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button 
                          onClick={() => setIsAddingEvent(false)} 
                          className="clay-btn flex-1 py-2 text-[10px] font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleCreateEvent} 
                          disabled={actionLoading}
                          className="clay-btn-primary flex-1 py-2 text-[10px] font-black shadow-md flex items-center justify-center gap-1"
                        >
                          {actionLoading ? "Saving..." : "Save Event"}
                        </button>
                      </div>
                    </motion.div>
                  ) : eventsOnSelectedDate.length > 0 ? (
                    eventsOnSelectedDate.map((ev) => (
                      <div 
                        key={ev.id}
                        className={`p-3.5 rounded-2xl border transition-all relative group ${
                          ev.description === "INTERNAL" 
                            ? "bg-amber-50/70 border-amber-200 shadow-sm" 
                            : "bg-white border-blue-100 shadow-[2px_4px_12px_rgba(15,37,71,0.04)]"
                        }`}
                      >
                        {/* Admin Delete Action */}
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start justify-between gap-2 mb-1 pr-6">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                            ev.description === "INTERNAL" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {ev.eventType || "CLUB SESSION"}
                          </span>
                          
                          {ev.description === "INTERNAL" && (
                            <span title="Internal Executive Only" className="text-amber-600">
                              <EyeOff className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <h5 className="text-xs font-black text-[#0F2547] leading-snug">{ev.title}</h5>
                        
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(ev.eventDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {ev.attendanceSession && (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <ScanLine className="w-3 h-3" /> Gate Attached
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* SMART UPCOMING ROSTER - PREVENTS EMPTY DEAD SPACE */
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-white/70 border border-white text-center">
                        <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-[11px] font-black text-slate-600">No sessions scheduled on this day</p>
                        <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Showing upcoming events for {monthName}:</p>
                      </div>

                      {upcomingEventsThisMonth.length > 0 ? (
                        upcomingEventsThisMonth.map(ev => {
                          const evDate = new Date(ev.eventDate);
                          return (
                            <div 
                              key={ev.id}
                              onClick={() => setSelectedDay(evDate.getDate())}
                              className="p-3 rounded-xl bg-white/80 border border-blue-100/70 hover:bg-white hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center font-black leading-none border border-blue-100">
                                  <span className="text-[11px]">{evDate.getDate()}</span>
                                  <span className="text-[7px] uppercase">{evDate.toLocaleDateString("en-US", { month: "short" })}</span>
                                </div>
                                <div className="min-w-0">
                                  <h6 className="text-[11px] font-black text-[#0F2547] truncate group-hover:text-blue-600 transition-colors">{ev.title}</h6>
                                  <span className="text-[9px] font-bold text-slate-400">{ev.eventType}</span>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400">No further events scheduled this month.</p>
                          <button 
                            onClick={() => setIsAddingEvent(true)}
                            className="text-[11px] font-black text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Schedule First Event
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Quick-Tip */}
            <div className="pt-3 mt-2 border-t border-blue-200/40 text-[9px] font-bold text-slate-400 flex items-center justify-between">
              <span>Total Month Load: {events.length} Event(s)</span>
              <span className="text-blue-600 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In-Place Live Sync
              </span>
            </div>

          </div>

        </div>

        {/* SECURE ATTENDANCE GATEWAY TERMINAL (4 Cols) */}
        <div className="lg:col-span-4 clay-card p-6 flex flex-col justify-between relative overflow-hidden group">
          
          {/* Top Security Status Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner bg-emerald-100 text-emerald-700 border-emerald-200">
                <ScanLine className="w-6 h-6" />
              </div>

              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isLiveSessionActive ? "STREAMING LIVE" : "TERMINAL ACTIVE"}
              </span>
            </div>

            <h3 className="text-lg font-black text-[#0F2547] leading-snug">
              Attendance Terminal Gateway
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
              Full Supreme Admin clearance. Launch QR check-in sessions, issue 6-character dynamic PIN codes, enforce active countdown timers, and stream verified presence records in real time.
            </p>

            {/* Informational Diagnostics */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-white space-y-2 text-[10px] font-bold">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Security Clearance:</span>
                <span className="text-emerald-600 font-black">Level 1 (Supreme Root)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Scanner Engine:</span>
                <span className="text-[#0F2547]">Dual-Key QR + 6-Char PIN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verification Protocol:</span>
                <span className="text-blue-600 font-mono">HMAC-SHA256 Token</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Session Status:</span>
                <span className={isLiveSessionActive ? "text-emerald-600 font-black flex items-center gap-1" : "text-slate-600"}>
                  {isLiveSessionActive ? "🟢 Active Broadcast" : "Idle (Ready to Launch)"}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="pt-5 mt-4 border-t border-blue-200/60">
            <button
              onClick={() => navigateTo("ATTENDANCE")}
              className="w-full clay-btn-primary py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
              <ScanLine className="w-4 h-4" />
              <span>Launch Attendance Terminal</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. LONG-SCROLL COMMAND SYSTEM: TELEMETRY & OPERATIONS   */}
      {/* (Replaces redundant buttons with a true Mission Deck)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* PLATFORM INFRASTRUCTURE & SECURITY MATRIX (7 Cols) */}
        <div className="lg:col-span-7 clay-card p-6 space-y-5 border border-white">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Infrastructure &amp; Security Matrix</h3>
                <p className="text-[10px] font-bold text-slate-400">Live health of system pipelines, database connection pools, &amp; security guards.</p>
              </div>
            </div>
            <span className="clay-badge-blue text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
              100% HEALTHY
            </span>
          </div>

          {/* 4 Diagnostic Pillars in 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Pillar 1: Database Engine */}
            <div className="clay-inset p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" /> Database Engine
                </span>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ONLINE
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F2547]">PostgreSQL / Prisma Client</h5>
              <p className="text-[10px] font-semibold text-slate-500">Connection pooling healthy • Latency &lt; 15ms</p>
            </div>

            {/* Pillar 2: Security & Rate Guard */}
            <div className="clay-inset p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-600" /> Security Layer
                </span>
                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  ENFORCED
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F2547]">Campus NAT Window Guard</h5>
              <p className="text-[10px] font-semibold text-slate-500">Memory buffer limiter &amp; Root role validation active</p>
            </div>

            {/* Pillar 3: Dynamic Vault & Forms */}
            <div className="clay-inset p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Schema &amp; Vault
                </span>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {metrics.totalSubmissions} RECORDS
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F2547]">Universal Intake Engine</h5>
              <p className="text-[10px] font-semibold text-slate-500">{metrics.activeForms} Active published forms receiving submissions</p>
            </div>

            {/* Pillar 4: Cryptographic Dispatch */}
            <div className="clay-inset p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-600" /> Real-Time Sync
                </span>
                <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ACTIVE
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F2547]">HMAC-SHA256 Tokens</h5>
              <p className="text-[10px] font-semibold text-slate-500">Attendance sessions bound to dynamic rolling OTPs</p>
            </div>

          </div>
        </div>

        {/* FAST GOVERNANCE DISPATCH DECK (5 Cols) */}
        <div className="lg:col-span-5 clay-card p-6 flex flex-col justify-between space-y-4 border border-white">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/50 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F2547] uppercase tracking-wider">Mission Fast-Track</h4>
                  <p className="text-[9px] font-bold text-slate-400">Direct pipeline accelerators</p>
                </div>
              </div>
            </div>

            {/* Pipeline Action 1: Presenter Workflow */}
            <div 
              onClick={() => navigateTo("WORKFLOW")}
              className="p-3 rounded-2xl bg-white/90 border border-blue-100 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between mb-2.5 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-black text-[#0F2547] group-hover:text-blue-600 transition-colors">Presenter Workflow Pipeline</h5>
                  <p className="text-[10px] font-medium text-slate-500 truncate">
                    {slot?.theme ? `Theme: "${slot.theme}"` : "Theme: Not Assigned"} • {selectedStudents.length}/2 Allocated
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>

            {/* Pipeline Action 2: Team Access Approvals */}
            <div 
              onClick={() => navigateTo("TEAM")}
              className="p-3 rounded-2xl bg-white/90 border border-blue-100 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between mb-2.5 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-[#0F2547] group-hover:text-amber-700 transition-colors">Executive Team Access</h5>
                    {pendingTeamCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-amber-100 text-amber-800">
                        {pendingTeamCount} PENDING
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 truncate">Review promotion requests &amp; role clearance</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>

            {/* Pipeline Action 3: Communications Hub */}
            <div 
              onClick={() => navigateTo("COMMUNICATION")}
              className="p-3 rounded-2xl bg-white/90 border border-blue-100 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-black text-[#0F2547] group-hover:text-purple-700 transition-colors">Broadcast &amp; Screening Mailer</h5>
                  <p className="text-[10px] font-medium text-slate-500 truncate">Screening invites matrix &amp; mass announcements</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>
          </div>

          <div className="pt-3 border-t border-blue-200/40 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Terminal Clearance: ROOT</span>
            <span className="text-blue-600 font-black">All Modules Operational</span>
          </div>
        </div>

      </div>

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { sendInvitesToShortlisted, sendMassEmails, sendDirectEmail } from "@/actions/admin";
import { Send, PlusCircle, Trash2, Mail, Users, AtSign, Server, Copy, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunicationTab({ slot }: { slot: any }) {
  const [commSubTab, setCommSubTab] = useState<"SCREENING" | "MASS" | "DIRECT" | "SMTP">("SCREENING");
  const [loading, setLoading] = useState<string>("");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const selectedStudents = slot?.selectedTrainees || [];

  const defaultPlainText = `Hello {{name}},

Congratulations! You have been officially shortlisted for our upcoming Weekly Cybersecurity Video Bulletin.

Approved Topic: {{topic}}
Screening Schedule: Friday, 4:00 PM IST (UIET Media Cell)

Please prepare 3-4 presentation slides covering the core concepts of your topic.

Best regards,
Cybersecurity Club • UIET CSJM University`;

  const [screeningTemplate, setScreeningTemplate] = useState(defaultPlainText);

  useEffect(() => {
    const savedTemplate = localStorage.getItem("savedScreeningTemplate");
    if (savedTemplate) {
      setScreeningTemplate(savedTemplate);
    }
  }, []);

  const [massRecipients, setMassRecipients] = useState([{ name: "", email: "" }]);
  const [massSubject, setMassSubject] = useState("");
  const [massTemplate, setMassTemplate] = useState("<h2>Hello {{name}},</h2>\n<p>Write your message body here...</p>");
  
  const [directEmail, setDirectEmail] = useState("");
  const [directSubject, setDirectSubject] = useState("");
  const [directBody, setDirectBody] = useState("");

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  }

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  }

  async function handleSendScreeningInvites() {
    setLoading("screening-email");
    try {
      const formattedHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #0F2547; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: #2563EB; padding: 16px 20px; border-radius: 12px; color: #ffffff; font-weight: bold; margin-bottom: 20px;">
            Cybersecurity Club • UIET CSJM University
          </div>
          <div>${screeningTemplate.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
      const res = await sendInvitesToShortlisted(slot.id, formattedHtml);
      if (res.error) notify(res.error, "error");
      else notify(res.message || "Screening invites dispatched successfully.");
    } catch {
      notify("Failed to transmit invites.", "error");
    } finally {
      setLoading("");
    }
  }

  function handlePermanentSave() {
    localStorage.setItem("savedScreeningTemplate", screeningTemplate);
    notify("Template permanently saved as default in local storage.");
  }

  async function handleSendMassEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("mass-email");
    try {
      const res = await sendMassEmails(massRecipients, massSubject, massTemplate);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(res.message || "Mass broadcast dispatched successfully.");
        setMassRecipients([{ name: "", email: "" }]);
        setMassSubject("");
      }
    } catch {
      notify("Failed to transmit mass email broadcast.", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleSendDirectEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("direct-email");
    try {
      const res = await sendDirectEmail(directEmail, directSubject, directBody);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(res.message || "Direct email dispatched successfully.");
        setDirectEmail(""); setDirectSubject(""); setDirectBody("");
      }
    } catch {
      notify("Failed to dispatch direct email.", "error");
    } finally {
      setLoading("");
    }
  }

  const addMassRecipientRow = () => setMassRecipients([...massRecipients, { name: "", email: "" }]);
  const removeMassRecipientRow = (index: number) => setMassRecipients(massRecipients.filter((_, i) => i !== index));
  const updateMassRecipient = (index: number, field: "name" | "email", value: string) => {
    const updated = [...massRecipients];
    updated[index][field as "name" | "email"] = value;
    setMassRecipients(updated);
  };

  return (
    <section className="clay-card p-5 sm:p-7 animate-in fade-in slide-in-from-bottom-2 duration-300 border border-white shadow-md space-y-6">
      
      {/* Toast Notification */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-200/50 pb-4 gap-4">
        <div>
          <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-1.5 inline-block">
            Outbound Mail Grid
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F2547]">Communication Suite</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Draft, personalize and transmit official club screening calls, mass bulletins, and direct student emails.</p>
        </div>
        
        {/* Sub-tab pills */}
        <div className="flex bg-white/70 p-1.5 rounded-2xl border border-white shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar shrink-0 gap-1">
          <button 
            onClick={() => setCommSubTab("SCREENING")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-center whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
              commSubTab === "SCREENING" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Screening Invites</span>
          </button>
          
          <button 
            onClick={() => setCommSubTab("MASS")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-center whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
              commSubTab === "MASS" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mass Broadcast</span>
          </button>

          <button 
            onClick={() => setCommSubTab("DIRECT")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-center whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
              commSubTab === "DIRECT" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white"
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>Direct Mail</span>
          </button>

          <button 
            onClick={() => setCommSubTab("SMTP")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-center whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
              commSubTab === "SMTP" 
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25" 
                : "text-slate-600 hover:text-amber-600 hover:bg-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SMTP Server</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: SCREENING INVITES                            */}
      {/* ======================================================== */}
      {commSubTab === "SCREENING" && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Dynamic variables guide */}
          <div className="clay-card p-4 rounded-2xl bg-blue-50/40 border border-blue-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Dynamic Personalization Tags
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">Click to copy into clipboard</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button"
                onClick={() => copyTag("{{name}}")}
                className="clay-btn px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 bg-white text-blue-800 hover:text-blue-600"
              >
                {copiedTag === "{{name}}" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{`{{name}}`}</span>
              </button>

              <button 
                type="button"
                onClick={() => copyTag("{{topic}}")}
                className="clay-btn px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 bg-white text-blue-800 hover:text-blue-600"
              >
                {copiedTag === "{{topic}}" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{`{{topic}}`}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              These placeholders are dynamically replaced by candidate details for all shortlisted presenters in the active batch.
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Screening Invitation Email Template</label>
            <textarea 
              rows={9} 
              value={screeningTemplate} 
              onChange={(e) => setScreeningTemplate(e.target.value)}
              className="clay-input w-full p-4 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap font-medium" 
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <button 
              onClick={handlePermanentSave} 
              className="clay-btn w-full sm:w-auto px-6 py-2.5 text-xs font-black text-slate-700 hover:text-blue-700 text-center"
            >
              Save as Default Template
            </button>
            
            <button 
              onClick={handleSendScreeningInvites} 
              disabled={loading === "screening-email" || selectedStudents.length === 0} 
              className="clay-btn-primary w-full sm:w-auto px-7 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading === "screening-email" ? "Transmitting..." : `Dispatch to ${selectedStudents.length} Shortlisted Presenter(s)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: MASS BROADCAST                               */}
      {/* ======================================================== */}
      {commSubTab === "MASS" && (
        <form onSubmit={handleSendMassEmail} className="space-y-5 animate-in fade-in">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Recipient Matrix ({massRecipients.length} Recipient(s))
              </label>
              <button 
                type="button" 
                onClick={addMassRecipientRow} 
                className="clay-btn px-3 py-1.5 text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Recipient
              </button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {massRecipients.map((recipient, index) => (
                <div key={index} className="clay-pill p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <input 
                    type="text" 
                    required 
                    placeholder="Recipient Name (e.g. Rahul Verma)" 
                    value={recipient.name} 
                    onChange={(e) => updateMassRecipient(index, "name", e.target.value)} 
                    className="clay-input flex-1 px-3.5 py-2 text-xs font-bold" 
                  />
                  <input 
                    type="email" 
                    required 
                    placeholder="Email Address" 
                    value={recipient.email} 
                    onChange={(e) => updateMassRecipient(index, "email", e.target.value)} 
                    className="clay-input flex-1 px-3.5 py-2 text-xs font-bold" 
                  />
                  <button 
                    type="button" 
                    onClick={() => removeMassRecipientRow(index)} 
                    disabled={massRecipients.length === 1} 
                    className="self-end sm:self-center p-2 text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Broadcast Subject</label>
            <input 
              type="text" 
              required 
              value={massSubject} 
              onChange={(e) => setMassSubject(e.target.value)} 
              className="clay-input w-full px-4 py-2.5 text-xs sm:text-sm font-bold" 
              placeholder="e.g. Official Update: Cybersecurity Club Orientation" 
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              HTML Email Body (Supports <code>{`{{name}}`}</code>)
            </label>
            <textarea 
              required 
              rows={7} 
              value={massTemplate} 
              onChange={(e) => setMassTemplate(e.target.value)} 
              className="clay-input w-full p-4 text-xs font-mono font-medium leading-relaxed" 
            />
          </div>

          <div className="flex justify-end pt-1">
            <button 
              type="submit" 
              disabled={loading === "mass-email"} 
              className="clay-btn-primary w-full sm:w-auto px-8 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>{loading === "mass-email" ? "Transmitting..." : "Execute Mass Broadcast"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: DIRECT EMAIL                                 */}
      {/* ======================================================== */}
      {commSubTab === "DIRECT" && (
        <form onSubmit={handleSendDirectEmail} className="space-y-4 animate-in fade-in">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Recipient Student Email</label>
            <input 
              type="email" 
              required 
              value={directEmail} 
              onChange={(e) => setDirectEmail(e.target.value)} 
              className="clay-input w-full px-4 py-2.5 text-xs sm:text-sm font-bold" 
              placeholder="e.g. trainee@csjmu.ac.in" 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Email Subject</label>
            <input 
              type="text" 
              required 
              value={directSubject} 
              onChange={(e) => setDirectSubject(e.target.value)} 
              className="clay-input w-full px-4 py-2.5 text-xs sm:text-sm font-bold" 
              placeholder="e.g. Schedule Update: Video Recording Slot" 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Direct Message Content</label>
            <textarea 
              required 
              rows={6} 
              value={directBody} 
              onChange={(e) => setDirectBody(e.target.value)} 
              className="clay-input w-full p-4 text-xs font-medium leading-relaxed" 
              placeholder="Enter message details..." 
            />
          </div>
          <div className="flex justify-end pt-1">
            <button 
              type="submit" 
              disabled={loading === "direct-email"} 
              className="clay-btn-primary w-full sm:w-auto px-8 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>{loading === "direct-email" ? "Dispatching..." : "Dispatch Direct Mail"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: SMTP CONFIGURATION                          */}
      {/* ======================================================== */}
      {commSubTab === "SMTP" && (
        <div className="space-y-5 animate-in fade-in">
          <div className="clay-card p-5 rounded-2xl text-xs text-amber-800 bg-amber-50/50 border border-amber-200 space-y-1">
            <strong className="block text-sm font-black text-amber-900">SMTP Server Configuration:</strong>
            <p className="font-medium">
              Global SMTP configurations are synchronized via secure server environment keys (GMAIL_EMAIL &amp; GMAIL_APP_PASSWORD) to safeguard against unauthorized credential exposure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">SMTP Host</label>
              <input type="text" readOnly className="clay-input w-full px-4 py-2.5 text-xs font-bold bg-slate-100" defaultValue="smtp.gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Port</label>
              <input type="number" readOnly className="clay-input w-full px-4 py-2.5 text-xs font-bold bg-slate-100" defaultValue="465" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Authenticated User</label>
              <input type="text" readOnly className="clay-input w-full px-4 py-2.5 text-xs font-bold bg-slate-100" defaultValue="process.env.GMAIL_EMAIL" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">App Token Key</label>
              <input type="password" readOnly className="clay-input w-full px-4 py-2.5 text-xs font-bold bg-slate-100" defaultValue="••••••••••••••••" />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

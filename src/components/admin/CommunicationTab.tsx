"use client";

import { useState, useEffect } from "react";
import { sendInvitesToShortlisted, sendMassEmails, sendDirectEmail } from "@/actions/admin";
import { Send, PlusCircle, Trash2 } from "lucide-react";

export default function CommunicationTab({ slot }: { slot: any }) {
  const [commSubTab, setCommSubTab] = useState<"SCREENING" | "MASS" | "DIRECT">("SCREENING");
  const [loading, setLoading] = useState<string>("");
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
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleSendScreeningInvites() {
    setLoading("screening-email");
    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F2547;">
        ${screeningTemplate.replace(/\n/g, '<br/>')}
      </div>
    `;
    const res = await sendInvitesToShortlisted(slot.id, formattedHtml);
    if (res.error) notify(res.error, "error");
    else notify(res.message || "Invites dispatched successfully.");
    setLoading("");
  }

  function handlePermanentSave() {
    localStorage.setItem("savedScreeningTemplate", screeningTemplate);
    notify("Template permanently saved as default.");
  }

  async function handleSendMassEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("mass-email");
    const res = await sendMassEmails(massRecipients, massSubject, massTemplate);
    if (res.error) notify(res.error, "error");
    else {
      notify(res.message || "Mass broadcast successful.");
      setMassRecipients([{ name: "", email: "" }]);
    }
    setLoading("");
  }

  async function handleSendDirectEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("direct-email");
    const res = await sendDirectEmail(directEmail, directSubject, directBody);
    if (res.error) notify(res.error, "error");
    else {
      notify(res.message || "Direct email dispatched.");
      setDirectEmail(""); setDirectSubject(""); setDirectBody("");
    }
    setLoading("");
  }

  const addMassRecipientRow = () => setMassRecipients([...massRecipients, { name: "", email: "" }]);
  const removeMassRecipientRow = (index: number) => setMassRecipients(massRecipients.filter((_, i) => i !== index));
  const updateMassRecipient = (index: number, field: "name" | "email", value: string) => {
    const updated = [...massRecipients];
    updated[index][field as "name" | "email"] = value;
    setMassRecipients(updated);
  };

  return (
    <section className="clay-card p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">Communication Module</h2>
          <p className="text-xs text-slate-500 mt-1">Manage and dispatch personalized emails directly from the server.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
          <button onClick={() => setCommSubTab("SCREENING")} className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${commSubTab === "SCREENING" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Approved Mail Editor</button>
          <button onClick={() => setCommSubTab("MASS")} className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${commSubTab === "MASS" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Mass Broadcast</button>
          <button onClick={() => setCommSubTab("DIRECT")} className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${commSubTab === "DIRECT" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Direct Mail</button>
        </div>
      </div>

      {commSubTab === "SCREENING" && (
        <div className="space-y-5 animate-in fade-in">
          <div className="clay-inset p-4 rounded-xl text-xs text-slate-600 bg-blue-50/50 border border-blue-100">
            <strong>Dynamic Variables:</strong> Use <code>{`{{name}}`}</code> and <code>{`{{topic}}`}</code> in your text. The system will automatically format this into a professional HTML email and inject candidate details before dispatching.
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Content Editor (Plain Text)</label>
            <textarea 
              rows={10} 
              value={screeningTemplate} 
              onChange={(e) => setScreeningTemplate(e.target.value)}
              className="clay-input w-full px-4 py-3 text-sm font-sans leading-relaxed whitespace-pre-wrap" 
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <button onClick={handlePermanentSave} className="clay-btn w-full sm:w-auto px-5 sm:px-6 py-3 text-xs sm:text-sm font-bold text-slate-600 hover:text-blue-700 text-center">
              Save as Default Template
            </button>
            <button onClick={handleSendScreeningInvites} disabled={loading === "screening-email" || selectedStudents.length === 0} className="clay-btn-primary w-full sm:w-auto px-6 sm:px-8 py-3 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              <span>{loading === "screening-email" ? "Transmitting..." : `Dispatch to ${selectedStudents.length} Candidate(s)`}</span>
            </button>
          </div>
        </div>
      )}

      {commSubTab === "MASS" && (
        <form onSubmit={handleSendMassEmail} className="space-y-6 animate-in fade-in">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Recipient Matrix (Name &amp; Email)</label>
              <button type="button" onClick={addMassRecipientRow} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                <PlusCircle className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            
            {massRecipients.map((recipient, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-2 rounded-xl border border-slate-200">
                <input type="text" required placeholder="Name (e.g. Rahul)" value={recipient.name} onChange={(e) => updateMassRecipient(index, "name", e.target.value)} className="clay-input flex-1 px-3 py-2 text-base sm:text-xs" />
                <input type="email" required placeholder="Email Address" value={recipient.email} onChange={(e) => updateMassRecipient(index, "email", e.target.value)} className="clay-input flex-1 px-3 py-2 text-base sm:text-xs" />
                <button type="button" onClick={() => removeMassRecipientRow(index)} disabled={massRecipients.length === 1} className="self-end sm:self-center p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Broadcast Subject</label>
            <input type="text" required value={massSubject} onChange={(e) => setMassSubject(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm" placeholder="Subject line..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">HTML Payload (Use <code>{`{{name}}`}</code> for personalization)</label>
            <textarea required rows={6} value={massTemplate} onChange={(e) => setMassTemplate(e.target.value)} className="clay-input w-full px-4 py-3 text-sm font-mono" />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading === "mass-email"} className="clay-btn-primary w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              <span>{loading === "mass-email" ? "Transmitting..." : "Execute Mass Broadcast"}</span>
            </button>
          </div>
        </form>
      )}

      {commSubTab === "DIRECT" && (
        <form onSubmit={handleSendDirectEmail} className="space-y-5 animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Recipient Email Address</label>
            <input type="email" required value={directEmail} onChange={(e) => setDirectEmail(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm" placeholder="e.g. student@csjmu.ac.in" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Communication Subject</label>
            <input type="text" required value={directSubject} onChange={(e) => setDirectSubject(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm" placeholder="e.g. Urgent: Presentation Rescheduled" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Message Body (Supports HTML formatting)</label>
            <textarea required rows={6} value={directBody} onChange={(e) => setDirectBody(e.target.value)} className="clay-input w-full px-4 py-3 text-sm font-mono" placeholder="<h2>Hello,</h2><p>Write your message here...</p>" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading === "direct-email"} className="clay-btn-primary w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              <span>{loading === "direct-email" ? "Transmitting..." : "Dispatch Secure Email"}</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
"use client";

import { useState } from "react";
import { Video, Users, Send, Settings as SettingsIcon } from "lucide-react";
import WorkflowTab from "@/components/admin/WorkflowTab";
import TeamTab from "@/components/admin/TeamTab";
import CommunicationTab from "@/components/admin/CommunicationTab";
import SettingsTab from "@/components/admin/SettingsTab";

type Trainee = {
  id: string;
  course: string;
  semester: string;
  topicInterested: string;
  status: string;
  appliedAt: Date;
  weeklySlotId: string | null;
  user: { name: string; email: string; };
};

type Slot = {
  id: string;
  theme: string | null;
  isPublished: boolean;
  selectedTrainees: Trainee[];
};

export default function AdminDashboardClient({ 
  initialSlot, 
  initialApplications 
}: { 
  initialSlot: Slot; 
  initialApplications: Trainee[];
}) {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "TEAM" | "COMMUNICATION" | "SETTINGS">("WORKFLOW");

  return (
    <div className="space-y-6 pb-16">
      {/* Supreme Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab("WORKFLOW")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "WORKFLOW" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Presenter Workflow</div>
        </button>
        <button onClick={() => setActiveTab("TEAM")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "TEAM" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Team Management</div>
        </button>
        <button onClick={() => setActiveTab("COMMUNICATION")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "COMMUNICATION" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Send className="w-4 h-4" /> Communication</div>
        </button>
        <button onClick={() => setActiveTab("SETTINGS")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "SETTINGS" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> System Settings</div>
        </button>
      </div>

      {/* Tab Rendering Logic */}
      {activeTab === "WORKFLOW" && (
        <WorkflowTab 
          initialSlot={initialSlot} 
          initialApplications={initialApplications} 
          onNavigateToComm={() => setActiveTab("COMMUNICATION")} 
        />
      )}
      
      {activeTab === "TEAM" && <TeamTab />}
      {activeTab === "COMMUNICATION" && <CommunicationTab slot={initialSlot} />}
      {activeTab === "SETTINGS" && <SettingsTab />}
    </div>
  );
}
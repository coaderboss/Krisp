"use client";

import { Users, Shield } from "lucide-react";

export default function TeamTab() {
  return (
    <section className="clay-card p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F2547]">Executive Access Control</h2>
          <p className="text-xs text-slate-500 mt-1">Authorize or revoke access for Core Team members.</p>
        </div>
        <button className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
          <Shield className="w-4 h-4" /> Add Executive Member
        </button>
      </div>
      
      <div className="clay-inset p-8 text-center rounded-2xl border border-dashed border-slate-300">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-700">Team Roster Deployment Pending</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
          In the upcoming phase, all registered users will populate here. Supreme Admin will have the authority to assign the "EXECUTIVE" role and grant explicit login approvals.
        </p>
      </div>
    </section>
  );
}
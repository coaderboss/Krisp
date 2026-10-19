"use client";

export default function SettingsTab() {
  return (
    <section className="clay-card p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F2547]">Global System Settings</h2>
          <p className="text-xs text-slate-500 mt-1">Manage dynamic forms, presentation topics, executive approvals, and storage.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dynamic Form Controller */}
        <div className="clay-inset p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Student Form Builder</h3>
          <p className="text-xs text-slate-500">Configure what fields students see during enrollment.</p>
          <div className="space-y-2">
            <button className="clay-btn w-full py-2.5 text-xs font-bold text-left px-4 flex justify-between">
              <span>Manage Presentation Topics</span>
              <span className="text-blue-600">Edit ➔</span>
            </button>
            <button className="clay-btn w-full py-2.5 text-xs font-bold text-left px-4 flex justify-between">
              <span>Toggle Required Fields</span>
              <span className="text-blue-600">Edit ➔</span>
            </button>
          </div>
        </div>

        {/* Storage & Uploads Manager */}
        <div className="clay-inset p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Storage & File Management</h3>
          <p className="text-xs text-slate-500">Monitor and delete files uploaded by students or executives.</p>
          <button className="clay-btn w-full py-2.5 text-xs font-bold text-left px-4 flex justify-between items-center">
            <span>View Media Library</span>
            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600">0 MB Used</span>
          </button>
        </div>
      </div>
    </section>
  );
}
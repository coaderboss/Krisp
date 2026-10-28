"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Terminal, ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [text, setText] = useState("");
  const [showButton, setShowButton] = useState(false);
  
  const fullText = `> CRITICAL ERROR: UNAUTHORIZED ROUTE ACCESSED.
> INITIATING TRACE PROTOCOL...
> IP ADDRESS CAPTURED AND LOGGED.
> UPLOADING BROWSER HISTORY TO SERVER...
> DISPATCHING CYBER RESPONSE TEAM TO YOUR LOCATION...
> 
> ...
> ...
> SYSTEM OVERRIDE: THREAT NEUTRALIZED.
> 
> Error 404: The requested sector does not exist.
> Just kidding. You've reached a dead end. 
> Return to base immediately before we actually track you.`;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        clearInterval(timer);
        setTimeout(() => setShowButton(true), 1000);
      }
    }, 40); 
    
    return () => clearInterval(timer);
  }, [fullText]);

  // 🟢 FIX: Added 'fixed inset-0 z-[100]' to break out of the layout container and cover the full screen
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 font-mono overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
      
      <div className="max-w-2xl w-full z-10 space-y-6">
        <div className="flex items-center gap-4 text-red-500 mb-8 animate-pulse">
          <ShieldAlert className="w-12 sm:w-16 h-12 sm:h-16 shrink-0" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest">SYSTEM BREACH 404</h1>
        </div>
        
        <div className="bg-slate-900 border border-green-500/30 p-6 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.1)] min-h-[300px]">
          <div className="flex items-center gap-2 mb-4 border-b border-green-500/20 pb-2">
            <Terminal className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-500/70">root@cyberkrisp-server:~#</span>
          </div>
          <pre className="text-green-400 font-mono text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {text}
            <span className="animate-pulse">_</span>
          </pre>
        </div>

        {showButton && (
          <div className="flex justify-center pt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <Link 
              href="/" 
              className="bg-green-500 hover:bg-green-400 text-slate-950 px-8 py-3 rounded-none font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-[6px_6px_0px_rgba(34,197,94,0.3)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
            >
              <ArrowLeft className="w-5 h-5" /> Abort Sequence & Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
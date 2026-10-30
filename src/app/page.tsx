import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { 
  Sparkles, Video, Calendar, ArrowRight, Award, CheckCircle2, Users, FileText,
  Clock, Shield, Play, Flame, Ticket, ExternalLink, Compass, Layers, Tv,
  Check, Building2, GraduationCap, Mail, Presentation, Mic, BrainCircuit
} from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export const instant = false;

export default async function HomePage() {
  // Safe fetch real-time live data from database
  let registeredCount = 0;
  let activeSlot: any = null;
  let pastSlots: any[] = [];
  let activeForms: any[] = [];
  let totalEventResponses = 0;
  let globalMedia: any = null; // 🟢 FIX: Initialize Global Media Variable

  try {
    const results = await Promise.all([
      prisma.application.count(),
      // 🟢 FIX: Fetch Global Media Settings from database
      prisma.clubSettings.findUnique({ where: { id: "global" } }),
      prisma.weeklySlot.findFirst({
        where: { isPublished: true },
        include: { selectedTrainees: { include: { user: true } } },
        orderBy: { weekStartDate: "desc" },
      }),
      prisma.weeklySlot.findMany({
        where: { isPublished: true },
        include: { selectedTrainees: { include: { user: true } } },
        orderBy: { weekEndDate: "desc" },
        take: 4,
      }),
      prisma.form.findMany({
        where: { isActive: true },
        include: { questions: { select: { id: true } } },
        orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
        take: 4
      }),
      prisma.formResponse.count()
    ]);

    registeredCount = results[0];
    globalMedia = results[1]; // 🟢 FIX: Map Database Setting
    activeSlot = results[2];
    pastSlots = results[3];
    activeForms = results[4];
    totalEventResponses = results[5];
  } catch (err) {
    console.warn("HomePage: Database fetch deferred or offline during build.");
  }

  const activeTrainees = activeSlot?.selectedTrainees || [];
  const totalCommunityReach = registeredCount + totalEventResponses;

  // 🟢 FIX: Safely parse dynamic media array and extract the first URL (Fallback to default)
  let officialReelUrl = "https://www.instagram.com/p/DekdEaWzhSa/embed/";
  try {
    if (globalMedia?.mediaUrls) {
      const parsedUrls = JSON.parse(globalMedia.mediaUrls);
      if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
        // Extract exact URL whether it's saved as string or object {type, url}
        const firstItem = parsedUrls[0];
        const rawUrl = typeof firstItem === "object" && firstItem.url ? firstItem.url : firstItem;
        
        // Auto-format Instagram URLs for strict iframe embedding
        if (rawUrl && typeof rawUrl === "string") {
          if (rawUrl.includes("instagram.com") && !rawUrl.includes("/embed")) {
            officialReelUrl = rawUrl.split("?")[0].replace(/\/$/, "") + "/embed/";
          } else {
            officialReelUrl = rawUrl;
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse global media URLs:", e);
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans selection:bg-blue-200">
      
      {/* ========================================================= */}
      {/* 1. HERO SECTION: 3D CLAY BROADCAST HEADQUARTERS           */}
      {/* ========================================================= */}
      <section className="relative pt-6 sm:pt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="clay-card bg-white p-8 sm:p-12 md:p-16 rounded-[40px] relative overflow-hidden shadow-[inset_0px_-10px_20px_rgba(0,0,0,0.03),_10px_10px_30px_rgba(200,208,230,0.5)]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/3 translate-y-1/3" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
            
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-black tracking-widest shadow-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> CYBERSECURITY CLUB
                </span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Learn • Present • Lead
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F2547] tracking-tight leading-[1.1]">
                  Weekly Video <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    Bulletin Program
                  </span>
                </h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
                  A flagship initiative empowering students to research high-impact cybersecurity domains, record professional video sessions with our in-house production team, and gain visibility across official academic channels.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 pt-2">
                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 transition-all">
                  <Users className="w-5 h-5" /> Enroll in Queue
                </Link>
                <a href="#featured-roster" className="bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 px-8 py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm">
                  <Play className="w-5 h-5 text-amber-500" /> View Current Batch
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
              <div className="w-full max-w-[380px] bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-[20px_20px_60px_rgba(0,0,0,0.15)] border-4 border-slate-800 relative transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-xs font-black tracking-widest text-slate-300 uppercase">Studio Live</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-900/50 text-blue-300 border border-blue-800">
                    Ep. {pastSlots.length + 1}
                  </span>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-4 shadow-inner">
                  <Tv className="w-10 h-10 text-blue-500 mx-auto" />
                  <div>
                    <h3 className="font-extrabold text-white text-base">Media Cell Recording</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-widest">Fridays • 4:00 PM IST</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">Shortlisted:</span>
                    <span className="font-black text-amber-400">{activeTrainees.length > 0 ? `${activeTrainees.length}/2` : "In Progress"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. FLOATING METRICS BAR (Overlap Effect)                  */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12">
        <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 rounded-[28px] border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-slate-100">
          <div className="text-center px-2">
            <p className="text-2xl sm:text-3xl font-black text-blue-600">{registeredCount}</p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Applicants</p>
          </div>
          <div className="text-center px-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-500">2<span className="text-lg">/wk</span></p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Active Slots</p>
          </div>
          <div className="text-center px-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{activeForms.length}</p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Initiatives</p>
          </div>
          <div className="text-center px-2">
            <p className="text-2xl sm:text-3xl font-black text-purple-600">{totalCommunityReach}</p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Community Reach</p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CORE BENEFITS (WHY JOIN)                               */}
      {/* ========================================================= */}
      <section className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">Why Become A Presenter?</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">A Platform Built for Future Tech Leaders</h2>
            <p className="text-base text-slate-600 font-medium leading-relaxed max-w-2xl">
              An official ecosystem designed to showcase your technical expertise, eliminate stage fear, and elevate your corporate soft skills for the modern digital era.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5"><BrainCircuit className="w-6 h-6" /></div>
            <h3 className="font-extrabold text-[#0F2547] text-lg mb-2">Deep Technical Mastery</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">Conducting deep-dive research on a specific cybersecurity vector permanently solidifies your foundational knowledge.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-5"><Presentation className="w-6 h-6" /></div>
            <h3 className="font-extrabold text-[#0F2547] text-lg mb-2">Executive Presentation</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">Collaborate with core mentors to structure high-impact slides, enhancing your ability to articulate complex ideas clearly.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5"><Mic className="w-6 h-6" /></div>
            <h3 className="font-extrabold text-[#0F2547] text-lg mb-2">Unshakeable Confidence</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">Facing a professional camera setup eliminates stage fright, preparing you for high-stakes corporate interviews and meetings.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-5"><Award className="w-6 h-6" /></div>
            <h3 className="font-extrabold text-[#0F2547] text-lg mb-2">Verifiable Portfolio</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">Your recorded session is published on official handles, providing a verifiable digital footprint for your Resume and LinkedIn.</p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. FOCUS DOMAINS (THE CURRICULUM)                         */}
      {/* ========================================================= */}
      <section className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white p-8 sm:p-12 rounded-[40px] shadow-sm border border-slate-200/60 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-2"><Compass className="w-7 h-7 text-indigo-600" /></div>
            <h2 className="text-3xl font-black text-[#0F2547] tracking-tight">Approved Research Domains</h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              We cover a broad spectrum of information security disciplines. Whether you are a beginner exploring the basics or an advanced student diving into cryptography, you can select a topic that aligns with your career trajectory.
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-indigo-600 font-extrabold text-sm flex items-center gap-2 hover:text-indigo-800 transition-colors">
                Explore full curriculum in the portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="lg:col-span-7">
            <div className="flex flex-wrap gap-3">
              {[
                "Web App Security (OWASP)", "Network Defense & Wireshark", "Malware & Ransomware Vectors",
                "Bug Bounty Hunting", "Social Engineering", "Linux Privilege Escalation",
                "OSINT & Forensics", "Cloud Security (AWS/Azure)", "Applied Cryptography",
                "Zero Trust Architecture", "API Vulnerabilities", "Endpoint Detection (EDR)"
              ].map((domain, i) => (
                <span key={i} className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 px-4 py-2.5 rounded-xl border border-slate-200 transition-colors cursor-default">
                  {domain}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. THE REAL 6-STEP PRESENTER JOURNEY (SCROLL SNAP)        */}
      {/* ========================================================= */}
      <section id="journey" className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4"/> Workflow Architecture</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">The Presenter Journey</h2>
          </div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-widest hidden sm:flex items-center gap-2 select-none">
            Swipe Horizontally <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Horizontal Flow Container with Connecting Lines */}
        <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory no-scrollbar pb-12 pt-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-6 sm:gap-8 w-full relative">
          
          {/* Background Connection Line for Desktop */}
          <div className="absolute top-24 left-8 right-8 h-1 bg-slate-200 rounded-full hidden md:block -z-10"></div>

          {[
            { step: "01", icon: Shield, title: "Register & Verify", desc: "Create an account on the portal and verify your institutional credentials.", highlight: "bg-blue-50 text-blue-600", border: "border-blue-100" },
            { step: "02", icon: FileText, title: "Topic Selection", desc: "Submit the master application and propose your preferred cybersecurity topic.", highlight: "bg-indigo-50 text-indigo-600", border: "border-indigo-100" },
            { step: "03", icon: Users, title: "The Waiting Queue", desc: "Enter our transparent FIFO queue. Every registered student is guaranteed an opportunity.", highlight: "bg-amber-50 text-amber-600", border: "border-amber-100" },
            { step: "04", icon: Mail, title: "Official Invitation", desc: "Receive an official screening invitation via your registered email when your slot arrives.", highlight: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
            { step: "05", icon: BrainCircuit, title: "Mentorship & Screening", desc: "Attend a brief consultation with the core team to refine your presentation structure.", highlight: "bg-purple-50 text-purple-600", border: "border-purple-100" },
            { step: "06", icon: Video, title: "Studio Recording", desc: "Deliver your presentation in our studio. The finalized video is published across official networks.", highlight: "bg-rose-50 text-rose-600", border: "border-rose-100" },
          ].map((item, idx) => (
            <div key={idx} className={`snap-center shrink-0 w-[280px] sm:w-[320px] bg-white p-7 rounded-[32px] border ${item.border} shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] relative group hover:-translate-y-2 transition-transform duration-300 flex flex-col`}>
              
              {/* Abstract Visual Graphic Element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-white rounded-bl-full z-0 opacity-80 overflow-hidden pointer-events-none">
                <div className="absolute top-4 right-4 w-16 h-16 rounded-full border-4 border-slate-100/80"></div>
                <div className="absolute top-12 right-12 w-4 h-4 rounded-full bg-slate-100"></div>
              </div>

              {/* Fixed Visible Number (Removed leading-none to prevent clipping, darkened color) */}
              <div className="absolute top-4 right-5 text-5xl sm:text-6xl font-black text-slate-200 select-none group-hover:scale-110 group-hover:text-slate-300 transition-all duration-300 z-0">
                {item.step}
              </div>
              
              {/* Node Connector (For Desktop Line) */}
              <div className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-[4px] border-slate-300 shadow-sm z-10 ring-4 ring-white"></div>

              <div className={`w-14 h-14 rounded-2xl ${item.highlight} flex items-center justify-center mb-8 relative z-10 shadow-sm`}>
                <item.icon className="w-7 h-7" />
              </div>
              
              <div className="relative z-10 mt-auto">
                {/* Interactive Progress Line */}
                <div className="w-full h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className={`h-full w-0 group-hover:w-full transition-all duration-700 ease-out ${item.highlight.split(' ')[0]}`}></div>
                </div>

                <h3 className="font-extrabold text-[#0F2547] text-xl mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. INSTAGRAM REEL BROADCAST INTEGRATION                   */}
      {/* ========================================================= */}
      <section className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-black text-pink-600 uppercase tracking-widest flex items-center gap-2 bg-pink-50 w-max px-3 py-1.5 rounded-full border border-pink-100">
              <InstagramIcon className="w-4 h-4"/> Official Media Channel
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F2547] tracking-tight leading-tight">Watch Our Latest Episode</h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Experience the quality of our student-led cybersecurity briefings. Our content is professionally edited and hosted directly on our official social media channels, ensuring zero lag and maximum visibility for the presenters.
            </p>
            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-600"/></div>
                <div>
                  <h4 className="font-extrabold text-[#0F2547] text-sm">Professional Editing</h4>
                  <p className="text-xs text-slate-500 mt-1">Our media cell handles audio engineering, graphics, and video production.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-600"/></div>
                <div>
                  <h4 className="font-extrabold text-[#0F2547] text-sm">Zero Database Bloat</h4>
                  <p className="text-xs text-slate-500 mt-1">Videos are securely streamed via Instagram's architecture for a lightning-fast portal experience.</p>
                </div>
              </div>
            </div>
            <div className="pt-6">
               <a href="https://www.instagram.com/uiet.cybersecurityclub?stkn=MXBub2VyN3plMGN3cg==" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl text-sm font-extrabold shadow-lg hover:bg-slate-800 transition-colors">
                 <InstagramIcon className="w-4 h-4" /> Follow the Official Handle
               </a>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            {/* Sleek Mobile Phone Mockup for Instagram Reel */}
            <div className="w-full max-w-[340px] aspect-[9/16] bg-slate-100 rounded-[40px] border-[10px] border-slate-900 shadow-2xl relative overflow-hidden flex items-center justify-center">
              {/* iPhone Notch Mockup */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20 pointer-events-none">
                <div className="w-32 h-5 bg-slate-900 rounded-b-xl"></div>
              </div>
              
              <div className="w-full h-full relative z-10 bg-white">
                <iframe 
                src={officialReelUrl}
                className="w-full h-full absolute inset-0 border-0"
                scrolling="no"
                allow="encrypted-media"
              ></iframe>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. SPOTLIGHT: FEATURED PRESENTERS                         */}
      {/* ========================================================= */}
      <section id="featured-roster" className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
        <div className="bg-white p-8 sm:p-12 rounded-[40px] shadow-[inset_0px_0px_0px_1px_rgba(226,232,240,1),_0_20px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
            <div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2"><Award className="w-4 h-4"/> Club Spotlight</span>
              <h2 className="text-3xl font-black text-[#0F2547] tracking-tight">Active Presenter Roster</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">Candidates who have successfully cleared the technical screening phase.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Batch: {activeSlot?.theme || "Current Cycle"}
            </div>
          </div>

          {activeTrainees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTrainees.map((trainee: any, idx: number) => (
                <div key={trainee.id} className="bg-slate-50 border border-slate-200/80 p-6 sm:p-8 rounded-[32px] relative flex gap-6 items-center hover:bg-blue-50/50 transition-colors">
                  <div className="w-20 h-20 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-600">{trainee.user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Presenter 0{idx + 1}</span>
                    <h3 className="font-extrabold text-[#0F2547] text-xl truncate">{trainee.user.name}</h3>
                    <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 truncate">
                      Topic: <span className="text-blue-700">{trainee.topicInterested}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-400 mx-auto mb-4" />
              <h3 className="font-extrabold text-[#0F2547] text-lg">Batch Processing Initiated</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto font-medium">The administrative core is currently shortlisting candidates for the upcoming iteration. Authenticate and enroll to secure your position.</p>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. EVENT HUB (MULTI-FORM ENGINE)                          */}
      {/* ========================================================= */}
      <section id="events" className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2 mb-2"><Layers className="w-4 h-4"/> Event Framework</span>
            <h2 className="text-3xl font-black text-[#0F2547] tracking-tight">Active Forms & Registrations</h2>
          </div>
          <Link href="/dashboard" className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-6 py-3 rounded-2xl text-xs font-black transition-colors flex items-center gap-2">
            Access Student Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeForms.map((form) => (
            <div key={form.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex flex-col justify-between hover:border-blue-300 transition-colors h-full space-y-4">
              <div className="space-y-4">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider inline-block ${form.isMaster ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                  {form.isMaster ? "⭐ Core Program" : "📅 Club Initiative"}
                </span>
                <h3 className="font-extrabold text-[#0F2547] text-base leading-snug line-clamp-2">{form.title}</h3>
              </div>
              <Link href="/login" className="w-full bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 py-3 rounded-xl text-xs font-black transition-colors text-center border border-slate-200 hover:border-blue-600">
                Authenticate to Register
              </Link>
            </div>
          ))}
          {activeForms.length === 0 && (
             <div className="col-span-full py-10 text-center bg-white rounded-[32px] border border-slate-200/60 text-slate-500 font-bold text-sm">
               Currently no active forms deployed by the administration.
             </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. PROFESSIONAL FOOTER                                    */}
      {/* ========================================================= */}
      <footer className="mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white p-8 sm:p-12 rounded-[40px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-200/60 grid grid-cols-1 md:grid-cols-12 gap-10">
          
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm"><Image src="/cyberpng.png" alt="Logo" width={56} height={56} className="w-full h-full object-contain" /></div>
              <div>
                <h3 className="font-black text-lg text-[#0F2547] tracking-tight">CYBERSECURITY CLUB</h3>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">UIET • CSJM University Kanpur</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
              The official student committee dedicated to technical research, ethical cybersecurity awareness, and professional communication mastery.
            </p>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Navigation Architecture</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-600">
              <li><Link href="/login" className="hover:text-blue-600 transition-colors">Student Authorization Portal</Link></li>
              <li><a href="#featured-roster" className="hover:text-blue-600 transition-colors">Active Presenter Roster</a></li>
              <li><a href="#journey" className="hover:text-blue-600 transition-colors">System Workflow</a></li>
              <li><a href="#events" className="hover:text-blue-600 transition-colors">Live Event Hub</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Network</h4>
            <a href="https://www.instagram.com/uiet.cybersecurityclub?stkn=MXBub2VyN3plMGN3cg==" target="_blank" rel="noreferrer" className="block bg-gradient-to-br from-pink-50 to-amber-50 p-5 rounded-2xl border border-pink-100 hover:scale-[1.02] transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <InstagramIcon className="w-6 h-6 text-pink-600" />
                <span className="font-black text-[#0F2547]">@uiet.cybersecurityclub</span>
              </div>
              <p className="text-xs font-medium text-slate-600">Follow the official channels for administrative updates, bulletin broadcasts, and event media.</p>
            </a>
          </div>

        </div>
        <div className="text-center pt-6 pb-4 text-xs font-bold text-slate-400">
          &copy; {new Date().getFullYear()} Cybersecurity Club, UIET CSJMU Kanpur. All intellectual properties reserved.
        </div>
      </footer>

    </div>
  );
}
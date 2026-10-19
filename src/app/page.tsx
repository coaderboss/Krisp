import Link from "next/link";
import prisma from "@/lib/prisma";
import { 
  Sparkles, 
  Video, 
  Calendar, 
  ArrowRight, 
  Award, 
  CheckCircle2, 
  Users, 
  Sliders, 
  FileText,
  Clock
} from "lucide-react";

export const instant = false;

export default async function HomePage() {
  // Fetch real-time data from database (no dummy hardcoding)
  const [registeredCount, activeSlot, pastSlots] = await Promise.all([
    prisma.application.count(),
    prisma.weeklySlot.findFirst({
      where: { isPublished: true },
      include: {
        selectedTrainees: {
          include: { user: true },
        },
      },
      orderBy: { weekStartDate: "desc" },
    }),
    prisma.weeklySlot.findMany({
      where: { isPublished: true },
      include: {
        selectedTrainees: {
          include: { user: true },
        },
      },
      orderBy: { weekEndDate: "desc" },
      take: 3,
    }),
  ]);

  const activeTrainees = activeSlot?.selectedTrainees || [];

  return (
    <div className="space-y-10 pb-12">
      {/* 1. HERO SECTION */}
      <section className="clay-card p-6 sm:p-10 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="clay-badge-blue px-3 py-1 rounded-full text-xs font-extrabold tracking-wide">
                UIET • CSJM UNIVERSITY KANPUR
              </span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Learn • Communicate • Present • Grow
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0F2547] tracking-tight leading-tight">
                Weekly Cybersecurity <br />
                <span className="text-blue-600">Video Bulletin</span>
              </h1>
              <div>
                <span className="clay-badge-amber inline-block px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase">
                  Student Presenter Program
                </span>
              </div>
            </div>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
              A continuous initiative where students get the opportunity to research a{" "}
              <strong className="text-slate-900 font-semibold">cybersecurity topic</strong>, present it in our{" "}
              <strong className="text-slate-900 font-semibold">Weekly Video Bulletin</strong>, and be featured on the official{" "}
              <strong className="text-slate-900 font-semibold">Cybersecurity Club platform</strong>. Every registered student gets a turn—if not selected on the first attempt, you remain prioritized for future weeks!
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/login" className="clay-btn-primary px-5 py-3 text-sm flex items-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                <Users className="w-4 h-4" />
                <span>Enroll as Student Presenter</span>
              </Link>
              <Link href="/admin" className="clay-btn px-5 py-3 text-sm flex items-center gap-2 hover:bg-blue-50/50">
                <Sliders className="w-4 h-4 text-slate-600" />
                <span>Manage Weekly Shortlist (Admin)</span>
              </Link>
              <a href="#journey" className="clay-btn px-3.5 py-3 text-xs flex items-center gap-1.5 text-slate-500 hover:text-slate-800">
                <FileText className="w-3.5 h-3.5" />
                <span>Program Flow</span>
              </a>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
              <div className="clay-pill px-3 py-2.5 text-center">
                <p className="text-lg font-black text-blue-600">{registeredCount}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered Pool</p>
              </div>
              <div className="clay-pill px-3 py-2.5 text-center">
                <p className="text-lg font-black text-amber-500">2</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presenters / Week</p>
              </div>
              <div className="clay-pill px-3 py-2.5 text-center">
                <p className="text-lg font-black text-emerald-600">{activeTrainees.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shortlist Active</p>
              </div>
              <div className="clay-pill px-3 py-2.5 text-center">
                <p className="text-sm font-black text-slate-700 mt-1">Auto-Queue</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Mode</p>
              </div>
            </div>
          </div>

          {/* Hero Right: 3D Clay Broadcasting Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="clay-navy w-full max-w-sm p-6 relative rounded-3xl border-2 border-blue-400/20 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-blue-400/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-extrabold tracking-wider text-blue-200 uppercase">
                    {activeSlot ? `Batch: ${activeSlot.theme || "Active Week"}` : "Weekly Studio Live"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  Target: 2/Wk
                </span>
              </div>

              {/* Graphic Mockup */}
              <div className="clay-card bg-slate-900/60 p-5 rounded-2xl border border-white/10 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl clay-soft-blue flex items-center justify-center shadow-inner">
                  <Video className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Studio Recording & Screening</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Fridays • 4:00 PM IST (UIET Media Cell)</p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/dashboard" className="clay-btn-primary w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 font-bold uppercase tracking-wider">
                  <span>Check My Turn in Queue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE CLUB ROSTER: THIS WEEK'S SHORTLISTED & FEATURED PRESENTERS */}
      <section className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Club Roster</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">
              This Week&apos;s Shortlisted &amp; Featured Presenters
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Managed by Club Admin • Real-time selection based on merit and queue order
            </p>
          </div>

          <Link href="/admin" className="clay-btn px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-blue-50">
            <Sliders className="w-3.5 h-3.5" />
            <span>Update Selection in Admin</span>
          </Link>
        </div>

        {/* Dynamic State: If admin has selected students, display them */}
        {activeTrainees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeTrainees.map((trainee) => (
              <div key={trainee.id} className="clay-card p-5 space-y-3.5 bg-white/90">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[#0F2547] text-base">{trainee.user.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {trainee.course} • {trainee.semester}
                    </p>
                  </div>
                  <span className="clay-badge-amber px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide">
                    {trainee.status === "SCREENING_DONE" ? "Selected (Shoot Ready)" : "Shortlisted (Screening)"}
                  </span>
                </div>

                <div className="clay-inset p-3 rounded-xl text-xs font-semibold text-slate-800">
                  <span className="text-blue-700 font-bold">Topic: </span>
                  {trainee.topicInterested}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Screening: Friday, 4:00 PM IST
                  </span>
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Personalized Invite Sent
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state when Admin hasn't published/shortlisted this week's batch yet */
          <div className="clay-soft-blue p-8 text-center rounded-2xl space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl clay-card flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2547]">This Week&apos;s Presenter Roster Pending Announcement</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Club Admin is currently reviewing registered applications and shortlisting candidates for the upcoming bulletin batch. Register now to enter the queue!
            </p>
            <div className="pt-2">
              <Link href="/login" className="clay-btn-primary px-5 py-2.5 text-xs inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enroll in Queue Now</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 3. 5-STEP STUDENT PRESENTER JOURNEY */}
      <section id="journey" className="clay-card p-6 sm:p-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="clay-badge-blue px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
            How It Works?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547]">5-Step Student Presenter Journey</h2>
          <p className="text-xs sm:text-sm text-slate-500 italic">
            &ldquo;Same students. Real learning. Real conversations. For a safer digital world.&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          {[
            {
              step: "1",
              title: "Fill Registration Form",
              desc: "Verify your student email & submit your preferred cybersecurity topic.",
              tag: "Email OTP Verified",
            },
            {
              step: "2",
              title: "Weekly 2 Shortlisted",
              desc: "Every week, 2 students are shortlisted from the registered pool via Auto-Queue.",
              tag: "Personalized Invite",
            },
            {
              step: "3",
              title: "Short Screening Call",
              desc: "Brief screening round on your conceptual clarity & speaking comfort.",
              tag: "Club Mentorship",
            },
            {
              step: "4",
              title: "Prepare & Present",
              desc: "Selected students prepare their slides and record the video session in studio.",
              tag: "Studio Recording",
            },
            {
              step: "5",
              title: "Featured on Platform",
              desc: "Your video is officially published on the Cybersecurity Club media channels.",
              tag: "Official Recognition",
            },
          ].map((item) => (
            <div key={item.step} className="clay-pill p-5 space-y-3 flex flex-col justify-between text-left hover:-translate-y-1 transition-transform">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl clay-btn-primary flex items-center justify-center text-xs font-black">
                  {item.step}
                </div>
                <h3 className="font-extrabold text-sm text-[#0F2547] leading-snug">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                  {item.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. THREE INFO COLUMNS (IMPORTANT POINTS, WHAT WILL YOU GAIN, WHO CAN PARTICIPATE) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Important Points */}
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl clay-badge-amber flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-extrabold text-base text-[#0F2547]">Important Points</h3>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <span>Opportunities will be given to <strong>all registered students</strong> in rotation order.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <span>If you are not selected in the 1st attempt, you automatically remain in the priority queue.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <span>Use waiting time to polish your presentation and cybersecurity topic concepts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <span>Program focuses on peer learning, communication, and confidence building.</span>
            </li>
          </ul>
        </div>

        {/* What Will You Gain */}
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl clay-badge-blue flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="font-extrabold text-base text-[#0F2547]">What Will You Gain?</h3>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            {[
              "Deeper understanding of real-world cybersecurity concepts",
              "Improved communication and public speaking skills",
              "Hands-on security research and presentation experience",
              "Campus confidence & peer recognition across UIET CSJMU",
              "Officially published work on the Cybersecurity Club platform",
            ].map((gain, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{gain}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Who Can Participate & Mini CTA */}
        <div className="clay-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
              <div className="w-9 h-9 rounded-xl clay-pill flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-700" />
              </div>
              <h3 className="font-extrabold text-base text-[#0F2547]">Who Can Participate?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              All interested CSJM University students who want to test, improve, or showcase their cybersecurity learning and communication skills. Beginners and experienced speakers are equally welcome!
            </p>
          </div>

          <div className="clay-navy p-4 rounded-2xl space-y-2 mt-2">
            <p className="text-xs font-bold text-blue-200">Ready to Express Interest?</p>
            <p className="text-[11px] text-slate-300">Takes &lt;2 minutes • Stream: CSE / CSIT / Other</p>
            <Link href="/login" className="clay-btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
              <span>Register Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. PUBLISHED CLUB WORK: RECENT VIDEO BULLETIN EPISODES */}
      <section className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Published Club Work</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">Recent Video Bulletin Episodes</h2>
          </div>
          <Link href="/admin" className="clay-btn px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-blue-50">
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Episodes in Admin</span>
          </Link>
        </div>

        {pastSlots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pastSlots.map((slot, idx) => (
              <div key={slot.id} className="clay-card p-5 space-y-3 bg-white/95">
                <span className="clay-badge-blue px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                  Episode #{pastSlots.length - idx}
                </span>
                <h3 className="font-extrabold text-[#0F2547] text-sm leading-snug">
                  {slot.theme || "Cybersecurity Deep Dive"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Presented by: {slot.selectedTrainees.map(t => t.user.name).join(" & ") || "Club Trainees"}
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                  <span>CSJMU Club Portal</span>
                  <span className="text-slate-400">Archived</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="clay-inset p-8 text-center rounded-2xl space-y-2">
            <Video className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Episodes Will Appear Here Once Published</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              As student presenters complete their studio recordings, their published episodes and topics will be automatically archived here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
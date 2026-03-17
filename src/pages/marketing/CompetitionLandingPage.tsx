import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    FileSpreadsheet,
    Layers,
    LockKeyhole,
    Play,
    ShieldCheck,
    Smartphone,
    Terminal,
} from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';

const workflow = [
    {
        title: 'Intake Authority',
        body: 'Start with the spreadsheet or Google Sheet your team already has. Keep participant details, notes, and readiness in one operational surface.',
        icon: FileSpreadsheet,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        title: 'Act Coordination',
        body: 'Move from "rows in a sheet" to "acts in a show." Coordinate identity, runtime, and lineup without juggling separate trackers.',
        icon: Layers,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        title: 'Stage Execution',
        body: 'Give operators a dedicated console built for live-event pressure. Real-time arrival status, lineup context, and show-flow control.',
        icon: Terminal,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
];

const trustPoints = [
    {
        title: 'Role-Based Access',
        body: 'Granular controls for EventAdmin and StageManager workflows ensure PII protection and operational focus.',
    },
    {
        title: 'Native Sync',
        body: 'Built-in support for real-world spreadsheet and Google Sheet habits. Mapping, not migration.',
    },
    {
        title: 'Controlled Rollout',
        body: 'Phase 2 external submission workflows are admin-supported to ensure high-fidelity coordination for every act.',
    },
];

function SectionEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
    return (
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${dark ? 'text-teal-400' : 'text-teal-600'} mb-3`}>
            {children}
        </p>
    );
}

function MockupFrame({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`relative rounded-[2rem] border-8 border-slate-900 bg-slate-900 shadow-[0_40px_100px_-20px_rgba(2,6,23,0.3)] overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export default function CompetitionLandingPage() {
    return (
        <div className="min-h-screen bg-[#fcfdfd] text-slate-900 selection:bg-teal-500/20">
            {/* Navigation */}
            <nav className="mx-auto max-w-7xl px-6 pt-6">
                <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 p-3 backdrop-blur-xl shadow-sm">
                    <div className="flex items-center gap-2 pl-3">
                        <BrandMark size="sm" showLabel />
                    </div>
                    <div className="hidden gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 md:flex">
                        <a href="#workflow" className="transition-colors hover:text-teal-600">Workflow</a>
                        <a href="#proof" className="transition-colors hover:text-teal-600">Product Proof</a>
                        <a href="#trust" className="transition-colors hover:text-teal-600">Trust Model</a>
                    </div>
                    <Button asChild className="h-11 rounded-2xl bg-slate-900 px-6 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-slate-800">
                        <Link to="/login">Operator Access</Link>
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.12),_transparent_70%)]" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.08),_transparent_70%)]" />
                </div>

                <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-32 lg:pb-24">
                    <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:items-center">
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-4 py-2">
                                <Activity className="h-4 w-4 text-teal-600" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-700">Operations Ready</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-7xl lg:text-8xl">
                                Calm for the <span className="text-teal-600 italic">Chaos</span> of Live Events.
                            </h1>
                            <p className="max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl font-medium">
                                InOutHub gives community and program-driven events one trusted command surface for roster readiness, act coordination, and stage-day execution.
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Button asChild className="h-16 rounded-2xl bg-teal-600 px-10 text-xs font-black uppercase tracking-widest text-white hover:bg-teal-700 shadow-xl shadow-teal-500/20">
                                    <Link to="/login">
                                        Open Operator Access
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-16 rounded-2xl border-slate-200 bg-white px-10 text-xs font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50">
                                    <a href="#proof">View Product Proof</a>
                                </Button>
                            </div>
                        </div>

                        <div className="relative animate-in fade-in slide-in-from-right-4 duration-1000">
                            <MockupFrame className="aspect-[4/3] w-full">
                                <div className="bg-slate-50 h-full w-full p-2">
                                    <div className="relative h-full w-full rounded-[1.4rem] overflow-hidden border border-slate-200 bg-white">
                                        <img src="/pwa-screenshot-desktop.png" alt="InOutHub Desktop" className="w-full h-full object-cover object-top" />
                                    </div>
                                </div>
                            </MockupFrame>
                            {/* Floating Phone Piece - Preserving Product Truth */}
                            <div className="absolute -bottom-10 -right-6 w-[35%] aspect-[9/19] rounded-[2.5rem] border-4 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden hidden sm:block">
                                <div className="h-full w-full bg-white p-1">
                                    <div className="h-full w-full rounded-[2.1rem] overflow-hidden">
                                        <img src="/pwa-screenshot-mobile.png" alt="InOutHub Mobile" className="w-full h-full object-cover object-top" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Workflow Section: Tangible Coordination */}
            <main className="mx-auto max-w-7xl px-6 py-24 space-y-32">
                <section id="workflow" className="grid lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-5 space-y-6">
                        <SectionEyebrow>The Operator Workflow</SectionEyebrow>
                        <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            Designed for the loop, not just the data.
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            Most events are managed across WhatsApp, call threads, and paper lists. InOutHub transforms that chaos into a structured operational flow.
                        </p>
                    </div>
                    <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
                        {workflow.map((item) => (
                            <div key={item.title} className="group p-8 rounded-[2.5rem] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                                <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center mb-8 ${item.bg} ${item.color} group-hover:scale-105 transition-transform`}>
                                    <item.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-950 mb-3">{item.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-600 font-medium">
                                    {item.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Product Proof Section */}
                <section id="proof" className="bg-slate-950 text-white rounded-[3.5rem] p-12 lg:p-24 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-teal-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-indigo-500/10 blur-[120px]" />

                    <div className="relative grid lg:grid-cols-2 gap-16 lg:items-center">
                        <div className="space-y-8">
                            <SectionEyebrow dark>Real Product Proof</SectionEyebrow>
                            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
                                Surfaces built for the pressure of live operations.
                            </h2>
                            <p className="text-xl text-slate-400 leading-relaxed font-medium">
                                Strategic triage on desktop. Precise execution on mobile. Our interfaces are designed for crew movement and high-stakes decision making.
                            </p>
                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="space-y-2">
                                    <p className="text-2xl font-black text-teal-400 tracking-tighter italic">ADMIN HUB</p>
                                    <p className="text-xs uppercase font-black tracking-widest text-slate-500 leading-relaxed">Lineup Management & Roster Sync</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-2xl font-black text-amber-400 tracking-tighter italic">STAGE CONSOLE</p>
                                    <p className="text-xs uppercase font-black tracking-widest text-slate-500 leading-relaxed">Live Execution & Arrival Tracking</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <div className="aspect-video rounded-3xl bg-slate-900 border border-white/10 overflow-hidden group cursor-pointer relative shadow-inner">
                                <div className="absolute inset-0 bg-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                   <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-2xl">
                                      <Play className="h-6 w-6 text-teal-600 fill-teal-600 ml-1" />
                                   </div>
                                </div>
                                <img src="/pwa-screenshot-desktop.png" alt="Acts Dashboard" className="opacity-60 group-hover:scale-105 transition-transform duration-700 h-full w-full object-cover" />
                                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
                                    Acts Coordination Workspace
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col justify-between aspect-square">
                                    <Smartphone className="h-8 w-8 text-sky-400" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">PWA Resilience</p>
                                </div>
                                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col justify-between aspect-square">
                                    <ShieldCheck className="h-8 w-8 text-emerald-400" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role-Aware Access</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </section>

                {/* Trust Section: High-Trust Operational Model */}
                <section id="trust" className="grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-5 space-y-10 order-2 lg:order-1">
                        <div className="space-y-4">
                            <SectionEyebrow>The Trust Model</SectionEyebrow>
                            <h2 className="text-4xl font-black text-slate-950 tracking-tight">Credible operations start with trust.</h2>
                        </div>
                        <div className="space-y-6">
                            {trustPoints.map((point) => (
                                <div key={point.title} className="flex gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 ring-1 ring-slate-200/50">
                                    <div className="mt-1 flex-shrink-0">
                                        <CheckCircle2 className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-slate-950 uppercase tracking-tighter italic">{point.title}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{point.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-7 bg-teal-600 rounded-[3.5rem] p-12 lg:p-20 text-white relative overflow-hidden order-1 lg:order-2 shadow-xl shadow-teal-500/20">
                         <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(135deg,_transparent_20%,_rgba(255,255,255,0.05)_100%)]" />
                         <LockKeyhole className="absolute -bottom-10 -right-10 h-64 w-64 text-white/5" />
                         <div className="relative space-y-6">
                            <h3 className="text-3xl font-black sm:text-5xl leading-tight tracking-tight">Protect the Roster. Run the Show.</h3>
                            <p className="text-xl text-teal-50 font-medium leading-relaxed max-w-lg">
                                We separate participant intake and external team onboarding to ensure only the approved, ready-to-run data hits your live execution surfaces.
                            </p>
                            <div className="pt-6">
                                <Button asChild className="bg-white text-teal-700 hover:bg-teal-50 h-14 rounded-2xl px-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/10">
                                    <Link to="/login">Start Secure Ops</Link>
                                </Button>
                            </div>
                         </div>
                    </div>
                </section>

                {/* Grounding Call to Action */}
                <section className="text-center space-y-12 py-12">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <h2 className="text-4xl font-black text-slate-950 sm:text-7xl tracking-tighter">Ready for Show Day?</h2>
                        <p className="text-xl text-slate-600 font-medium leading-relaxed">
                            Join the organizations moving away from spreadsheet dread toward operational confidence.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-6">
                        <Button asChild className="h-16 rounded-2xl bg-teal-600 px-12 text-xs font-black uppercase tracking-widest text-white hover:bg-teal-700 shadow-2xl shadow-teal-500/30">
                            <Link to="/login">Open Operator Access</Link>
                        </Button>
                        <div className="flex gap-x-12 gap-y-6 flex-wrap justify-center opacity-40 grayscale items-center py-6">
                            <div className="text-xl font-black italic tracking-tighter text-slate-400">DANCE HUB</div>
                            <div className="text-xl font-black italic tracking-tighter text-slate-400">PROGRAMS+</div>
                            <div className="text-xl font-black italic tracking-tighter text-slate-400">SHOWCASE</div>
                            <div className="text-xl font-black italic tracking-tighter text-slate-400 uppercase tracking-widest">CultureHub</div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Practical Footer */}
            <footer className="border-t border-slate-200 bg-white py-12">
                <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col items-center md:items-start gap-3">
                         <BrandMark size="sm" showLabel />
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trusted Operational Platform</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] text-center md:text-right max-w-sm">
                        Refined Operational Variant // Competition Entry // Alignment to Phase 1 & 2 Live Readiness
                    </p>
                </div>
            </footer>
        </div>
    );
}

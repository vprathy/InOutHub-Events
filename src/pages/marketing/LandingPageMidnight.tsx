import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    Command,
    Database,
    Layers,
    Layout,
    Lock,
    Monitor,
    Shield,
    Terminal,
} from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';

const features = [
    {
        name: 'Roster Authority',
        description: 'Map existing spreadsheets and Google Sheets to a live roster. No data entry overhead, just operational sync.',
        icon: Database,
        color: 'text-emerald-400',
    },
    {
        name: 'Act Coordination',
        description: 'Manage performances as first-class objects. Track readiness, media, and lineup position in real-time.',
        icon: Layers,
        color: 'text-amber-400',
    },
    {
        name: 'Stage Navigation',
        description: 'A dedicated console for the live-event loop. Clear arrival status and show-flow control for operators.',
        icon: Terminal,
        color: 'text-sky-400',
    },
];

const capabilities = [
    {
        title: 'Trusted Identity',
        body: 'Role-based access controls for EventAdmin and StageManager. Protect PII while keeping ops moving.',
        icon: Shield,
    },
    {
        title: 'Device Agnostic',
        body: 'Built for the thumb-zone. Rock-solid performance on mobile and tablet for crew on the move.',
        icon: Monitor,
    },
    {
        title: 'Controlled Intake',
        body: 'Admin-vetted external submissions and roster onboarding. A formal gate for messy upstream data.',
        icon: Lock,
    },
];

export default function LandingPageMidnight() {
    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-300 selection:bg-teal-500/30">
            {/* Ambient Background Elements */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-teal-600/10 blur-[120px]" />
                <div className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-amber-600/5 blur-[100px]" />
                <div className="absolute left-1/3 top-1/2 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[80px]" />
            </div>

            <div className="relative">
                {/* Navbar */}
                <nav className="mx-auto max-w-7xl px-6 py-8">
                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 p-3 backdrop-blur-xl">
                        <div className="flex items-center gap-2 pl-2">
                           <BrandMark size="sm" showLabel className="invert grayscale brightness-200" />
                        </div>
                        <div className="hidden gap-8 text-xs font-bold uppercase tracking-widest text-slate-400 md:flex">
                            <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
                            <a href="#infrastructure" className="transition-colors hover:text-white">Infrastructure</a>
                            <a href="#access" className="transition-colors hover:text-white">Access</a>
                        </div>
                        <Button asChild variant="default" className="bg-white text-black hover:bg-slate-200 rounded-xl px-6 py-5 text-xs font-black uppercase tracking-widest">
                            <Link to="/login">Enter Console</Link>
                        </Button>
                    </div>
                </nav>

                {/* Hero Section */}
                <header className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-4 py-2">
                            <Activity className="h-4 w-4 text-teal-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Night Variant Prototype</span>
                        </div>
                        <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl">
                            The Operating System for <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">Event Logistics.</span>
                        </h1>
                        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                            Stop juggling spreadsheets and WhatsApp. InOutHub is the command surface for community event ops—from roster sync to live performance execution.
                        </p>
                        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                            <Button asChild className="h-16 rounded-2xl bg-teal-500 px-10 text-sm font-black uppercase tracking-widest text-black hover:bg-teal-400">
                                <Link to="/login">
                                    Start Operations
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-16 rounded-2xl border-white/10 bg-white/5 px-10 text-sm font-black uppercase tracking-widest text-white hover:bg-white/10">
                                <a href="#infrastructure">View Infrastructure</a>
                            </Button>
                        </div>
                    </div>

                    {/* Dashboard Mockup (Visual Proof) */}
                    <div className="mt-24 relative lg:mt-32">
                        <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-b from-teal-500/20 to-transparent blur-2xl" />
                        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl">
                           {/* Dashboard Header UI Mock */}
                            <div className="flex items-center justify-between border-b border-white/5 bg-slate-950 px-6 py-3">
                                <div className="flex gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">InOutHub Console // Stage Live</div>
                            </div>
                            <div className="grid grid-cols-12 gap-px bg-white/5">
                                <div className="col-span-3 bg-slate-900 p-6 space-y-6 hidden lg:block">
                                    <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                                    <div className="h-4 w-1/2 rounded bg-white/5" />
                                    <div className="pt-8 space-y-3">
                                        <div className="h-10 rounded-xl bg-teal-500/10 border border-teal-500/20" />
                                        <div className="h-10 rounded-xl bg-white/5" />
                                        <div className="h-10 rounded-xl bg-white/5" />
                                    </div>
                                </div>
                                <div className="col-span-12 lg:col-span-9 bg-slate-950 p-4 sm:p-8">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
                                        <div className="h-10 w-48 rounded-xl bg-white/5" />
                                        <div className="h-10 w-32 rounded-xl bg-white/5" />
                                    </div>
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 ring-1 ring-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold">{i}</div>
                                                    <div>
                                                        <div className="h-3.5 w-32 rounded bg-white/10" />
                                                        <div className="h-2.5 w-24 rounded bg-white/5 mt-2" />
                                                    </div>
                                                </div>
                                                <div className="h-6 w-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 hidden sm:block" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Features Section */}
                <section id="workflow" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
                    <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
                        <div className="space-y-8">
                             <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5">
                                <Layout className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Core Workflow</span>
                            </div>
                            <h2 className="text-4xl font-black text-white sm:text-6xl">Built for the Loop.</h2>
                            <p className="text-xl text-slate-400 leading-relaxed">
                                InOutHub isn't a CRM or a generic task manager. It's a specialized surface for the event lifecycle: Ingest, Assemble, Schedule, Execute.
                            </p>
                            <ul className="space-y-6">
                                {features.map((f) => (
                                    <li key={f.name} className="group relative flex gap-6 rounded-3xl border border-transparent p-4 transition-all hover:bg-white/[0.02] hover:border-white/5">
                                        <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 ${f.color}`}>
                                            <f.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white tracking-wide">{f.name}</h3>
                                            <p className="mt-2 text-slate-400 leading-relaxed">{f.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-4 rounded-[3rem] bg-teal-500/10 blur-2xl group-hover:bg-teal-500/20 transition-all" />
                            <div className="relative rounded-[2.5rem] border border-white/10 bg-slate-900 p-2 shadow-2xl">
                                <div className="rounded-[2.2rem] overflow-hidden bg-slate-950 p-8 flex items-center justify-center">
                                     <Command className="h-32 w-32 text-slate-800" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust/Access Section */}
                <section id="access" className="bg-slate-900/50 py-24 sm:py-32 border-y border-white/5">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16 space-y-4">
                            <SectionEyebrow>Operator Trust</SectionEyebrow>
                            <h2 className="text-3xl font-black text-white sm:text-5xl">Grounded, Trusted Operations.</h2>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {capabilities.map((c) => (
                                <div key={c.title} className="group p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 ring-1 ring-white/5 hover:bg-white/[0.05] transition-all">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 mb-6 group-hover:scale-110 transition-transform">
                                        <c.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">{c.title}</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm font-medium">{c.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
                    <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900 px-8 py-20 text-center shadow-3xl lg:px-16">
                         <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
                         <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
                         
                         <div className="relative">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-400" />
                            <h2 className="mt-8 text-4xl font-black italic tracking-tighter text-white sm:text-6xl">
                                READY FOR SHOW DAY?
                            </h2>
                            <p className="mt-6 mx-auto max-w-2xl text-lg text-slate-400 font-medium leading-relaxed">
                                Join the community of operators moving from chaos to command. Start your assisted roster intake tonight.
                            </p>
                            <div className="mt-12 flex justify-center">
                                <Button asChild className="h-16 rounded-2xl bg-white px-12 text-sm font-black uppercase tracking-widest text-black hover:bg-slate-100">
                                    <Link to="/login">Open Operator Access</Link>
                                </Button>
                            </div>
                         </div>
                    </div>
                </section>

                <footer className="border-t border-white/5 py-12">
                   <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-2">
                        <BrandMark size="sm" showLabel className="invert grayscale brightness-200" />
                      </div>
                      <div className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-600">
                        Night Variant Prototype // InOutHub Operations
                      </div>
                   </div>
                </footer>
            </div>
        </div>
    );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 block">
            {children}
        </span>
    );
}

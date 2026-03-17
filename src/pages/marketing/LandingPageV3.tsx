import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    FileSpreadsheet,
    Layers,
    LockKeyhole,
    Terminal,
} from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { Button } from '@/components/ui/Button';

const workflowSteps = [
    {
        step: '01',
        title: 'Intake',
        description:
            'Bring in the spreadsheet or Google Sheet your team already uses. Keep roster details, readiness signals, and follow-up visible without forcing a rigid new process.',
        icon: FileSpreadsheet,
        accent: 'bg-teal-500/10 text-teal-600',
        uiPreview: '/workflow_intake_seed_1773724685258.png',
        supportLabel: 'Roster intake',
        supportValue: 'Sheets, uploads, sync',
    },
    {
        step: '02',
        title: 'Coordination',
        description:
            'Move from rows in a sheet to performances in a live event. Track act identity, intro readiness, lineup context, and operator next action in one system.',
        icon: Layers,
        accent: 'bg-amber-500/10 text-amber-600',
        uiPreview: '/workflow_coordination_seed_1773724647860.png',
        supportLabel: 'Act workspace',
        supportValue: 'Readiness, lineup, intro',
    },
    {
        step: '03',
        title: 'Execution',
        description:
            'Hand stage-day operators a real execution surface with arrival visibility, on-deck awareness, and live lineup control built for event pressure.',
        icon: Terminal,
        accent: 'bg-indigo-500/10 text-indigo-600',
        uiPreview: '/workflow_execution_seed_1773724699295.png',
        supportLabel: 'Live console',
        supportValue: 'On deck, status, advance',
    },
];

const controlPoints = [
    'Know who is ready before showtime, not after confusion starts',
    'Keep roster, performance, and lineup coordination in one operational system',
    'Control access cleanly for admins and operators without breaking workflow',
];

const proofSignals = [
    { label: 'Act', value: 'ZiffyVolve Showcase Act', tone: 'text-white' },
    { label: 'Roster', value: '24 ready, 3 flagged', tone: 'text-emerald-300' },
    { label: 'Intro', value: 'Approved', tone: 'text-emerald-300' },
    { label: 'On deck', value: 'Stage A', tone: 'text-amber-300' },
];

function SectionEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
    return (
        <span className={`block text-[10px] font-black uppercase tracking-[0.32em] ${dark ? 'text-teal-400' : 'text-teal-600'}`}>
            {children}
        </span>
    );
}

export default function LandingPageV3() {
    const [headerScrolled, setHeaderScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setHeaderScrolled(window.scrollY > 20);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#fcfdfd] font-sans text-slate-900 selection:bg-teal-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 h-1/2 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.12),_transparent_70%)]" />
                <div className="absolute bottom-0 left-0 h-1/2 w-1/2 bg-[radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.08),_transparent_70%)]" />
            </div>

            <div className="relative">
                <nav className="sticky top-0 z-50 mx-auto max-w-7xl px-3 pt-2.5 sm:px-6 sm:pt-5" aria-label="Main Navigation">
                    <div
                        className={`flex items-center justify-between rounded-3xl px-2.5 py-2 backdrop-blur-xl transition-all duration-200 sm:p-3 ${
                            headerScrolled
                                ? 'border border-slate-200/90 bg-white/88 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.22)]'
                                : 'border border-slate-200/70 bg-white/72 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.14)]'
                        }`}
                    >
                        <div className="flex items-center gap-2 pl-2 sm:pl-3">
                            <BrandMark size="sm" showLabel />
                        </div>
                        <div className="hidden gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 lg:flex">
                            <a href="#workflow" className="transition-colors hover:text-teal-600">Workflow</a>
                            <a href="#proof" className="transition-colors hover:text-teal-600">Product Proof</a>
                            <a href="#trust" className="transition-colors hover:text-teal-600">Operational Control</a>
                        </div>
                        <Button asChild className="h-8.5 rounded-2xl bg-slate-900 px-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800 sm:h-11 sm:px-6">
                            <Link to="/login">Operator Login</Link>
                        </Button>
                    </div>
                </nav>

                <header className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:pb-40 lg:pt-20">
                    <div className="grid items-center gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-10">
                        <div className="max-w-2xl space-y-7 sm:space-y-9">
                            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-4 py-2">
                                <Activity className="h-4 w-4 text-teal-600" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-700 underline decoration-teal-500/30 underline-offset-4">
                                    Event Operations
                                </span>
                            </div>

                            <div className="space-y-5">
                                <h1 className="text-4xl font-black tracking-tighter text-slate-950 sm:text-7xl lg:text-8xl">
                                    Replace the coordination chaos around <span className="text-teal-600">rosters, performances, and show day</span>
                                </h1>
                                <p className="max-w-xl text-xl font-medium leading-relaxed text-slate-600">
                                    InOutHub gives community, cultural, and program-driven events one trusted command surface for participant readiness,
                                    performance coordination, and confident stage-day execution.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Button asChild className="h-16 rounded-2xl bg-teal-600 px-10 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] hover:bg-teal-700">
                                    <Link to="/login">
                                        Get Setup for Your Event
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-16 rounded-2xl border-slate-200 bg-white px-10 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-50">
                                    <a href="#proof">See Product Proof</a>
                                </Button>
                            </div>
                        </div>

                        <div className="relative px-2 lg:px-0">
                            <div className="absolute left-10 right-10 top-10 h-36 rounded-full bg-teal-500/12 blur-[120px]" />
                            <div className="absolute inset-x-[9%] bottom-1 h-10 rounded-full bg-slate-950/10 blur-2xl" />
                            <div className="relative z-10 translate-y-1 rounded-[2.8rem] border border-slate-200/70 bg-gradient-to-b from-white to-slate-100 p-3 shadow-[0_65px_140px_-34px_rgba(15,23,42,0.33)] lg:scale-[1.14] lg:origin-right">
                                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white aspect-[16/10]">
                                    <img
                                        src="/hero_desktop_seed_1773724633176.png"
                                        alt="InOutHub Events desktop command surface"
                                        className="h-full w-full object-cover object-top"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </div>
                            </div>

                            <div className="absolute -bottom-2 -right-2 z-20 scale-75 shadow-2xl sm:scale-100 lg:-bottom-4 lg:right-4 w-[23%] min-w-[100px] max-w-[156px] rounded-[2rem] border-4 border-slate-900 bg-slate-900 p-1.5 shadow-[0_32px_72px_-24px_rgba(15,23,42,0.42)]">
                                <div className="overflow-hidden rounded-[1.7rem] aspect-[9/19.5] border border-slate-800 bg-black">
                                    <img
                                        src="/hero_mobile_seed_1773724640146.png"
                                        alt="InOutHub Events mobile operator view"
                                        className="h-full w-full object-cover object-top"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <section id="workflow" className="mx-auto max-w-7xl border-t border-slate-100 px-6 py-24 lg:py-28">
                    <div className="mx-auto max-w-3xl text-center space-y-5">
                        <SectionEyebrow>How It Works</SectionEyebrow>
                        <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                            Intake, coordination, and execution should read like one system
                        </h2>
                        <p className="text-lg font-medium leading-relaxed text-slate-600">
                            InOutHub Events keeps the flow connected: intake authority, performance coordination, and stage execution in one operational line instead of separate admin tools.
                        </p>
                    </div>

                    <div className="relative mt-16 lg:mt-20">
                        <div className="absolute left-7 top-10 hidden h-[80%] w-px bg-gradient-to-b from-teal-200 via-slate-200 to-indigo-200 lg:block" />
                        <div className="space-y-10 lg:space-y-12">
                            {workflowSteps.map((step) => (
                                <div
                                    key={step.title}
                                    className="relative grid gap-8 rounded-[2.8rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:p-8"
                                >
                                    <div className="space-y-5 lg:pl-12">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-[1.35rem] ${step.accent} shadow-inner ring-4 ring-white`}>
                                                <step.icon className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Step {step.step}</p>
                                                <h3 className="text-2xl font-black tracking-tight text-slate-950">{step.title}</h3>
                                            </div>
                                        </div>
                                        <p className="text-base font-medium leading-8 text-slate-600">{step.description}</p>
                                        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{step.supportLabel}</span>
                                            <span className="text-sm font-black text-slate-800">{step.supportValue}</span>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-[2.2rem] border border-slate-100 bg-slate-50 p-2 shadow-xl shadow-slate-200/40">
                                        <div className="absolute left-5 top-5 z-10 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 backdrop-blur">
                                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">{step.title} Preview</span>
                                        </div>
                                        <img
                                            src={step.uiPreview}
                                            alt={`${step.title} preview`}
                                            className="aspect-[16/10] w-full rounded-[1.55rem] object-cover object-top"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="proof" className="relative mx-4 overflow-hidden rounded-[4rem] bg-[#0B0E14] py-24 text-white shadow-2xl sm:mx-6 sm:py-32">
                    <div className="absolute top-0 right-0 h-1/2 w-1/2 bg-teal-500/10 blur-[150px]" />
                    <div className="absolute bottom-0 left-0 h-1/2 w-1/2 bg-indigo-500/10 blur-[150px]" />

                    <div className="relative mx-auto max-w-7xl px-6">
                        <div className="mb-16 max-w-3xl space-y-5">
                            <SectionEyebrow dark>Product Proof</SectionEyebrow>
                            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
                                A real event operations system should look like one
                            </h2>
                            <p className="text-xl font-medium leading-relaxed text-slate-400">
                                One primary product surface leads here on purpose, with supporting operational signals around readiness, on-deck context, and active control.
                            </p>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-[1.24fr_0.76fr]">
                            <div className="space-y-4 sm:space-y-5">
                                <div className="relative overflow-hidden rounded-[2.8rem] border border-white/10 bg-slate-900 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.55)]">
                                    <div className="absolute -left-3 top-8 z-10 flex flex-wrap gap-2 scale-75 shadow-2xl sm:-left-4 sm:top-12 sm:scale-100 lg:-left-12 lg:top-20">
                                        {proofSignals.map((signal) => (
                                            <div key={signal.label} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 backdrop-blur">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{signal.label}</span>
                                                <span className={`ml-2 text-[11px] font-black ${signal.tone}`}>{signal.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <img
                                        src="/hero_desktop_seed_1773724633176.png"
                                        alt="InOutHub Events primary product surface"
                                        className="aspect-[16/10] w-full object-cover object-top"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>

                                <div className="grid gap-3 sm:gap-4 md:grid-cols-[0.4fr_0.6fr]">
                                    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900">
                                        <img
                                            src="/hero_mobile_seed_1773724640146.png"
                                            alt="Mobile operator execution surface"
                                            className="aspect-[9/14] h-full w-full object-cover object-top"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Stage Signal</p>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                                                    On Deck
                                                </span>
                                                <span className="text-sm font-black text-white">Act 14 • Stage A</span>
                                            </div>
                                            <p className="mt-4 text-sm font-medium leading-6 text-slate-400">
                                                Operators can see who is next, who is ready, and what is changing without rebuilding context from side channels.
                                            </p>
                                        </div>
                                        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Readiness State</p>
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
                                                    <span>Intro approved</span>
                                                    <span className="text-emerald-300">Ready</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
                                                    <span>Roster confirmed</span>
                                                    <span className="text-emerald-300">Ready</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
                                                    <span>Stage arrival</span>
                                                    <span className="text-amber-300">Watching</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[2.4rem] border border-white/10 bg-white/5 p-8">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">What this proves</h3>
                                        <p className="font-medium leading-relaxed text-slate-400">
                                            The product proof is grounded in real surfaces and real workflow logic: roster intake, performance coordination, and operator execution tied together in one customer-safe system.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Participant readiness</p>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                                                Roster details, approvals, follow-up, and readiness stay visible before the room gets chaotic.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Performance coordination</p>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                                                Acts stay at the center of the system with lineup context, intro readiness, and status all tied to the same operational object.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Controlled access</p>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                                                Operators get the visibility they need while admins retain the controls that should not drift into live execution screens.
                                            </p>
                                        </div>
                                    </div>

                                    <Button asChild variant="outline" className="h-14 w-full rounded-2xl border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10">
                                        <Link to="/login">Open InOutHub</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="trust" className="mx-auto max-w-7xl px-6 py-28">
                    <div className="grid gap-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
                        <div className="space-y-6">
                            <SectionEyebrow>Operational Control</SectionEyebrow>
                            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                Keep readiness clear, coordination connected, and access controlled
                            </h2>
                            <p className="text-lg font-medium leading-relaxed text-slate-600">
                                InOutHub Events is strongest when operators can move quickly without losing trust. The product is built to keep the roster accurate,
                                the performance workflow connected, and access boundaries practical for live event teams.
                            </p>
                        </div>

                        <div className="rounded-[2.6rem] border border-slate-200 bg-white p-8 shadow-sm">
                            <div className="space-y-5">
                                {controlPoints.map((point) => (
                                    <div key={point} className="flex items-start gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-medium leading-7 text-slate-700">{point}</p>
                                    </div>
                                ))}
                                <div className="flex items-start gap-4 rounded-2xl bg-slate-900 px-4 py-4 text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-teal-300">
                                        <LockKeyhole className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm font-medium leading-7 text-slate-200">
                                        EventAdmin and StageManager workflows stay distinct so operator speed never comes from weakening access clarity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto mb-28 max-w-5xl rounded-[4rem] border border-slate-100 bg-white px-6 py-24 text-center shadow-sm">
                    <div className="mx-auto max-w-2xl space-y-10">
                        <div className="space-y-5">
                            <h2 className="text-5xl font-black tracking-tighter text-slate-950 sm:text-7xl">Get setup for your event</h2>
                            <p className="text-xl font-medium leading-relaxed text-slate-600">
                                Explore the product, review the workflow, and give your operators one place to run roster readiness, performance coordination, and show-day execution.
                            </p>
                        </div>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <Button asChild className="h-16 rounded-[2rem] bg-teal-600 px-10 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_25px_50px_-12px_rgba(45,159,141,0.35)] transition-all hover:scale-[1.02] hover:bg-teal-700">
                                <Link to="/login">Get Setup for Your Event</Link>
                            </Button>
                            <Button asChild variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white px-10 text-xs font-black uppercase tracking-[0.2em] text-slate-900 hover:bg-slate-50">
                                <Link to="/login">Operator Login</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <footer className="border-t border-slate-200 bg-[#f8fafc] py-16">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
                        <div className="space-y-3 text-center md:text-left">
                            <BrandMark size="sm" showLabel />
                            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">ZiffyVolve</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-8 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                            <Link to="/login" className="hover:text-teal-600">Operator Access</Link>
                            <a href="#proof" className="hover:text-teal-600">Product Overview</a>
                            <a href="#workflow" className="hover:text-teal-600">Workflow</a>
                            <span>ZiffyVolve</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

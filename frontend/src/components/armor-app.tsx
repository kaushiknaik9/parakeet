import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Building2, Calculator, Camera, Check, CheckCircle2,
  ChevronDown, Clock3, Copy, FileCheck2, FileText, Handshake, Info, LayoutDashboard, ListFilter, LockKeyhole,
  Mail, Menu, Mic, MicOff, PenLine, Play, Plus, RefreshCcw, Search, Send, Settings, ShieldCheck, Sparkles,
  Square, Trash2, UserRound, Video, VideoOff, Wand2, X,
} from "lucide-react";
import {
  API_BASE_URL, analyzeDeal, applyChange, checkHealth, confirmDeal, deleteDeal, getActivity, getDeal, getProfile,
  getSampleTranscript, listDeals, loginUser, regenerateEmail, requestDealChanges, shareDeal, signupUser,
  simulateWhatIf, transcribeAudio, updateDeal, updateProfile,
} from "@/lib/api";
import { clearSession, loadSession, saveSession } from "@/lib/auth";
import { formatDate, formatDateTime, linesToTranscript, money, transcriptToLines } from "@/lib/format";
import type {
  ActivityEvent, AuthUser, Conflict, ConfirmationStatus, DealBadgeStatus, DealRecord, DealSummary, ExtractedDeal,
  HealthStatus, Profile, TranscriptLine, WhatIfResult,
} from "@/types/armor";
import { Button, Card, Field, IconButton, Modal, Progress, StatusBadge } from "./armor-ui";

type Screen =
  | "login" | "signup" | "dashboard" | "new" | "meeting" | "recording" | "transcript" | "analysis"
  | "review" | "agreement" | "counterparty" | "deal" | "deals" | "agreements" | "activity" | "settings";

type ConnStatus = "checking" | "online" | "offline";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new", label: "New Conversation", icon: Plus },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "agreements", label: "Agreements", icon: FileCheck2 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const titles: Record<Screen, string> = {
  login: "Sign in", signup: "Create organisation", dashboard: "Dashboard", new: "New Conversation",
  meeting: "Online Conversation", recording: "Offline Recording", transcript: "Conversation Transcript",
  analysis: "Deal Analysis", review: "Review Deal Agreement", agreement: "Agreement",
  counterparty: "Agreement Preview", deal: "Deal Workspace", deals: "Deals", agreements: "Agreements",
  activity: "Activity", settings: "Organisation Settings",
};

const emptyExtracted: ExtractedDeal = {
  parties: [], product_or_service: "", quantity: "", total_value: "", total_value_numeric: null,
  currency: "INR", payment_terms: "", advance_percent: null, advance_amount: null, balance_amount: null,
  delivery_terms: "", deadlines: [], responsibilities: [], conditions: [], negotiated_changes: [], conflicts: [],
};

function dealBadge(deal: { extracted: ExtractedDeal; confirmation_status?: ConfirmationStatus }): DealBadgeStatus {
  switch (deal.confirmation_status) {
    case "confirmed": return "Confirmed";
    case "changes_requested": return "Changes Requested";
    case "awaiting_counterparty": return "Awaiting Counterparty";
    default: return (deal.extracted.conflicts?.length ?? 0) > 0 ? "Under Review" : "Completed";
  }
}

function partyLabel(extracted: ExtractedDeal, role: "Buyer" | "Seller", fallback: string) {
  const p = extracted.parties?.find((x) => x.role?.toLowerCase() === role.toLowerCase());
  return p?.name || extracted.parties?.[role === "Buyer" ? 0 : 1]?.name || fallback;
}

export default function ArmorApp() {
  // ── Session / profile ────────────────────────────────────────────────
  const [session, setSession] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const existing = loadSession();
    setSession(existing);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    getProfile(session.username).then(setProfile).catch(() => {});
  }, [session]);

  // ── Navigation / UI chrome ───────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const go = (s: Screen) => { setScreen(s); setSidebar(false); window.scrollTo(0, 0); };
  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(""), 3200); };

  // ── Backend connectivity (drives which "new conversation" paths are usable) ─
  // Distinguishes "can't reach the backend at all" from "backend is up but no
  // STT/LLM key configured" — collapsing these into one silent disabled state
  // is what makes an unreachable backend look like a broken feature.
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [conn, setConn] = useState<ConnStatus>("checking");
  const connRef = useRef<ConnStatus>("checking");
  const recheckHealth = async () => {
    setConn("checking");
    try {
      const h = await checkHealth();
      setHealth(h);
      setConn("online"); connRef.current = "online";
    } catch {
      setHealth(null);
      setConn("offline"); connRef.current = "offline";
    }
  };
  useEffect(() => {
    recheckHealth();
    const id = setInterval(() => { if (connRef.current === "offline") recheckHealth(); }, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Deals cache ───────────────────────────────────────────────────────
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const refreshDeals = async (username: string) => {
    setDealsLoading(true); setDealsError(null);
    try { setDeals(await listDeals(username)); }
    catch (e: any) { setDealsError(e.message); }
    finally { setDealsLoading(false); }
  };
  useEffect(() => { if (session) refreshDeals(session.username); }, [session]);

  // ── Active deal (analysis result / opened from list) ────────────────
  const [activeDeal, setActiveDeal] = useState<DealRecord | null>(null);

  // ── New-conversation transcript draft (before analysis) ─────────────
  const [dealName, setDealName] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!session) return;
    const text = linesToTranscript(lines);
    if (text.trim().length < 20) { notify("Add a bit more transcript before analyzing."); return; }
    setIsAnalyzing(true); setAnalyzeError(null); go("analysis");
    try {
      const deal = await analyzeDeal(session.username, text, dealName);
      setActiveDeal(deal);
      refreshDeals(session.username);
    } catch (e: any) {
      setAnalyzeError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openDeal = async (id: string) => {
    try { setActiveDeal(await getDeal(id)); go("deal"); }
    catch (e: any) { notify(e.message); }
  };

  const handleLogout = () => { clearSession(); setSession(null); setProfile(null); setActiveDeal(null); go("dashboard"); };

  // ── Auth screens ──────────────────────────────────────────────────────
  if (!sessionChecked) return null;
  if (!session) {
    return (
      <Auth
        screen={screen === "signup" ? "signup" : "login"}
        go={go}
        onAuthed={(u) => { saveSession(u); setSession(u); go("dashboard"); }}
      />
    );
  }

  if (screen === "counterparty" && activeDeal) {
    return <Counterparty deal={activeDeal} go={go} notify={notify} setDeal={setActiveDeal} />;
  }

  return (
    <div className="app-shell">
      <Sidebar screen={screen} go={go} open={sidebar} profile={profile} onLogout={handleLogout} />
      <div className="app-main">
        <Header title={titles[screen]} setSidebar={setSidebar} go={go} search={search} setSearch={setSearch} session={session} conn={conn} onRetry={recheckHealth} />
        <main className="page-wrap">
          {screen === "dashboard" && (
            <Dashboard profile={profile} deals={deals} loading={dealsLoading} error={dealsError} go={go} openDeal={openDeal} />
          )}
          {screen === "new" && <NewConversation go={go} health={health} conn={conn} onRetry={recheckHealth} onUseSample={async () => {
            const { transcript } = await getSampleTranscript();
            setLines(transcriptToLines(transcript));
            setDealName("Earbuds Bulk Order — Sample");
            go("transcript");
          }} />}
          {screen === "meeting" && (
            <Meeting onFinish={(text) => { setLines(transcriptToLines(text)); go("transcript"); }} />
          )}
          {screen === "recording" && (
            <Recording onTranscribed={(text) => { setLines(transcriptToLines(text)); go("transcript"); }} health={health} conn={conn} onRetry={recheckHealth} />
          )}
          {screen === "transcript" && (
            <TranscriptWorkspace
              lines={lines} setLines={setLines} dealName={dealName} setDealName={setDealName}
              go={go} notify={notify} onAnalyze={runAnalysis}
            />
          )}
          {screen === "analysis" && (
            <Analysis isAnalyzing={isAnalyzing} error={analyzeError} deal={activeDeal} go={go} />
          )}
          {screen === "review" && activeDeal && (
            <DealReview deal={activeDeal} setDeal={setActiveDeal} go={go} notify={notify} session={session} />
          )}
          {screen === "agreement" && activeDeal && <Agreement deal={activeDeal} setDeal={setActiveDeal} go={go} notify={notify} />}
          {screen === "deal" && activeDeal && (
            <DealDetail
              deal={activeDeal}
              setDeal={setActiveDeal}
              notify={notify}
              go={go}
              onDeleted={() => { setActiveDeal(null); if (session) refreshDeals(session.username); go("deals"); }}
            />
          )}
          {screen === "deals" && (
            <DealsDirectory query={search} deals={deals} loading={dealsLoading} openDeal={openDeal} go={go} />
          )}
          {screen === "agreements" && <Agreements deals={deals} loading={dealsLoading} openDeal={openDeal} go={go} />}
          {screen === "activity" && <ActivityCenter username={session.username} openDeal={openDeal} />}
          {screen === "settings" && session && (
            <SettingsPage session={session} profile={profile} setProfile={setProfile} notify={notify} />
          )}
        </main>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

// ── Chrome ──────────────────────────────────────────────────────────────
function Sidebar({ screen, go, open, profile, onLogout }: {
  screen: Screen; go: (s: Screen) => void; open: boolean; profile: Profile | null; onLogout: () => void;
}) {
  const orgName = profile?.company_name?.trim() || "Your workspace";
  const initials = orgName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "AR";
  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
      <button className="brand" onClick={() => go("dashboard")}><span className="brand__mark"><ShieldCheck /></span><span>ARMOR</span></button>
      <p className="nav-label">Workspace</p>
      <nav>{nav.map((item) => { const I = item.icon; return (
        <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => go(item.id as Screen)}>
          <I size={18} /><span>{item.label}</span>
        </button>
      ); })}</nav>
      <div className="sidebar__foot">
        <div className="org-avatar">{initials}</div>
        <div><strong>{orgName}</strong><span>{profile?.role || "Workspace"}</span></div>
        <IconButton label="Sign out" onClick={onLogout}><ChevronDown size={16} /></IconButton>
      </div>
    </aside>
  );
}

function Header({ title, setSidebar, go, search, setSearch, session, conn, onRetry }: {
  title: string; setSidebar: (v: boolean) => void; go: (s: Screen) => void; search: string;
  setSearch: (v: string) => void; session: AuthUser; conn: ConnStatus; onRetry: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <IconButton label="Open navigation" className="menu-button" onClick={() => setSidebar(true)}><Menu /></IconButton>
        <div><span className="crumb">Armor / {session.name}</span><h1>{title}</h1></div>
      </div>
      <div className="topbar__tools">
        {conn === "offline" && (
          <button onClick={onRetry} title={`Can't reach the backend at ${API_BASE_URL}`} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--danger)", color: "var(--danger)", background: "transparent", borderRadius: 7, padding: "0 10px", height: 34, fontSize: 10, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />Backend unreachable — Retry
          </button>
        )}
        {conn === "checking" && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--muted-foreground)" }}>
            <RefreshCcw size={12} className="animate-spin" />Connecting…
          </span>
        )}
        <label className="global-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals by name, party, or ID..." /></label>
        <Button onClick={() => go("new")}><Plus size={17} />New Conversation</Button>
        <button className="profile"><span>{session.name.slice(0, 2).toUpperCase()}</span><ChevronDown size={15} /></button>
      </div>
    </header>
  );
}

function PageHeading({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2><p>{body}</p></div>
      {action}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────
function Dashboard({ profile, deals, loading, error, go, openDeal }: {
  profile: Profile | null; deals: DealSummary[]; loading: boolean; error: string | null;
  go: (s: Screen) => void; openDeal: (id: string) => void;
}) {
  const needsReview = deals.filter((d) => dealBadge(d) === "Under Review").length;
  const currency = profile?.default_currency || deals[0]?.extracted?.currency || "INR";
  const totalValue = deals.reduce((sum, d) => sum + (d.extracted?.total_value_numeric || 0), 0);
  const aiCount = deals.filter((d) => d.generation_mode === "ai").length;
  const metrics = [
    { l: "Total Deals", v: String(deals.length).padStart(2, "0"), d: `${money(totalValue, currency)} tracked`, i: Handshake },
    { l: "Needs Review", v: String(needsReview).padStart(2, "0"), d: "Deals with flagged contradictions", i: AlertTriangle },
    { l: "AI-Analyzed", v: String(aiCount).padStart(2, "0"), d: "Using a configured LLM key", i: Sparkles },
    { l: "Completed", v: String(deals.length - needsReview).padStart(2, "0"), d: "No open contradictions", i: CheckCircle2 },
  ];
  return (
    <>
      <PageHeading eyebrow="WORKSPACE" title={`Good to see you, ${profile?.company_name || "there"}`} body="Here's what's happening across your deals." action={<Button onClick={() => go("new")}><Plus size={17} />New Conversation</Button>} />
      <section className="action-grid">
        <Card className="action-card" onClick={() => go("meeting")}>
          <div className="action-card__icon"><Video /></div>
          <div><span className="eyebrow">LIVE NOTES</span><h3>Capture a live conversation</h3><p>Keep the call open in your usual meeting app, and take structured notes here while Armor prepares them for analysis.</p><span className="text-action">Start Live Notes <ArrowRight size={16} /></span></div>
        </Card>
        <Card className="action-card" onClick={() => go("recording")}>
          <div className="action-card__icon action-card__icon--dark"><Mic /></div>
          <div><span className="eyebrow">IN PERSON</span><h3>Record an offline meeting</h3><p>Record the conversation from your microphone and let Armor transcribe and diarize it automatically.</p><span className="text-action">Start Recording <ArrowRight size={16} /></span></div>
        </Card>
      </section>
      <section>
        <div className="section-title"><h3>Business overview</h3><span>Live from your deals</span></div>
        <div className="metrics">{metrics.map(({ l, v, d, i: I }) => (
          <Card className="metric" key={l}><div className="metric__top"><span className="metric__icon"><I size={18} /></span></div><b>{v}</b><h4>{l}</h4><p>{d}</p></Card>
        ))}</div>
      </section>
      <RecentDeals deals={deals} loading={loading} error={error} openDeal={openDeal} go={go} />
    </>
  );
}

function RecentDeals({ deals, loading, error, openDeal, go }: {
  deals: DealSummary[]; loading: boolean; error: string | null; openDeal: (id: string) => void; go: (s: Screen) => void;
}) {
  const shown = deals.slice(0, 6);
  return (
    <section>
      <div className="section-title"><div><h3>Recent deals</h3><span>Your most recently analyzed conversations</span></div><button onClick={() => go("deals")}>View all <ArrowRight size={15} /></button></div>
      {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading deals…</p>}
      {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      {!loading && !error && shown.length === 0 && (
        <div className="empty-inline"><Handshake /><h3>No deals yet</h3><p>Start a conversation to create your first deal.</p></div>
      )}
      {shown.length > 0 && (
        <div className="data-table">
          <div className="table-row table-head"><span>Deal</span><span>Counterparty</span><span>Value</span><span>Status</span><span>Mode</span><span>Created</span></div>
          {shown.map((d) => (
            <button className="table-row" key={d.id} onClick={() => openDeal(d.id)}>
              <span><b>{d.id}</b><small>{d.deal_name}</small></span>
              <span>{partyLabel(d.extracted, "Seller", "—")}</span>
              <span><b>{d.extracted?.total_value || money(d.extracted?.total_value_numeric, d.extracted?.currency)}</b></span>
              <span><StatusBadge status={dealBadge(d)} /></span>
              <span>{d.generation_mode === "ai" ? "AI" : "Heuristic"}</span>
              <span>{formatDate(d.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── New conversation ──────────────────────────────────────────────────
function NewConversation({ go, health, conn, onRetry, onUseSample }: {
  go: (s: Screen) => void; health: HealthStatus | null; conn: ConnStatus; onRetry: () => void; onUseSample: () => void;
}) {
  return (
    <>
      <PageHeading eyebrow="CREATE" title="Start a Business Conversation" body="Capture the conversation and let Armor identify what both parties agreed to." />
      {conn === "offline" && (
        <Card className="alert-card" style={{ marginBottom: 20, borderColor: "var(--danger)" }}>
          <AlertTriangle style={{ color: "var(--danger)" }} />
          <div><span className="eyebrow">BACKEND UNREACHABLE</span><h3>Can't reach the Armor server</h3><p>No response from <code>{API_BASE_URL}</code>. Make sure the Flask backend is running (<code>python app.py</code> in <code>backend/</code>) and that <code>VITE_API_URL</code> in your frontend <code>.env</code> points at it.</p></div>
          <Button variant="secondary" onClick={onRetry}><RefreshCcw size={16} />Retry</Button>
        </Card>
      )}
      {conn === "online" && health && !health.stt_configured && (
        <Card className="alert-card" style={{ marginBottom: 20 }}>
          <Info />
          <div><span className="eyebrow">RECORDING UNAVAILABLE</span><h3>No speech-to-text key configured</h3><p>The server has no ASSEMBLYAI_API_KEY / OPENAI_API_KEY set, so audio recording can't be transcribed right now. Paste a transcript instead, or try the sample deal below.</p></div>
        </Card>
      )}
      <div className="choice-grid">
        <button className="choice" onClick={() => go("meeting")}>
          <span className="choice__visual"><Video size={38} /><i /><i /></span>
          <div><h3>Live Notes</h3><p>Take structured notes during a call you're already on (video/audio stays in your usual meeting app — this just helps you capture the terms).</p><span>Start Live Notes <ArrowRight size={17} /></span></div>
        </button>
        <button className="choice" onClick={() => go("recording")} disabled={conn === "offline" || (conn === "online" && !health?.stt_configured)}>
          <span className="choice__visual choice__visual--mic"><Mic size={38} /><i /><i /></span>
          <div><h3>Offline Recording</h3><p>Record an in-person business conversation from your microphone and have Armor transcribe it.</p><span>Start Recording <ArrowRight size={17} /></span></div>
        </button>
      </div>
      <div className="workflow-strip">
        <span>Conversation</span><ArrowRight /><span>Deal understanding</span><ArrowRight /><span>Verified agreement</span><ArrowRight /><span>Tracked terms</span>
      </div>
      <p style={{ marginTop: 24, fontSize: 12, color: "var(--muted-foreground)" }}>
        Already have a transcript? <button className="text-action" style={{ display: "inline", border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }} onClick={() => go("transcript")}>Paste it directly</button>{" "}
        or <button style={{ display: "inline", border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }} onClick={onUseSample}>try a sample deal</button>.
      </p>
    </>
  );
}

// ── Live notes ("online meeting") ────────────────────────────────────
function Meeting({ onFinish }: { onFinish: (transcript: string) => void }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [entries, setEntries] = useState<{ speaker: string; text: string }[]>([]);
  const [speaker, setSpeaker] = useState("Me");
  const [draft, setDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) { setCam(false); setCameraError("Camera access isn't available in this browser."); return; }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch((e) => {
      if (cancelled) return;
      setCam(false);
      setCameraError(e?.name === "NotAllowedError" ? "Camera/microphone permission was denied — you can still take notes below." : "Couldn't access the camera — you can still take notes below.");
    });
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const toggleMic = () => { setMic((v) => !v); streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !mic)); };
  const toggleCam = () => { setCam((v) => !v); streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !cam)); };

  const addEntry = () => {
    if (!draft.trim()) return;
    setEntries((e) => [...e, { speaker, text: draft.trim() }]);
    setDraft("");
  };

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="meeting">
      <div className="meeting-main">
        <div className="meeting-meta"><span className="live-dot" />Notes running <b>{time}</b><span>{cameraError || "Local camera preview only — nothing is streamed anywhere"}</span></div>
        <div className="video-grid">
          <div className="video-tile video-tile--main">
            {cam ? <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <div className="avatar-xl">ME</div>}
            <span>You (self preview)</span>
            <i>{mic ? <Mic size={14} /> : <MicOff size={14} />}</i>
          </div>
        </div>
        <div className="meeting-controls">
          <IconButton label={mic ? "Mute microphone" : "Unmute microphone"} onClick={toggleMic}>{mic ? <Mic /> : <MicOff />}</IconButton>
          <IconButton label={cam ? "Turn camera off" : "Turn camera on"} onClick={toggleCam}>{cam ? <Camera /> : <VideoOff />}</IconButton>
          <IconButton label="End & process" className="end-call" onClick={() => setEnding(true)}><Square /></IconButton>
        </div>
      </div>
      <aside className="ai-panel">
        <div className="ai-panel__head"><span className="brand__mark"><Sparkles /></span><div><h3>LIVE NOTES</h3><span><i /> Type what's being agreed as you go</span></div></div>
        <div className="ai-insight"><ShieldCheck size={17} /><div><b>Your notes become the transcript</b><span>Armor analyzes exactly what you type below — nothing is guessed.</span></div></div>
        <div className="transcript-live" style={{ height: "calc(100% - 260px)" }}>
          {entries.map((e, i) => (
            <div className="live-line" key={i}><span>{e.speaker}</span><p>{e.text}</p></div>
          ))}
          {entries.length === 0 && <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>No notes yet — add the first term being discussed below.</p>}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <select value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="field__control" style={{ height: 36 }}>
            <option>Me</option><option>Counterparty</option>
          </select>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. We agreed on 500 units at ₹800 each" rows={2} className="large-input" />
          <Button variant="secondary" onClick={addEntry}><Plus size={14} />Add note</Button>
        </div>
      </aside>
      {ending && (
        <Modal title="End this conversation?" description="Armor will process your notes and prepare the deal information." onClose={() => setEnding(false)}>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setEnding(false)}><X size={16} />Cancel</Button>
            <Button variant="danger" onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); onFinish(entries.map((e) => `${e.speaker}: ${e.text}`).join("\n")); }}><Square size={16} />End & Process</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Picks a MediaRecorder mimeType the browser actually supports, and maps it
// to a filename extension the backend's ALLOWED_AUDIO_EXT allow-list
// recognizes — hardcoding "recording.webm" regardless of the real encoding
// (e.g. Safari records audio/mp4) caused the uploaded bytes and the claimed
// extension to mismatch, which can confuse format-sniffing on the STT side.
const AUDIO_MIME_CANDIDATES: { mime: string; ext: string }[] = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  { mime: "audio/mp4", ext: "m4a" },
];
function pickRecorderMime(): { mime: string; ext: string } {
  if (typeof MediaRecorder !== "undefined") {
    for (const c of AUDIO_MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported?.(c.mime)) return c;
    }
  }
  return { mime: "", ext: "webm" };
}

// ── Offline recording ─────────────────────────────────────────────────
function Recording({ onTranscribed, health, conn, onRetry }: {
  onTranscribed: (transcript: string) => void; health: HealthStatus | null; conn: ConnStatus; onRetry: () => void;
}) {
  const [state, setState] = useState<"ready" | "recording" | "paused" | "uploading" | "error">("ready");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const extRef = useRef("webm");

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const upload = async (blob: Blob, filename: string) => {
    setState("uploading"); setError(null);
    try {
      const result = await transcribeAudio(blob, filename);
      onTranscribed(result.transcript || "");
    } catch (e: any) {
      setError(e.message); setState("ready");
    }
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Microphone access isn't available in this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const { mime, ext } = pickRecorderMime();
      extRef.current = ext;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        upload(blob, `recording.${extRef.current}`);
      };
      recorder.start(); setState("recording"); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      setError(e?.name === "NotAllowedError" ? "Microphone permission was denied." : `Could not start recording: ${e.message || e}`);
    }
  };

  const pauseResume = () => {
    const rec = mediaRecorderRef.current; if (!rec) return;
    if (state === "paused") { rec.resume(); setState("recording"); }
    else { rec.pause(); setState("paused"); }
  };

  const stop = () => { if (timerRef.current) clearInterval(timerRef.current); mediaRecorderRef.current?.stop(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (file) upload(file, file.name);
  };

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <PageHeading eyebrow="OFFLINE CONVERSATION" title="Capture the agreement in the room" body="Armor will transcribe and diarize the recording, then let you review it before analysis." />
      {conn === "offline" && (
        <Card className="alert-card" style={{ marginBottom: 20, borderColor: "var(--danger)" }}>
          <AlertTriangle style={{ color: "var(--danger)" }} />
          <div><span className="eyebrow">BACKEND UNREACHABLE</span><h3>Can't reach the Armor server</h3><p>No response from <code>{API_BASE_URL}</code> — recording and file upload need the backend running to transcribe audio.</p></div>
          <Button variant="secondary" onClick={onRetry}><RefreshCcw size={16} />Retry</Button>
        </Card>
      )}
      <Card className="recorder">
        {state === "uploading" ? (
          <>
            <span className="brand__mark brand__mark--large"><Sparkles /></span>
            <h2>Transcribing your recording</h2>
            <p>This can take a few minutes for longer calls — please keep this tab open.</p>
            <div className="processing-list"><div className="done"><span className="processing-ring" /><b>Uploading &amp; transcribing audio…</b></div></div>
          </>
        ) : (
          <>
            <div className={`mic-orbit ${state === "recording" ? "recording" : ""}`}><Mic size={42} /><i /><i /></div>
            <span className="recorder__status">{state === "ready" ? "READY" : state === "paused" ? "PAUSED" : "RECORDING"}</span>
            <div className="timer">{time}</div>
            <p>{state === "ready" ? "Place your device near the conversation participants." : "Audio is being captured on this device."}</p>
            <div className="recorder__buttons">
              {state === "ready" ? (
                <Button onClick={start} disabled={conn !== "online" || !health?.stt_configured}><Mic size={17} />Start Recording</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={pauseResume}>{state === "paused" ? <Play size={17} /> : <Square size={17} />}{state === "paused" ? "Resume" : "Pause"}</Button>
                  <Button variant="danger" onClick={stop}><Square size={17} />Stop &amp; Process</Button>
                </>
              )}
            </div>
            <div style={{ marginTop: 18 }}>
              <input ref={fileRef} type="file" accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg,.mp4,.mpeg,.mpga" className="hidden" style={{ display: "none" }} onChange={handleFile} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><FileText size={16} />Upload a recorded call instead</Button>
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</p>}
            {conn === "online" && !health?.stt_configured && <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 10 }}>No speech-to-text key is configured on the server, so live recording is disabled. You can still upload an existing audio file if a key is added later, or paste a transcript instead.</p>}
            {conn === "checking" && <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 10 }}>Checking connection to the backend…</p>}
          </>
        )}
      </Card>
    </>
  );
}

// ── Transcript review ─────────────────────────────────────────────────
function TranscriptWorkspace({ lines, setLines, dealName, setDealName, go, notify, onAnalyze }: {
  lines: TranscriptLine[]; setLines: (r: TranscriptLine[]) => void; dealName: string; setDealName: (v: string) => void;
  go: (s: Screen) => void; notify: (s: string) => void; onAnalyze: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(lines.length === 0);
  const [pasteText, setPasteText] = useState(linesToTranscript(lines));
  const update = (id: string, text: string) => setLines(lines.map((r) => (r.id === id ? { ...r, text } : r)));
  const removeLine = (id: string) => setLines(lines.filter((r) => r.id !== id));
  const addLine = () => setLines([...lines, { id: `manual-${Date.now()}`, speaker: "Speaker", text: "" }]);
  const totalWords = lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);

  return (
    <>
      <PageHeading title="Conversation Transcript" body="Review and correct the conversation before Armor identifies the agreement." action={<span className="ai-badge"><Sparkles size={14} />{lines.length} lines</span>} />
      <div className="summary-bar">
        <span><Calculator /><span>{totalWords}<small>Words</small></span></span>
        <span><FileText /><span>{lines.length}<small>Lines</small></span></span>
        <span><CheckCircle2 /><span>Editable<small>Status</small></span></span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Field label="Deal name (optional)" value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="e.g. 500 Unit Supply Agreement" />
      </div>
      <div className="transcript-layout">
        <Card className="transcript-editor">
          <div className="editor-toolbar">
            <div><span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center" }}>Line-by-line transcript</span></div>
            <div><IconButton label="Paste raw text" onClick={() => { setPasteText(linesToTranscript(lines)); setPasteOpen(true); }}><PenLine /></IconButton><IconButton label="Copy transcript" onClick={() => { navigator.clipboard.writeText(linesToTranscript(lines)); notify("Transcript copied."); }}><Copy /></IconButton></div>
          </div>
          {lines.map((r) => (
            <div className="transcript-row" key={r.id}>
              <div className="speaker-avatar">{r.speaker.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="speaker-line">
                  <input value={r.speaker} onChange={(e) => setLines(lines.map((x) => (x.id === r.id ? { ...x, speaker: e.target.value } : x)))} style={{ border: 0, background: "transparent", fontWeight: 700, fontSize: 11, width: 120 }} />
                  <button onClick={() => setEditing(editing === r.id ? null : r.id)}><PenLine size={14} />Edit</button>
                  <button onClick={() => removeLine(r.id)}><Trash2 size={14} /></button>
                </div>
                {editing === r.id
                  ? <textarea value={r.text} onChange={(e) => update(r.id, e.target.value)} onBlur={() => setEditing(null)} autoFocus />
                  : <p>{r.text || <em style={{ color: "var(--muted-foreground)" }}>Empty line</em>}</p>}
              </div>
            </div>
          ))}
          {lines.length === 0 && (
            <div className="empty-inline"><FileText /><h3>No transcript yet</h3><p>Paste one below to get started.</p></div>
          )}
          <div style={{ padding: 16 }}><Button variant="secondary" onClick={addLine}><Plus size={14} />Add line</Button></div>
        </Card>
        <aside className="review-panel">
          <h3>Review checklist</h3>
          <p>Confirm the source conversation before analysis begins.</p>
          {["Participant names", "Quantities and prices", "Payment terms", "Dates and deadlines"].map((s) => (
            <label key={s}><input type="checkbox" defaultChecked /><span><Check size={13} /></span>{s}</label>
          ))}
          <div className="review-note"><ShieldCheck /><p>Your edits become the source of truth for deal analysis.</p></div>
          <Button onClick={onAnalyze}>Continue to Deal Analysis <ArrowRight size={17} /></Button>
        </aside>
      </div>
      {pasteOpen && (
        <Modal title="Paste transcript" description="Paste a speaker-labelled transcript (e.g. 'Buyer: ...' / 'Seller: ...'), one line per turn." onClose={() => setPasteOpen(false)}>
          <textarea className="large-input" style={{ minHeight: 220, fontFamily: "monospace" }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Buyer: Let's finalize the order — 500 units at ₹800 each...\nSeller: That's ₹4,00,000 total. I'll need 30% upfront..."} />
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setLines(transcriptToLines(pasteText)); setPasteOpen(false); }}><Check size={16} />Use this transcript</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Analysis ──────────────────────────────────────────────────────────
function Analysis({ isAnalyzing, error, deal, go }: { isAnalyzing: boolean; error: string | null; deal: DealRecord | null; go: (s: Screen) => void }) {
  if (isAnalyzing) {
    return (
      <Card className="recorder">
        <span className="brand__mark brand__mark--large"><Sparkles /></span>
        <h2>Understanding your conversation</h2>
        <p>Armor is identifying the deal, not just transcribing the words. This usually takes a few seconds.</p>
        <div className="processing-list"><div className="done"><span className="processing-ring" /><b>Extracting terms, conditions and conflicts…</b></div></div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="alert-card">
        <AlertTriangle />
        <div><span className="eyebrow">ANALYSIS FAILED</span><h3>Couldn't analyze this transcript</h3><p>{error}</p></div>
        <Button variant="secondary" onClick={() => go("transcript")}><ArrowLeft size={16} />Back to transcript</Button>
      </Card>
    );
  }
  if (!deal) return <p>No deal to show yet — start a new conversation.</p>;

  const { extracted, generation_mode } = deal;
  const conflicts = extracted.conflicts || [];
  return (
    <>
      <PageHeading eyebrow="AI DEAL UNDERSTANDING" title={`Armor found: ${extracted.product_or_service || deal.deal_name}`} body="Review every extracted term and flagged contradiction before creating the agreement." action={<StatusBadge status={generation_mode === "ai" ? "AI Analysis" : "Fallback Analysis"} />} />
      {generation_mode === "fallback" && (
        <Card className="alert-card" style={{ marginBottom: 16 }}>
          <Info /><div><span className="eyebrow">HEURISTIC MODE</span><h3>No LLM key configured</h3><p>The server extracted these terms with rule-based heuristics rather than an LLM. Double-check the numbers below before continuing.</p></div>
        </Card>
      )}
      {conflicts.length > 0 ? (
        <Card className="alert-card">
          <AlertTriangle />
          <div>
            <span className="eyebrow">CONFIRMATION REQUIRED</span>
            <h3>{conflicts.length} contradiction{conflicts.length > 1 ? "s" : ""} detected in the transcript</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="alert-card" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <CheckCircle2 style={{ color: "var(--success)" }} />
          <div><span className="eyebrow">CLEAN TRANSCRIPT</span><h3>No contradictions detected</h3><p>Armor didn't find any conflicting numbers or terms in this conversation.</p></div>
        </Card>
      )}
      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />
      <div className="sticky-actions">
        <span><ShieldCheck />{conflicts.length > 0 ? `${conflicts.length} term${conflicts.length > 1 ? "s" : ""} flagged for review` : "All terms verified"}</span>
        <Button onClick={() => go("review")}>Create Editable Deal <ArrowRight size={16} /></Button>
      </div>
    </>
  );
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 7, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <b style={{ fontSize: 11 }}>{conflict.topic}</b>
        <span className={conflict.severity === "high" ? "verify-warn" : ""} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{conflict.severity} severity</span>
      </div>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Earlier:</b> {conflict.earlier_statement}</p>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Later:</b> {conflict.later_statement}</p>
      <p style={{ fontSize: 10, marginTop: 6 }}><b>Suggested resolution ({conflict.resolved_value}):</b> {conflict.resolution}</p>
    </div>
  );
}

function DealSummaryCard({ extracted, dealName }: { extracted: ExtractedDeal; dealName: string }) {
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");
  return (
    <Card className="deal-summary">
      <div className="summary-title"><div><span className="eyebrow">STRUCTURED DEAL</span><h3>{dealName}</h3></div><span className="ai-badge"><Sparkles />Extracted by Armor</span></div>
      <div className="parties"><div><span>BUYER</span><b>{buyer}</b></div><ArrowRight /><div><span>SELLER</span><b>{seller}</b></div></div>
      <div className="term-grid">
        <Term label="Product / service" value={extracted.product_or_service || "—"} />
        <Term label="Quantity" value={extracted.quantity || "—"} />
        <Term label="Total value" value={extracted.total_value || money(extracted.total_value_numeric, extracted.currency)} verified />
        <Term label="Payment terms" value={extracted.payment_terms || "—"} />
        <Term label="Delivery terms" value={extracted.delivery_terms || "—"} />
        <Term label="Advance" value={extracted.advance_percent != null ? `${extracted.advance_percent}%` : "—"} />
      </div>
      {(extracted.advance_amount != null || extracted.balance_amount != null) && (
        <div className="payment-breakdown">
          <div><span>Advance</span><b>{money(extracted.advance_amount, extracted.currency)}</b></div>
          <div><span>Balance</span><b>{money(extracted.balance_amount, extracted.currency)}</b></div>
          <div className="payment-bar"><i /><i /></div>
        </div>
      )}
      {extracted.responsibilities.length > 0 && (
        <div className="responsibilities">
          <div><h4>Responsibilities</h4>{extracted.responsibilities.map((r, i) => <p key={i}><Check />{r.party}: {r.responsibility}</p>)}</div>
          <div><h4>Conditions</h4>{extracted.conditions.length ? extracted.conditions.map((c, i) => <p key={i}><Check />{c}</p>) : <p>None stated</p>}</div>
        </div>
      )}
    </Card>
  );
}

function Term({ label, value, verified, warning }: { label: string; value: string; verified?: boolean; warning?: boolean }) {
  return (
    <div className="term"><span>{label}</span><b>{value}</b>{(verified || warning) && <small className={warning ? "verify-warn" : "verify-ok"}>{warning ? <AlertTriangle /> : <CheckCircle2 />}{warning ? "Needs confirmation" : "Confirmed"}</small>}</div>
  );
}

// ── Review ────────────────────────────────────────────────────────────
function DealReview({ deal, setDeal, go, notify, session }: {
  deal: DealRecord; setDeal: (d: DealRecord) => void; go: (s: Screen) => void; notify: (s: string) => void; session: AuthUser;
}) {
  const [name, setName] = useState(deal.deal_name);
  const [extracted, setExtracted] = useState<ExtractedDeal>(deal.extracted);
  const [notes, setNotes] = useState((deal.extracted.conditions || []).join(" "));
  const [saving, setSaving] = useState(false);
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const setParty = (role: "Buyer" | "Seller", value: string) => {
    const parties = [...(extracted.parties || [])];
    const idx = parties.findIndex((p) => p.role?.toLowerCase() === role.toLowerCase());
    if (idx >= 0) parties[idx] = { name: value, role: parties[idx]?.role || role };
    else parties.push({ name: value, role });
    setExtracted({ ...extracted, parties });
  };

  const save = async (andContinue: boolean) => {
    setSaving(true);
    try {
      const nextExtracted = { ...extracted, conditions: notes ? [notes] : [] };
      const updated = await updateDeal(deal.id, { deal_name: name, extracted: nextExtracted });
      let final = updated;
      try { final = await regenerateEmail(deal.id, nextExtracted, deal.agreement); } catch { /* email regen is best-effort */ }
      setDeal(final);
      notify(andContinue ? "Deal confirmed." : "Draft saved.");
      if (andContinue) go("agreement");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeading title="Review Deal Agreement" body="Edit the structured terms. The agreement preview updates with your changes." action={saving ? <span className="save-state"><RefreshCcw size={13} className="animate-spin" />Saving…</span> : undefined} />
      <div className="editor-split">
        <div className="deal-form">
          <Card>
            <div className="card-head"><h3>Deal information</h3></div>
            <Field label="Deal title" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="form-grid">
              <Field label="Buyer" value={buyer === "Buyer" ? "" : buyer} onChange={(e) => setParty("Buyer", e.target.value)} placeholder="Buyer name" />
              <Field label="Seller" value={seller === "Seller" ? "" : seller} onChange={(e) => setParty("Seller", e.target.value)} placeholder="Seller name" />
              <Field label="Product / service" value={extracted.product_or_service} onChange={(e) => setExtracted({ ...extracted, product_or_service: e.target.value })} />
              <Field label="Quantity" value={extracted.quantity} onChange={(e) => setExtracted({ ...extracted, quantity: e.target.value })} />
              <Field label="Total value (numeric)" type="number" value={extracted.total_value_numeric ?? ""} onChange={(e) => setExtracted({ ...extracted, total_value_numeric: e.target.value ? Number(e.target.value) : null })} />
              <Field label="Currency" value={extracted.currency} onChange={(e) => setExtracted({ ...extracted, currency: e.target.value })} />
            </div>
          </Card>
          <Card>
            <div className="card-head"><h3>Payment &amp; delivery</h3></div>
            <Field label="Payment terms" value={extracted.payment_terms} onChange={(e) => setExtracted({ ...extracted, payment_terms: e.target.value })} />
            <Field label="Delivery terms" value={extracted.delivery_terms} onChange={(e) => setExtracted({ ...extracted, delivery_terms: e.target.value })} />
          </Card>
          <Card>
            <div className="card-head"><h3>Additional notes / conditions</h3></div>
            <textarea className="large-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>
        </div>
        <DocumentPreview title={name} extracted={extracted} notes={notes} buyer={buyer} seller={seller} dealId={deal.id} />
      </div>
      <div className="sticky-actions">
        <Button variant="secondary" onClick={() => save(false)} disabled={saving}><FileText size={16} />Save Draft</Button>
        <Button variant="success" onClick={() => save(true)} disabled={saving}><Check size={16} />Confirm Agreement</Button>
      </div>
    </>
  );
}

function DocumentPreview({ title, extracted, notes, buyer, seller, dealId }: {
  title: string; extracted: ExtractedDeal; notes: string; buyer: string; seller: string; dealId: string;
}) {
  return (
    <aside className="document-wrap">
      <div className="document-label">LIVE AGREEMENT PREVIEW <span>DEAL {dealId.toUpperCase()}</span></div>
      <article className="document">
        <div className="document__brand"><span className="brand__mark"><ShieldCheck /></span>ARMOR</div>
        <span className="document__kicker">DEAL AGREEMENT · {dealId.toUpperCase()}</span>
        <h2>{title}</h2>
        <p>This deal record documents the commercial terms confirmed by both parties following their business conversation.</p>
        <hr />
        <h4>1. Parties</h4>
        <p><b>Buyer:</b> {buyer}<br /><b>Seller:</b> {seller}</p>
        <h4>2. Financial terms</h4>
        <div className="document-total"><span>Total deal value</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b></div>
        <p>{extracted.payment_terms || "Payment terms not specified."}</p>
        <h4>3. Delivery</h4>
        <p>{extracted.quantity ? `${extracted.quantity} of ${extracted.product_or_service}. ` : ""}{extracted.delivery_terms || "Delivery terms not specified."}</p>
        <h4>4. Additional notes</h4>
        <p>{notes || "None."}</p>
        <footer>Generated from a verified business conversation. This record is not represented as a legally binding electronic signature.</footer>
      </article>
    </aside>
  );
}

// ── Agreement ─────────────────────────────────────────────────────────
function Agreement({ deal, setDeal, go, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; go: (s: Screen) => void; notify: (s: string) => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");
  return (
    <>
      <PageHeading eyebrow="ARMOR DEAL AGREEMENT" title={deal.deal_name} body={`Deal ID ${deal.id} · Created ${formatDateTime(deal.created_at)}`} action={<StatusBadge status={dealBadge(deal)} />} />
      <div className="agreement-layout">
        <div><DocumentPreview title={deal.deal_name} extracted={extracted} notes={(extracted.conditions || []).join(" ")} buyer={buyer} seller={seller} dealId={deal.id} /></div>
        <aside>
          <Card className="confirmation-card">
            <h3>Share this agreement</h3>
            <div><span className="party-icon"><Building2 /></span><p><b>{seller}</b><span>Counterparty {deal.confirmation_status !== "draft" && `· ${dealBadge(deal)}`}</span></p></div>
            <Button onClick={() => setShareOpen(true)}><Send />Share Agreement</Button>
            <Button variant="secondary" onClick={() => go("counterparty")}><ArrowRight />Open Confirmation View</Button>
          </Card>
          {deal.agreement?.summary && (
            <Card className="secure-note">
              <Sparkles />
              <div><b>AI summary from initial analysis</b><p>{deal.agreement.summary}</p></div>
            </Card>
          )}
          <Card className="secure-note"><LockKeyhole /><div><b>About sharing</b><p>If the server has SMTP configured, "Share Agreement" emails the counterparty directly. Otherwise it still records the deal as shared and falls back to opening your own mail client.</p></div></Card>
        </aside>
      </div>
      {shareOpen && <ShareModal deal={deal} onClose={() => setShareOpen(false)} notify={notify} onShared={setDeal} />}
    </>
  );
}

function ShareModal({ deal, onClose, notify, onShared }: {
  deal: DealRecord; onClose: () => void; notify: (s: string) => void; onShared: (d: DealRecord) => void;
}) {
  const [subject, setSubject] = useState(deal.email?.subject || `Deal Agreement — ${deal.id}`);
  const [body, setBody] = useState(deal.email?.body || "");
  const [counterpartyEmail, setCounterpartyEmail] = useState(deal.counterparty_email || "");
  const [regenerating, setRegenerating] = useState(false);
  const [sharing, setSharing] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await regenerateEmail(deal.id, deal.extracted, deal.agreement);
      setSubject(updated.email.subject); setBody(updated.email.body);
    } catch (e: any) { notify(e.message); }
    finally { setRegenerating(false); }
  };

  const copy = () => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); notify("Copied to clipboard."); };
  const openMail = () => { window.location.href = `mailto:${encodeURIComponent(counterpartyEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; };

  const share = async () => {
    setSharing(true);
    try {
      const updated = await shareDeal(deal.id, { counterparty_email: counterpartyEmail, subject, body });
      onShared(updated);
      if (updated.email_sent) {
        notify(`Emailed to ${counterpartyEmail}.`);
        onClose();
      } else {
        notify(updated.email_send_note || "Marked as shared — no SMTP configured, so it wasn't emailed automatically.");
      }
    } catch (e: any) { notify(e.message); }
    finally { setSharing(false); }
  };

  return (
    <Modal title="Share Agreement" description="Records this deal as sent for confirmation. Emails the counterparty directly if the server has SMTP configured — otherwise use Open in Mail / Copy below." onClose={onClose}>
      <Field label="Counterparty email" type="email" value={counterpartyEmail} onChange={(e) => setCounterpartyEmail(e.target.value)} placeholder="counterparty@company.com" />
      <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <div className="email-preview"><span>EMAIL PREVIEW</span><textarea className="large-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 160 }} /></div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={regenerate} disabled={regenerating}><RefreshCcw size={16} className={regenerating ? "animate-spin" : ""} />Regenerate</Button>
        <Button variant="secondary" onClick={copy}><Copy size={16} />Copy</Button>
        <Button variant="secondary" onClick={openMail} disabled={!counterpartyEmail}><Mail size={16} />Open in Mail</Button>
        <Button onClick={share} loading={sharing} disabled={!counterpartyEmail}><Send size={16} />Share Agreement</Button>
      </div>
    </Modal>
  );
}

// ── Counterparty preview (client-only — backend has no confirmation API) ─
function Counterparty({ deal: initialDeal, go, notify, setDeal }: {
  deal: DealRecord; go: (s: Screen) => void; notify: (s: string) => void; setDeal: (d: DealRecord) => void;
}) {
  const [deal, setLocalDeal] = useState(initialDeal);
  const [changes, setChanges] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const apply = (updated: DealRecord) => { setLocalDeal(updated); setDeal(updated); };

  const doConfirm = async () => {
    setBusy(true);
    try { apply(await confirmDeal(deal.id)); notify("Terms confirmed."); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  };

  const submitChanges = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { apply(await requestDealChanges(deal.id, text.trim())); notify("Change request recorded."); setChanges(false); setText(""); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="counterparty-page">
      <header><button className="brand" onClick={() => go("agreement")}><span className="brand__mark"><ShieldCheck /></span><span>ARMOR</span></button><span className="secure-pill"><LockKeyhole />No public link yet — for internal review</span></header>
      <main>
        <div className="counterparty-heading">
          <span className="eyebrow">DEAL AGREEMENT · {deal.id}</span>
          <h1>{deal.deal_name}</h1>
          <p>This is what {seller} would see if you shared this agreement with them. Confirming or requesting changes here updates the real deal record in Armor.</p>
          <StatusBadge status={dealBadge(deal)} />
        </div>
        <div className="counterparty-grid">
          <article className="terms-sheet">
            <div className="terms-total"><span>AGREEMENT VALUE</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b></div>
            <section><h3>Parties</h3><div className="party-grid"><p><span>BUYER</span><b>{buyer}</b></p><p><span>SELLER</span><b>{seller}</b></p></div></section>
            <section><h3>Commercial terms</h3><dl>
              <div><dt>Product</dt><dd>{extracted.product_or_service || "—"}</dd></div>
              <div><dt>Quantity</dt><dd>{extracted.quantity || "—"}</dd></div>
              <div><dt>Payment</dt><dd>{extracted.payment_terms || "—"}</dd></div>
              <div><dt>Delivery</dt><dd>{extracted.delivery_terms || "—"}</dd></div>
            </dl></section>
            <section><h3>Conditions</h3><p>{(extracted.conditions || []).join(" ") || "None stated."}</p></section>
          </article>
          <aside className="confirm-box">
            <ShieldCheck size={30} />
            <h3>Confirm the agreed terms</h3>
            <p>By confirming, you acknowledge that these terms accurately reflect the business conversation. This persists to the deal record — but since there's no separate public link yet, only people with access to this Armor workspace can act on it.</p>
            {deal.confirmation_status === "changes_requested" && deal.change_request && (
              <div className="alert-card" style={{ padding: 10, gridTemplateColumns: "auto 1fr" }}><AlertTriangle size={16} /><div><b style={{ fontSize: 10 }}>Last change request</b><p style={{ fontSize: 10 }}>{deal.change_request}</p></div></div>
            )}
            {changes ? (
              <>
                <textarea placeholder="Describe the term you would like to change..." value={text} onChange={(e) => setText(e.target.value)} />
                <Button variant="secondary" disabled={!text.trim() || busy} onClick={submitChanges}><Send />Submit Change Request</Button>
                <button className="text-link" onClick={() => setChanges(false)}>Cancel</button>
              </>
            ) : (
              <>
                <Button variant="success" onClick={doConfirm} disabled={busy}><Check />I Confirm These Terms</Button>
                <Button variant="secondary" onClick={() => setChanges(true)} disabled={busy}><PenLine />Request Changes</Button>
              </>
            )}
            {deal.confirmation_status === "confirmed" && <div className="success-panel"><CheckCircle2 /><b>Terms confirmed</b><span>Saved to the deal</span></div>}
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Deal workspace (full detail) ──────────────────────────────────────
function DealDetail({ deal, setDeal, notify, go, onDeleted }: {
  deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void; go: (s: Screen) => void; onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const remove = async () => {
    setDeleting(true);
    try { await deleteDeal(deal.id); notify("Deal deleted."); onDeleted(); }
    catch (e: any) { notify(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeading eyebrow={`DEAL #${deal.id}`} title={deal.deal_name} body={`${buyer} ↔ ${seller}`} action={
        <div className="deal-value"><span>DEAL VALUE</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b><StatusBadge status={dealBadge(deal)} /></div>
      } />
      <div className="deal-health">
        <div><span>Generation mode</span><b>{deal.generation_mode === "ai" ? "AI-Powered" : "Heuristic Fallback"}</b><small>Set by server config</small></div>
        <div><span>Created</span><b>{formatDate(deal.created_at)}</b><small>{formatDateTime(deal.created_at)}</small></div>
        <div><span>Last updated</span><b>{formatDate(deal.updated_at)}</b><small>{formatDateTime(deal.updated_at)}</small></div>
        <div>
          <span>Confirmation</span><b>{dealBadge(deal)}</b>
          <small>
            {deal.confirmation_status === "confirmed" && `Confirmed ${formatDate(deal.confirmed_at)}`}
            {deal.confirmation_status === "awaiting_counterparty" && `Shared ${formatDate(deal.shared_at)}`}
            {deal.confirmation_status === "changes_requested" && (deal.change_request || "Changes requested")}
            {deal.confirmation_status === "draft" && "Not yet shared"}
          </small>
        </div>
      </div>

      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />

      {extracted.conflicts.length > 0 && (
        <section>
          <div className="section-title"><h3>Flagged contradictions</h3></div>
          <div style={{ display: "grid", gap: 10 }}>{extracted.conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}</div>
        </section>
      )}

      <section>
        <div className="section-title"><h3>What happens if something changes?</h3><span>Simulated by Armor before you apply it</span></div>
        <WhatIfPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      <section>
        <div className="section-title"><h3>Confirmation email</h3></div>
        <EmailPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      {deal.transcript && (
        <section>
          <div className="section-title"><h3>Source transcript</h3></div>
          <Card style={{ padding: 18, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6 }}>{deal.transcript}</Card>
        </section>
      )}

      <div className="sticky-actions">
        <span><ShieldCheck />Deal {deal.id}</span>
        <Button variant="secondary" onClick={() => go("agreement")}><FileCheck2 size={16} />View Agreement</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={16} />Delete Deal</Button>
      </div>
      {confirmDelete && (
        <Modal title="Delete this deal?" description="This permanently removes the deal, its transcript and extracted terms." onClose={() => setConfirmDelete(false)}>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={remove}><Trash2 size={16} />Delete</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function WhatIfPanel({ deal, setDeal, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void }) {
  const [changeText, setChangeText] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const examples = ["Actually, make it 600 units instead of 500", "Let's do 40% advance instead", "Push the deadline back by two weeks"];

  const simulate = async (text?: string) => {
    const finalText = (text ?? changeText).trim();
    if (!finalText) return;
    setChangeText(finalText); setSimulating(true); setError(null); setResult(null);
    try { setResult(await simulateWhatIf(deal.id, finalText)); }
    catch (e: any) { setError(e.message); }
    finally { setSimulating(false); }
  };

  const apply = async () => {
    if (!result?.updated_extracted) return;
    setApplying(true);
    try {
      const updated = await applyChange(deal.id, result.updated_extracted, result.updated_agreement);
      setDeal(updated); notify("Change applied to the deal."); setResult(null); setChangeText("");
    } catch (e: any) { setError(e.message); }
    finally { setApplying(false); }
  };

  return (
    <Card style={{ padding: 20 }}>
      {!result ? (
        <div style={{ display: "grid", gap: 10 }}>
          <textarea className="large-input" value={changeText} onChange={(e) => setChangeText(e.target.value)} rows={3} placeholder='e.g. "Actually, make it 600 units instead of 500"' />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {examples.map((ex) => <button key={ex} onClick={() => setChangeText(ex)} style={{ border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, padding: "6px 10px", fontSize: 10, color: "var(--muted-foreground)" }}>{ex}</button>)}
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 11 }}>{error}</p>}
          <Button onClick={() => simulate()} loading={simulating}><Wand2 size={16} />Simulate impact</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 12, fontStyle: "italic" }}>"{result.change_text}"</p>
          <ul style={{ display: "grid", gap: 6, paddingLeft: 18, fontSize: 12 }}>{result.impacts.map((line, i) => <li key={i}>{line}</li>)}</ul>
          {error && <p style={{ color: "var(--danger)", fontSize: 11 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => { setResult(null); setChangeText(""); }}><RefreshCcw size={14} />Try another</Button>
            <Button onClick={apply} loading={applying}><Check size={16} />Apply this change to the deal</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function EmailPanel({ deal, setDeal, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void }) {
  const [subject, setSubject] = useState(deal.email?.subject || "");
  const [body, setBody] = useState(deal.email?.body || "");
  const [regenerating, setRegenerating] = useState(false);
  useEffect(() => { setSubject(deal.email?.subject || ""); setBody(deal.email?.body || ""); }, [deal.email]);

  const regenerate = async () => {
    setRegenerating(true);
    try { setDeal(await regenerateEmail(deal.id, deal.extracted, deal.agreement)); }
    catch (e: any) { notify(e.message); }
    finally { setRegenerating(false); }
  };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <b style={{ fontSize: 12 }}>{subject}</b>
        <button onClick={regenerate} style={{ border: 0, background: "none", color: "var(--primary)", fontSize: 10, display: "flex", gap: 4, alignItems: "center" }} disabled={regenerating}><RefreshCcw size={12} className={regenerating ? "animate-spin" : ""} />Regenerate</button>
      </div>
      <p style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--muted-foreground)" }}>{body}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); notify("Copied."); }}><Copy size={14} />Copy</Button>
        <Button variant="secondary" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }}><Mail size={14} />Open in Mail</Button>
      </div>
    </Card>
  );
}

// ── Deals directory ───────────────────────────────────────────────────
function DealsDirectory({ query, deals, loading, openDeal, go }: {
  query: string; deals: DealSummary[]; loading: boolean; openDeal: (id: string) => void; go: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState<"All" | DealBadgeStatus>("All");
  const shown = useMemo(() => deals.filter((d) => {
    const badge = dealBadge(d);
    const matchesFilter = filter === "All" || badge === filter;
    const haystack = `${d.id} ${d.deal_name} ${partyLabel(d.extracted, "Buyer", "")} ${partyLabel(d.extracted, "Seller", "")}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [deals, filter, query]);

  return (
    <>
      <PageHeading title="Deals" body="Every conversation Armor has turned into a structured deal." action={<Button onClick={() => go("new")}><Plus />New Conversation</Button>} />
      <div className="filterbar">
        <div className="filter-tabs">{(["All", "Completed", "Under Review"] as const).map((f) => (
          <button className={f === filter ? "active" : ""} key={f} onClick={() => setFilter(f)}>{f}</button>
        ))}</div>
        <IconButton label="More filters"><ListFilter /></IconButton>
      </div>
      {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading deals…</p>}
      <div className="data-table directory">
        <div className="table-row table-head"><span>Deal ID</span><span>Name / Parties</span><span>Value</span><span>Status</span><span>Created</span><span>Mode</span></div>
        {shown.map((d) => (
          <button className="table-row" onClick={() => openDeal(d.id)} key={d.id}>
            <span><b>{d.id}</b></span>
            <span><b>{d.deal_name}</b><small>{partyLabel(d.extracted, "Buyer", "—")} ↔ {partyLabel(d.extracted, "Seller", "—")}</small></span>
            <span><b>{d.extracted.total_value || money(d.extracted.total_value_numeric, d.extracted.currency)}</b></span>
            <span><StatusBadge status={dealBadge(d)} /></span>
            <span>{formatDate(d.created_at)}</span>
            <span>{d.generation_mode === "ai" ? "AI" : "Heuristic"}</span>
          </button>
        ))}
      </div>
      {!loading && !shown.length && <div className="empty-inline"><Search /><h3>No matching deals</h3><p>Try another status or search term.</p></div>}
    </>
  );
}

// ── Agreements (deals viewed through their agreement / email) ────────
function Agreements({ deals, loading, openDeal, go }: { deals: DealSummary[]; loading: boolean; openDeal: (id: string) => void; go: (s: Screen) => void }) {
  const [q, setQ] = useState("");
  const shown = deals.filter((d) => `${d.id} ${d.deal_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeading title="Agreements" body="Every agreement Armor has drafted from your deals." action={<Button onClick={() => go("new")}><Plus />New Agreement</Button>} />
      <label className="page-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agreement or deal" /></label>
      {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading…</p>}
      <div className="data-table directory agreements-table">
        <div className="table-row table-head"><span>Agreement</span><span>Counterparty</span><span>Value</span><span>Status</span><span>Last updated</span><span>Actions</span></div>
        {shown.map((a) => (
          <div className="table-row" key={a.id}>
            <span><b>{a.deal_name}</b><small>{a.id}</small></span>
            <span>{partyLabel(a.extracted, "Seller", "—")}</span>
            <span>{a.extracted.total_value || money(a.extracted.total_value_numeric, a.extracted.currency)}</span>
            <span><StatusBadge status={dealBadge(a)} /></span>
            <span>{formatDate(a.updated_at)}</span>
            <span className="row-actions">
              <IconButton label="View agreement" onClick={() => openDeal(a.id)}><ArrowRight /></IconButton>
            </span>
          </div>
        ))}
      </div>
      {!loading && !shown.length && <div className="empty-inline"><FileCheck2 /><h3>No agreements yet</h3><p>Analyze a conversation to generate your first agreement.</p></div>}
    </>
  );
}

// ── Activity (derived from real deal timestamps — no notifications API) ─
const ACTIVITY_ICONS: Record<string, { icon: typeof CheckCircle2; tone: string }> = {
  deal_analyzed: { icon: Handshake, tone: "blue" },
  deal_updated: { icon: PenLine, tone: "warn" },
  deal_shared: { icon: Send, tone: "blue" },
  deal_confirmed: { icon: CheckCircle2, tone: "" },
  changes_requested: { icon: AlertTriangle, tone: "warn" },
  deal_deleted: { icon: Trash2, tone: "warn" },
};

function ActivityCenter({ username, openDeal }: { username: string; openDeal: (id: string) => void }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivity(username).then(setEvents).catch((e) => setError(e.message));
  }, [username]);

  return (
    <>
      <PageHeading title="Activity" body="A real, server-side log of what's happened across your deals." />
      {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      {events === null && !error && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading…</p>}
      {events && events.length === 0 && (
        <div className="empty-inline"><Activity /><h3>Nothing yet</h3><p>Activity will appear here once you analyze a conversation.</p></div>
      )}
      {events && events.length > 0 && (
        <Card className="activity-feed">
          {events.map((e) => {
            const { icon: I, tone } = ACTIVITY_ICONS[e.event_type] || { icon: Info, tone: "" };
            return (
              <div className="activity-item" key={e.id}>
                <span className={`activity-icon ${tone}`}><I /></span>
                <div><b>{e.message}</b>{e.deal_id && <button onClick={() => openDeal(e.deal_id!)}>View related deal <ArrowRight /></button>}</div>
                <time>{formatDateTime(e.created_at)}</time>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}

// ── Settings ──────────────────────────────────────────────────────────
function SettingsPage({ session, profile, setProfile, notify }: {
  session: AuthUser; profile: Profile | null; setProfile: (p: Profile) => void; notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState<Partial<Profile>>(profile || {});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(profile || {}); }, [profile]);

  const save = async () => {
    setSaving(true);
    try { setProfile(await updateProfile(session.username, draft)); notify("Organisation profile updated successfully."); }
    catch (e: any) { notify(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeading title="Organisation Settings" body="These fields are stored in your Armor profile on the server." />
      <div className="settings-layout">
        <nav><button className="active"><Building2 />Organisation</button><button disabled style={{ opacity: 0.4 }}><UserRound />Primary Contact</button><button disabled style={{ opacity: 0.4 }}><LockKeyhole />Account &amp; Security</button></nav>
        <div>
          <Card className="settings-card">
            <h3>Account</h3>
            <div className="form-grid">
              <Field label="Name" defaultValue={session.name} readOnly />
              <Field label="Email" defaultValue={session.email} readOnly />
            </div>
            <h3>Organisation details</h3>
            <div className="form-grid">
              <Field label="Organisation name" value={draft.company_name || ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} />
              <Field label="Your role" value={draft.role || ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              <Field label="Default currency" value={draft.default_currency || "INR"} onChange={(e) => setDraft({ ...draft, default_currency: e.target.value })} />
              <Field label="Default advance %" type="number" value={draft.default_advance_percent ?? 30} onChange={(e) => setDraft({ ...draft, default_advance_percent: Number(e.target.value) })} />
            </div>
            <h3>Notes</h3>
            <textarea className="large-input" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Free-form notes about your organisation, address, industry, etc." />
            <div className="settings-actions"><Button onClick={save} loading={saving}><Check />Save Changes</Button></div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Auth (login / signup, wired to /api/auth/*) ───────────────────────
function Auth({ screen, go, onAuthed }: { screen: "login" | "signup"; go: (s: Screen) => void; onAuthed: (u: AuthUser) => void }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // signup fields
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const doLogin = async () => {
    setLoading(true); setError(null);
    try { onAuthed(await loginUser(loginEmail, loginPassword)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const doSignup = async () => {
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (!agreed) { setError("Please agree to the terms to continue."); return; }
    setLoading(true); setError(null);
    try {
      const user = await signupUser({ email: contactEmail, password, name: contactName, company_name: orgName, role });
      // Fields the backend's signup endpoint doesn't persist directly (org
      // type/industry/website/country/address/phone) are saved into the
      // free-text profile "notes" field instead, so nothing typed is lost.
      const notes = [
        orgType && `Type: ${orgType}`, industry && `Industry: ${industry}`, website && `Website: ${website}`,
        country && `Country: ${country}`, address && `Address: ${address}`, contactPhone && `Phone: ${contactPhone}`,
      ].filter(Boolean).join(" · ");
      if (notes) { try { await updateProfile(user.username, { notes }); } catch { /* best-effort */ } }
      onAuthed(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === "login") {
    return (
      <div className="auth-page">
        <aside className="auth-story">
          <button className="brand"><span className="brand__mark"><ShieldCheck /></span><span>ARMOR</span></button>
          <div>
            <span className="eyebrow">AGREEMENT INTELLIGENCE</span>
            <h1>Turn business conversations into agreements you can act on.</h1>
            <p>Understand the deal. Verify the terms. Track every financial commitment through completion.</p>
            <div className="auth-flow"><span>Conversation</span><ArrowRight /><span>Verified deal</span><ArrowRight /><span>Action</span></div>
          </div>
          <footer>Trusted workflow for accountable business agreements.</footer>
        </aside>
        <main className="auth-form">
          <div>
            <span className="mobile-brand">ARMOR</span>
            <h2>Welcome back</h2>
            <p>Sign in to your organisation workspace.</p>
            <Field label="Work email" icon={<Mail />} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@company.in" />
            <label className="field"><span className="field__label">Password</span><span className="field__control"><LockKeyhole /><input type={show ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /><button onClick={() => setShow(!show)} type="button">{show ? "Hide" : "Show"}</button></span></label>
            {error && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>{error}</p>}
            <Button onClick={doLogin} loading={loading}>Sign In <ArrowRight /></Button>
            <p className="auth-switch">New to Armor? <button onClick={() => go("signup")}>Create organisation</button></p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <header><button className="brand"><span className="brand__mark"><ShieldCheck /></span><span>ARMOR</span></button><span>Already have an account? <button onClick={() => go("login")}>Sign in</button></span></header>
      <main>
        <div className="signup-head"><span className="eyebrow">CREATE YOUR WORKSPACE</span><h1>Set up your organisation</h1><p>Armor uses these details to prepare trusted business agreements.</p></div>
        <div className="steps"><span className={step >= 1 ? "active" : ""}>1 <b>Organisation</b></span><i /><span className={step >= 2 ? "active" : ""}>2 <b>Contact</b></span><i /><span className={step >= 3 ? "active" : ""}>3 <b>Security</b></span></div>
        <Card className="signup-card">
          {step === 1 && (
            <div className="form-grid">
              <Field label="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Vertex Commerce" />
              <Field label="Organisation type" value={orgType} onChange={(e) => setOrgType(e.target.value)} placeholder="Private Limited" />
              <Field label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industrial Supply" />
              <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="company.in" />
              <Field label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              <Field label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, State" />
            </div>
          )}
          {step === 2 && (
            <div className="form-grid">
              <Field label="Primary contact name" icon={<UserRound />} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
              <Field label="Primary contact email" icon={<Mail />} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="name@company.in" />
              <Field label="Primary contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
              <Field label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director" />
            </div>
          )}
          {step === 3 && (
            <>
              <Field label="Password" icon={<LockKeyhole />} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Field label="Confirm password" icon={<LockKeyhole />} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <label className="terms"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I agree to Armor's terms and privacy policy.</label>
            </>
          )}
          {error && <p style={{ color: "var(--danger)", fontSize: 11, margin: "8px 0" }}>{error}</p>}
          <div className="signup-actions">
            {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}
            <Button loading={loading} onClick={() => (step < 3 ? setStep(step + 1) : doSignup())}>{step < 3 ? "Continue" : "Create Workspace"}<ArrowRight /></Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

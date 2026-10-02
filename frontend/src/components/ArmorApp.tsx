import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Search, Plus, Menu, Sun, Moon } from "lucide-react";
import { Sidebar, Header } from "./shared/Layout";
import { Auth } from "./screens/Auth";
import { Dashboard } from "./screens/Dashboard";
import { Meeting } from "./screens/Meeting";
import { Recording } from "./screens/Recording";
import { TranscriptWorkspace } from "./screens/Transcript";
import { Analysis } from "./screens/Analysis";
import { DealReview } from "./screens/DealReview";
import { Agreement } from "./screens/Agreement";
import { Counterparty } from "./screens/Counterparty";
import { DealDetail } from "./screens/DealDetail";
import { DealsDirectory } from "./screens/DealsDirectory";
import { Agreements } from "./screens/Agreements";
import { ActivityCenter } from "./screens/Activity";
import { SettingsPage } from "./screens/Settings";
import { NewConversation } from "./screens/NewConversation";
import {
  API_BASE_URL, analyzeDeal, checkHealth, getDeal, getProfile, getSampleTranscript, listDeals,
} from "@/lib/api";
import { clearSession, loadSession, saveSession } from "@/lib/auth";
import { linesToTranscript, transcriptToLines } from "@/lib/format";
import type { AuthUser, DealRecord, DealSummary, HealthStatus, Screen, TranscriptLine } from "@/types/armor";

type ConnStatus = "checking" | "online" | "offline";

export default function ArmorApp() {
  const [session, setSession] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
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

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("armor_theme") as "dark" | "light";
      if (saved) return saved;
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("armor_theme", theme);
  }, [theme]);

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const go = (s: Screen) => { setScreen(s); setSidebar(false); window.scrollTo(0, 0); };
  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(""), 3200); };

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
  }, []);

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

  const [activeDeal, setActiveDeal] = useState<DealRecord | null>(null);

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

  if (!sessionChecked) return null;
  if (!session) {
    return (
      <Auth
        screen={screen === "signup" ? "signup" : "login"}
        go={go}
        onAuthed={(u) => { saveSession(u); setSession(u); go("dashboard"); }}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      />
    );
  }

  if (screen === "counterparty" && activeDeal) {
    return <Counterparty deal={activeDeal} go={go} notify={notify} setDeal={setActiveDeal} theme={theme} onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} />;
  }

  return (
    <div className="app-shell">
      <Sidebar screen={screen} go={go} open={sidebar} profile={profile} onLogout={handleLogout} theme={theme} onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} />
      <div className="app-main">
        <Header title={screen.charAt(0).toUpperCase() + screen.slice(1)} setSidebar={setSidebar} go={go} search={search} setSearch={setSearch} session={session} conn={conn} onRetry={recheckHealth} theme={theme} onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} />
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
            <Meeting go={go} onFinish={(text) => { setLines(transcriptToLines(text)); go("transcript"); }} />
          )}
          {screen === "recording" && (
            <Recording go={go} onTranscribed={(text) => { setLines(transcriptToLines(text)); go("transcript"); }} health={health} conn={conn} onRetry={recheckHealth} />
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
          {screen === "activity" && <ActivityCenter username={session.username} openDeal={openDeal} go={go} />}
          {screen === "settings" && session && (
            <SettingsPage session={session} profile={profile} setProfile={setProfile} notify={notify} go={go} />
          )}
        </main>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

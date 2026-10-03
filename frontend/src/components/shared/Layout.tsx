import { IconButton } from "./armor-ui";
import type { Screen } from "@/types/armor";
import {
  Activity, ArrowRight, Boxes, Building2, CheckCircle2, FileCheck2, Handshake, LayoutDashboard, LogOut,
  Menu, Moon, Plus, Settings, ShieldCheck, Sun,
} from "lucide-react";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new", label: "New Conversation", icon: Plus },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "agreements", label: "Agreements", icon: FileCheck2 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ screen, go, open, profile, onLogout, theme, onToggleTheme }: {
  screen: Screen; go: (s: Screen) => void; open: boolean; profile: any; onLogout: () => void;
  theme: "dark" | "light"; onToggleTheme: () => void;
}) {
  const orgName = profile?.company_name?.trim() || "Your workspace";
  const initials = orgName.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "AR";
  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
      <button className="brand" onClick={() => go("dashboard")}>
        <span className="brand__mark">
          <img src="/LOGO_Fair.png" alt="Armor" style={{ width: 34, height: 34, objectFit: "contain" }} />
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.03em" }}>ARMOR</span>
      </button>
      <p className="nav-label">Workspace</p>
      <nav>{nav.map((item) => { const I = item.icon; return (
        <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => go(item.id as Screen)}>
          <I size={18} /><span>{item.label}</span>
        </button>
      ); })}</nav>
      <div className="sidebar__foot">
        <div className="org-avatar">{initials}</div>
        <div className="sidebar__user-info">
          <strong>{orgName}</strong>
          <span>{profile?.role || "Workspace"}</span>
        </div>
        <IconButton label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>
        <IconButton label="Sign out" onClick={onLogout}><LogOut size={15} /></IconButton>
      </div>
    </aside>
  );
}

export function Header({ title, setSidebar, go, search, setSearch, session, conn, onRetry, theme, onToggleTheme }: {
  title: string; setSidebar: (v: boolean) => void; go: (s: Screen) => void; search: string;
  setSearch: (v: string) => void; session: any; conn: string; onRetry: () => void;
  theme: "dark" | "light"; onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <IconButton label="Open navigation" className="menu-button" onClick={() => setSidebar(true)}><Menu /></IconButton>
        <div>
          <span className="crumb" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <img src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"} alt="Armor Logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
            Armor / {session.name}
          </span>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="topbar__tools">
        {conn === "offline" && (
          <button onClick={onRetry} title="Backend unreachable" style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--danger)", color: "var(--danger)", background: "transparent", borderRadius: 7, padding: "0 10px", height: 34, fontSize: 10, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />Backend unreachable — Retry
          </button>
        )}
        {conn === "checking" && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--muted-foreground)" }}>
            Connecting…
          </span>
        )}
        <label className="global-search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals..." /></label>
        <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
        <button className="profile"><span>{session.name.slice(0, 2).toUpperCase()}</span></button>
      </div>
    </header>
  );
}

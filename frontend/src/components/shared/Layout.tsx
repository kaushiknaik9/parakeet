import { IconButton } from "./armor-ui";
import type { Screen } from "@/types/armor";
import {
  Activity,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Sparkles,
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

export function Sidebar({
  screen,
  go,
  open,
  profile,
  onLogout,
  theme,
  onToggleTheme,
}: {
  screen: Screen;
  go: (s: Screen) => void;
  open: boolean;
  profile: any;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const orgName = profile?.company_name?.trim() || "Your workspace";
  const initials =
    orgName
      .split(/\s+/)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AR";

  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`} data-theme="dark">
      {/* Brand Header */}
      <button className="brand" onClick={() => go("dashboard")}>
        <span className="brand__mark">
          <img
            src="/LOGO_Fair.png"
            alt="Armor Logo"
            style={{ width: 32, height: 32, objectFit: "contain" }}
          />
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", color: "#F0F6FC" }}>
              ARMOR
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                background: "#2F81F7",
                color: "#FFFFFF",
                padding: "1px 5px",
                borderRadius: 4,
                letterSpacing: "0.05em",
              }}
            >
              AI
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              color: "#8B949E",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Deal Intelligence
          </span>
        </div>
      </button>

      {/* Navigation */}
      <p className="nav-label">Workspace</p>
      <nav>
        {nav.map((item) => {
          const I = item.icon;
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              className={isActive ? "active" : ""}
              onClick={() => go(item.id as Screen)}
              style={{
                position: "relative",
              }}
            >
              <I size={17} style={{ color: isActive ? "#3B91FF" : "#8B96A8" }} />
              <span>{item.label}</span>
              {item.id === "new" && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    background: "rgba(47, 129, 247, 0.15)",
                    color: "#58A6FF",
                    padding: "2px 6px",
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar__foot">
        <div className="org-avatar" style={{ background: "linear-gradient(135deg, #1f6feb, #238636)" }}>
          {initials}
        </div>
        <div className="sidebar__user-info">
          <strong style={{ color: "#F0F6FC" }}>{orgName}</strong>
          <span style={{ color: "#8B949E" }}>{profile?.role || "Commercial Workspace"}</span>
        </div>
        <IconButton
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={onToggleTheme}
          style={{ width: 28, height: 28 }}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </IconButton>
        <IconButton
          label="Sign out"
          onClick={onLogout}
          style={{ width: 28, height: 28 }}
        >
          <LogOut size={14} />
        </IconButton>
      </div>
    </aside>
  );
}

export function Header({
  title,
  setSidebar,
  go,
  search,
  setSearch,
  session,
  conn,
  onRetry,
  theme,
  onToggleTheme,
}: {
  title: string;
  setSidebar: (v: boolean) => void;
  go: (s: Screen) => void;
  search: string;
  setSearch: (v: string) => void;
  session: any;
  conn: string;
  onRetry: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <IconButton
          label="Open navigation"
          className="menu-button"
          onClick={() => setSidebar(true)}
        >
          <Menu />
        </IconButton>
        <div>
          <span className="crumb" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <img
              src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"}
              alt="Armor"
              style={{ width: 16, height: 16, objectFit: "contain" }}
            />
            <span style={{ color: "var(--muted-foreground)" }}>ARMOR</span>
            <span style={{ color: "var(--border-strong)" }}>/</span>
            <span style={{ color: "var(--muted-foreground)" }}>{session.name}</span>
            <span style={{ color: "var(--border-strong)" }}>/</span>
            <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{title}</span>
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
        </div>
      </div>

      <div className="topbar__tools">

        {conn === "offline" && (
          <button
            onClick={onRetry}
            title="Backend unreachable — click to retry"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--danger)",
              color: "var(--danger-text)",
              background: "rgba(218, 54, 51, 0.08)",
              borderRadius: 6,
              padding: "0 10px",
              height: 30,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--danger)",
              }}
            />
            Server Unreachable — Retry
          </button>
        )}

        {conn === "checking" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            Connecting…
          </span>
        )}

        {/* Global Search */}
        <label className="global-search" style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals, counterparties..."
            style={{ paddingLeft: 30 }}
          />
        </label>

        {/* Theme Toggle */}
        <IconButton
          label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        {/* Profile Avatar */}
        <button
          className="profile"
          onClick={() => go("settings")}
          title="Account settings"
        >
          <span>{session.name.slice(0, 2).toUpperCase()}</span>
        </button>
      </div>
    </header>
  );
}

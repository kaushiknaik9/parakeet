import React, { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TranscriptInput from "./components/TranscriptInput";
import DealWorkspace from "./components/DealWorkspace";
import DealHistory from "./components/DealHistory";
import SettingsView from "./components/SettingsView";
import UserProfile from "./components/UserProfile";
import AboutSection from "./components/AboutSection";
import AuthPage from "./pages/AuthPage";
import { DashParticles } from "./components/DashParticles";
import { CursorGlow } from "./components/BackgroundEffects";
import { analyzeDeal, getDeal } from "./api/dealapi";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [palette, setPalette] = useState("warm");
  const aboutRef = useRef(null);

  // ── Deal flow state ───────────────────────────────────────────────────
  const [activeDeal, setActiveDeal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  // ── Derive username from email ────────────────────────────────────────
  const username = (user?.email?.split("@")[0] ?? "guest")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleTabClick = (tabId) => {
    if (tabId === "new_convo") {
      setActiveDeal(null);
      setAnalyzeError(null);
      setActiveTab("dashboard");
    } else {
      setActiveTab(tabId);
    }
  };

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAnalyze = async (transcript, dealName) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const deal = await analyzeDeal(username, transcript, dealName);
      setActiveDeal(deal);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openDealFromHistory = async (dealId) => {
    try {
      const deal = await getDeal(dealId);
      setActiveDeal(deal);
      setActiveTab("dashboard");
    } catch (err) {
      setAnalyzeError(err.message);
    }
  };

  // ── Scroll container ────────────────────────────────────────────────────
  const mainRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: mainRef });

  // ── Mouse parallax ───────────────────────────────────────────────────────
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const mouseX = useSpring(rawMouseX, { stiffness: 25, damping: 18 });
  const mouseY = useSpring(rawMouseY, { stiffness: 25, damping: 18 });

  const mouseBlob1X = useTransform(mouseX, [-1, 1], [-50, 50]);
  const mouseBlob1Y = useTransform(mouseY, [-1, 1], [-35, 35]);
  const mouseBlob2X = useTransform(mouseX, [-1, 1], [35, -35]);
  const mouseBlob2Y = useTransform(mouseY, [-1, 1], [25, -25]);
  const mouseBlob3X = useTransform(mouseX, [-1, 1], [-20, 20]);
  const mouseBlob3Y = useTransform(mouseY, [-1, 1], [-15, 15]);

  const scrollBlob1Y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const scrollBlob2Y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const scrollBlob3Y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const blob1X = mouseBlob1X;
  const blob1Y = useTransform([mouseBlob1Y, scrollBlob1Y], ([m, s]) => m + s);
  const blob2X = mouseBlob2X;
  const blob2Y = useTransform([mouseBlob2Y, scrollBlob2Y], ([m, s]) => m + s);
  const blob3X = mouseBlob3X;
  const blob3Y = useTransform([mouseBlob3Y, scrollBlob3Y], ([m, s]) => m + s);

  const handleMouseMove = (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    rawMouseX.set((e.clientX - cx) / cx);
    rawMouseY.set((e.clientY - cy) / cy);
  };

  const getHeaderBackHandler = () => {
    if (activeTab === "dashboard" && activeDeal) {
      return () => setActiveDeal(null);
    }
    if (activeTab === "reports") return () => setActiveTab("dashboard");
    return null;
  };

  return (
    <div
      className={`flex h-screen overflow-hidden relative font-sans ${theme} ${palette}`}
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
      onMouseMove={handleMouseMove}
    >
      {/* ── Global cursor glow ────────────────────────────────────────────── */}
      <CursorGlow />

      {/* ── Background layer ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="dot-grid absolute inset-0" />
        <div className="grain absolute inset-0" />
        <DashParticles />
        <div
          className="absolute inset-0 transition-colors duration-500 pointer-events-none"
          style={{
            background:
              theme === "dark"
                ? "radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(2,2,2,0.65) 100%)"
                : "radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(248,250,252,0.85) 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.26, 0.18] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-22%] left-[-12%] w-[55vw] h-[55vw] rounded-full blur-[140px]"
          style={{
            x: blob1X,
            y: blob1Y,
            backgroundColor: palette === "void" ? "#4f46e5" : "var(--glass-base)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute bottom-[-14%] right-[-12%] w-[65vw] h-[65vw] rounded-full blur-[160px]"
          style={{
            x: blob2X,
            y: blob2Y,
            backgroundColor: palette === "void" ? "#7c3aed" : "var(--glass-base)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-[120px]"
          style={{
            x: blob3X,
            y: blob3Y,
            backgroundColor: palette === "void" ? "#06b6d4" : "var(--glass-base)",
          }}
        />
        <div className="beam-wrap absolute inset-0 overflow-hidden pointer-events-none">
          <div className="beam" />
        </div>
      </div>

      {/* ── App layout ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <AuthPage
            key="auth"
            theme={theme}
            onAuthSuccess={(userData) => {
              setUser(userData);
              setIsAuthenticated(true);
            }}
          />
        ) : (
          <motion.div
            key="app-core"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 flex flex-col md:flex-row w-full h-full relative z-10"
          >
            <Sidebar activeTab={activeTab} onTabClick={handleTabClick} onAboutClick={scrollToAbout} />

            <main
              ref={mainRef}
              className="flex-1 flex flex-col relative z-10 h-full overflow-y-auto w-full scroll-smooth pb-16 md:pb-0 custom-scrollbar"
              id="scroll-container"
            >
              <Header
                theme={theme}
                toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                onBack={getHeaderBackHandler()}
                palette={palette}
                togglePalette={() => setPalette((p) => (p === "warm" ? "void" : "warm"))}
                user={user}
                onLogout={() => {
                  setIsAuthenticated(false);
                  setUser(null);
                  setActiveDeal(null);
                }}
              />

              <div className="px-4 md:px-8 max-w-7xl mx-auto w-full min-h-[calc(100vh-80px)] flex flex-col">
                <div className="flex-1" />
                <div className="w-full shrink-0 flex flex-col py-8">
                  <AnimatePresence mode="wait">
                    {activeTab === "settings" && (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full flex flex-col justify-center"
                      >
                        <SettingsView theme={theme} />
                      </motion.div>
                    )}

                    {activeTab === "profile" && (
                      <motion.div
                        key="profile"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full flex flex-col justify-center"
                      >
                        <UserProfile username={username} />
                      </motion.div>
                    )}

                    {activeTab === "reports" && (
                      <motion.div
                        key="reports-history"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full"
                      >
                        <DealHistory username={username} onOpenDeal={openDealFromHistory} />
                      </motion.div>
                    )}

                    {activeTab === "dashboard" && !activeDeal && (
                      <motion.div key="transcript-input" className="w-full">
                        <TranscriptInput
                          onAnalyze={handleAnalyze}
                          isAnalyzing={isAnalyzing}
                          error={analyzeError}
                        />
                      </motion.div>
                    )}

                    {activeTab === "dashboard" && activeDeal && (
                      <DealWorkspace
                        key="deal-workspace"
                        deal={activeDeal}
                        onNewDeal={() => setActiveDeal(null)}
                        onEmailUpdated={(updated) => setActiveDeal(updated)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1" />
              </div>

              <div ref={aboutRef}>
                <AboutSection />
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

import React from "react";
import {
  LayoutDashboard,
  MessageSquarePlus,
  FileText,
  Settings,
  UserRound,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

const Sidebar = ({ activeTab, onTabClick, onAboutClick }) => {
  const items = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "new_convo", icon: MessageSquarePlus, label: "New Deal" },
    { id: "reports", icon: FileText, label: "Deal History" },
    { id: "profile", icon: UserRound, label: "Profile" },
    { id: "settings", icon: Settings, label: "Settings" },
    { id: "about", icon: Info, label: "About" },
  ];

  return (
    <nav className="fixed bottom-0 md:relative w-full md:w-20 lg:w-24 h-16 md:h-full glass-panel border-t md:border-t-0 md:border-r border-[var(--glass-border)] flex flex-row md:flex-col items-center justify-around md:justify-start px-2 md:px-0 md:py-8 z-50 md:z-20 md:bg-transparent backdrop-blur-2xl">
      <div className="w-full h-full flex flex-row md:flex-col items-center justify-between md:justify-start md:gap-8 md:mt-12 overflow-x-auto md:overflow-visible no-scrollbar px-2 sm:px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.div
              key={item.id}
              onClick={() => {
                if (item.id === "about") onAboutClick();
                else onTabClick(item.id);
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`relative p-3 rounded-2xl cursor-pointer group transition-colors ${isActive ? "bg-[var(--glass-base)]/10 text-[var(--text-main)] shadow-[0_0_15px_rgba(150,150,150,0.15)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />

              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 glass-panel rounded-lg text-sm bg-[var(--text-main)] text-[var(--bg-main)] font-medium opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 hidden md:block">
                {item.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
};

export default Sidebar;

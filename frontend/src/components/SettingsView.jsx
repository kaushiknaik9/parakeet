import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calculator, Shield, Bell } from 'lucide-react';

const SettingsRow = ({ icon, title, desc, active, onToggle }) => (
  <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] hover:bg-[var(--glass-base)]/5 transition-colors group cursor-pointer" onClick={onToggle}>
    <div className="flex items-center gap-5">
      <div className={`p-3 rounded-2xl transition-colors ${active ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'bg-[var(--glass-base)]/10 text-[var(--text-main)] opacity-50'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold text-[var(--text-main)] mb-1">{title}</h4>
        <p className="text-sm text-[var(--text-muted)] line-clamp-1">{desc}</p>
      </div>
    </div>
    
    {/* Custom Toggle Switch */}
    <div className={`w-14 h-8 rounded-full p-1 transition-colors relative ${active ? 'bg-emerald-500' : 'bg-[var(--glass-base)]/10'}`}>
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-6 h-6 rounded-full bg-white shadow-md absolute"
        style={{ left: active ? 'calc(100% - 28px)' : '4px' }}
      />
    </div>
  </div>
);

const SettingsView = () => {
  const [settings, setSettings] = useState({
    autoDraft: true,
    autoCalc: true,
    privacy: false,
    notifs: true,
  });

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  return (
    <div className="max-w-4xl w-full mx-auto animate-in fade-in zoom-in duration-500">
      <h2 className="text-3xl font-bold text-[var(--text-main)] mb-8 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[var(--glass-base)]/10 text-[var(--text-main)]">
          <Calculator size={24} />
        </div>
        Preferences
      </h2>

      <div className="glass-panel rounded-3xl overflow-hidden flex flex-col shadow-[0_0_30px_rgba(150,150,150,0.02)]">
        <SettingsRow 
          icon={<Sparkles size={24} />}
          title="Auto-draft Confirmation Email"
          desc="Automatically generate the counterparty email right after analysis."
          active={settings.autoDraft}
          onToggle={() => toggle('autoDraft')}
        />
        <SettingsRow 
          icon={<Calculator size={24} />}
          title="Auto-fill Deal Calculator"
          desc="Pre-fill the advance/balance calculator from extracted deal terms."
          active={settings.autoCalc}
          onToggle={() => toggle('autoCalc')}
        />
        <SettingsRow 
          icon={<Shield size={24} />}
          title="Strict Data Privacy"
          desc="Keep transcripts and deal data local to your own database and API keys."
          active={settings.privacy}
          onToggle={() => toggle('privacy')}
        />
        <SettingsRow 
          icon={<Bell size={24} />}
          title="Deadline Alerts"
          desc="Get notified as a deal's countdown approaches its deadline."
          active={settings.notifs}
          onToggle={() => toggle('notifs')}
        />
      </div>
    </div>
  );
};

export default SettingsView;

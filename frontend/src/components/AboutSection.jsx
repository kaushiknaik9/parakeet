import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature, Calculator, MailCheck, X } from 'lucide-react';
import { CometCard } from './ui/comet-card';

/* ── Feature highlight cards (top grid) ──────────────────────────────── */
const features = [
  {
    icon: <FileSignature size={28} />,
    title: 'Deal Extraction',
    desc: 'Parties, product, value, payment & delivery terms pulled straight from your transcript.',
    glow: 'color-mix(in srgb, var(--glass-base) 8%, transparent)',
  },
  {
    icon: <Calculator size={28} />,
    title: 'Deal Calculator',
    desc: 'Advance vs. balance split calculated instantly, and stays editable if terms change.',
    glow: 'color-mix(in srgb, var(--glass-base) 6%, transparent)',
  },
  {
    icon: <MailCheck size={28} />,
    title: 'Confirmation Email',
    desc: 'A ready-to-send counterparty email confirming exactly what was agreed.',
    glow: 'color-mix(in srgb, var(--glass-base) 7%, transparent)',
  },
];

/* ── Expandable "Who We Are" cards ───────────────────────────────────── */
const teamCards = [
  {
    title: 'Our Mission',
    description: 'Why Armour exists',
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80',
    ctaText: 'Learn More',
    content: () => (
      <p>
        Deals are won and lost in conversation — but the details agreed on a call rarely make it
        into a clean written record. Armour closes that gap.<br /><br />
        Drop in a negotiation transcript and get back structured deal data, a plain-English
        agreement, a live payment calculator, and a confirmation email — in seconds, not hours.
      </p>
    ),
  },
  {
    title: 'The Technology',
    description: 'How the multi-agent pipeline works',
    src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80',
    ctaText: 'Explore',
    content: () => (
      <p>
        A crew of specialised CrewAI agents work in sequence: an extraction agent pulls
        structured facts (parties, value, terms, deadlines) from the raw transcript, an
        agreement agent turns those facts into a readable deal summary, and a communication
        agent drafts the confirmation email.<br /><br />
        Even mixed-language, informal negotiation talk is normalised into clean numbers,
        dates, and terms — with every field traceable back to what was actually said.
      </p>
    ),
  },
  {
    title: 'Deal Agreement',
    description: '"What exactly did we agree to?"',
    src: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
    ctaText: 'See it work',
    content: () => (
      <p>
        No more re-listening to a call to remember the fine print. The Deal Agreement view
        answers "what exactly did we agree to?" with a structured, section-by-section summary —
        parties, scope, commercial terms, responsibilities, conditions, and any changes that
        were negotiated mid-call.
      </p>
    ),
  },
  {
    title: 'Calculator & Countdown',
    description: 'Money and deadlines, kept live',
    src: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80',
    ctaText: 'Try it',
    content: () => (
      <p>
        The Deal Calculator auto-fills from the extracted total value and payment split
        (e.g. a ₹4,00,000 deal at 30% advance becomes ₹1,20,000 upfront and ₹2,80,000 on
        delivery) and stays fully editable. The Countdown view tracks the agreed deadline in
        real time, so nothing slips through the cracks.
      </p>
    ),
  },
  {
    title: 'Privacy & Data',
    description: 'Your transcripts, your keys',
    src: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80',
    ctaText: 'Read More',
    content: () => (
      <p>
        Transcripts are analysed using the LLM provider and API key you configure yourself —
        nothing is sent anywhere without your own credentials. Deal history is stored locally
        in your own database, and can be deleted at any time.
      </p>
    ),
  },
];

/* ── useOutsideClick (no external dep) ───────────────────────────────── */
function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

/* ── CloseIcon ───────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.05 } }}
  >
    <X size={14} />
  </motion.div>
);

/* ── Main Component ──────────────────────────────────────────────────── */
const AboutSection = () => {
  const [active, setActive] = useState(null);
  const cardRef = useRef(null);
  const id = useId();

  useOutsideClick(cardRef, () => setActive(null));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [active]);

  const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.18 } } };
  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section className="w-full relative mt-[35vh] border-t border-[var(--glass-border)]/30 overflow-hidden py-40">

      {/* Background accents */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--glass-base)]/20 to-transparent opacity-50" />
      <div className="dot-grid absolute inset-0 opacity-40" />
      <div className="grain absolute inset-0" />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="absolute -bottom-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[40vw] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: 'color-mix(in srgb, var(--glass-base) 4%, transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-8 relative z-10 flex flex-col text-center items-center">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 p-6 rounded-full bg-[var(--glass-base)]/5 border border-[var(--glass-border)] inline-block"
        >
          <FileSignature size={48} className="text-[var(--text-main)] opacity-60" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl font-black tracking-tight mb-10 leading-tight"
        >
          From conversation<br />to closed deal.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl text-[var(--text-muted)] text-xl md:text-2xl leading-relaxed mb-24"
        >
          Armour turns a raw negotiation transcript into extracted terms, a signed-off
          agreement, a live payment calculator, and a confirmation email — automatically.
        </motion.p>

        {/* ── Feature grid (top 3 cards) ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-32"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariants}
              className="glass-panel rounded-3xl p-10 flex flex-col items-center text-center group hover:border-[var(--glass-base)]/15 transition-all duration-300"
              whileHover={{ y: -8, boxShadow: `0 25px 50px -12px ${f.glow}`, transition: { duration: 0.25 } }}
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--glass-base)]/5 flex justify-center items-center mb-6 text-[var(--text-main)] opacity-40 group-hover:opacity-70 group-hover:bg-[var(--glass-base)]/10 group-hover:scale-110 transition-all duration-300">
                {f.icon}
              </div>
              <h4 className="font-bold text-xl md:text-2xl mb-3 text-[var(--text-main)]">{f.title}</h4>
              <p className="text-base text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Expandable cards section ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-4xl"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-main)]">
            Who We Are
          </h3>
          <p className="text-[var(--text-muted)] mb-12 text-lg">Click any card to explore in detail.</p>

          {/* Backdrop overlay */}
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              />
            )}
          </AnimatePresence>

          {/* Expanded modal */}
          <AnimatePresence mode="popLayout">
            {active && (
              <div className="fixed inset-0 grid place-items-center z-50 px-4">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setActive(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--glass-base)]/10 border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/20 transition"
                >
                  <CloseIcon />
                </motion.button>

                {/* Modal — no layoutId so close doesn't spring-back */}
                <motion.div
                  key={active.title}
                  ref={cardRef}
                  initial={{ opacity: 0, scale: 0.94, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 12 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 50 }}
                  className="w-full max-w-[500px] outline-none"
                >
                  <CometCard className="w-full flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
                    <div className="relative w-full h-64 overflow-hidden shrink-0">
                      <img
                        src={active.src}
                        alt={active.title}
                        className="absolute inset-0 w-full h-full object-cover object-top saturate-50 contrast-75 bg-[#000]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F2121] via-[#1F2121]/30 to-transparent opacity-90" />
                    </div>

                    <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[50vh] bg-[#1F2121] text-white saturate-[0.85]">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-bold text-2xl font-mono text-white">{active.title}</h3>
                          <p className="text-sm text-gray-300 opacity-80 font-mono mt-1">{active.description}</p>
                        </div>
                        <span className="shrink-0 px-4 py-2 text-xs rounded-full font-bold border border-white/20 bg-white/10 text-white opacity-90 font-mono">
                          {active.ctaText}
                        </span>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: 0.06 }}
                        className="text-gray-300 opacity-90 text-sm leading-relaxed font-mono"
                      >
                        {typeof active.content === 'function' ? active.content() : active.content}
                      </motion.div>
                    </div>
                  </CometCard>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Card list */}
          <ul className="w-full grid grid-cols-1 gap-6 text-left">
            {teamCards.map((card) => (
              <motion.li
                layoutId={`card-container-${card.title}-${id}`}
                key={card.title}
                onClick={() => setActive(card)}
                className="cursor-pointer group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              >
                <CometCard className="w-full">
                  <div className="flex flex-col md:flex-row items-center gap-5 p-4 rounded-2xl bg-[#1F2121] text-white saturate-[0.85] w-full">
                    {/* Thumbnail */}
                    <motion.div
                      layoutId={`image-${card.title}-${id}`}
                      className="shrink-0"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    >
                      <img
                        src={card.src}
                        alt={card.title}
                        className="w-full md:w-20 md:h-20 h-40 rounded-[12px] object-cover object-top saturate-50 contrast-75 bg-black"
                      />
                    </motion.div>

                    {/* Text */}
                    <div className="flex-1 text-center md:text-left">
                      <motion.h3
                        layoutId={`title-${card.title}-${id}`}
                        className="font-bold font-mono text-white text-lg"
                      >
                        {card.title}
                      </motion.h3>
                      <motion.p
                        layoutId={`desc-${card.title}-${id}`}
                        className="text-sm text-gray-300 opacity-80 font-mono mt-1"
                      >
                        {card.description}
                      </motion.p>
                    </div>

                    {/* CTA */}
                    <motion.button
                      layoutId={`cta-${card.title}-${id}`}
                      className="shrink-0 px-5 py-2 text-xs rounded-full font-bold border border-white/20 bg-white/10 text-white opacity-80 group-hover:opacity-100 group-hover:bg-white/20 transition-all font-mono"
                    >
                      {card.ctaText}
                    </motion.button>
                  </div>
                </CometCard>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;

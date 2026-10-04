import React from "react";
import {
  Mic,
  BrainCircuit,
  Handshake,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 1. EDITORIAL HEADING: Large artistic serif display heading
// ─────────────────────────────────────────────────────────────────────────────
export function EditorialHeading({
  kicker,
  title,
  subtitle,
  actions,
  className,
}: {
  kicker?: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("editorial-header", className)}>
      <div className="editorial-header__content">
        {kicker && <div className="editorial-kicker">{kicker}</div>}
        <h1 className="editorial-title">{title}</h1>
        {subtitle && <p className="editorial-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="editorial-header__actions">{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WAVEFORM VISUALIZER: Animated or static sound wave visualization
// ─────────────────────────────────────────────────────────────────────────────
export function WaveformVisualizer({
  active = false,
  barCount = 36,
  className,
  color = "var(--primary)",
}: {
  active?: boolean;
  barCount?: number;
  className?: string;
  color?: string;
}) {
  // Pre-calculated wave height pattern
  const heights = [
    25, 45, 60, 30, 75, 90, 40, 65, 85, 30, 50, 95, 80, 45, 70, 85, 40, 60,
    90, 75, 35, 80, 65, 40, 90, 50, 70, 85, 30, 60, 80, 45, 70, 55, 35, 20,
  ];

  return (
    <div
      className={cn("waveform-container", active && "waveform--active", className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const height = heights[i % heights.length];
        return (
          <span
            key={i}
            className="waveform-bar"
            style={
              {
                "--bar-height": `${height}%`,
                "--delay": `${(i * 0.05).toFixed(2)}s`,
                backgroundColor: color,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PIPELINE VISUALIZER: Interactive Conversation → Deal Intelligence Flow
// ─────────────────────────────────────────────────────────────────────────────
export function IntelligencePipeline({
  className,
  activeStep = 3,
}: {
  className?: string;
  activeStep?: number;
}) {
  const steps = [
    {
      num: "01",
      name: "Conversation",
      desc: "Live audio / notes / transcript",
      icon: Mic,
      tag: "Audio & Text",
    },
    {
      num: "02",
      name: "AI Extraction",
      desc: "Diarization & commercial terms",
      icon: BrainCircuit,
      tag: "NLP Parser",
    },
    {
      num: "03",
      name: "Deal Intelligence",
      desc: "Values, commitments & contradiction check",
      icon: Handshake,
      tag: "Verified Terms",
    },
    {
      num: "04",
      name: "Agreement",
      desc: "Digital contract & counterparty confirmation",
      icon: FileCheck2,
      tag: "Commercial Doc",
    },
  ];

  return (
    <div className={cn("pipeline-card", className)}>
      <div className="pipeline-card__header">
        <div>
          <span className="pipeline-kicker">
            <Sparkles size={13} className="text-primary inline mr-1.5" />
            AI-POWERED CONTRACT PIPELINE
          </span>
          <h3 className="pipeline-title">From Spoken Word to Signed Agreement</h3>
        </div>
        <span className="pipeline-badge">Zero Manual Drafting</span>
      </div>

      <div className="pipeline-steps-grid">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isComplete = idx + 1 <= activeStep;
          const isCurrent = idx + 1 === activeStep;

          return (
            <div
              key={s.num}
              className={cn(
                "pipeline-step",
                isComplete && "pipeline-step--complete",
                isCurrent && "pipeline-step--current"
              )}
            >
              <div className="pipeline-step__top">
                <span className="pipeline-step__num">{s.num}</span>
                <span className="pipeline-step__tag">{s.tag}</span>
              </div>
              <div className="pipeline-step__icon-box">
                <Icon size={20} />
              </div>
              <h4 className="pipeline-step__name">{s.name}</h4>
              <p className="pipeline-step__desc">{s.desc}</p>
              {idx < steps.length - 1 && (
                <div className="pipeline-step__arrow" aria-hidden="true">
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTELLIGENCE PILL / COMMERCIAL TERM TAG
// ─────────────────────────────────────────────────────────────────────────────
export function CommercialTermPill({
  label,
  value,
  status = "confirmed",
  className,
}: {
  label: string;
  value: string | React.ReactNode;
  status?: "confirmed" | "flagged" | "extracted";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "commercial-pill",
        `commercial-pill--${status}`,
        className
      )}
    >
      <span className="commercial-pill__label">{label}</span>
      <span className="commercial-pill__value">{value}</span>
      {status === "confirmed" && (
        <CheckCircle2 size={12} className="commercial-pill__icon text-success" />
      )}
      {status === "flagged" && (
        <AlertTriangle size={12} className="commercial-pill__icon text-warning" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TIMELINE ITEM: For Activity history
// ─────────────────────────────────────────────────────────────────────────────
export function TimelineItem({
  icon: Icon,
  tone = "primary",
  title,
  time,
  dealAction,
  isLast = false,
}: {
  icon: any;
  tone?: "primary" | "warning" | "success" | "muted";
  title: string | React.ReactNode;
  time: string;
  dealAction?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={cn("timeline-node", isLast && "timeline-node--last")}>
      <div className="timeline-node__line" />
      <div className={cn("timeline-node__icon", `timeline-node__icon--${tone}`)}>
        <Icon size={14} />
      </div>
      <div className="timeline-node__content">
        <div className="timeline-node__main">
          <p className="timeline-node__title">{title}</p>
          {dealAction}
        </div>
        <time className="timeline-node__time">{time}</time>
      </div>
    </div>
  );
}

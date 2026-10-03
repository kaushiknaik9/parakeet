import { ShieldCheck, LoaderCircle, X } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DealBadgeStatus } from "@/types/armor";

export function Button({
  children,
  variant = "primary",
  loading = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  loading?: boolean;
}) {
  return (
    <button
      className={cn("ui-button", `ui-button--${variant}`, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children?: ReactNode }) {
  return (
    <button
      className={cn("icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  onClick,
  style,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card",
        onClick && !disabled && "surface-card--interactive",
        disabled && "surface-card--disabled",
        className
      )}
      style={style}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: DealBadgeStatus | "AI Analysis" | "Fallback Analysis";
}) {
  const key = status.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");
  return (
    <span className={`status status--${key}`}>
      <span className="status__dot" />
      {status}
    </span>
  );
}

export function Field({
  label,
  icon,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  error?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__control">
        {icon}
        <input {...props} />
      </span>
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-inline">
      <div className="brand__mark brand__mark--large" style={{ margin: "0 auto 16px" }}>
        <ShieldCheck size={28} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function BOMTable({ items, currency = "INR" }: { items?: any[]; currency?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 14, overflowX: "auto" }}>
      <b style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)", display: "block", marginBottom: 8 }}>
        ELECTRONICS BILL OF MATERIALS (BOM)
      </b>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
        <thead>
          <tr style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: 10, textTransform: "uppercase" }}>
            <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>Part / MPN</th>
            <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>Category</th>
            <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>Quantity</th>
            <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>Unit Price</th>
            <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "8px 10px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{item.part_name}</td>
              <td style={{ padding: "8px 10px", color: "var(--muted-foreground)" }}>{item.category}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{item.quantity?.toLocaleString() || "—"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{item.unit_price ? `${currency} ${item.unit_price}` : "—"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{item.total_price ? `${currency} ${item.total_price.toLocaleString()}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


import { Building2, FileCheck, Download, ShieldCheck, Sparkles, LockKeyhole } from "lucide-react";
import { Button, Card, StatusBadge } from "../shared/armor-ui";
import { dealBadge } from "../features/DealHelpers";
import { formatDateTime } from "@/lib/format";
import { API_BASE_URL } from "@/lib/api";
import type { DealRecord, Screen } from "@/types/armor";

interface SignActionSidebarProps {
  deal: DealRecord;
  seller: string;
  onOpenEsign: () => void;
  onOpenShare?: () => void;
  go?: (s: Screen) => void;
  notify: (msg: string) => void;
}

export function SignActionSidebar({
  deal,
  seller,
  onOpenEsign,
  notify,
}: SignActionSidebarProps) {
  const isSigned = deal.signature_status === "signed";

  const handleDownloadPdf = () => {
    const pdfUrl = `${API_BASE_URL}/api/deals/${deal.id}/pdf`;
    window.open(pdfUrl, "_blank");
    notify("Downloading official executed agreement PDF...");
  };

  return (
    <aside className="flex flex-col gap-4 w-full">
      <Card className="p-5 flex flex-col gap-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          E-Signature &amp; Sharing
        </h3>

        {/* Counterparty Signatory Badge */}
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
          <span className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
            <Building2 size={18} />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <b className="text-sm font-bold truncate text-foreground">{seller}</b>
            <span className="text-xs text-muted-foreground truncate flex items-center gap-2">
              Counterparty · <StatusBadge status={dealBadge(deal)} />
            </span>
          </div>
        </div>

        {/* Streamlined Primary Action Button */}
        <div className="grid gap-2.5">
          {isSigned ? (
            <Button onClick={handleDownloadPdf} className="w-full justify-center">
              <Download size={15} /> Download Executed Agreement (PDF)
            </Button>
          ) : (
            <Button onClick={onOpenEsign} className="w-full justify-center">
              <FileCheck size={15} /> Send for E-Signature via Email
            </Button>
          )}
        </div>
      </Card>

      {deal.agreement?.summary && (
        <Card className="p-4 bg-secondary/30 border border-border flex items-start gap-3">
          <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <b className="text-xs font-bold block mb-1 text-foreground">AI Deal Context</b>
            <p className="text-xs leading-relaxed text-muted-foreground opacity-90">{deal.agreement.summary}</p>
          </div>
        </Card>
      )}

      <Card className="p-4 bg-secondary/30 border border-border flex items-start gap-3">
        <LockKeyhole size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <b className="text-xs font-bold block mb-1 text-foreground">Turnkey &amp; Dual-Engine Security</b>
          <p className="text-xs leading-relaxed text-muted-foreground opacity-90">
            Dispatches through Armor Direct Mail or DocuSeal Turnkey Signatures. Syncs completion in real-time.
          </p>
        </div>
      </Card>
    </aside>
  );
}

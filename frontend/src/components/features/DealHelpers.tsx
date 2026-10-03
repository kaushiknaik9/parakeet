import type { ExtractedDeal, DealBadgeStatus } from "@/types/armor";

export function dealBadge(deal: { extracted?: ExtractedDeal; confirmation_status?: string; signature_status?: string }): DealBadgeStatus {
  if (deal.signature_status === "signed") return "Signed & Legally Accepted";
  if (deal.signature_status === "awaiting_signature") return "Awaiting Counterparty Signature";
  if (deal.signature_status === "declined") return "Rejected by Counterparty";
  if (deal.signature_status === "draft") return "Unsigned";

  switch (deal.confirmation_status) {
    case "confirmed": return "Signed & Legally Accepted";
    case "changes_requested": return "Rejected by Counterparty";
    case "awaiting_counterparty": return "Awaiting Counterparty Signature";
    default: return (deal.extracted?.conflicts?.length ?? 0) > 0 ? "Under Review" : "Completed";
  }
}

export function partyLabel(extracted: ExtractedDeal, role: "Buyer" | "Seller", fallback: string) {
  const p = extracted.parties?.find((x) => x.role?.toLowerCase() === role.toLowerCase());
  return p?.name || extracted.parties?.[role === "Buyer" ? 0 : 1]?.name || fallback;
}

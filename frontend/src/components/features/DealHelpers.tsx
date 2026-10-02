import type { ExtractedDeal, DealBadgeStatus } from "@/types/armor";

export function dealBadge(deal: { extracted: ExtractedDeal; confirmation_status?: string }): DealBadgeStatus {
  switch (deal.confirmation_status) {
    case "confirmed": return "Confirmed";
    case "changes_requested": return "Changes Requested";
    case "awaiting_counterparty": return "Awaiting Counterparty";
    default: return (deal.extracted.conflicts?.length ?? 0) > 0 ? "Under Review" : "Completed";
  }
}

export function partyLabel(extracted: ExtractedDeal, role: "Buyer" | "Seller", fallback: string) {
  const p = extracted.parties?.find((x) => x.role?.toLowerCase() === role.toLowerCase());
  return p?.name || extracted.parties?.[role === "Buyer" ? 0 : 1]?.name || fallback;
}

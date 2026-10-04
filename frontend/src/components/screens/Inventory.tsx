import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Layers,
  DollarSign,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit3,
  ArrowUpDown,
  Cpu,
  Warehouse,
  ExternalLink,
  Copy,
  Check,
  PackageCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { Button, StatusBadge, Modal } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { InventoryFlowField } from "../shared/InventoryFlowField";
import {
  getInventory,
  getInventoryStats,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/lib/api";
import type {
  InventoryItem,
  InventoryStats,
  CreateInventoryPayload,
  InventoryHealthStatus,
  Screen,
} from "@/types/armor";

export interface InventoryScreenProps {
  go: (s: Screen) => void;
  notify: (msg: string) => void;
}

export function Inventory({ go, notify }: InventoryScreenProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "alert" | "optimal">("all");
  const [sortField, setSortField] = useState<"mpn" | "name" | "stock_level" | "unit_price">("stock_level");
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Copied MPN feedback state
  const [copiedMpn, setCopiedMpn] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<CreateInventoryPayload>({
    mpn: "",
    name: "",
    category: "Microcontrollers",
    stock_level: 1000,
    min_reorder_level: 200,
    unit_price: 5.0,
    currency: "USD",
    location: "Warehouse A · Bay 01",
  });

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [invData, statsData] = await Promise.all([
        getInventory(),
        getInventoryStats(),
      ]);
      const itemsList = Array.isArray(invData) ? invData : ((invData as any)?.items || []);
      setItems(itemsList);
      setStats(statsData);
      if (isRefresh) {
        notify("Warehouse inventory synchronized with live data.");
      }
    } catch (err: any) {
      notify(`Inventory fetch error: ${err.message || err}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyMpn = (mpn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(mpn);
    setCopiedMpn(mpn);
    setTimeout(() => setCopiedMpn(null), 1800);
  };

  // Open Edit Modal
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      mpn: item.mpn,
      name: item.name,
      category: item.category,
      stock_level: item.stock_level ?? (item as any).current_stock ?? 0,
      min_reorder_level: item.min_reorder_level ?? 0,
      unit_price: item.unit_price ?? (item as any).unit_price_usd ?? 0,
      currency: item.currency || "USD",
      location: item.location ?? (item as any).warehouse_location ?? "",
    });
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      mpn: "",
      name: "",
      category: "Microcontrollers",
      stock_level: 1000,
      min_reorder_level: 250,
      unit_price: 4.5,
      currency: "USD",
      location: "Warehouse A · Bay 01",
    });
    setIsAddModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mpn.trim() || !formData.name.trim()) {
      notify("Please provide both MPN and Component Name.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, formData);
        notify(`Updated component ${formData.mpn} successfully.`);
        setEditingItem(null);
      } else {
        await createInventoryItem(formData);
        notify(`Added new component ${formData.mpn} to warehouse inventory.`);
        setIsAddModalOpen(false);
      }
      await loadData();
    } catch (err: any) {
      notify(`Save error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsSaving(true);
    try {
      await deleteInventoryItem(deletingItem.id);
      notify(`Component ${deletingItem.mpn} removed from inventory.`);
      setDeletingItem(null);
      await loadData();
    } catch (err: any) {
      notify(`Delete error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute Categories for Filter Dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const q = search.trim().toLowerCase();
        const stock = item.stock_level ?? (item as any).current_stock ?? 0;
        const isAlert = stock <= item.min_reorder_level;

        const matchesQuery =
          !q ||
          item.mpn.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.location && item.location.toLowerCase().includes(q));

        const matchesCat =
          categoryFilter === "all" ||
          item.category.toLowerCase() === categoryFilter.toLowerCase();

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "alert" && isAlert) ||
          (statusFilter === "optimal" && !isAlert);

        return matchesQuery && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortField];
        let valB: any = (b as any)[sortField];
        if (typeof valA === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
      });
  }, [items, search, categoryFilter, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: "mpn" | "name" | "stock_level" | "unit_price") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Total metrics calculation
  const totalMpns = stats?.total_mpns ?? items.length;
  const totalUnits =
    stats?.total_units ?? items.reduce((acc, i) => acc + (i.stock_level ?? (i as any).current_stock ?? 0), 0);
  const totalValuation =
    stats?.total_valuation ??
    items.reduce(
      (acc, i) =>
        acc +
        (i.stock_level ?? (i as any).current_stock ?? 0) * (i.unit_price ?? (i as any).unit_price_usd ?? 0),
      0
    );
  const reorderAlertsCount =
    stats?.reorder_alerts ??
    items.filter((i) => (i.stock_level ?? (i as any).current_stock ?? 0) <= i.min_reorder_level).length;

  return (
    <div className="inventory-hero-workspace">
      {/* ── Cinematic 3D Digital Inventory Stream Flow Field ─────────── */}
      <InventoryFlowField />

      {/* ── Foreground Content ────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 28,
          padding: "36px 44px 80px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Editorial Header */}
        <EditorialHeading
          kicker="INVENTORY INTELLIGENCE · WAREHOUSE CONTROL"
          title="Seller Warehouse Inventory"
          subtitle="Track electronics component stock levels, minimum reorder thresholds, and real-time pre-confirmation availability."
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button
                variant="secondary"
                onClick={() => loadData(true)}
                disabled={refreshing || loading}
                style={{
                  height: 40,
                  padding: "0 16px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </Button>
              <Button
                onClick={openAddModal}
                style={{
                  height: 40,
                  padding: "0 18px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Plus size={16} />
                Add Warehouse Component
              </Button>
            </div>
          }
        />

        {/* ── 4 Dark Translucent Statistics Cards ─────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
            width: "100%",
          }}
        >
          {/* Card 1: Tracked MPNs */}
          <div
            className="inventory-stat-card card-mpns"
            style={{
              background: "rgba(7, 12, 20, 0.72)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="stat-top-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, #38BDF8 0%, rgba(56, 189, 248, 0.3) 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                className="inventory-stat-label"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Tracked MPNs
              </span>
              <div
                className="stat-icon-wrap"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(56, 189, 248, 0.12)",
                  display: "grid",
                  placeItems: "center",
                  color: "#38BDF8",
                }}
              >
                <Cpu size={16} />
              </div>
            </div>
            <div
              className="inventory-stat-number"
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#F0F6FC",
                lineHeight: 1.1,
              }}
            >
              {loading ? "—" : totalMpns}
            </div>
            <span
              className="inventory-stat-sub"
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              Verified electronic catalogue line items
            </span>
          </div>

          {/* Card 2: Total Warehouse Units */}
          <div
            className="inventory-stat-card card-units"
            style={{
              background: "rgba(7, 12, 20, 0.72)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="stat-top-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, #2F81F7 0%, rgba(47, 129, 247, 0.3) 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                className="inventory-stat-label"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Total Warehouse Units
              </span>
              <div
                className="stat-icon-wrap"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(47, 129, 247, 0.12)",
                  display: "grid",
                  placeItems: "center",
                  color: "#2F81F7",
                }}
              >
                <Boxes size={16} />
              </div>
            </div>
            <div
              className="inventory-stat-number"
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#F0F6FC",
                lineHeight: 1.1,
              }}
            >
              {loading ? "—" : totalUnits.toLocaleString()}
            </div>
            <span
              className="inventory-stat-sub"
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              Components across localized storage bays
            </span>
          </div>

          {/* Card 3: Inventory Valuation */}
          <div
            className="inventory-stat-card card-valuation"
            style={{
              background: "rgba(7, 12, 20, 0.72)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="stat-top-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, #10B981 0%, rgba(16, 185, 129, 0.3) 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                className="inventory-stat-label"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Inventory Valuation
              </span>
              <div
                className="stat-icon-wrap"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.12)",
                  display: "grid",
                  placeItems: "center",
                  color: "#10B981",
                }}
              >
                <DollarSign size={16} />
              </div>
            </div>
            <div
              className="inventory-stat-number"
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#F0F6FC",
                lineHeight: 1.1,
              }}
            >
              {loading
                ? "—"
                : `$${totalValuation.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <span
              className="inventory-stat-sub"
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              Real-time liquid asset valuation
            </span>
          </div>

          {/* Card 4: Stock Reorder Alerts */}
          <div
            className="inventory-stat-card card-alerts"
            style={{
              background: "rgba(7, 12, 20, 0.72)",
              backdropFilter: "blur(20px)",
              border:
                reorderAlertsCount > 0
                  ? "1px solid rgba(245, 158, 11, 0.35)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="stat-top-bar"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  reorderAlertsCount > 0
                    ? "linear-gradient(90deg, #F59E0B 0%, rgba(245, 158, 11, 0.3) 100%)"
                    : "linear-gradient(90deg, #10B981 0%, rgba(16, 185, 129, 0.3) 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                className="inventory-stat-label"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Stock Reorder Alerts
              </span>
              <div
                className="stat-icon-wrap"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    reorderAlertsCount > 0
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(16, 185, 129, 0.12)",
                  display: "grid",
                  placeItems: "center",
                  color: reorderAlertsCount > 0 ? "#F59E0B" : "#10B981",
                }}
              >
                <AlertTriangle size={16} />
              </div>
            </div>
            <div
              className="inventory-stat-number"
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: reorderAlertsCount > 0 ? "#FBBF24" : "#F0F6FC",
                lineHeight: 1.1,
              }}
            >
              {loading ? "—" : reorderAlertsCount}
            </div>
            <span
              style={{
                fontSize: 11,
                color: reorderAlertsCount > 0 ? "#F59E0B" : "var(--muted-foreground)",
              }}
            >
              {reorderAlertsCount > 0
                ? "Components at or below reorder threshold"
                : "All stock tiers at safe operational levels"}
            </span>
          </div>
        </div>

        {/* ── Search and Filter Controls Toolbar ──────────────────────── */}
        <div className="inventory-toolbar">
          {/* Search Box (Height 40px, Left aligned) */}
          <div className="inventory-search-wrap">
            <Search size={15} className="inventory-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by MPN, component name, category, or location..."
              className="inventory-search-input"
            />
          </div>

          {/* Filters Group (Category + Reorder Alerts, Right aligned) */}
          <div className="inventory-controls-right">
            {/* Category Dropdown */}
            <div className="inventory-category-wrap">
              <span className="inventory-toolbar-category-label">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="inventory-category-select"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Health / Reorder Alert Filter */}
            <button
              onClick={() => setStatusFilter(statusFilter === "alert" ? "all" : "alert")}
              className={`inventory-reorder-btn ${statusFilter === "alert" ? "active" : ""}`}
            >
              <AlertTriangle size={15} className="inventory-reorder-icon" />
              Reorder Alerts
            </button>
          </div>
        </div>

        {/* ── Inventory Data Table ─────────────────────────────────────── */}
        <div className="inventory-table-container">
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table className="inventory-table" style={{ minWidth: 960 }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr className="inventory-table-head">
                  <th
                    className="inventory-table-th inventory-table-th--sortable"
                    onClick={() => toggleSort("mpn")}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      MPN &amp; MODEL
                      <ArrowUpDown size={11} style={{ opacity: sortField === "mpn" ? 1 : 0.35, color: sortField === "mpn" ? "#4DA3FF" : "inherit" }} />
                    </div>
                  </th>
                  <th
                    className="inventory-table-th inventory-table-th--sortable"
                    onClick={() => toggleSort("name")}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      COMPONENT
                      <ArrowUpDown size={11} style={{ opacity: sortField === "name" ? 1 : 0.35, color: sortField === "name" ? "#4DA3FF" : "inherit" }} />
                    </div>
                  </th>
                  <th className="inventory-table-th">CATEGORY</th>
                  <th
                    className="inventory-table-th inventory-table-th--sortable"
                    style={{ textAlign: "right" }}
                    onClick={() => toggleSort("stock_level")}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      AVAILABLE
                      <ArrowUpDown size={11} style={{ opacity: sortField === "stock_level" ? 1 : 0.35, color: sortField === "stock_level" ? "#4DA3FF" : "inherit" }} />
                    </div>
                  </th>
                  <th className="inventory-table-th" style={{ textAlign: "right" }}>REORDER</th>
                  <th
                    className="inventory-table-th inventory-table-th--sortable"
                    style={{ textAlign: "right" }}
                    onClick={() => toggleSort("unit_price")}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      UNIT PRICE
                      <ArrowUpDown size={11} style={{ opacity: sortField === "unit_price" ? 1 : 0.35, color: sortField === "unit_price" ? "#4DA3FF" : "inherit" }} />
                    </div>
                  </th>
                  <th className="inventory-table-th" style={{ textAlign: "center" }}>HEALTH</th>
                  <th className="inventory-table-th" style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {/* Subtle Skeleton Rows when loading */}
                {loading && (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="inventory-table-row">
                      <td className="inventory-table-td">
                        <div className="inventory-skeleton-bar" style={{ width: "125px", height: "15px", marginBottom: 6 }} />
                        <div className="inventory-skeleton-bar" style={{ width: "90px", height: "11px" }} />
                      </td>
                      <td className="inventory-table-td">
                        <div className="inventory-skeleton-bar" style={{ width: "190px", height: "15px" }} />
                      </td>
                      <td className="inventory-table-td">
                        <div className="inventory-skeleton-bar" style={{ width: "76px", height: "14px", borderRadius: "3px" }} />
                      </td>
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <div className="inventory-skeleton-bar" style={{ width: "60px", height: "16px", marginLeft: "auto" }} />
                      </td>
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <div className="inventory-skeleton-bar" style={{ width: "45px", height: "14px", marginLeft: "auto" }} />
                      </td>
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <div className="inventory-skeleton-bar" style={{ width: "55px", height: "15px", marginLeft: "auto" }} />
                      </td>
                      <td className="inventory-table-td" style={{ textAlign: "center" }}>
                        <div className="inventory-skeleton-bar" style={{ width: "72px", height: "14px", borderRadius: "3px", margin: "0 auto" }} />
                      </td>
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <div className="inventory-skeleton-bar" style={{ width: "56px", height: "24px", borderRadius: "4px", marginLeft: "auto" }} />
                      </td>
                    </tr>
                  ))
                )}

                {/* Data Rows */}
                {!loading && filteredItems.map((item) => {
                  const stock = item.stock_level ?? (item as any).current_stock ?? 0;
                  const minReorder = item.min_reorder_level ?? 0;
                  const price = item.unit_price ?? (item as any).unit_price_usd ?? 0;
                  const isLow = stock <= minReorder && stock > 0;
                  const isOut = stock === 0;

                  return (
                    <tr key={item.id} className="inventory-table-row">
                      {/* 1. MPN & Model (Primary Identifier) */}
                      <td className="inventory-table-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span className="inventory-mpn-text">
                            {item.mpn}
                          </span>
                          <button
                            onClick={(e) => handleCopyMpn(item.mpn, e)}
                            title="Copy MPN to clipboard"
                            aria-label="Copy MPN"
                            style={{
                              background: "transparent",
                              border: 0,
                              padding: "2px 4px",
                              color: copiedMpn === item.mpn ? "#10B981" : "#55657E",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: 4,
                              transition: "color 150ms ease",
                            }}
                          >
                            {copiedMpn === item.mpn ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        {(item.location || (item as any).warehouse_location) && (
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10.5px",
                              color: "#6B7A90",
                              marginTop: 4,
                              letterSpacing: "0.01em",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            Location: {item.location || (item as any).warehouse_location}
                          </div>
                        )}
                      </td>

                      {/* 2. Component Name */}
                      <td className="inventory-table-td">
                        <span className="inventory-component-name">
                          {item.name}
                        </span>
                      </td>

                      {/* 3. Category */}
                      <td className="inventory-table-td">
                        <span className="inventory-category-label">
                          <span className="inventory-category-dot" />
                          {item.category}
                        </span>
                      </td>

                      {/* 4. Available Stock (Primary Numeric) */}
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <span
                          className={`inventory-stock-num ${
                            isOut
                              ? "inventory-stock-num--critical"
                              : isLow
                              ? "inventory-stock-num--low"
                              : "inventory-stock-num--healthy"
                          }`}
                        >
                          {stock.toLocaleString()}
                        </span>
                      </td>

                      {/* 5. Reorder Level */}
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <span className="inventory-reorder-num">
                          {minReorder.toLocaleString()}
                        </span>
                      </td>

                      {/* 6. Unit Price */}
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <span className="inventory-price-num">
                          <span style={{ color: "#7F8A9A", marginRight: 2 }}>$</span>
                          {price.toFixed(2)}
                        </span>
                      </td>

                      {/* 7. Health Indicator */}
                      <td className="inventory-table-td" style={{ textAlign: "center" }}>
                        {isOut ? (
                          <span className="inventory-health-status inventory-health-status--critical">
                            <span className="inventory-health-dot inventory-health-dot--critical" />
                            Reorder Required
                          </span>
                        ) : isLow ? (
                          <span className="inventory-health-status inventory-health-status--low">
                            <span className="inventory-health-dot inventory-health-dot--low" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inventory-health-status inventory-health-status--optimal">
                            <span className="inventory-health-dot inventory-health-dot--optimal" />
                            Optimal
                          </span>
                        )}
                      </td>

                      {/* 8. Actions (Compact Icon Buttons) */}
                      <td className="inventory-table-td" style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                          <button
                            className="inventory-action-btn inventory-action-btn--edit"
                            onClick={() => openEditModal(item)}
                            title="Edit component"
                            aria-label="Edit component"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="inventory-action-btn inventory-action-btn--delete"
                            onClick={() => setDeletingItem(item)}
                            title="Delete component"
                            aria-label="Delete component"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State when zero items match */}
          {!loading && filteredItems.length === 0 && (
            <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
              <Warehouse size={36} style={{ margin: "0 auto 14px", opacity: 0.4, color: "#388BFD" }} />
              <h3 style={{ fontSize: 16, color: "var(--foreground)", marginBottom: 6, fontWeight: 700 }}>
                No Components Found
              </h3>
              <p style={{ fontSize: 12, maxWidth: 420, margin: "0 auto 20px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                No warehouse line items matched your filter or search query. Adjust the filters or register a new component.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
                style={{ fontSize: 12, padding: "0 16px", height: 34 }}
              >
                Reset Filters
              </Button>
            </div>
          )}

          {/* Minimal Table Footer */}
          {!loading && filteredItems.length > 0 && (
            <div className="inventory-table-footer">
              <div>
                Showing <b style={{ color: "#E7EBF0" }}>{filteredItems.length}</b> of{" "}
                <b style={{ color: "#E7EBF0" }}>{items.length}</b> components
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2E7D52" }} />
                  {items.filter((i) => (i.stock_level ?? (i as any).current_stock ?? 0) > i.min_reorder_level).length} Optimal
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#B49A67" }} />
                  {reorderAlertsCount} Reorder Alerts
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Component Modal ───────────────────────────────── */}
      {(isAddModalOpen || editingItem) && (
        <Modal
          title={editingItem ? `Edit Component — ${editingItem.mpn}` : "Add Warehouse Component"}
          description="Register or modify warehouse electronic component parameters, stock levels, and reorder triggers."
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
        >
          <form onSubmit={handleSubmitForm} style={{ display: "grid", gap: 16, marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* MPN */}
              <label className="field">
                <span className="field__label">Manufacturer Part Number (MPN) *</span>
                <span className="field__control">
                  <input
                    type="text"
                    required
                    value={formData.mpn}
                    onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                    placeholder="e.g. STM32F407VGT6"
                  />
                </span>
              </label>

              {/* Category */}
              <label className="field">
                <span className="field__label">Category *</span>
                <span className="field__control">
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Microcontrollers, Power ICs"
                  />
                </span>
              </label>
            </div>

            {/* Component Name */}
            <label className="field">
              <span className="field__label">Component Name &amp; Description *</span>
              <span className="field__control">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ARM Cortex-M4 32-bit MCU 168MHz"
                />
              </span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {/* Current Stock */}
              <label className="field">
                <span className="field__label">Current Stock (Units) *</span>
                <span className="field__control">
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_level}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_level: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </span>
              </label>

              {/* Min Reorder Level */}
              <label className="field">
                <span className="field__label">Min Reorder Threshold *</span>
                <span className="field__control">
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.min_reorder_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_reorder_level: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </span>
              </label>

              {/* Unit Price */}
              <label className="field">
                <span className="field__label">Std Unit Price (USD) *</span>
                <span className="field__control">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Warehouse Location / Bin */}
              <label className="field">
                <span className="field__label">Warehouse Bay / Location Bin</span>
                <span className="field__control">
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Warehouse A · Bay 04"
                  />
                </span>
              </label>

              {/* Currency */}
              <label className="field">
                <span className="field__label">Billing Currency</span>
                <span className="field__control">
                  <input
                    type="text"
                    value={formData.currency || "USD"}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="USD"
                  />
                </span>
              </label>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 12,
                borderTop: "1px solid var(--border)",
                paddingTop: 16,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSaving}>
                {editingItem ? "Save Changes" : "Register Component"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      {deletingItem && (
        <Modal
          title={`Remove Component ${deletingItem.mpn}?`}
          description="Are you sure you want to delete this warehouse line item? This action removes it from stock valuation and tracking."
          onClose={() => setDeletingItem(null)}
        >
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#FCA5A5",
                fontSize: 12,
                marginBottom: 20,
              }}
            >
              <b>Warning:</b> Deleting <b>{deletingItem.mpn}</b> ({deletingItem.name}) will remove{" "}
              <b>
                {(deletingItem.stock_level ?? (deletingItem as any).current_stock ?? 0).toLocaleString()}{" "}
                units
              </b>{" "}
              worth $
              {(
                (deletingItem.stock_level ?? (deletingItem as any).current_stock ?? 0) *
                (deletingItem.unit_price ?? (deletingItem as any).unit_price_usd ?? 0)
              ).toLocaleString()}{" "}
              from the warehouse database.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setDeletingItem(null)}>
                Cancel
              </Button>
              <Button variant="danger" loading={isSaving} onClick={handleDeleteConfirm}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Package,
  Layers,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { deleteInventoryItem, listInventory, upsertInventoryItem } from "@/lib/api";
import type { InventoryItem, Screen } from "@/types/armor";

interface InventoryProps {
  go: (s: Screen) => void;
  notify: (msg: string) => void;
}

export function InventoryScreen({ go, notify }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const [formData, setFormData] = useState({
    id: "",
    mpn: "",
    name: "",
    category: "Microcontroller",
    stock_qty: 1000,
    min_reorder_level: 200,
    standard_unit_price: 150.0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listInventory();
      setItems(data);
    } catch (err: any) {
      notify(err.message || "Failed to load warehouse inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      id: "",
      mpn: "",
      name: "",
      category: "Microcontroller",
      stock_qty: 1000,
      min_reorder_level: 200,
      standard_unit_price: 150.0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      mpn: item.mpn,
      name: item.name,
      category: item.category,
      stock_qty: item.stock_qty,
      min_reorder_level: item.min_reorder_level,
      standard_unit_price: item.standard_unit_price,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mpn.trim() || !formData.name.trim()) {
      notify("Please provide part MPN and component name.");
      return;
    }
    try {
      await upsertInventoryItem(formData);
      notify(editingItem ? `Updated ${formData.mpn}` : `Added ${formData.mpn} to inventory`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message || "Failed to save inventory item");
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.mpn} (${item.name}) from inventory?`)) return;
    try {
      await deleteInventoryItem(item.id);
      notify(`Removed ${item.mpn} from catalog`);
      loadData();
    } catch (err: any) {
      notify(err.message || "Failed to delete item");
    }
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.mpn.toLowerCase().includes(search.toLowerCase()) ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || it.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCat;
  });

  // Analytics
  const totalParts = items.length;
  const totalStockQty = items.reduce((acc, it) => acc + (it.stock_qty || 0), 0);
  const totalValuation = items.reduce((acc, it) => acc + (it.stock_qty || 0) * (it.standard_unit_price || 0), 0);
  const lowStockCount = items.filter((it) => (it.stock_qty || 0) <= (it.min_reorder_level || 0)).length;

  const categories = Array.from(new Set(items.map((it) => it.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            Seller Warehouse Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track electronics component stock levels, min reorder thresholds, and real-time pre-confirmation availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse Component
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Tracked MPNs</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{totalParts}</span>
            <span className="text-xs text-muted-foreground">Active Catalog</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Warehouse Units</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{totalStockQty.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Physical Units</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Inventory Valuation</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">₹{totalValuation.toLocaleString("en-IN")}</span>
            <span className="text-xs text-muted-foreground">Asset Value</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Stock Reorder Alerts</span>
            <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${lowStockCount > 0 ? "text-amber-500" : "text-foreground"}`}>
              {lowStockCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {lowStockCount > 0 ? "Action Required" : "Optimal Levels"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by MPN, component name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">MPN & Model</th>
                <th className="py-3 px-4">Component Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Min Reorder Level</th>
                <th className="py-3 px-4 text-right">Std Unit Price</th>
                <th className="py-3 px-4 text-center">Health Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {loading ? "Loading warehouse catalog..." : "No components found in warehouse inventory."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.stock_qty <= item.min_reorder_level;
                  const isOutOfStock = item.stock_qty === 0;

                  return (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{item.mpn}</td>
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {item.stock_qty.toLocaleString()} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {item.min_reorder_level.toLocaleString()} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        ₹{item.standard_unit_price.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Healthy Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Component"
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Delete Component"
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editingItem ? "Edit Warehouse Component" : "Add Component to Inventory"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Part Model / MPN *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32, STM32F401RET6, DHT22"
                  value={formData.mpn}
                  onChange={(e) => setFormData({ ...formData, mpn: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32 Wi-Fi & Bluetooth MCU Module"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Microcontroller">Microcontroller</option>
                    <option value="Semiconductor">Semiconductor</option>
                    <option value="Passive Component">Passive Component</option>
                    <option value="Sensor">Sensor</option>
                    <option value="Display">Display</option>
                    <option value="Power Supply">Power Supply</option>
                    <option value="PCB Assembly">PCB Assembly</option>
                    <option value="Finished Device">Finished Device</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Std Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.standard_unit_price}
                    onChange={(e) => setFormData({ ...formData, standard_unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Available Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.min_reorder_level}
                    onChange={(e) => setFormData({ ...formData, min_reorder_level: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-sm"
                >
                  {editingItem ? "Save Changes" : "Create Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, formatErr, API } from "@/lib/api";
import Layout from "@/components/Layout";
import { useRegion } from "@/contexts/RegionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash, FilePdf, FileDoc, FileXls, ArrowLeft, Calculator } from "@phosphor-icons/react";

const BOUNDARIES = ["cradle_to_gate", "cradle_to_grave", "gate_to_gate"];
const QUALITY = ["high", "medium", "low"];
const INV_KEYS = ["raw_materials", "energy", "fuel", "water", "transport", "packaging", "waste"];

const blankInv = () => INV_KEYS.reduce((a, k) => ({ ...a, [k]: [] }), {});

export default function LCA() {
  const { fmt } = useRegion();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  const load = () => api.get("/lca").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (active) return <LCAEditor study={active} onBack={() => { setActive(null); load(); }} />;

  return (
    <Layout title="LCA Studies" subtitle="ISO 14040 / 14044"
      actions={<Button data-testid="new-lca-btn" onClick={() => setActive({})} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New Study</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.length === 0 && <div className="col-span-full text-center text-slate-400 py-16 bg-white border border-slate-200 rounded-sm">No LCA studies yet</div>}
        {items.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-sm p-5 card-hover cursor-pointer" onClick={() => setActive(s)} data-testid={`lca-card-${s.id}`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{s.system_boundary?.replace(/_/g, " ") || "draft"}</div>
            <h3 className="font-display text-xl font-medium tracking-tight mt-1 mb-2">{s.title}</h3>
            <div className="text-xs text-slate-500 mb-4">{s.product_name || "—"}</div>
            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-200">
              <div><div className="text-sm font-semibold text-[#0A3B2A]">{fmt.unit(s.results?.carbon_footprint, "mass")}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{fmt.unitLabel("mass")} CO2e</div></div>
              <div><div className="text-sm font-semibold text-[#1A365D]">{fmt.unit(s.results?.energy_footprint, "energy")}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{fmt.unitLabel("energy")}</div></div>
              <div><div className="text-sm font-semibold text-[#5C8DB8]">{fmt.unit(s.results?.water_footprint, "water")}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{fmt.unitLabel("water")}</div></div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function LCAEditor({ study, onBack }) {
  const { fmt } = useRegion();
  const [s, setS] = useState({
    title: "", goal: "", scope: "", functional_unit: "", system_boundary: "cradle_to_gate",
    product_name: "", process_description: "", allocation_method: "", data_quality: "medium",
    assumptions: "", inventory: blankInv(), location: { lat: null, lng: null },
    ...study,
  });
  const [saving, setSaving] = useState(false);
  const isNew = !s.id;

  const update = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updateInv = (cat, idx, k, v) => {
    setS(p => {
      const inv = { ...(p.inventory || blankInv()) };
      inv[cat] = [...(inv[cat] || [])];
      inv[cat][idx] = { ...inv[cat][idx], [k]: v };
      return { ...p, inventory: inv };
    });
  };
  const addRow = (cat) => setS(p => {
    const inv = { ...(p.inventory || blankInv()) };
    inv[cat] = [...(inv[cat] || []), { name: "", quantity: "", unit: "", ef: "" }];
    return { ...p, inventory: inv };
  });
  const delRow = (cat, idx) => setS(p => {
    const inv = { ...(p.inventory || blankInv()) };
    inv[cat] = inv[cat].filter((_, i) => i !== idx);
    return { ...p, inventory: inv };
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...s };
      // numeric coerce in inventory
      Object.keys(payload.inventory || {}).forEach(k => {
        payload.inventory[k] = (payload.inventory[k] || []).map(it => ({
          ...it,
          quantity: it.quantity === "" ? 0 : Number(it.quantity || 0),
          ef: it.ef === "" ? 0 : Number(it.ef || 0),
        }));
      });
      let res;
      if (isNew) res = await api.post("/lca", payload);
      else res = await api.put(`/lca/${s.id}`, payload);
      setS(res.data);
      toast.success(isNew ? "Study created" : "Saved & recalculated");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setSaving(false);
  };

  return (
    <Layout title={s.title || "New LCA Study"} subtitle="ISO 14040 / 14044"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="rounded-sm" data-testid="lca-back"><ArrowLeft size={16} className="mr-1" />Back</Button>
          {!isNew && <a href={`${API}/lca/${s.id}/report.pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="lca-pdf"><FilePdf size={16} className="mr-1" />PDF</Button>
          </a>}
          {!isNew && <a href={`${API}/lca/${s.id}/report.docx`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="lca-docx"><FileDoc size={16} className="mr-1" />Word</Button>
          </a>}
          {!isNew && <a href={`${API}/lca/${s.id}/report.xlsx`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="lca-xlsx"><FileXls size={16} className="mr-1" />Excel</Button>
          </a>}
          <Button data-testid="lca-save" onClick={save} disabled={saving} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">
            <Calculator size={16} className="mr-1" />{saving ? "Saving…" : "Save & Calculate"}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="goal" className="w-full">
        <TabsList className="bg-white border border-slate-200 rounded-sm">
          <TabsTrigger value="goal" data-testid="tab-goal">Goal & Scope</TabsTrigger>
          <TabsTrigger value="inv" data-testid="tab-inv">Inventory</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="goal">
          <div className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Title</Label><Input data-testid="lca-title" value={s.title} onChange={e => update("title", e.target.value)} /></div>
            <div><Label>Product</Label><Input data-testid="lca-product" value={s.product_name || ""} onChange={e => update("product_name", e.target.value)} /></div>
            <div><Label>Functional unit</Label><Input data-testid="lca-functional-unit" value={s.functional_unit || ""} onChange={e => update("functional_unit", e.target.value)} /></div>
            <div>
              <Label>System boundary</Label>
              <Select value={s.system_boundary} onValueChange={v => update("system_boundary", v)}>
                <SelectTrigger data-testid="lca-boundary"><SelectValue /></SelectTrigger>
                <SelectContent>{BOUNDARIES.map(b => <SelectItem key={b} value={b}>{b.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data quality</Label>
              <Select value={s.data_quality} onValueChange={v => update("data_quality", v)}>
                <SelectTrigger data-testid="lca-quality"><SelectValue /></SelectTrigger>
                <SelectContent>{QUALITY.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Goal</Label><Textarea data-testid="lca-goal" rows={3} value={s.goal || ""} onChange={e => update("goal", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Scope</Label><Textarea rows={3} value={s.scope || ""} onChange={e => update("scope", e.target.value)} /></div>
            <div><Label>Allocation method</Label><Input value={s.allocation_method || ""} onChange={e => update("allocation_method", e.target.value)} /></div>
            <div><Label>Process description</Label><Input value={s.process_description || ""} onChange={e => update("process_description", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Assumptions & limitations</Label><Textarea rows={3} value={s.assumptions || ""} onChange={e => update("assumptions", e.target.value)} /></div>
          </div>
        </TabsContent>

        <TabsContent value="inv">
          <div className="space-y-4">
            {INV_KEYS.map((cat) => (
              <div key={cat} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-[#F9FAFB]">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Inventory</div>
                    <h4 className="font-display text-base font-medium">{cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h4>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addRow(cat)} className="rounded-sm" data-testid={`add-row-${cat}`}><Plus size={14} className="mr-1" />Add row</Button>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2 w-32">Quantity</th>
                      <th className="text-left px-4 py-2 w-24">Unit</th>
                      <th className="text-left px-4 py-2 w-32">Emission Factor</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(s.inventory?.[cat] || []).length === 0 && (
                      <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-xs">No entries</td></tr>
                    )}
                    {(s.inventory?.[cat] || []).map((it, idx) => (
                      <tr key={`${cat}-${idx}-${it.name || ""}`} className="border-t border-slate-100">
                        <td className="px-4 py-2"><Input value={it.name || ""} onChange={e => updateInv(cat, idx, "name", e.target.value)} className="h-8" /></td>
                        <td className="px-4 py-2"><Input type="number" step="any" value={it.quantity ?? ""} onChange={e => updateInv(cat, idx, "quantity", e.target.value)} className="h-8" /></td>
                        <td className="px-4 py-2"><Input value={it.unit || ""} onChange={e => updateInv(cat, idx, "unit", e.target.value)} className="h-8" /></td>
                        <td className="px-4 py-2"><Input type="number" step="any" value={it.ef ?? ""} onChange={e => updateInv(cat, idx, "ef", e.target.value)} className="h-8" /></td>
                        <td className="px-4 py-2 text-right"><button onClick={() => delRow(cat, idx)} className="text-slate-400 hover:text-red-600"><Trash size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">LCIA</div>
            <h3 className="font-display text-xl font-medium mb-4">Impact Assessment</h3>
            {!s.results && <div className="text-sm text-slate-500">Save & calculate to see results.</div>}
            {s.results && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: `Carbon (${fmt.unitLabel("mass")} CO2e)`, value: fmt.unit(s.results.carbon_footprint, "mass"), color: "#0A3B2A" },
                  { label: `Energy (${fmt.unitLabel("energy")})`, value: fmt.unit(s.results.energy_footprint, "energy"), color: "#1A365D" },
                  { label: `Water (${fmt.unitLabel("water")})`, value: fmt.unit(s.results.water_footprint, "water"), color: "#5C8DB8" },
                  { label: `Materials (${fmt.unitLabel("mass")})`, value: fmt.unit(s.results.material_intensity, "mass"), color: "#166534" },
                  { label: `Waste (${fmt.unitLabel("mass")})`, value: fmt.unit(s.results.waste_intensity, "mass"), color: "#B45309" },
                ].map(m => (
                  <div key={m.label} className="border border-slate-200 p-4 rounded-sm">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{m.label}</div>
                    <div className="font-display text-2xl font-medium mt-1" style={{ color: m.color }}>{m.value ?? "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

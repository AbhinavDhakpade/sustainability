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
import { Plus, FilePdf, FileXls, ArrowLeft, FloppyDisk } from "@phosphor-icons/react";

const STANDARDS = ["Verra", "Gold Standard", "CDM", "Article 6"];
const SECTORS = ["AFOLU", "Renewable Energy", "Energy Efficiency", "Waste Management", "Transport", "Industrial Processes"];

export default function Carbon() {
  const { fmt } = useRegion();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const load = () => api.get("/carbon").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (active) return <CarbonEditor project={active} onBack={() => { setActive(null); load(); }} />;

  return (
    <Layout title="Carbon Projects" subtitle="Article 6 · Verra · Gold Standard"
      actions={<Button data-testid="new-carbon-btn" onClick={() => setActive({})} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New Project</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.length === 0 && <div className="col-span-full text-center text-slate-400 py-16 bg-white border border-slate-200 rounded-sm">No carbon projects yet</div>}
        {items.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-sm p-5 card-hover cursor-pointer" onClick={() => setActive(p)} data-testid={`carbon-card-${p.id}`}>
            <div className="flex justify-between items-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{p.standard}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{p.verification_status}</div>
            </div>
            <h3 className="font-display text-xl font-medium tracking-tight mt-1 mb-2">{p.title}</h3>
            <div className="text-xs text-slate-500 mb-3">{p.sector || "—"} · {p.methodology || "—"}</div>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Estimated reductions</div>
                <div className="font-display text-lg font-medium text-[#0A3B2A]">{fmt.num(p.estimated_reductions_tco2e)} <span className="text-xs text-slate-500">tCO2e</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const EMPTY_PROJECT = {
  title: "", project_proponent: "", sector: "AFOLU", standard: "Verra", methodology: "",
  baseline_scenario: "", additionality: "", project_boundary: "", leakage_risk: "",
  permanence_risk: "", monitoring_plan: "", mrv_plan: "", stakeholder_consultation: "",
  safeguards: "", risk_assessment: "",
  estimated_reductions_tco2e: "", carbon_stock: "", soil_carbon: "", biomass: "", re_savings: "",
  location: { lat: null, lng: null }, sdg_co_benefits: [],
};

const NUMERIC_FIELDS = [
  ["estimated_reductions_tco2e", "Estimated reductions (tCO2e)"],
  ["carbon_stock", "Carbon stock"],
  ["soil_carbon", "Soil carbon"],
  ["biomass", "Biomass"],
  ["re_savings", "RE / energy savings"],
];

const TEXT_TABS = {
  baseline: [
    ["baseline_scenario", "Baseline scenario", 4],
    ["additionality", "Additionality justification", 4],
    ["project_boundary", "Project boundary", 3],
    ["leakage_risk", "Leakage risk", 3, true],
    ["permanence_risk", "Permanence risk", 3, true],
  ],
  monitoring: [
    ["monitoring_plan", "Monitoring plan", 4],
    ["mrv_plan", "MRV plan", 4],
  ],
  safeguards: [
    ["stakeholder_consultation", "Stakeholder consultation", 3],
    ["safeguards", "Safeguards", 3],
    ["risk_assessment", "Risk assessment", 3],
  ],
};

const TABS = [
  ["basics", "Basics"], ["baseline", "Baseline & Boundary"], ["monitoring", "Monitoring & MRV"],
  ["impact", "Impact"], ["safeguards", "Safeguards"],
];

const PANEL = "bg-white border border-slate-200 rounded-sm p-6";
const testId = (key) => `carbon-${key.replace(/_/g, "-")}`;

function toPayload(p) {
  const payload = { ...p };
  NUMERIC_FIELDS.forEach(([k]) => { payload[k] = payload[k] === "" ? null : Number(payload[k] || 0); });
  return payload;
}

function TextAreaFields({ fields, p, set }) {
  return (
    <div className={`${PANEL} grid grid-cols-1 md:grid-cols-2 gap-4`}>
      {fields.map(([key, label, rows, half]) => (
        <div key={key} className={half ? "" : "md:col-span-2"}><Label>{label}</Label>
          <Textarea data-testid={testId(key)} rows={rows} value={p[key] || ""} onChange={e => set(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function OptionSelect({ label, value, options, onChange, id }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={id}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function BasicsTab({ p, set }) {
  const setLoc = (k, v) => set("location", { ...(p.location || {}), [k]: Number(v) });
  const setSdgs = (v) => set("sdg_co_benefits", v.split(",").map(s => s.trim()).filter(Boolean));
  return (
    <div className={`${PANEL} grid grid-cols-1 md:grid-cols-2 gap-4`}>
      <div className="md:col-span-2"><Label>Project title</Label><Input data-testid="carbon-title" value={p.title} onChange={e => set("title", e.target.value)} /></div>
      <div><Label>Proponent</Label><Input data-testid="carbon-proponent" value={p.project_proponent || ""} onChange={e => set("project_proponent", e.target.value)} /></div>
      <OptionSelect label="Sector" value={p.sector} options={SECTORS} onChange={v => set("sector", v)} id="carbon-sector" />
      <OptionSelect label="Standard" value={p.standard} options={STANDARDS} onChange={v => set("standard", v)} id="carbon-standard" />
      <div><Label>Methodology</Label><Input data-testid="carbon-methodology" value={p.methodology || ""} onChange={e => set("methodology", e.target.value)} placeholder="e.g. VM0042" /></div>
      <div><Label>Latitude</Label><Input data-testid="carbon-lat" type="number" step="any" value={p.location?.lat ?? ""} onChange={e => setLoc("lat", e.target.value)} /></div>
      <div><Label>Longitude</Label><Input data-testid="carbon-lng" type="number" step="any" value={p.location?.lng ?? ""} onChange={e => setLoc("lng", e.target.value)} /></div>
      <div className="md:col-span-2"><Label>SDG co-benefits (comma-separated)</Label>
        <Input data-testid="carbon-sdgs" value={(p.sdg_co_benefits || []).join(", ")} onChange={e => setSdgs(e.target.value)} placeholder="SDG 13, SDG 15…" />
      </div>
    </div>
  );
}

function ImpactTab({ p, set }) {
  return (
    <div className={`${PANEL} grid grid-cols-1 md:grid-cols-3 gap-4`}>
      {NUMERIC_FIELDS.map(([key, label]) => (
        <div key={key}><Label>{label}</Label>
          <Input data-testid={testId(key)} type="number" step="any" value={p[key] ?? ""} onChange={e => set(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function EditorActions({ p, isNew, saving, onBack, onSave }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onBack} className="rounded-sm" data-testid="carbon-back"><ArrowLeft size={16} className="mr-1" />Back</Button>
      {!isNew && <a href={`${API}/carbon/${p.id}/pdd.pdf`} target="_blank" rel="noreferrer">
        <Button variant="outline" className="rounded-sm" data-testid="carbon-pdd"><FilePdf size={16} className="mr-1" />PDD</Button>
      </a>}
      {!isNew && <a href={`${API}/carbon/${p.id}/report.xlsx`} target="_blank" rel="noreferrer">
        <Button variant="outline" className="rounded-sm" data-testid="carbon-xlsx"><FileXls size={16} className="mr-1" />Excel</Button>
      </a>}
      <Button onClick={onSave} disabled={saving} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid="carbon-save">
        <FloppyDisk size={16} className="mr-1" />{saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function CarbonEditor({ project, onBack }) {
  const [p, setP] = useState({ ...EMPTY_PROJECT, ...project });
  const [saving, setSaving] = useState(false);
  const isNew = !p.id;
  const set = (key, value) => setP(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = toPayload(p);
      const res = isNew ? await api.post("/carbon", payload) : await api.put(`/carbon/${p.id}`, payload);
      setP(res.data); toast.success("Saved");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setSaving(false);
  };

  return (
    <Layout title={p.title || "New Carbon Project"} subtitle={`${p.standard} PDD`}
      actions={<EditorActions p={p} isNew={isNew} saving={saving} onBack={onBack} onSave={save} />}
    >
      <Tabs defaultValue="basics">
        <TabsList className="bg-white border border-slate-200 rounded-sm overflow-x-auto">
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v} data-testid={`carbon-tab-${v}`} className="data-[state=active]:bg-[#0A3B2A] data-[state=active]:text-white rounded-sm">{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="basics"><BasicsTab p={p} set={set} /></TabsContent>
        {Object.entries(TEXT_TABS).map(([v, fields]) => (
          <TabsContent key={v} value={v}><TextAreaFields fields={fields} p={p} set={set} /></TabsContent>
        ))}
        <TabsContent value="impact"><ImpactTab p={p} set={set} /></TabsContent>
      </Tabs>
    </Layout>
  );
}

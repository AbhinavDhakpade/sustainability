import { useCallback, useEffect, useState } from "react";
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

const FRAMEWORKS = ["GRI", "SASB", "BRSR", "CSRD", "CUSTOM"];
const SECTIONS = [
  "governance", "ethics", "stakeholders", "employees", "energy", "water",
  "emissions", "waste", "biodiversity", "community", "csr",
  "supply_chain", "human_rights", "risk", "climate"
];

export default function ESG() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const load = () => api.get("/esg").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (active) return <ESGEditor report={active} onBack={() => { setActive(null); load(); }} />;

  return (
    <Layout title="ESG Reports" subtitle="GRI · SASB · BRSR"
      actions={<Button data-testid="new-esg-btn" onClick={() => setActive({})} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New Report</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.length === 0 && <div className="col-span-full text-center text-slate-400 py-16 bg-white border border-slate-200 rounded-sm">No ESG reports yet</div>}
        {items.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-sm p-5 card-hover cursor-pointer" onClick={() => setActive(r)} data-testid={`esg-card-${r.id}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{r.framework}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{r.status}</div>
            </div>
            <h3 className="font-display text-xl font-medium tracking-tight mt-1 mb-2">{r.title}</h3>
            <div className="text-xs text-slate-500">Period: {r.period || "—"}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function ESGEditor({ report, onBack }) {
  const { settings } = useRegion();
  const [r, setR] = useState({
    title: "", framework: settings.framework || "GRI", period: "", sections: SECTIONS.reduce((a, k) => ({ ...a, [k]: "" }), {}),
    ...report,
    sections: { ...SECTIONS.reduce((a, k) => ({ ...a, [k]: "" }), {}), ...(report.sections || {}) },
  });
  const isNew = !r.id;
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      let res;
      if (isNew) res = await api.post("/esg", r);
      else res = await api.put(`/esg/${r.id}`, r);
      setR(res.data);
      toast.success("Saved");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setSaving(false);
  };

  return (
    <Layout title={r.title || "New ESG Report"} subtitle={`${r.framework} Report`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="rounded-sm"><ArrowLeft size={16} className="mr-1" />Back</Button>
          {!isNew && <a href={`${API}/esg/${r.id}/report.pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="esg-pdf"><FilePdf size={16} className="mr-1" />PDF</Button>
          </a>}
          {!isNew && <a href={`${API}/esg/${r.id}/report.xlsx`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="esg-xlsx"><FileXls size={16} className="mr-1" />Excel</Button>
          </a>}
          <Button onClick={save} disabled={saving} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid="esg-save">
            <FloppyDisk size={16} className="mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="meta">
        <TabsList className="bg-white border border-slate-200 rounded-sm overflow-x-auto">
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="gov">Governance</TabsTrigger>
          <TabsTrigger value="sasb" data-testid="tab-sasb">SASB Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="meta">
          <div className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Title</Label><Input data-testid="esg-title" value={r.title} onChange={e => setR({ ...r, title: e.target.value })} /></div>
            <div>
              <Label>Framework</Label>
              <Select value={r.framework} onValueChange={v => setR({ ...r, framework: v })}>
                <SelectTrigger data-testid="esg-framework"><SelectValue /></SelectTrigger>
                <SelectContent>{FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reporting period</Label><Input value={r.period || ""} onChange={e => setR({ ...r, period: e.target.value })} placeholder="FY 2025" /></div>
          </div>
        </TabsContent>
        {[
          ["env", "Environment", ["energy", "water", "emissions", "waste", "biodiversity", "climate"]],
          ["social", "Social", ["employees", "stakeholders", "community", "csr", "supply_chain", "human_rights"]],
          ["gov", "Governance", ["governance", "ethics", "risk"]],
        ].map(([id, label, keys]) => (
          <TabsContent key={id} value={id}>
            <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{label}</div>
              {keys.map(k => (
                <div key={k}>
                  <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                  <Textarea data-testid={`esg-section-${k}`} rows={3} value={r.sections?.[k] || ""}
                    onChange={e => setR({ ...r, sections: { ...r.sections, [k]: e.target.value } })}
                    placeholder={`Disclosure for ${k.replace(/_/g, " ")}…`} />
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
        <TabsContent value="sasb">
          {isNew ? (
            <div className="bg-white border border-slate-200 rounded-sm p-10 text-center text-slate-500 text-sm">Save the report first to enable SASB metrics.</div>
          ) : (
            <SASBPanel reportId={r.id} />
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function SASBPanel({ reportId }) {
  const [industries, setIndustries] = useState([]);
  const [industryId, setIndustryId] = useState("");
  const [industry, setIndustry] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);

  const loadInitial = useCallback(async () => {
    try {
      const [ind, vals] = await Promise.all([
        api.get("/sasb/industries").then(r => r.data).catch((e) => { console.warn("SASB industries failed", e); return []; }),
        api.get(`/sasb/values/${reportId}`).then(r => r.data).catch((e) => { console.warn("SASB values failed", e); return {}; }),
      ]);
      setIndustries(ind);
      setIndustryId(vals.industry_id || "");
      setValues(vals.values || {});
    } catch (e) {
      console.error("SASB initial load failed:", e);
    }
  }, [reportId]);

  const loadIndustry = useCallback(async (id) => {
    if (!id) { setIndustry(null); return; }
    try {
      const { data } = await api.get(`/sasb/industries/${id}`);
      setIndustry(data);
    } catch (e) {
      console.error("SASB industry load failed:", e);
      setIndustry(null);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);
  useEffect(() => { loadIndustry(industryId); }, [industryId, loadIndustry]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/sasb/values/${reportId}`, { industry_id: industryId, values });
      toast.success("SASB metrics saved");
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setBusy(false);
  };

  const setVal = (code, idx, v) => {
    const key = `${code}__${idx}`;
    setValues(p => ({ ...p, [key]: v }));
  };

  // Group metrics by category
  const grouped = (industry?.metrics || []).reduce((a, m, idx) => {
    a[m.category] = a[m.category] || [];
    a[m.category].push({ ...m, idx });
    return a;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-sm p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">SASB · Industry-specific metrics</div>
        <h3 className="font-display text-lg font-medium mb-3">Select industry standard</h3>
        <Select value={industryId} onValueChange={setIndustryId}>
          <SelectTrigger data-testid="sasb-industry"><SelectValue placeholder="Pick a SASB industry" /></SelectTrigger>
          <SelectContent>
            {industries.map(i => <SelectItem key={i.id} value={i.id}>{i.id} · {i.name} ({i.metric_count})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {industry && (
        <>
          {Object.entries(grouped).map(([cat, metrics]) => (
            <div key={cat} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <div className="bg-[#F9FAFB] px-5 py-3 border-b border-slate-200">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Category</div>
                <h4 className="font-display text-base font-medium">{cat}</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-5 py-2 w-32">Code</th>
                    <th className="text-left px-5 py-2">Metric</th>
                    <th className="text-left px-5 py-2 w-32">Unit</th>
                    <th className="text-left px-5 py-2 w-48">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(m => (
                    <tr key={m.idx} className="border-t border-slate-100">
                      <td className="px-5 py-2 font-mono text-xs text-slate-500">{m.code}</td>
                      <td className="px-5 py-2 text-slate-700">{m.name}</td>
                      <td className="px-5 py-2 text-xs text-slate-500">{m.unit}</td>
                      <td className="px-5 py-2">
                        <Input
                          data-testid={`sasb-input-${m.code}-${m.idx}`}
                          type={m.type === "quantitative" && m.unit !== "narrative" ? "number" : "text"}
                          step="any"
                          value={values[`${m.code}__${m.idx}`] || ""}
                          onChange={e => setVal(m.code, m.idx, e.target.value)}
                          className="h-8"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={save} disabled={busy} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid="sasb-save">
              <FloppyDisk size={16} className="mr-1" />{busy ? "Saving…" : "Save SASB metrics"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

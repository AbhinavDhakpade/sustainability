import { useEffect, useState } from "react";
import { api, formatErr, API } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkle, FilePdf, Globe, Copy, ArrowsClockwise, Plus } from "@phosphor-icons/react";

const LANGS = [
  { id: "en", name: "English" }, { id: "es", name: "Español" },
  { id: "fr", name: "Français" }, { id: "de", name: "Deutsch" },
  { id: "zh", name: "中文" }, { id: "ar", name: "العربية" },
  { id: "pt", name: "Português" }, { id: "hi", name: "हिन्दी" },
];
const PROVIDERS = [
  { id: "anthropic", label: "Claude Sonnet 4.5" },
  { id: "openai", label: "GPT-5.2" },
  { id: "gemini", label: "Gemini 2.5 Pro" },
];

export default function Flagship() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", period: String(new Date().getFullYear()), language: "en",
    brand_color: "#0A3B2A", headline: "", ceo_note_input: "", provider: "anthropic"
  });
  const load = () => api.get("/flagship-reports").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/flagship-reports", form);
      toast.success("Flagship report generated");
      setOpen(false); setActive(data); load();
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setBusy(false);
  };

  const regen = async (id) => {
    try {
      const { data } = await api.post(`/flagship-reports/${id}/regenerate`);
      setActive(data); toast.success("Regenerated"); load();
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!confirm("Delete report?")) return;
    await api.delete(`/flagship-reports/${id}`); load(); setActive(null);
  };

  const copyPublic = (slug) => {
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <Layout title="Flagship Report" subtitle="Magazine-quality sustainability disclosure"
      actions={<Button data-testid="new-flagship-btn" onClick={() => setOpen(true)} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New report</Button>}
    >
      {!active && (
        <>
          {items.length === 0 && (
            <div className="bg-gradient-to-br from-[#0A3B2A] to-[#0E4733] text-white rounded-sm p-10 mb-6">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#8FA998] font-bold">Premium · Multi-language · Public-shareable</div>
              <h2 className="font-display text-4xl font-medium tracking-tight mt-2 mb-3">Tell the world your sustainability story.</h2>
              <p className="text-white/80 max-w-2xl text-sm leading-relaxed">
                Generate a magazine-quality CSR / Sustainability report from your existing LCA, ESG, traceability and carbon data.
                AI writes the narrative in any of 8 languages. Each report gets a public share-link for stakeholders, customers and investors.
              </p>
              <Button onClick={() => setOpen(true)} className="mt-6 bg-white text-[#0A3B2A] hover:bg-[#F0F4F2] rounded-sm" data-testid="hero-flagship-cta">
                <Sparkle size={16} className="mr-1" /> Generate flagship report
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {items.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden card-hover cursor-pointer" onClick={() => setActive(r)} data-testid={`flagship-card-${r.id}`}>
                <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${r.brand_color} 0%, #0E4733 100%)` }}>
                  <div className="absolute inset-0 p-4 text-white">
                    <div className="text-[10px] uppercase tracking-[0.25em] opacity-70">{r.language?.toUpperCase()} · {r.period}</div>
                    <div className="font-display text-lg font-medium leading-tight mt-1 line-clamp-2">{r.title}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 line-clamp-2 mb-3">{r.headline || "—"}</div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                    <span>{r.status}</span>
                    <span>/r/{r.slug}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {active && (
        <FlagshipPreview report={active} onBack={() => setActive(null)} onRegen={() => regen(active.id)} onCopy={() => copyPublic(active.slug)} onDelete={() => remove(active.id)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-xl">
          <DialogHeader><DialogTitle className="font-display">New Flagship Sustainability Report</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title</Label><Input data-testid="flagship-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sustainability Report 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period</Label><Input value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} /></div>
              <div>
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger data-testid="flagship-language"><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGS.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="color" value={form.brand_color} onChange={e => setForm({ ...form, brand_color: e.target.value })}
                    className="h-9 w-12 border border-slate-200 rounded-sm cursor-pointer" data-testid="flagship-brand-color" />
                  <Input value={form.brand_color} onChange={e => setForm({ ...form, brand_color: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>AI provider</Label>
                <Select value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Headline (optional)</Label><Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Building a regenerative future." /></div>
            <div><Label>CEO message guidance (optional)</Label><Textarea rows={3} value={form.ceo_note_input} onChange={e => setForm({ ...form, ceo_note_input: e.target.value })} placeholder="Themes / tone / key milestones to include…" /></div>
            <div className="text-xs bg-[#F0F4F2] border border-slate-200 p-3 rounded-sm text-slate-600">
              The AI will aggregate all your existing LCA, ESG, traceability and carbon data and produce a board-quality narrative in {LANGS.find(l => l.id === form.language)?.name}. This usually takes 15-30 seconds.
            </div>
          </div>
          <DialogFooter><Button data-testid="flagship-create-submit" disabled={busy} onClick={create} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">
            <Sparkle size={16} className="mr-1" />{busy ? "Generating…" : "Generate"}
          </Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function FlagshipPreview({ report, onBack, onRegen, onCopy, onDelete }) {
  const n = report.narrative || {};
  const a = report.aggregates || {};
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="outline" onClick={onBack} className="rounded-sm" data-testid="flagship-back">← Back to list</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCopy} className="rounded-sm" data-testid="flagship-copy-link"><Copy size={14} className="mr-1" />Copy public link</Button>
          <a href={`${window.location.origin}/r/${report.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="flagship-public-view"><Globe size={14} className="mr-1" />Open public page</Button>
          </a>
          <a href={`${API}/flagship-reports/${report.id}/render.pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm" data-testid="flagship-pdf"><FilePdf size={14} className="mr-1" />PDF</Button>
          </a>
          <Button variant="outline" onClick={onRegen} className="rounded-sm" data-testid="flagship-regen"><ArrowsClockwise size={14} className="mr-1" />Regenerate</Button>
          <Button variant="outline" onClick={onDelete} className="rounded-sm text-red-700 hover:text-red-800">Delete</Button>
        </div>
      </div>

      {/* Hero cover preview */}
      <div className="rounded-sm overflow-hidden text-white relative" style={{ background: `linear-gradient(135deg, ${report.brand_color} 0%, #0E4733 100%)`, minHeight: "320px" }}>
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08), transparent 40%)`
        }} />
        <div className="relative p-10">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#8FA998] font-bold">{report.language?.toUpperCase()} · {report.period}</div>
          <h1 className="font-display text-5xl font-medium tracking-tight mt-3 max-w-3xl">{report.title}</h1>
          <p className="text-white/80 max-w-2xl mt-4 text-base">{report.headline || n.cover_tagline}</p>
          <div className="mt-8 text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">Public page</div>
          <div className="text-sm font-mono text-white/90">{window.location.origin}/r/{report.slug}</div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          ["Total CO₂e (kg)", a.total_co2e],
          ["Energy (MJ)", a.total_energy],
          ["Water (m³)", a.total_water],
          ["LCA studies", a.lca_count],
          ["Batches", a.batch_count],
          ["Carbon (tCO₂e)", a.carbon_reductions],
        ].map(([l, v]) => (
          <div key={l} className="text-white p-4 rounded-sm" style={{ background: report.brand_color }}>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-bold">{l}</div>
            <div className="font-display text-2xl mt-1">{v ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* Chapter previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          ["letter_title", "letter", "01 / Letter from leadership"],
          ["highlights_title", "highlights_intro", "02 / Year in review"],
          ["environment_title", "environment", "03 / Environment"],
          ["carbon_title", "carbon", "04 / Carbon Strategy"],
          ["supply_title", "supply", "05 / Supply chain"],
          ["social_title", "social", "06 / Social & governance"],
          ["sdg_title", "sdg", "07 / SDG alignment"],
          ["forward_title", "forward", "08 / Looking forward"],
        ].map(([titleKey, bodyKey, num]) => (
          <div key={titleKey} className="bg-white border border-slate-200 p-6 rounded-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: report.brand_color }}>{num}</div>
            <h3 className="font-display text-2xl font-medium tracking-tight mt-1 mb-3">{n[titleKey] || "—"}</h3>
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line line-clamp-[10]">{n[bodyKey] || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

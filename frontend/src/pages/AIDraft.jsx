import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkle, Copy } from "@phosphor-icons/react";

const TYPES = [
  { id: "lca", label: "LCA Report" },
  { id: "esg", label: "ESG / Sustainability Report" },
  { id: "traceability", label: "Traceability Audit Report" },
  { id: "carbon_pdd", label: "Carbon PDD" },
  { id: "mrv", label: "MRV Report" },
  { id: "gap_analysis", label: "Gap Analysis" },
  { id: "exec_summary", label: "Executive Summary" },
  { id: "board_outline", label: "Board Presentation Outline" },
];

const PROVIDERS = [
  { id: "anthropic", label: "Claude Sonnet 4.5" },
  { id: "openai", label: "GPT-5.2" },
  { id: "gemini", label: "Gemini 2.5 Pro" },
];

const CONTEXT_URL = {
  lca: "/lca", esg: "/esg", traceability: "/batches", carbon_pdd: "/carbon", mrv: "/carbon",
};

const toOption = (x) => ({ id: x.id, label: x.title || x.product_name || x.id.slice(0, 8) });

function useContextOptions(reportType) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const url = CONTEXT_URL[reportType];
    if (!url) { setOptions([]); return; }
    api.get(url)
      .then(({ data }) => setOptions(data.map(toOption)))
      .catch((e) => { console.warn("AI context load failed:", e); setOptions([]); });
  }, [reportType]);
  return options;
}

function useDraftGenerator() {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const generate = async (body) => {
    setBusy(true); setDraft("");
    try {
      const { data } = await api.post("/ai/draft", body);
      setDraft(data.draft);
      toast.success(`Drafted by ${data.model}`);
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setBusy(false);
  };
  return { draft, setDraft, busy, generate };
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function OptionSelect({ value, onChange, options, testId, placeholder }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function DraftOutput({ draft, setDraft, busy }) {
  const copy = () => { navigator.clipboard.writeText(draft); toast.success("Copied"); };
  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5 min-h-[500px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Draft</div>
          <h3 className="font-display text-lg font-medium">Editable output</h3>
        </div>
        {draft && <Button variant="outline" size="sm" onClick={copy} className="rounded-sm" data-testid="ai-copy"><Copy size={14} className="mr-1" />Copy</Button>}
      </div>
      {!draft && !busy && <div className="text-slate-400 text-sm py-20 text-center" data-testid="ai-empty">Choose a report type and click Generate Draft.</div>}
      {busy && <div className="text-slate-500 text-sm py-20 text-center animate-pulse" data-testid="ai-loading">Generating with AI…</div>}
      {draft && (
        <Textarea data-testid="ai-output" value={draft} onChange={e => setDraft(e.target.value)} rows={28}
          className="font-mono text-xs leading-relaxed border-slate-200 rounded-sm" />
      )}
    </div>
  );
}

export default function AIDraft() {
  const [reportType, setReportType] = useState("lca");
  const [provider, setProvider] = useState("anthropic");
  const [contextId, setContextId] = useState("");
  const [notes, setNotes] = useState("");
  const contextOptions = useContextOptions(reportType);
  const { draft, setDraft, busy, generate } = useDraftGenerator();

  const changeType = (t) => { setReportType(t); setContextId(""); };
  const onGenerate = () => generate({ report_type: reportType, provider, context_id: contextId || null, user_notes: notes });

  return (
    <Layout title="AI Report Drafter" subtitle="Powered by Emergent LLM">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
          <Field label="Report type"><OptionSelect value={reportType} onChange={changeType} options={TYPES} testId="ai-type" /></Field>
          <Field label="LLM provider"><OptionSelect value={provider} onChange={setProvider} options={PROVIDERS} testId="ai-provider" /></Field>
          {contextOptions.length > 0 && (
            <Field label="Use context (optional)">
              <OptionSelect value={contextId} onChange={setContextId} options={contextOptions} testId="ai-context" placeholder="(none)" />
            </Field>
          )}
          <Field label="Additional notes">
            <Textarea data-testid="ai-notes" rows={6} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, tone, audience…" />
          </Field>
          <Button data-testid="ai-generate" onClick={onGenerate} disabled={busy} className="w-full bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">
            <Sparkle size={16} className="mr-2" />{busy ? "Drafting…" : "Generate Draft"}
          </Button>
        </div>
        <DraftOutput draft={draft} setDraft={setDraft} busy={busy} />
      </div>
    </Layout>
  );
}

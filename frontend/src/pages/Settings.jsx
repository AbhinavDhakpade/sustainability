import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FloppyDisk, GlobeHemisphereWest } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion, REGION_PRESETS, USD_RATES, buildFormatters } from "@/contexts/RegionContext";
import { formatErr } from "@/lib/api";

const LOCALES = ["en-US", "en-GB", "en-IN", "de-DE", "fr-FR", "es-ES", "pt-BR", "en-AU", "ja-JP", "en-ZA", "en-SG", "ar-AE"];
const FRAMEWORKS = ["GRI", "SASB", "BRSR", "CSRD", "CUSTOM"];

function Choice({ label, value, onChange, options, id, disabled }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger data-testid={id} className="mt-1.5 rounded-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function Preview({ fmt }) {
  const rows = [
    ["Price example ($199/mo)", fmt.money(199)],
    ["Large number", fmt.num(1234567.891)],
    ["Date", fmt.date(new Date().toISOString())],
    ["Carbon (1,000 kg)", `${fmt.unit(1000, "mass")} ${fmt.unitLabel("mass")} CO₂e`],
    ["Water (10 m³)", `${fmt.unit(10, "water")} ${fmt.unitLabel("water")}`],
    ["Energy (500 MJ)", `${fmt.unit(500, "energy")} ${fmt.unitLabel("energy")}`],
  ];
  return (
    <div className="bg-[#0A3B2A] text-white rounded-sm p-6" data-testid="region-preview">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#8FA998] font-bold">Live preview</div>
      <h3 className="font-display text-lg font-medium mb-4">How your workspace will read</h3>
      <dl className="space-y-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">{k}</dt><dd className="font-mono" data-testid={`preview-${k.split(" ")[0].toLowerCase()}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-white/50 mt-4">Currency is shown at indicative rates. Subscriptions are charged in USD. Stored data stays metric.</p>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { settings, save } = useRegion();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const canEdit = ["super_admin", "company_admin"].includes(user?.role);
  useEffect(() => { setForm(settings); }, [settings]);
  const previewFmt = useMemo(() => buildFormatters(form), [form]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const pickRegion = (region) => {
    const { label, ...preset } = REGION_PRESETS[region]; // eslint-disable-line no-unused-vars
    setForm({ region, ...preset });
  };
  const submit = async () => {
    setBusy(true);
    try { await save(form); toast.success("Region settings saved"); } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
    setBusy(false);
  };

  return (
    <Layout title="Region & Formats" subtitle="Workspace settings"
      actions={canEdit && <Button data-testid="region-save" onClick={submit} disabled={busy} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><FloppyDisk size={16} className="mr-1" />{busy ? "Saving…" : "Save"}</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-sm p-6 space-y-5">
          <div className="flex items-center gap-2 text-[#0A3B2A]"><GlobeHemisphereWest size={20} weight="duotone" /><span className="text-sm font-medium">Choose your region to apply sensible defaults, then fine-tune.</span></div>
          {!canEdit && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-sm" data-testid="region-readonly">Only company admins can change these settings.</div>}
          <Choice label="Region" id="region-select" value={form.region} onChange={pickRegion} disabled={!canEdit}
            options={Object.entries(REGION_PRESETS).map(([k, p]) => [k, p.label])} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Choice label="Currency (display)" id="region-currency" value={form.currency} onChange={set("currency")} disabled={!canEdit} options={Object.keys(USD_RATES).map(c => [c, c])} />
            <Choice label="Date & number format" id="region-locale" value={form.locale} onChange={set("locale")} disabled={!canEdit} options={LOCALES.map(l => [l, l])} />
            <Choice label="Units" id="region-units" value={form.units} onChange={set("units")} disabled={!canEdit} options={[["metric", "Metric (kg, m³, MJ)"], ["imperial", "Imperial (lb, gal, kBtu)"]]} />
            <Choice label="Default reporting framework" id="region-framework" value={form.framework} onChange={set("framework")} disabled={!canEdit} options={FRAMEWORKS.map(f => [f, f])} />
          </div>
        </div>
        <div className="lg:col-span-2"><Preview fmt={previewFmt} /></div>
      </div>
    </Layout>
  );
}

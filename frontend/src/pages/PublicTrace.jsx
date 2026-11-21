import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle, MapPin, Leaf, Tag, Truck, Stack } from "@phosphor-icons/react";

export default function PublicTrace() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/trace/public/${id}`).then(r => setData(r.data)).catch(() => setErr("Batch not found"));
  }, [id]);

  if (err) return <div className="min-h-screen flex items-center justify-center text-slate-500">{err}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;

  const b = data.batch || {};
  const f = data.farm || {};

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#0A3B2A] text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-[#8FA998] flex items-center justify-center rounded-sm"><Stack size={14} weight="duotone" className="text-[#0A3B2A]" /></div>
            <span className="font-display text-sm font-semibold">Sustainability360 · Verified Origin</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#8FA998] font-bold">Batch · {b.id?.slice(0, 8)}</div>
          <h1 className="font-display text-5xl font-medium tracking-tight mt-3">{b.product_name}</h1>
          {b.certification_status && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider">
              <CheckCircle size={14} weight="fill" className="text-[#8FA998]" /> {b.certification_status}
            </div>
          )}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-10 grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-sm overflow-hidden">
        {[
          ["Quantity", `${b.quantity ?? "—"} ${b.unit || ""}`],
          ["Harvest date", b.harvest_date || "—"],
          ["Sustainability score", b.sustainability_score ?? "—"],
          ["Carbon footprint (kg CO₂e)", b.carbon_footprint ?? "—"],
          ["Processing", b.processing_unit || "—"],
          ["Buyer", b.buyer || "—"],
        ].map(([l, v]) => (
          <div key={l} className="bg-white p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{l}</div>
            <div className="font-display text-lg font-medium mt-1 text-slate-900">{v}</div>
          </div>
        ))}
      </section>

      {f && f.farmer_name && (
        <section className="max-w-3xl mx-auto px-6 py-10">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#0A3B2A] font-bold">From the source</div>
          <h2 className="font-display text-3xl font-medium mt-2 mb-6">Meet {f.farmer_name}</h2>
          <div className="border border-slate-200 rounded-sm p-6 space-y-3">
            <Row icon={<Leaf size={16} className="text-[#166534]" />} label="Crop" value={f.crop || "—"} />
            <Row icon={<MapPin size={16} className="text-[#5C8DB8]" />} label="Location" value={f.location?.lat ? `${f.location.lat.toFixed(3)}, ${f.location.lng.toFixed(3)}` : "—"} />
            <Row icon={<Tag size={16} className="text-[#0A3B2A]" />} label="Certification" value={f.certification || "—"} />
            <Row icon={<Truck size={16} className="text-[#1A365D]" />} label="Farm size" value={f.area_hectares ? `${f.area_hectares} ha` : "—"} />
          </div>
        </section>
      )}

      <footer className="text-center py-8 text-xs text-slate-500">
        Verified by Sustainability360 · Scan QR to verify any batch
      </footer>
    </div>
  );
}

const Row = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
    <div className="mt-0.5">{icon}</div>
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  </div>
);

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, API } from "@/lib/api";
import { Stack, FilePdf, Globe } from "@phosphor-icons/react";

export default function PublicFlagship() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/r/${slug}`).then(r => setData(r.data)).catch(e => setErr(e.response?.status === 404 ? "Report not found" : "Loading failed"));
  }, [slug]);

  if (err) return <div className="min-h-screen flex items-center justify-center text-slate-500">{err}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;

  const brand = data.brand_color || "#0A3B2A";
  const n = data.narrative || {};
  const a = data.aggregates || {};
  const dir = data.language === "ar" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* Hero */}
      <header className="text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand} 0%, #0E4733 70%)`, minHeight: "85vh" }}>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08), transparent 40%), radial-gradient(circle at 15% 85%, rgba(255,255,255,0.05), transparent 40%)"
        }} />
        <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-24">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-white/15 flex items-center justify-center rounded-sm"><Stack size={16} weight="duotone" /></div>
            <span className="font-display text-base font-semibold">Sustainability360</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold">{data.language?.toUpperCase()} · {data.period}</div>
          <h1 className="font-display text-5xl md:text-7xl font-medium tracking-tight leading-[1.05] mt-4 max-w-4xl">{data.title}</h1>
          <p className="text-white/80 text-lg md:text-xl max-w-3xl mt-6 leading-relaxed">{data.headline || n.cover_tagline}</p>
          <div className="mt-12 text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">Published by</div>
          <div className="text-2xl md:text-3xl font-display mt-1">{data.company_name || "Sustainability360"}</div>
          <div className="mt-12 flex flex-wrap gap-3">
            <a href={`${API}/r/${slug}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-[#0A3B2A] px-5 py-2.5 rounded-sm font-medium hover:bg-[#F0F4F2] transition-colors text-sm" data-testid="public-pdf">
              <FilePdf size={16} /> Download PDF
            </a>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied"); }} className="inline-flex items-center gap-2 border border-white/30 text-white px-5 py-2.5 rounded-sm font-medium hover:bg-white/10 transition-colors text-sm">
              <Globe size={16} /> Share
            </button>
          </div>
        </div>
      </header>

      {/* KPI Strip */}
      <section className="bg-[#F9FAFB] border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200">
          {[
            ["Carbon (kg CO₂e)", a.total_co2e],
            ["Energy (MJ)", a.total_energy],
            ["Water (m³)", a.total_water],
            ["LCA studies", a.lca_count],
            ["Batches traced", a.batch_count],
            ["Carbon credits (tCO₂e)", a.carbon_reductions],
          ].map(([l, v]) => (
            <div key={l} className="bg-white p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{l}</div>
              <div className="font-display text-3xl font-medium tracking-tight mt-2" style={{ color: brand }}>{v ?? "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chapters */}
      <main className="max-w-3xl mx-auto px-6 md:px-10 py-20 space-y-20">
        {[
          ["01", "letter_title", "letter"],
          ["02", "highlights_title", "highlights_intro"],
          ["03", "environment_title", "environment"],
          ["04", "carbon_title", "carbon"],
          ["05", "supply_title", "supply"],
          ["06", "social_title", "social"],
          ["07", "sdg_title", "sdg"],
          ["08", "forward_title", "forward"],
        ].map(([num, tk, bk]) => (
          <section key={num}>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: brand }}>{num} / Chapter</div>
            <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight mb-6 text-slate-900">{n[tk] || "—"}</h2>
            <div className="text-base md:text-lg leading-relaxed text-slate-700 space-y-4">
              {(n[bk] || "—").split("\n\n").map((p, i) => (
                p.startsWith("> ")
                  ? <blockquote key={`${num}-q-${i}-${p.slice(0, 12)}`} className="border-l-4 pl-4 italic text-xl leading-relaxed" style={{ borderColor: brand, color: brand }}>{p.replace(/^> /, "")}</blockquote>
                  : <p key={`${num}-p-${i}-${p.slice(0, 12)}`}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="text-white py-10 text-center text-xs" style={{ background: brand }}>
        <div className="opacity-80">© {new Date().getFullYear()} {data.company_name || "Sustainability360"} · Sustainability disclosure</div>
        <div className="opacity-50 mt-1">Generated by Sustainability360</div>
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useRegion } from "@/contexts/RegionContext";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(null);
  const { fmt, settings } = useRegion();
  const local = settings.currency !== "USD";

  useEffect(() => {
    api.get("/plans").then(r => setPlans(r.data)).catch(() => {});
    api.get("/billing/usage").then(r => setUsage(r.data)).catch(() => {});
  }, []);

  const checkout = async (plan_id) => {
    setBusy(plan_id);
    try {
      const { data } = await api.post("/billing/checkout-session", {
        plan: plan_id,
        origin_url: window.location.origin,
      });
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail));
    }
    setBusy(null);
  };

  const used = usage?.used || {};
  const lim = usage?.limits || {};

  return (
    <Layout title="Subscription Plans" subtitle="Pricing & limits">
      {usage && (
        <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Current plan</div>
              <h3 className="font-display text-xl font-medium">{lim.name}</h3>
            </div>
            <span className="text-xs text-slate-500" data-testid="current-plan-price">{fmt.money(lim.price)}/mo</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ["Users", used.users, lim.users],
              ["Projects", used.projects, lim.projects],
              ["Reports", used.reports, lim.reports],
            ].map(([label, u, mx]) => {
              const pct = mx > 0 ? Math.min(100, (u / mx) * 100) : 0;
              const close = pct > 80;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-mono text-slate-900">{u} / {mx === -1 ? "∞" : mx}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: close ? "#B45309" : "#0A3B2A" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {plans.map(p => {
          const isCurrent = p.id === usage?.plan;
          return (
            <div key={p.id} className={`bg-white border rounded-sm p-5 flex flex-col ${p.id === "company" ? "border-[#0A3B2A] ring-2 ring-[#0A3B2A]/10 lg:scale-[1.02]" : "border-slate-200"}`} data-testid={`plan-${p.id}`}>
              <div className="flex justify-between items-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{p.id}</div>
                {isCurrent && <span className="text-[10px] uppercase tracking-wider bg-[#0A3B2A] text-white px-2 py-0.5 rounded-sm">current</span>}
              </div>
              <h3 className="font-display text-2xl font-medium tracking-tight mt-1">{p.name}</h3>
              <div className="font-display text-3xl font-medium mt-3" data-testid={`plan-price-${p.id}`}>{fmt.money(p.price)}<span className="text-sm text-slate-500 font-normal">/mo</span></div>
              {local && <div className="text-[11px] text-slate-400" data-testid={`plan-usd-${p.id}`}>≈ billed as ${p.price} USD</div>}
              <ul className="mt-5 text-sm space-y-2 flex-1">
                <Item>{p.users === -1 ? "Unlimited" : p.users} users</Item>
                <Item>{p.projects === -1 ? "Unlimited" : p.projects} {p.projects === 1 ? "project" : "projects"}</Item>
                <Item>{p.reports === -1 ? "Unlimited" : p.reports} reports</Item>
                <Item>{p.storage_gb} GB storage</Item>
                <Item>{p.modules.includes("all") ? "All modules" : `${p.modules.length} modules`}</Item>
              </ul>
              <Button
                disabled={busy === p.id || isCurrent}
                onClick={() => checkout(p.id)}
                className={`mt-6 rounded-sm ${p.id === "company" ? "bg-[#0A3B2A] hover:bg-[#0E4733] text-white" : "bg-white text-[#0A3B2A] border border-[#0A3B2A]/20 hover:bg-[#F0F4F2]"}`}
                data-testid={`plan-cta-${p.id}`}
              >
                {isCurrent ? "Current plan" : busy === p.id ? "Redirecting…" : (p.price === 0 ? "Activate free" : "Choose plan")}
                {!isCurrent && busy !== p.id && <ArrowRight size={14} className="ml-1" />}
              </Button>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

const Item = ({ children }) => (
  <li className="flex items-start gap-2 text-slate-700">
    <Check size={14} weight="bold" className="text-[#166534] mt-0.5 shrink-0" />
    <span>{children}</span>
  </li>
);

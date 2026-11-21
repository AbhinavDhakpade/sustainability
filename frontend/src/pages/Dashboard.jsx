import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import MapView from "@/components/MapView";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import {
  Buildings, Briefcase, Leaf, ChartLineUp, Path, Tree,
  Warning, FilePdf, Users
} from "@phosphor-icons/react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar
} from "recharts";

const KPIS = [
  { key: "companies", label: "Companies", icon: Buildings, accent: "#0A3B2A" },
  { key: "projects", label: "Projects", icon: Briefcase, accent: "#1A365D" },
  { key: "lca_studies", label: "LCA Studies", icon: Leaf, accent: "#166534" },
  { key: "esg_reports", label: "ESG Reports", icon: ChartLineUp, accent: "#5C8DB8" },
  { key: "traceability_batches", label: "Traceability Batches", icon: Path, accent: "#0A3B2A" },
  { key: "carbon_projects", label: "Carbon Projects", icon: Tree, accent: "#166534" },
  { key: "data_gaps", label: "Pending Data Gaps", icon: Warning, accent: "#B45309" },
  { key: "reports_generated", label: "Reports Generated", icon: FilePdf, accent: "#1A365D" },
];

const SERIES_LINES = [
  { key: "LCA", color: "#0A3B2A" },
  { key: "ESG", color: "#5C8DB8" },
  { key: "Batches", color: "#166534" },
  { key: "Carbon", color: "#1A365D" },
];

const MODULE_MIX = [
  { name: "LCA", key: "lca_studies" },
  { name: "ESG", key: "esg_reports" },
  { name: "Trace", key: "traceability_batches" },
  { name: "Carbon", key: "carbon_projects" },
];

const TOOLTIP_STYLE = { borderRadius: 2, border: "1px solid #E2E8F0", fontSize: 12 };

const safeGet = (url, fallback) =>
  api.get(url).then(r => r.data).catch((e) => { console.warn(`${url} failed`, e); return fallback; });

function buildLineData(series) {
  const months = [...new Set(Object.values(series).flatMap(arr => (arr || []).map(p => p.month)))].sort();
  return months.map(month => {
    const row = { month };
    SERIES_LINES.forEach(({ key }) => { row[key] = series[key]?.find(p => p.month === month)?.value || 0; });
    return row;
  });
}

function useDashboardData() {
  const [data, setData] = useState({ stats: {}, series: {}, markers: [] });
  const load = useCallback(async () => {
    const [stats, series, markers] = await Promise.all([
      safeGet("/dashboard/stats", {}), safeGet("/dashboard/series", {}), safeGet("/map/markers", []),
    ]);
    setData({ stats, series, markers });
  }, []);
  useEffect(() => { load(); }, [load]);
  return data;
}

function KpiCard({ kpi, value }) {
  const Icon = kpi.icon;
  const { fmt } = useRegion();
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4 md:p-5 card-hover" data-testid={`kpi-${kpi.key}`}>
      <div className="flex items-start justify-between">
        <Icon size={20} weight="duotone" style={{ color: kpi.accent }} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-medium">live</span>
      </div>
      <div className="mt-4 font-display text-3xl tracking-tight font-medium text-slate-900">{fmt.num(value, 0)}</div>
      <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">{eyebrow}</div>
      <h3 className="font-display text-lg font-medium">{title}</h3>
    </div>
  );
}

function ActivityChart({ data }) {
  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5" data-testid="dashboard-activity-chart">
      <PanelHeading eyebrow="Activity" title="Reports & batches over time" className="mb-4" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SERIES_LINES.map(s => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ModuleMixChart({ stats }) {
  const data = MODULE_MIX.map(m => ({ name: m.name, value: stats[m.key] || 0 }));
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="dashboard-module-mix-chart">
      <PanelHeading eyebrow="Module mix" title="Workload distribution" className="mb-4" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill="#0A3B2A" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LocationsPanel({ markers }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-slate-200 flex items-baseline justify-between">
        <PanelHeading eyebrow="Geo intelligence" title="Active project locations" />
        <div className="text-xs text-slate-500" data-testid="dashboard-pinned-count"><Users size={12} className="inline mr-1" />{markers.length} pinned</div>
      </div>
      <div className="h-[420px]"><MapView markers={markers} height="420px" /></div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, series, markers } = useDashboardData();
  const lineData = useMemo(() => buildLineData(series), [series]);

  return (
    <Layout title="Executive Overview" subtitle={`Welcome, ${user?.name || ""}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {KPIS.map(k => <KpiCard key={k.key} kpi={k} value={stats[k.key]} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
        <ActivityChart data={lineData} />
        <ModuleMixChart stats={stats} />
      </div>
      <LocationsPanel markers={markers} />
    </Layout>
  );
}

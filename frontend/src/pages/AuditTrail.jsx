import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { useRegion } from "@/contexts/RegionContext";

export default function AuditTrail() {
  const { fmt } = useRegion();
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit-logs?limit=300").then(r => setLogs(r.data)).catch(() => {}); }, []);

  return (
    <Layout title="Audit Trail" subtitle="Immutable activity log">
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 border-b border-slate-200 w-48">Time</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">User</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Action</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Resource</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">No activity yet</td></tr>}
            {logs.map(l => (
              <tr key={l.id} className="border-b border-slate-200 hover:bg-[#F0F4F2]">
                <td className="px-5 py-3 text-xs font-mono text-slate-500">{fmt.dateTime(l.timestamp)}</td>
                <td className="px-5 py-3 text-slate-700">{l.user_email || "—"}</td>
                <td className="px-5 py-3"><span className="text-xs bg-[#F0F4F2] text-[#0A3B2A] px-2 py-0.5 rounded-sm uppercase tracking-wider">{l.action}</span></td>
                <td className="px-5 py-3 text-slate-700">{l.resource}{l.resource_id ? ` · ${l.resource_id.slice(0, 8)}` : ""}</td>
                <td className="px-5 py-3 text-xs text-slate-500 font-mono truncate max-w-md">{l.details ? JSON.stringify(l.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

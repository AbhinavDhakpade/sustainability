import { useCallback, useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Copy, UserPlus } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { JOIN_EVENT } from "@/lib/useJoinCount";

const ROLES = ["viewer", "consultant", "auditor", "data_entry", "supplier", "company_admin"];

export function JoinCodeCard() {
  const { user } = useAuth();
  if (!user?.company_id) return null;
  const copy = () => { navigator.clipboard.writeText(user.company_id); toast.success("Join code copied"); };
  return (
    <div className="bg-[#F0F4F2] border border-[#0A3B2A]/15 rounded-sm p-5 flex flex-col md:flex-row md:items-center gap-4 mb-6" data-testid="join-code-card">
      <UserPlus size={28} weight="duotone" className="text-[#0A3B2A] shrink-0" />
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Workspace join code</div>
        <div className="text-sm text-slate-600">Share this with teammates. They pick “Join a workspace” on the sign-up page and you approve them here.</div>
      </div>
      <code className="font-mono text-xs bg-white border border-slate-200 px-3 py-2 rounded-sm" data-testid="join-code-value">{user.company_id}</code>
      <Button variant="outline" size="sm" onClick={copy} className="rounded-sm" data-testid="join-code-copy"><Copy size={14} className="mr-1" />Copy</Button>
    </div>
  );
}

function RequestRow({ req, onDone, fmt }) {
  const [role, setRole] = useState("viewer");
  const act = async (kind) => {
    try {
      if (kind === "approve") await api.post(`/join-requests/${req.id}/approve`, { role });
      else await api.post(`/join-requests/${req.id}/reject`);
      toast.success(kind === "approve" ? `${req.name} approved` : "Request rejected");
      onDone();
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-slate-200 last:border-0" data-testid={`join-request-${req.id}`}>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{req.name}</div>
        <div className="text-xs text-slate-500 truncate">{req.email} · requested {fmt.date(req.created_at)}</div>
      </div>
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-40 rounded-sm" data-testid={`join-role-${req.id}`}><SelectValue /></SelectTrigger>
        <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" onClick={() => act("approve")} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm" data-testid={`join-approve-${req.id}`}><Check size={14} className="mr-1" />Approve</Button>
      <Button size="sm" variant="outline" onClick={() => act("reject")} className="rounded-sm text-red-700 hover:text-red-800" data-testid={`join-reject-${req.id}`}><X size={14} className="mr-1" />Reject</Button>
    </div>
  );
}

export function JoinRequests({ onChange }) {
  const { fmt } = useRegion();
  const [items, setItems] = useState([]);
  const load = useCallback(() => {
    api.get("/join-requests").then(r => setItems(r.data)).catch((e) => console.warn("join requests failed", e));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (window.location.search.includes("tab=requests")) document.getElementById("requests")?.scrollIntoView({ behavior: "smooth" });
  }, []);
  const done = () => { load(); onChange?.(); window.dispatchEvent(new Event(JOIN_EVENT)); };

  return (
    <div className="bg-white border border-slate-200 rounded-sm mb-6" id="requests" data-testid="join-requests">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">Pending approval</div>
          <h3 className="font-display text-lg font-medium">Join requests</h3>
        </div>
        <span className="text-xs bg-[#B45309] text-white px-2 py-0.5 rounded-sm" data-testid="join-requests-count">{items.length}</span>
      </div>
      {items.length === 0 && <div className="text-sm text-slate-400 text-center py-8" data-testid="join-requests-empty">No pending requests</div>}
      {items.map(r => <RequestRow key={r.id} req={r} onDone={done} fmt={fmt} />)}
    </div>
  );
}

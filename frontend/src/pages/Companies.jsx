import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";

const PLANS = ["free_demo", "consultant", "company", "enterprise", "auditor"];

export default function Companies() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", country: "", contact_email: "", plan: "free_demo" });

  const load = () => api.get("/companies").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api.post("/companies", form); setOpen(false); setForm({ name: "", industry: "", country: "", contact_email: "", plan: "free_demo" }); toast.success("Company created"); load(); }
    catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!confirm("Delete company?")) return;
    try { await api.delete(`/companies/${id}`); load(); toast.success("Deleted"); } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  return (
    <Layout title="Companies" subtitle="Tenant administration"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-company-btn" className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New Company</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display">Create Company</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>Name</Label><Input data-testid="company-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              </div>
              <div><Label>Contact email</Label><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger data-testid="company-plan"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map(p => <SelectItem key={p} value={p}>{p.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button data-testid="company-create-submit" onClick={create} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm" data-testid="companies-table">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 border-b border-slate-200">Name</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Industry</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Country</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Plan</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Status</th>
              <th className="text-right px-5 py-3 border-b border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No companies yet</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-200 hover:bg-[#F0F4F2]">
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3 text-slate-600">{c.industry || "—"}</td>
                <td className="px-5 py-3 text-slate-600">{c.country || "—"}</td>
                <td className="px-5 py-3">
                  <span className="inline-block bg-[#F0F4F2] text-[#0A3B2A] text-xs px-2 py-0.5 rounded-sm uppercase tracking-wider">{(c.plan || "—").replace("_", " ")}</span>
                </td>
                <td className="px-5 py-3"><span className={`text-xs ${c.active ? "text-[#166534]" : "text-slate-400"}`}>{c.active ? "Active" : "Inactive"}</span></td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-600 transition-colors" data-testid={`delete-company-${c.id}`}><Trash size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

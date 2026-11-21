import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { JoinCodeCard, JoinRequests } from "@/components/JoinRequests";

const ROLES = ["company_admin", "consultant", "auditor", "data_entry", "supplier", "viewer"];

export default function UsersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consultant", company_id: "" });

  const members = items.filter(u => !u.pending);
  const load = () => api.get("/users").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
    if (user?.role === "super_admin") api.get("/companies").then(r => setCompanies(r.data)).catch(() => {});
  }, [user]);

  const create = async () => {
    try {
      const payload = { ...form };
      if (user?.role !== "super_admin") delete payload.company_id;
      else if (!payload.company_id) delete payload.company_id;
      await api.post("/users", payload);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "consultant", company_id: "" });
      toast.success("User created"); load();
    } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  const toggle = async (u) => {
    try { await api.put(`/users/${u.id}`, { active: !u.active }); load(); } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!confirm("Delete user?")) return;
    try { await api.delete(`/users/${id}`); load(); toast.success("Deleted"); } catch (e) { toast.error(formatErr(e.response?.data?.detail)); }
  };

  return (
    <Layout title="Users" subtitle="Roles & access"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-user-btn" className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm"><Plus size={16} className="mr-1" />New User</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display">Invite User</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>Name</Label><Input data-testid="user-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input data-testid="user-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Temporary password</Label><Input data-testid="user-password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {user?.role === "super_admin" && (
                <div>
                  <Label>Company</Label>
                  <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose company" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter><Button data-testid="user-create-submit" onClick={create} className="bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm">Invite</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <JoinCodeCard />
      <JoinRequests onChange={load} />
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm" data-testid="users-table">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 border-b border-slate-200">Name</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Email</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Role</th>
              <th className="text-left px-5 py-3 border-b border-slate-200">Active</th>
              <th className="text-right px-5 py-3 border-b border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">No users</td></tr>}
            {members.map((u) => (
              <tr key={u.id} className="border-b border-slate-200 hover:bg-[#F0F4F2]">
                <td className="px-5 py-3 font-medium">{u.name}</td>
                <td className="px-5 py-3 text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <span className="inline-block bg-[#F0F4F2] text-[#0A3B2A] text-xs px-2 py-0.5 rounded-sm uppercase tracking-wider">{u.role.replace("_", " ")}</span>
                </td>
                <td className="px-5 py-3"><Switch checked={u.active} onCheckedChange={() => toggle(u)} data-testid={`user-toggle-${u.id}`} /></td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(u.id)} className="text-slate-400 hover:text-red-600" data-testid={`user-delete-${u.id}`}><Trash size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

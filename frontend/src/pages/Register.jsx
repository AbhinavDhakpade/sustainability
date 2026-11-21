import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HourglassMedium } from "@phosphor-icons/react";

function Field({ label, testId, ...props }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-slate-600">{label}</Label>
      <Input data-testid={testId} className="mt-1.5 rounded-sm" {...props} />
    </div>
  );
}

function PendingScreen({ email }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-sm shadow-sm text-center" data-testid="register-pending">
        <HourglassMedium size={36} weight="duotone" className="mx-auto text-[#0A3B2A]" />
        <h2 className="font-display text-2xl font-medium tracking-tight mt-3">Request sent</h2>
        <p className="text-sm text-slate-500 mt-2">The workspace admins have been notified. We'll email {email} as soon as your access is approved.</p>
        <Link to="/login" className="inline-block mt-6 text-[#0A3B2A] font-medium hover:underline" data-testid="register-pending-login">Back to sign in</Link>
      </div>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", company_id: "" });
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { company_id, ...rest } = form;
    const res = await register(joining ? { ...rest, company_id: company_id.trim() } : rest);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (res.pending) { setPending(true); return; }
    toast.success("Workspace created"); nav("/dashboard");
  };

  if (pending) return <PendingScreen email={form.email} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-sm shadow-sm" data-testid="register-form">
        <div className="grid grid-cols-2 border border-slate-200 rounded-sm p-1 mb-6 text-sm" data-testid="register-mode">
          {[[false, "Create workspace"], [true, "Join a workspace"]].map(([val, label]) => (
            <button type="button" key={label} onClick={() => setJoining(val)} data-testid={val ? "register-mode-join" : "register-mode-create"}
              className={`py-2 rounded-sm transition-colors ${joining === val ? "bg-[#0A3B2A] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>
          ))}
        </div>
        <h2 className="font-display text-3xl font-medium tracking-tight mb-1">{joining ? "Join your team" : "Start sustainability360"}</h2>
        <p className="text-sm text-slate-500 mb-6">{joining ? "Ask your admin for the workspace join code. They'll approve your access." : "A private workspace will be created for your company."}</p>
        <div className="space-y-4">
          {joining && <Field label="Workspace join code" testId="register-join-code" required value={form.company_id} onChange={set("company_id")} placeholder="e.g. 3f2a9c…" />}
          <Field label="Full name" testId="register-name" required value={form.name} onChange={set("name")} />
          <Field label="Work email" testId="register-email" type="email" required value={form.email} onChange={set("email")} />
          <Field label="Password" testId="register-password" type="password" required minLength={6} value={form.password} onChange={set("password")} />
        </div>
        <Button data-testid="register-submit" disabled={busy} type="submit"
          className="w-full mt-6 bg-[#0A3B2A] hover:bg-[#0E4733] text-white rounded-sm h-10">
          {busy ? "Submitting…" : joining ? "Request access" : "Create workspace"}
        </Button>
        <div className="mt-4 text-sm text-slate-500 text-center">
          Already a user? <Link to="/login" className="text-[#0A3B2A] font-medium hover:underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}

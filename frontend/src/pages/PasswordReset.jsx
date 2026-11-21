import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function Shell({ eyebrow, title, subtitle, children, testId }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-sm shadow-sm" data-testid={testId}>
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#0A3B2A] font-bold mb-2">{eyebrow}</div>
        <h2 className="font-display text-3xl font-medium tracking-tight mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        {children}
        <div className="mt-6 text-sm text-slate-500 text-center">
          <Link to="/login" data-testid="back-to-login" className="text-[#0A3B2A] font-medium hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/auth/forgot-password", { email }); setSent(true); } catch (err) { toast.error(formatErr(err.response?.data?.detail)); }
    setBusy(false);
  };
  if (sent) {
    return (
      <Shell eyebrow="Check your inbox" title="Email on its way" testId="forgot-sent"
        subtitle={`If an account exists for ${email}, we've sent a link to reset the password. It expires in 1 hour.`} />
    );
  }
  return (
    <Shell eyebrow="Account recovery" title="Forgot password?" subtitle="Enter your work email and we'll send you a reset link." testId="forgot-form">
      <form onSubmit={submit}>
        <Label className="text-xs uppercase tracking-wider text-slate-600">Work email</Label>
        <Input data-testid="forgot-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 rounded-sm" />
        <Button data-testid="forgot-submit" disabled={busy} type="submit" className="w-full mt-6 bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm h-10">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password: pw });
      toast.success("Password updated. Please sign in.");
      nav("/login");
    } catch (err) { toast.error(formatErr(err.response?.data?.detail)); }
    setBusy(false);
  };
  if (!token) {
    return <Shell eyebrow="Account recovery" title="Link incomplete" subtitle="This reset link is missing its code. Request a new one." testId="reset-missing" />;
  }
  return (
    <Shell eyebrow="Account recovery" title="Choose a new password" subtitle="Use at least 8 characters." testId="reset-form">
      <form onSubmit={submit} className="space-y-4">
        <div><Label className="text-xs uppercase tracking-wider text-slate-600">New password</Label>
          <Input data-testid="reset-password" type="password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} className="mt-1.5 rounded-sm" /></div>
        <div><Label className="text-xs uppercase tracking-wider text-slate-600">Confirm password</Label>
          <Input data-testid="reset-confirm" type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1.5 rounded-sm" /></div>
        <Button data-testid="reset-submit" disabled={busy} type="submit" className="w-full bg-[#0A3B2A] hover:bg-[#0E4733] rounded-sm h-10">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </Shell>
  );
}

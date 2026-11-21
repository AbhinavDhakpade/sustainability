import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      toast.success("Welcome back");
      nav("/dashboard");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-white">
      <div className="lg:col-span-3 hidden lg:flex flex-col justify-between p-12 bg-[#0A3B2A] text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#8FA998] flex items-center justify-center rounded-sm">
              <Leaf size={18} weight="duotone" className="text-[#0A3B2A]" />
            </div>
            <span className="font-display text-lg font-semibold">Sustainability360</span>
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-3">Enterprise ESG Platform</div>
          <h1 className="font-display text-4xl lg:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
            Audit-grade sustainability, from farm to filing.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Multi-tenant LCA, ESG, traceability and carbon credit documentation —
            built for consultants, corporates, and verifiers.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-xs">
            {["ISO 14040/44", "GRI · BRSR · SASB", "Verra · Gold Std"].map(s => (
              <div key={s} className="bg-white/5 border border-white/10 px-3 py-2 rounded-sm">{s}</div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/50">© 2026 Sustainability360</div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, #8FA998 0%, transparent 40%), radial-gradient(circle at 20% 80%, #5C8DB8 0%, transparent 40%)"
        }} />
      </div>

      <div className="lg:col-span-2 flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#0A3B2A] font-bold mb-2">Sign in</div>
          <h2 className="font-display text-3xl font-medium tracking-tight mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-8">Access your sustainability workspace.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-slate-600">Email</Label>
              <Input id="email" data-testid="login-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} className="mt-1.5 rounded-sm" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-slate-600">Password</Label>
                <Link to="/forgot-password" data-testid="link-forgot-password" className="text-xs text-[#0A3B2A] hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" data-testid="login-password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} className="mt-1.5 rounded-sm" />
            </div>
          </div>

          <Button data-testid="login-submit" disabled={busy} type="submit"
            className="w-full mt-6 bg-[#0A3B2A] hover:bg-[#0E4733] text-white rounded-sm h-10">
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <div className="mt-6 text-sm text-slate-500 text-center">
            New to Sustainability360?{" "}
            <Link to="/register" data-testid="link-register" className="text-[#0A3B2A] font-medium hover:underline">Create workspace</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

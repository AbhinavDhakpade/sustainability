import { useCallback, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Spinner } from "@phosphor-icons/react";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 8;

export function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const planParam = params.get("plan");
  const [state, setState] = useState({ status: sessionId ? "checking" : "ok", message: "" });

  const poll = useCallback(async (attempts) => {
    if (!sessionId) {
      setState({ status: "ok", message: "Plan activated" });
      return;
    }
    try {
      const { data } = await api.get(`/billing/session/${sessionId}`);
      if (data.payment_status === "paid") {
        setState({ status: "paid", message: `Subscription active — $${(data.amount_total / 100).toFixed(2)} ${data.currency?.toUpperCase()}` });
        return;
      }
      if (data.status === "expired") {
        setState({ status: "fail", message: "Checkout expired. Try again." });
        return;
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setState({ status: "timeout", message: "Still processing — your plan will activate shortly." });
        return;
      }
      setTimeout(() => poll(attempts + 1), POLL_INTERVAL_MS);
    } catch (e) {
      console.error("Billing session poll failed:", e);
      setState({ status: "fail", message: "Could not confirm payment status" });
    }
  }, [sessionId]);

  useEffect(() => {
    poll(1);
  }, [poll]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="bg-white border border-slate-200 rounded-sm p-10 max-w-md text-center">
        {state.status === "checking" && (<><Spinner size={48} className="text-[#0A3B2A] mx-auto animate-spin" /><h1 className="font-display text-2xl mt-4">Confirming payment…</h1></>)}
        {(state.status === "paid" || state.status === "ok") && (<><CheckCircle size={56} weight="duotone" className="text-[#0A3B2A] mx-auto" /><h1 className="font-display text-3xl mt-4">You're upgraded</h1><p className="text-slate-600 mt-2 text-sm">{state.message || `${planParam || "Plan"} activated`}</p></>)}
        {state.status === "timeout" && (<><CheckCircle size={56} weight="duotone" className="text-amber-600 mx-auto" /><h1 className="font-display text-2xl mt-4">Payment processing</h1><p className="text-slate-600 mt-2 text-sm">{state.message}</p></>)}
        {state.status === "fail" && (<><XCircle size={56} weight="duotone" className="text-red-600 mx-auto" /><h1 className="font-display text-2xl mt-4">Could not confirm payment</h1><p className="text-slate-600 mt-2 text-sm">{state.message}</p></>)}
        <Link to="/dashboard" className="inline-block mt-6 bg-[#0A3B2A] hover:bg-[#0E4733] text-white px-5 py-2 rounded-sm text-sm" data-testid="billing-back-dashboard">Continue to dashboard →</Link>
      </div>
    </div>
  );
}

export function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="bg-white border border-slate-200 rounded-sm p-10 max-w-md text-center">
        <XCircle size={56} weight="duotone" className="text-slate-500 mx-auto" />
        <h1 className="font-display text-3xl mt-4">Checkout cancelled</h1>
        <p className="text-slate-600 mt-2 text-sm">No charge was made. You can pick a plan anytime.</p>
        <Link to="/plans" className="inline-block mt-6 bg-[#0A3B2A] hover:bg-[#0E4733] text-white px-5 py-2 rounded-sm text-sm">Back to plans →</Link>
      </div>
    </div>
  );
}

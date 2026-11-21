import { useCallback, useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_ROLES = ["super_admin", "company_admin"];
export const JOIN_EVENT = "join-requests-changed";

export function useJoinCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.get("/join-requests/count").then(r => setCount(r.data.count)).catch((e) => console.warn("join count failed", formatErr(e.response?.data?.detail)));
  }, [isAdmin]);

  useEffect(() => {
    load();
    if (!isAdmin) return undefined;
    const t = setInterval(load, 60000);
    window.addEventListener(JOIN_EVENT, load);
    return () => { clearInterval(t); window.removeEventListener(JOIN_EVENT, load); };
  }, [load, isAdmin]);

  return isAdmin ? count : 0;
}

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJoinCount } from "@/lib/useJoinCount";
import {
  House, Buildings, Users, Leaf, ChartLineUp, Path, Tree,
  MapTrifold, Sparkle, ClipboardText, Crown, SignOut, Stack, NewspaperClipping, GlobeHemisphereWest
} from "@phosphor-icons/react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: House, roles: null },
  { to: "/companies", label: "Companies", icon: Buildings, roles: ["super_admin"] },
  { to: "/users", label: "Users", icon: Users, roles: ["super_admin", "company_admin"] },
  { to: "/lca", label: "LCA Studies", icon: Leaf, roles: null },
  { to: "/esg", label: "ESG Reports", icon: ChartLineUp, roles: null },
  { to: "/traceability", label: "Traceability", icon: Path, roles: null },
  { to: "/carbon", label: "Carbon Projects", icon: Tree, roles: null },
  { to: "/map", label: "Geo / Map", icon: MapTrifold, roles: null },
  { to: "/ai", label: "AI Drafter", icon: Sparkle, roles: null },
  { to: "/flagship", label: "Flagship Report", icon: NewspaperClipping, roles: null },
  { to: "/audit", label: "Audit Trail", icon: ClipboardText, roles: ["super_admin", "company_admin", "auditor"] },
  { to: "/plans", label: "Plans", icon: Crown, roles: null },
  { to: "/settings", label: "Region & Formats", icon: GlobeHemisphereWest, roles: null },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const joinCount = useJoinCount();

  const visible = NAV.filter(n => !n.roles || n.roles.includes(user?.role));

  return (
    <aside className="hidden md:flex w-64 shrink-0 bg-[#0A3B2A] text-white flex-col h-screen sticky top-0" data-testid="app-sidebar">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#8FA998] flex items-center justify-center rounded-sm">
            <Stack size={18} weight="duotone" className="text-[#0A3B2A]" />
          </div>
          <div>
            <div className="font-display font-semibold text-base leading-tight">Sustainability360</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">ESG · LCA · MRV</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.to.slice(1)}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 my-0.5 text-sm rounded-sm transition-colors ${
                isActive ? "nav-active text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon size={18} weight="regular" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/users" && joinCount > 0 && (
              <span className="bg-[#B45309] text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center" data-testid="nav-users-badge">{joinCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="text-xs text-white/60 mb-2">
          <div className="font-medium text-white truncate">{user?.name}</div>
          <div className="truncate">{user?.email}</div>
          <div className="mt-1 inline-block bg-white/10 px-2 py-0.5 rounded-sm uppercase tracking-wider text-[10px]">
            {user?.role?.replace("_", " ")}
          </div>
        </div>
        <button
          data-testid="logout-button"
          onClick={async () => { await logout(); nav("/login"); }}
          className="w-full flex items-center justify-center gap-2 text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-3 py-2 rounded-sm transition-colors"
        >
          <SignOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}

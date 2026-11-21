import Sidebar from "@/components/Sidebar";
import { Link } from "react-router-dom";
import { useJoinCount } from "@/lib/useJoinCount";
import { Bell, MagnifyingGlass } from "@phosphor-icons/react";

function NotificationBell() {
  const count = useJoinCount();
  return (
    <Link to="/users?tab=requests" className="relative text-slate-500 hover:text-slate-900 transition-colors" data-testid="header-notifications"
      title={count ? `${count} join request(s) waiting` : "No new notifications"}>
      <Bell size={18} />
      {count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#B45309] text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center" data-testid="header-notifications-count">{count}</span>}
    </Link>
  );
}

export default function Layout({ children, title, subtitle, actions }) {
  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center px-6 md:px-8">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#0A3B2A] font-bold">
              {subtitle || "Sustainability360"}
            </div>
            <h1 className="font-display text-lg md:text-xl font-medium tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-500 hover:text-slate-900 transition-colors" data-testid="header-search">
              <MagnifyingGlass size={18} />
            </button>
            <NotificationBell />
            {actions}
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

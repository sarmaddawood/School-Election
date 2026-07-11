import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Vote,
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Award,
  Users,
  BarChart3,
  LogOut,
  User,
  Key,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { User as UserType } from "../types";
import ConfirmModal from "./ConfirmModal";

// @ts-ignore
import bolinaoLogo from "../assets/images/bolinao_logo_1783614038890.jpg";

interface AppShellProps {
  user: UserType;
  onLogout: () => void;
  token: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

export default function AppShell({
  user,
  onLogout,
  token,
  activeTab,
  onTabChange,
  children,
  setErrorNotification,
  setSuccessNotification,
}: AppShellProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 880);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 880);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems =
    user.role === "admin"
      ? [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "elections", label: "Elections", icon: Calendar },
          { id: "positions", label: "Positions", icon: Award },
          { id: "candidates", label: "Candidates", icon: Users },
          { id: "users", label: "Users Registry", icon: User },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
          { id: "diagnostics", label: "System Diagnostics", icon: Activity },
        ]
      : user.role === "teacher"
      ? [
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ]
      : [
          { id: "vote", label: "Cast Ballot", icon: Vote },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ];

  return (
    <div className="h-[100dvh] w-screen overflow-hidden grid md:grid-cols-[280px_1fr] md:grid-rows-[1fr_auto] bg-[var(--bg)] text-[var(--ink)] font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex justify-between items-center p-4 bg-[var(--surface)] border-b border-[var(--border)] shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 -ml-1 text-[var(--ink)]">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img src={bolinaoLogo} alt="Logo" className="w-8 h-8 rounded bg-white object-contain" />
          <div className="font-display text-sm font-bold uppercase">BSF E-Voting</div>
        </div>
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-8 h-8 rounded bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center font-bold text-xs border border-[var(--border)] overflow-hidden">
            {user.photoUrl && user.photoUrl !== "null" && user.photoUrl !== "" && user.photoUrl !== "undefined" ? (
              <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              user.fullName[0]
            )}
          </button>
          <AnimatePresence>
            {isMobile && showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded p-2 z-50 shadow-2xl"
              >
                <div className="px-3 py-2 border-b border-[var(--border)] mb-2">
                    <p className="font-bold uppercase truncate tracking-wider text-[var(--ink)] text-[10px]">{user.fullName}</p>
                    <p className="text-zinc-500 uppercase truncate tracking-wider text-[9px] mt-0.5">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    onTabChange("password");
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-[var(--ink)] hover:bg-[var(--bg)] rounded flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Key size={13} />
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowConfirmLogout(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:flex w-[280px] bg-[var(--surface)] border-r border-[var(--border)] flex-col p-6 md:p-8 transition-transform duration-300 flex md:row-span-2`}>
        <div className="mb-12">
            <div className="w-[50px] h-[50px] bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img src={bolinaoLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="font-display text-base uppercase leading-none tracking-tight">
                Bolinao School<br/>of Fisheries
            </div>
            <span className="font-mono text-[0.6rem] text-[var(--accent)] uppercase tracking-widest mt-2 block">
                E-Voting Portal
            </span>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pr-1 py-4 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 text-[0.7rem] font-mono uppercase tracking-wider rounded transition-all cursor-pointer border-none text-left ${
                  isActive ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[rgba(26,26,24,0.6)] hover:bg-[rgba(26,26,24,0.03)] hover:text-[var(--ink)]"
                }`}
              >
                <item.icon size={16} className={isActive ? "opacity-100" : "opacity-60"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-[var(--border)] relative hidden md:block">
            <div className="flex items-center gap-3 p-2 hover:bg-[var(--accent-soft)] rounded-lg cursor-pointer transition-colors" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-[var(--surface)] flex items-center justify-center font-bold text-[0.7rem] shrink-0 overflow-hidden">
                    {user.photoUrl && user.photoUrl !== "null" && user.photoUrl !== "" && user.photoUrl !== "undefined" ? (
                        <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                        user.fullName[0]
                    )}
                </div>
                <div className="text-[0.65rem] overflow-hidden flex-1">
                    <p className="font-bold uppercase truncate tracking-wider text-[var(--ink)]">{user.fullName}</p>
                    <p className="text-zinc-500 uppercase truncate tracking-wider mt-0.5">{user.role}</p>
                </div>
            </div>

            <AnimatePresence>
              {!isMobile && showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded p-2 z-50 shadow-2xl"
                >
                  <button
                    onClick={() => {
                      onTabChange("password");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-[var(--ink)] hover:bg-[var(--bg)] rounded flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Key size={13} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </aside>

      <main className="p-4 md:p-10 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(0,255,170,0.03),transparent)] relative min-h-0">
        <header className="hidden md:flex justify-between items-end mb-12 shrink-0">
            <div>
                <h2 className="font-display text-4xl uppercase leading-none tracking-tight">ADMINISTRATION<br/>TELEMETRY</h2>
                <p className="text-sm opacity-50 max-w-[400px] mt-4">Real-time status updates, polling metrics, and registry logs across the centralized BSF system.</p>
            </div>
        </header>

        {children}
      </main>

      <footer className="hidden md:flex md:col-start-2 px-10 py-4 border-t border-[var(--border)] font-mono text-[0.6rem] opacity-40 justify-between shrink-0 bg-[var(--bg)]">
        <span>© 2026 BOLINAO SCHOOL OF FISHERIES</span>
        <span>SECURITY PROTOCOL: v4.1.2_SECURE</span>
      </footer>

      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={onLogout}
      />
    </div>
  );
}

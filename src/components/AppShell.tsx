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
  ChevronDown,
} from "lucide-react";
import { User as UserType } from "../types";
import ConfirmModal from "./ConfirmModal";
// @ts-ignore
import schoolElectionLogo from "../assets/images/school_election_logo_1783276555365.jpg";

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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const isThemeLight = false;

  useEffect(() => {
    document.body.className = "theme-light";
    localStorage.setItem("ui-theme", "light");
  }, []);


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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 14,
      },
    },
  };

  const mobileContainerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.05,
      },
    },
  };

  const mobileItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 12 },
    },
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row text-zinc-900 relative bg-white">
      {!isMobile ? (
        <motion.aside
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
          className="w-64 glass-panel border-r border-zinc-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-2xl z-20"
        >
          <div className="space-y-6 pt-6">
            <div className="px-6 flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="h-9 w-9 bg-indigo-500/10 rounded-xl border border-violet-400/20 overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.15)] cursor-pointer"
              >
                <img
                  src={schoolElectionLogo}
                  alt="School Election Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <span className="font-display font-semibold text-base tracking-tight text-gradient">
                School Election
              </span>
            </div>
 
            <div className="px-3">
              <div className={`transition-colors duration-200 rounded-2xl shadow-md overflow-hidden ${
                isThemeLight 
                  ? "bg-black/3 border border-black/5" 
                  : "bg-white/3 border border-zinc-200"
              }`}>
                {/* Profile Trigger */}
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-colors duration-200 cursor-pointer group ${
                    isThemeLight ? "hover:bg-black/3" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-zinc-900 font-bold flex items-center justify-center text-xs font-display border border-zinc-200 uppercase shadow-md shrink-0 group-hover:scale-105 transition-transform duration-250">
                      {user.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate transition-colors duration-200 ${
                        isThemeLight ? "text-zinc-800" : "text-zinc-900"
                      }`}>
                        {user.fullName}
                      </p>
                      <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider mt-0.5">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isProfileDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 transition-colors duration-200 ${
                      isThemeLight ? "text-zinc-500" : "text-zinc-500"
                    }`}
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                {/* Dropdown Content */}
                <AnimatePresence initial={false}>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 pt-1 space-y-2 border-t transition-colors duration-200 ${
                        isThemeLight ? "border-black/5" : "border-zinc-200"
                      }`}>
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: isThemeLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onTabChange("password")}
                          className={`w-full py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            isThemeLight
                              ? "bg-black/5 text-zinc-700 border-black/5 hover:border-black/10 hover:text-zinc-900"
                              : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-zinc-200 hover:text-zinc-900"
                          }`}
                        >
                          <Key size={10} />
                          Change Password
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.nav
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1.5 px-2.5"
            >
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    variants={itemVariants}
                    onClick={() => onTabChange(item.id)}
                    whileHover={{
                      scale: 1.02,
                      x: 4,
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 cursor-pointer border relative overflow-hidden group transition-colors duration-200 ${
                      isActive
                        ? isThemeLight
                          ? "text-violet-700 font-bold border-violet-500/25 shadow-[0_0_15px_rgba(139,92,246,0.08)] bg-indigo-600/10"
                          : "text-indigo-500 font-bold border-indigo-200 shadow-[0_0_15px_rgba(139,92,246,0.12)] bg-indigo-600/5"
                        : isThemeLight
                          ? "text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-black/5"
                          : "text-zinc-500 border-transparent hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBackground"
                        className={`absolute inset-0 z-0 ${
                          isThemeLight 
                            ? "bg-gradient-to-r from-violet-600/10 to-indigo-600/5" 
                            : "bg-gradient-to-r from-violet-600/15 to-indigo-600/5"
                        }`}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-r-full z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3 w-full">
                      <item.icon
                        size={16}
                        className={`transition-colors duration-200 ${
                          isActive
                            ? isThemeLight ? "text-violet-600" : "text-indigo-600"
                            : isThemeLight ? "text-zinc-500 group-hover:text-zinc-950" : "text-zinc-500 group-hover:text-zinc-900"
                        }`}
                      />
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.nav>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-3 border-t border-zinc-200 space-y-1.5"
          >
            {/* Theme Accordion - Removed */}

            <motion.button
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                x: 4,
                backgroundColor: isThemeLight ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.1)",
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConfirmLogout(true)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors duration-200 cursor-pointer border border-transparent ${
                isThemeLight
                  ? "text-zinc-600 hover:text-red-600"
                  : "text-zinc-500 hover:text-red-400"
              }`}
            >
              <span className="flex items-center gap-3">
                <LogOut size={16} />
                Sign Out
              </span>
            </motion.button>
            <div className="px-4 py-2 text-[10px] text-zinc-500 font-medium">
              © 2026 E-Voting Inc.
            </div>
            <ConfirmModal
              isOpen={showConfirmLogout}
              onClose={() => setShowConfirmLogout(false)}
              onConfirm={onLogout}
            />
          </motion.div>
        </motion.aside>
      ) : (
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3 flex justify-between items-center z-40 shadow-lg shrink-0"
        >
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="h-8 w-8 bg-indigo-500/10 rounded-lg border border-indigo-200 overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.15)]"
            >
              <img
                src={schoolElectionLogo}
                alt="School Election Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <span className="font-display font-semibold text-sm tracking-tight text-gradient">
              School Election
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-200 flex items-center justify-center font-bold text-xs uppercase"
              >
                {user.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-black border border-zinc-200 rounded-2xl shadow-2xl p-2 space-y-1.5 z-50 backdrop-blur-xl"
                  >
                    <div className="px-3 py-2 border-b border-zinc-200">
                      <p className="text-xs font-semibold text-zinc-900 truncate">{user.fullName}</p>
                      <p className="text-[9px] font-bold uppercase text-indigo-600 tracking-wider mt-0.5">{user.role}</p>
                    </div>
                    <button
                      onClick={() => {
                        onTabChange("password");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Key size={13} />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowConfirmLogout(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ConfirmModal
              isOpen={showConfirmLogout}
              onClose={() => setShowConfirmLogout(false)}
              onConfirm={onLogout}
            />
          </div>
        </motion.header>
      )}

      <main className="flex-grow overflow-y-auto h-full p-4 md:p-8 lg:p-10 pb-24 md:pb-8 relative z-10">
        {children}
      </main>

      {isMobile && (
        <motion.nav
          variants={mobileContainerVariants}
          initial="hidden"
          animate="visible"
          className="fixed bottom-0 left-0 right-0 bg-[var(--bg-main)]/90 backdrop-blur-lg border-t border-zinc-200 py-2.5 px-4 flex justify-around items-center z-40 shadow-2xl"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                variants={mobileItemVariants}
                onClick={() => onTabChange(item.id)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors duration-200 relative py-1 px-3.5 rounded-xl ${
                  isActive ? "text-indigo-600 font-bold" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackgroundMobile"
                    className="absolute inset-0 bg-indigo-500/10 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <item.icon size={18} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </span>
              </motion.button>
            );
          })}
        </motion.nav>
      )}
    </div>
  );
}

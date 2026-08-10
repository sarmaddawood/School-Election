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
  Camera,
  Settings,
} from "lucide-react";
import { SchoolBranding, User as UserType } from "../types";
import ConfirmModal from "./ConfirmModal";
import ImageCropModal from "./ImageCropModal";

// @ts-ignore
import bolinaoLogo from "../assets/images/bolinao_logo_1783614038890.png";

interface AppShellProps {
  user: UserType;
  onLogout: () => void;
  token: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  onUserUpdate?: (updatedUser: UserType) => void;
  branding: SchoolBranding;
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
  onUserUpdate,
  branding,
}: AppShellProps) {
  const brandingLogo = branding.logoUrl && !branding.logoUrl.startsWith("/src/") ? branding.logoUrl : bolinaoLogo;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSaveProfilePhoto = async (croppedDataUrl: string, fileBlob?: Blob) => {
    try {
      let photoUrlToSave = croppedDataUrl;

      if (fileBlob) {
        try {
          const formData = new FormData();
          formData.append("file", fileBlob, "profile.jpg");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              photoUrlToSave = uploadData.url;
            }
          }
        } catch (uploadErr) {
          console.warn("Direct blob upload failed, falling back to server processing:", uploadErr);
        }
      }

      const res = await fetch(`/api/users/${user.id}/photo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoUrl: photoUrlToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile photo");
      }

      setSuccessNotification("Profile picture updated and saved!");
      if (onUserUpdate && data.user) {
        onUserUpdate(data.user);
      }
    } catch (err: any) {
      setErrorNotification(err.message || "Failed to update profile picture");
    }
  };

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
          { id: "branding", label: "School Branding", icon: Settings },
          { id: "diagnostics", label: "System Diagnostics", icon: Activity },
        ]
      : user.role === "teacher"
      ? [
          { id: "users", label: "Users Registry", icon: User },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ]
      : [
          { id: "vote", label: "Cast Ballot", icon: Vote },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ];

  return (
    <div className="h-[100dvh] w-full min-w-0 overflow-hidden grid grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto] bg-[var(--bg)] text-[var(--ink)] font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex justify-between items-center gap-2 px-3 py-2.5 bg-[#3498DB] text-white border-b border-white/20 shrink-0 relative z-30 safe-area-top">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 -ml-1 text-white">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img src={brandingLogo} alt={`${branding.schoolName} logo`} className="w-10 h-10 rounded-lg bg-white p-1 object-contain shadow-sm shrink-0" />
          <div className="font-display text-xs min-[380px]:text-sm font-bold uppercase text-white truncate">{branding.schoolName}</div>
        </div>
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30 overflow-hidden">
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
                className="absolute top-full right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 z-50 shadow-2xl text-[var(--ink)]"
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
                  className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-[var(--ink)] hover:bg-[var(--bg)] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Key size={13} />
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowConfirmLogout(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
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

      <aside className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:flex w-[280px] max-w-[86vw] md:max-w-none bg-[#3498DB] text-white border-r border-white/20 flex-col p-5 md:p-8 transition-transform duration-300 flex md:row-span-2 shadow-[4px_0_24px_rgba(52,152,219,0.2)] safe-area-y`}>
        <div className="mb-8 flex flex-col items-center text-center pb-6 border-b border-white/20">
            <div className="w-28 h-28 rounded-3xl bg-white p-3 mb-4 flex items-center justify-center border-2 border-white/30 shadow-lg shrink-0">
                <img src={brandingLogo} alt={`${branding.schoolName} logo`} className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="font-display font-bold text-xl uppercase leading-tight tracking-tight text-white">
                {branding.schoolName}
            </div>
            <span className="font-mono text-[0.7rem] text-amber-300 uppercase tracking-widest mt-2 font-semibold bg-black/20 px-2.5 py-0.5 rounded-full">
                {branding.tagline || "E-Voting Portal"}
            </span>
        </div>
        
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto min-h-0 pr-1 py-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold tracking-wide rounded-xl transition-all cursor-pointer border-none text-left ${
                  isActive 
                    ? "bg-[#E8F4FC] text-[var(--ink)] shadow-md font-bold" 
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                <item.icon size={18} className={isActive ? "opacity-100 text-[var(--secondary)]" : "opacity-80"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/20 relative hidden md:block">
            <div className="flex items-center gap-3 p-2.5 hover:bg-white/15 rounded-xl cursor-pointer transition-colors" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-[0.7rem] shrink-0 overflow-hidden shadow-inner">
                    {user.photoUrl && user.photoUrl !== "null" && user.photoUrl !== "" && user.photoUrl !== "undefined" ? (
                        <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                        user.fullName[0]
                    )}
                </div>
                <div className="text-[0.65rem] overflow-hidden flex-1">
                    <p className="font-bold uppercase truncate tracking-wider text-white">{user.fullName}</p>
                    <p className="text-blue-100 uppercase truncate tracking-wider mt-0.5">{user.role}</p>
                </div>
            </div>

            <AnimatePresence>
              {!isMobile && showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-3 w-full bg-white border border-[#3498DB]/20 rounded-2xl p-2 z-50 shadow-2xl text-[var(--ink)]"
                >
                  <button
                    onClick={() => {
                      setIsCropModalOpen(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-[var(--ink)] hover:bg-[#E8F4FC] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Camera size={13} />
                    Change Profile Picture
                  </button>
                  <button
                    onClick={() => {
                      onTabChange("password");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-[var(--ink)] hover:bg-[#E8F4FC] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Key size={13} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </aside>

      <main className="min-w-0 p-3 min-[380px]:p-4 md:p-8 xl:p-10 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(0,255,170,0.03),transparent)] relative min-h-0 safe-area-bottom">
        <header className="hidden md:flex justify-between items-end mb-12 shrink-0">
            <div>
                <h2 className="font-display text-4xl uppercase leading-none tracking-tight">ADMINISTRATION<br/>TELEMETRY</h2>
                <p className="text-sm opacity-50 max-w-[400px] mt-4">Real-time status updates, polling metrics, and registry logs across the centralized BSF system.</p>
            </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="flex md:col-start-2 px-4 md:px-10 py-2.5 md:py-4 border-t border-[var(--border)] font-mono text-[0.55rem] md:text-[0.6rem] opacity-50 justify-between gap-3 shrink-0 bg-[var(--bg)]">
        <span>{branding.attributionText}</span>
        <span>SECURITY PROTOCOL: v5.0 ENCRYPTED OFFLINE BALLOTS</span>
      </footer>

      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={onLogout}
      />

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropSave={async (croppedUrl, fileBlob) => {
          await handleSaveProfilePhoto(croppedUrl, fileBlob);
        }}
        title={`Crop Profile Picture for ${user.fullName}`}
      />
    </div>
  );
}

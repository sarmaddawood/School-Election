import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Info, Loader2, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { SchoolBranding, User } from "../types";
import HowToVoteModal from "./HowToVoteModal";
import bolinaoLogo from "../assets/images/bolinao_logo_1783614038890.png";

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  branding?: SchoolBranding;
}

async function readApiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const message = (await response.text()).trim();
  if (!response.ok) {
    throw new Error(message || `The login service returned HTTP ${response.status}. Please try again.`);
  }
  throw new Error("The login service returned an invalid response. Please try again.");
}

export default function LoginPage({
  onLoginSuccess,
  setErrorNotification,
  setSuccessNotification,
  branding,
}: LoginPageProps) {
  const brandingLogo = branding?.logoUrl && !branding.logoUrl.startsWith("/src/") ? branding.logoUrl : bolinaoLogo;
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHowToVote, setShowHowToVote] = useState(false);

  // First time password setup state
  const [passwordSetupData, setPasswordSetupData] = useState<{
    setupToken: string;
    studentNumber: string;
    fullName: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setErrorNotification("Please enter your username");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber: studentNumber.trim(), password }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.needsPasswordSetup) {
        setPasswordSetupData({
          setupToken: data.setupToken,
          studentNumber: data.user.studentNumber,
          fullName: data.user.fullName,
        });
        setSuccessNotification(`Welcome ${data.user.fullName}! As a first-time user, please create your password.`);
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorNotification(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setErrorNotification("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorNotification("Passwords do not match. Please verify and try again.");
      return;
    }

    setSetupLoading(true);
    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupToken: passwordSetupData?.setupToken,
          newPassword,
        }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to set password");
      }

      setSuccessNotification("Password created successfully! Logging you in...");
      setPasswordSetupData(null);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorNotification(err.message || "Failed to complete password setup");
    } finally {
      setSetupLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-sky-500/20 bg-[#0f172a]">
      {/* Full Screen Logo Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none">
        <img 
          src={brandingLogo}
          alt={`${branding?.schoolName || "Bolinao School of Fisheries"} logo background`} 
          className="w-full h-full object-cover opacity-20 filter brightness-110 scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-sky-950/80 to-slate-900/95 backdrop-blur-[3px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full max-w-[480px] my-auto"
      >
        <motion.div 
          variants={itemVariants}
          className="bg-slate-800/90 rounded-2xl sm:rounded-[28px] p-5 sm:p-9 shadow-2xl border border-white/20 text-white backdrop-blur-md"
        >
          <div className="text-center mb-6 flex flex-col items-center">
            <img 
              src={brandingLogo}
              alt={`${branding?.schoolName || "Bolinao School of Fisheries"} logo`} 
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain mb-3 drop-shadow-md" 
            />
            <span className="inline-block bg-sky-500/20 text-sky-200 font-mono text-[0.7rem] uppercase tracking-wider px-3.5 py-1 rounded-full font-bold mb-2 border border-sky-400/30">
              {branding?.tagline || "Bolinao School of Fisheries Student E-Voting Portal"}
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight mb-1.5">
              Welcome!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-sm">
              Log in with your official <strong className="text-white">username</strong> and password to access active elections.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-slate-200 font-bold text-xs uppercase tracking-wider block mb-1.5">
                USERNAME
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full p-3.5 px-4 border border-slate-600 rounded-xl text-base bg-slate-900/90 text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 transition-all placeholder:text-slate-500 font-mono shadow-inner"
              />
            </div>

            <div>
              <label className="label text-slate-200 font-bold text-xs uppercase tracking-wider block mb-1.5">
                PASSWORD
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter password (leave blank if first time)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 px-4 border border-slate-600 rounded-xl text-base bg-slate-900/90 text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 transition-all placeholder:text-slate-500 font-sans shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-sky-900/30 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>VERIFYING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <Key size={18} />
                  <span>LOG IN TO E-VOTING</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center flex flex-col min-[380px]:flex-row items-center justify-center gap-1.5 min-[380px]:gap-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowHowToVote(true)}
              className="text-slate-300 hover:text-white underline transition-opacity bg-transparent border-none cursor-pointer font-sans font-medium"
            >
              How to Vote Guide
            </button>
            <span>•</span>
            <span className="text-slate-400 font-mono">First time? Leave password blank</span>
          </div>
        </motion.div>
      </motion.div>

      {/* First Time Password Creation Modal */}
      {passwordSetupData && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-sky-500/40 rounded-2xl p-5 sm:p-8 max-w-md w-full my-auto shadow-2xl text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">First-Time Account Setup</h3>
                <p className="text-xs text-slate-400">Username: <span className="font-mono text-sky-300">{passwordSetupData.studentNumber}</span></p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              Welcome, <strong className="text-white">{passwordSetupData.fullName}</strong>! You are logging in for the first time. Please create a password to secure your account for future voting sessions.
            </p>

            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-sans outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  CONFIRM NEW PASSWORD
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-sans outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 text-sm"
                  required
                />
              </div>

              <div className="flex flex-col-reverse min-[380px]:flex-row min-[380px]:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordSetupData(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-900/30"
                >
                  {setupLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  <span>Save Password & Log In</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <HowToVoteModal isOpen={showHowToVote} onClose={() => setShowHowToVote(false)} />
    </div>
  );
}


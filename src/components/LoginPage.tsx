import React, { useState } from "react";
import { motion } from "motion/react";
import { Vote, Shield, UserCheck, AlertCircle, Loader2, Sparkles, Key, Info } from "lucide-react";
import { User } from "../types";
import HowToVoteModal from "./HowToVoteModal";

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

export default function LoginPage({
  onLoginSuccess,
  setErrorNotification,
  setSuccessNotification,
}: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showHowToVote, setShowHowToVote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorNotification("Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorNotification(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock-token-admin-1",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Seeding failed");
      }
      setUsername("admin");
      setPassword("ChangeMe!2026Vote");
      setSuccessNotification("Demo data seeded! Admin credentials filled.");
    } catch (err: any) {
      setErrorNotification(err.message || "Could not seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  // Stagger children config
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  const leftPanelVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 80, damping: 18 }
    }
  };

  const rightPanelVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 80, damping: 18 }
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden p-4 md:p-8 bg-[#F4F5F7]">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-5xl bg-white rounded-[24px] overflow-hidden grid md:grid-cols-12 relative z-10 min-h-[580px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200"
      >
        {/* Left pane - Branded Info Panel */}
        <motion.div
          variants={leftPanelVariants}
          className="md:col-span-6 bg-zinc-50 p-8 md:p-12 flex flex-col justify-between text-zinc-900 relative overflow-hidden border-r border-zinc-200"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-zinc-100/50 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 bg-indigo-500/10 rounded-2xl border border-violet-400/20 text-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.25)] cursor-pointer"
            >
              <Vote size={24} />
            </motion.div>
            <span className="font-display font-semibold text-xl tracking-tight text-gradient">
              E-Voting
            </span>
          </div>

          <div className="my-10 relative z-10 space-y-6">
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-none text-zinc-900"
            >
              The Next Gen <br />
              <motion.span
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% auto" }}
                className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent block mt-1"
              >
                E-Voting
              </motion.span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-zinc-700 text-sm md:text-base max-w-md leading-relaxed"
            >
              A secure, auditable, and beautiful digital polling system for school leadership elections. Cast your vote with confidence.
            </motion.p>

            <div className="pt-4 space-y-3.5">
              {[
                {
                  icon: Shield,
                  color: "text-indigo-600",
                  title: "Double-Vote Protection",
                  desc: "Rigorous election constraints prevent duplicates."
                },
                {
                  icon: UserCheck,
                  color: "text-emerald-500",
                  title: "Role-Based Access Control",
                  desc: "Dedicated portals for Admins, Teachers, and Students."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, x: 5, backgroundColor: "rgba(255,255,255,0.04)" }}
                  className="flex items-center gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 shadow-sm transition-colors"
                >
                  <feature.icon className={`${feature.color} shrink-0`} size={18} />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-900">{feature.title}</p>
                    <p className="text-zinc-500">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 5, backgroundColor: "rgba(139,92,246,0.15)" }}
                onClick={() => setShowHowToVote(true)}
                className="w-full text-left flex items-center gap-3 bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-200 shadow-sm transition-colors cursor-pointer"
              >
                <Info className="text-indigo-600 shrink-0" size={18} />
                <div className="text-xs">
                  <p className="font-semibold text-indigo-900">How to Vote Guide</p>
                  <p className="text-indigo-500/70">New? Learn how the digital voting process works.</p>
                </div>
              </motion.button>
            </div>
          </div>

          <motion.div
            variants={itemVariants}
            className="relative z-10 text-xs text-zinc-500 flex justify-between items-center border-t border-zinc-200 pt-4"
          >
            <span>© 2026 E-Voting Inc.</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              All Data Encrypted
            </span>
          </motion.div>
        </motion.div>

        {/* Right pane - Interactive Sign In */}
        <motion.div
          variants={rightPanelVariants}
          className="md:col-span-6 p-8 md:p-12 flex flex-col justify-between bg-white backdrop-blur-sm"
        >
          <div className="max-w-md w-full mx-auto space-y-6 my-auto">
            <motion.div variants={itemVariants} className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-zinc-900 tracking-tight">
                Sign in to vote
              </h2>
              <p className="text-zinc-500 text-sm">
                Enter your credentials to access the secure ballot board.
              </p>
            </motion.div>

            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                  Username / Roll Number
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01, borderColor: "rgba(79, 70, 229, 0.4)" }}
                  type="text"
                  placeholder="e.g. admin or student1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm text-zinc-900 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">
                  Password
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01, borderColor: "rgba(79, 70, 229, 0.4)" }}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm text-zinc-900 transition-all outline-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Sign In Securely
                  </>
                )}
              </motion.button>
            </motion.form>

            <motion.div variants={itemVariants} className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                Quick Testing
              </span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.01, borderColor: "rgba(255,255,255,0.1)" }}
              className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-md transition-all"
            >
              <div className="flex gap-2">
                <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                <p className="text-xs text-zinc-700 leading-relaxed">
                  Want to preview the full system immediately? Click below to seed sample student/teacher accounts and load an active demo election.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(139,92,246,0.15)" }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSeedDemo}
                disabled={seeding}
                className="w-full py-2.5 bg-indigo-500/10 text-indigo-500 disabled:bg-zinc-50 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer"
              >
                {seeding ? (
                  <>
                    <Loader2 className="animate-spin" size={12} />
                    Seeding system data...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    Seed Demo Data & Autofill Admin
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      <HowToVoteModal isOpen={showHowToVote} onClose={() => setShowHowToVote(false)} />
    </div>
  );
}

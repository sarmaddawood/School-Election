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
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden p-4 md:p-8 bg-[#0D0D0E] font-mono text-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-5xl bg-[#161618] rounded-none overflow-hidden grid md:grid-cols-12 relative z-10 min-h-[580px] border border-[rgba(255,255,255,0.12)] shadow-2xl"
      >
        {/* Left pane - Branded Info Panel */}
        <motion.div
          variants={leftPanelVariants}
          className="md:col-span-6 bg-[#0D0D0E] p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden border-r border-[rgba(255,255,255,0.12)]"
        >
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0D0D0E] to-[#0D0D0E] pointer-events-none opacity-20" />
          
          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 bg-[#E6FE52]/10 rounded-sm border border-[#E6FE52]/30 text-[#E6FE52] shadow-[0_0_15px_rgba(230,254,82,0.15)] cursor-pointer"
            >
              <Vote size={24} />
            </motion.div>
            <span className="font-display font-black text-xl tracking-wider text-[#E6FE52] uppercase">
              EV-BOARD
            </span>
          </div>

          <div className="my-10 relative z-10 space-y-6">
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl md:text-5xl font-black tracking-wider leading-none text-white uppercase"
            >
              SECURE <br />
              <motion.span
                className="text-[#E6FE52] block mt-1"
              >
                E-VOTING
              </motion.span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-[rgba(255,255,255,0.6)] text-xs md:text-sm max-w-md leading-relaxed"
            >
              A high-integrity, real-time, digital voting platform with Zero-Trust constraints and auditable verification logs.
            </motion.p>

            <div className="pt-4 space-y-3.5">
              {[
                {
                  icon: Shield,
                  color: "text-[#E6FE52]",
                  title: "Double-Vote Protection",
                  desc: "Enforced via distributed multi-write atomic transactions."
                },
                {
                  icon: UserCheck,
                  color: "text-[#E6FE52]",
                  title: "Role-Based Integrity",
                  desc: "Strict sandbox isolations for Admin, Teacher, and Voter entries."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center gap-3 bg-[#161618] p-3.5 rounded-none border border-[rgba(255,255,255,0.08)] shadow-sm transition-colors"
                >
                  <feature.icon className={`${feature.color} shrink-0`} size={18} />
                  <div className="text-[10px]">
                    <p className="font-bold uppercase tracking-wider text-white">{feature.title}</p>
                    <p className="text-[rgba(255,255,255,0.45)] mt-0.5">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.01, x: 4 }}
                onClick={() => setShowHowToVote(true)}
                className="w-full text-left flex items-center gap-3 bg-[rgba(230,254,82,0.05)] p-3.5 rounded-none border border-[#E6FE52]/30 shadow-sm cursor-pointer transition-all"
              >
                <Info className="text-[#E6FE52] shrink-0" size={18} />
                <div className="text-[10px]">
                  <p className="font-bold uppercase tracking-wider text-[#E6FE52]">How to Vote Guide</p>
                  <p className="text-[rgba(255,255,255,0.5)] mt-0.5">Understand the cryptographic ballot and candidate selection.</p>
                </div>
              </motion.button>
            </div>
          </div>

          <motion.div
            variants={itemVariants}
            className="relative z-10 text-[9px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] flex justify-between items-center border-t border-[rgba(255,255,255,0.1)] pt-4"
          >
            <span>SYS_VER_2.0.4</span>
            <span className="flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6FE52] animate-ping" />
              AES_256_ACTIVE
            </span>
          </motion.div>
        </motion.div>

        {/* Right pane - Interactive Sign In */}
        <motion.div
          variants={rightPanelVariants}
          className="md:col-span-6 p-8 md:p-12 flex flex-col justify-between bg-[#161618]"
        >
          <div className="max-w-md w-full mx-auto space-y-6 my-auto">
            <motion.div variants={itemVariants} className="space-y-2">
              <span className="text-[9px] font-bold text-[#E6FE52] tracking-widest uppercase">AUTH_SERVICE_01</span>
              <h2 className="font-display text-2xl font-black text-white uppercase tracking-wider">
                SIGN IN TO BALLOT
              </h2>
              <p className="text-[rgba(255,255,255,0.45)] text-xs">
                Provide secure login key and registration username.
              </p>
            </motion.div>
 
            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                  Username / Roll Number
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  placeholder="e.g. admin or student1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white transition-all outline-none focus:border-[#E6FE52]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                  Password Key
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white transition-all outline-none focus:border-[#E6FE52]"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E6FE52] hover:bg-[#d6ec3d] disabled:bg-[#a6b44c] text-black rounded-none font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    VERIFYING_KEY...
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    AUTHORIZE_SESSION
                  </>
                )}
              </motion.button>
            </motion.form>

            <motion.div variants={itemVariants} className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[rgba(255,255,255,0.1)]"></div>
              <span className="flex-shrink mx-4 text-[rgba(255,255,255,0.35)] text-[9px] uppercase tracking-widest font-black">
                QUICK_SEED
              </span>
              <div className="flex-grow border-t border-[rgba(255,255,255,0.1)]"></div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-[#0D0D0E] rounded-none border border-[rgba(255,255,255,0.1)] p-4 space-y-3"
            >
              <div className="flex gap-2">
                <Sparkles size={16} className="text-[#E6FE52] shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] text-[rgba(255,255,255,0.6)] leading-relaxed">
                  Want to preview the full system immediately? Click below to seed 100 sample student/teacher accounts and load an active demo election.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.01, backgroundColor: "rgba(230,254,82,0.12)" }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSeedDemo}
                disabled={seeding}
                className="w-full py-2.5 bg-transparent text-[#E6FE52] disabled:text-[rgba(255,255,255,0.3)] rounded-none font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-[#E6FE52]/40 cursor-pointer"
              >
                {seeding ? (
                  <>
                    <Loader2 className="animate-spin" size={12} />
                    SEEDING_DATABASE...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    SEED_DEMO_DATA
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

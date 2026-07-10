import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Info, Loader2 } from "lucide-react";
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
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)] font-sans flex items-center justify-center p-6 md:p-12 selection:bg-[var(--accent)]/10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_2px_1fr] gap-12 lg:gap-16 items-center"
      >
        {/* Left Side: Brand Hero */}
        <motion.div variants={itemVariants} className="flex flex-col justify-center">
          
          <h1 className="font-display text-7xl md:text-8xl lg:text-[8.5rem] font-light leading-[0.85] tracking-tight text-[var(--ink)] mb-8">
            Campus<br />Ballot
          </h1>
          
          <p className="max-w-[440px] text-sm text-[var(--ink)]/80 leading-relaxed font-sans">
            A high-integrity, real-time, digital voting platform with Zero-Trust constraints and auditable verification logs.
          </p>

          <div className="mt-12 text-[10px] tracking-[0.15em] text-[var(--ink)]/40 font-mono uppercase hidden lg:block">
            VER 2.0.4.R32 // academic standard
          </div>
        </motion.div>

        {/* Middle Line Divider */}
        <motion.div 
          variants={itemVariants}
          className="hidden lg:block bg-[var(--ink)]/10 self-stretch w-[1px] my-4"
        />

        {/* Right Side: Auth Panel */}
        <motion.div variants={itemVariants} className="w-full">
          <div className="border border-[var(--ink)]/10 p-8 md:p-12 bg-[var(--surface)]/50 backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
            <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--accent)] mb-8 uppercase">
              Authenticate Identity
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="USERNAME / ROLL NUMBER"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border border-[var(--ink)]/20 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 outline-none p-4 font-mono text-xs tracking-wider transition-all placeholder:text-[var(--ink)]/30"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="PASSWORD KEY"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-[var(--ink)]/20 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 outline-none p-4 font-mono text-xs tracking-wider transition-all placeholder:text-[var(--ink)]/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] font-mono font-bold p-4 text-xs tracking-[0.15em] uppercase cursor-pointer transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    AUTHORIZING_SESSION...
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    Authorize Session
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-[var(--ink)]/10 flex justify-center">
              <div
                onClick={() => setShowHowToVote(true)}
                className="flex items-center justify-center gap-2 text-[10px] text-[var(--accent)] uppercase tracking-[0.15em] hover:text-[var(--ink)] transition-colors cursor-pointer select-none font-mono font-bold"
              >
                <Info size={12} />
                How to Vote Guide
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <HowToVoteModal isOpen={showHowToVote} onClose={() => setShowHowToVote(false)} />
    </div>
  );
}

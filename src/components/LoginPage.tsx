import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Info, Loader2 } from "lucide-react";
import { User } from "../types";
import HowToVoteModal from "./HowToVoteModal";
import bolinaoLogo from "../assets/images/bolinao_logo_1783614038890.jpg";

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
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-[var(--secondary)]/15 bg-[#1a2b48]">
      {/* Full Screen Logo Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none">
        <img 
          src={bolinaoLogo} 
          alt="Bolinao School of Fisheries Background Logo" 
          className="w-full h-full object-cover opacity-25 filter brightness-110 scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2b48]/90 via-[#3498DB]/80 to-[#1a2b48]/95 backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full max-w-[460px] my-auto"
      >
        <motion.div 
          variants={itemVariants}
          className="bg-[#3498DB]/90 rounded-[28px] p-8 sm:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] border border-white/25 text-white backdrop-blur-md"
        >
          <div className="text-center mb-6">
            <span className="inline-block bg-white/20 text-white font-mono text-[0.65rem] uppercase tracking-widest px-3.5 py-1 rounded-full font-bold mb-3 border border-white/20 shadow-sm">
              BSF E-Voting Portal
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight mb-2">
              Welcome!
            </h1>
            <p className="text-sm text-blue-100 font-medium leading-relaxed">
              Welcome to Bolinao School of Fisheries E-Voting System. Please enter your credentials to authorize your session.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-white/90 font-bold text-xs uppercase tracking-wider block mb-1.5">
                IDENTITY
              </label>
              <input
                type="text"
                placeholder="USER ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3.5 px-4 border-2 border-white/20 rounded-xl text-base bg-white text-[var(--ink)] outline-none focus:border-white focus:ring-4 focus:ring-white/20 transition-all placeholder:text-[var(--ink)]/40 font-sans shadow-inner"
              />
            </div>

            <div>
              <label className="label text-white/90 font-bold text-xs uppercase tracking-wider block mb-1.5">
                CREDENTIAL
              </label>
              <input
                type="password"
                placeholder="SECRET KEY"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 px-4 border-2 border-white/20 rounded-xl text-base bg-white text-[var(--ink)] outline-none focus:border-white focus:ring-4 focus:ring-white/20 transition-all placeholder:text-[var(--ink)]/40 font-sans shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-[var(--ink)] hover:bg-[#111e33] text-white border-none rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>AUTHORIZING SESSION...</span>
                </>
              ) : (
                <>
                  <Key size={18} />
                  <span>AUTHORIZE SESSION</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowHowToVote(true)}
              className="text-xs text-white/90 underline hover:text-white transition-opacity bg-transparent border-none cursor-pointer font-sans font-medium"
            >
              How to Vote Guide
            </button>
          </div>
        </motion.div>
      </motion.div>

      <HowToVoteModal isOpen={showHowToVote} onClose={() => setShowHowToVote(false)} />
    </div>
  );
}

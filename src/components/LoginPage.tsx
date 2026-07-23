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
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)] font-sans flex items-center justify-center p-4 sm:p-6 md:p-12 selection:bg-[var(--secondary)]/15">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-[420px] my-auto"
      >
        <motion.div 
          variants={itemVariants}
          className="bg-[var(--surface)] rounded-[24px] p-8 shadow-[0_20px_40px_-10px_rgba(26,43,72,0.1)] border border-[rgba(26,43,72,0.08)]"
        >
          <div className="text-center mb-8 flex flex-col items-center">
            <img src={bolinaoLogo} alt="BSF Logo" className="w-16 h-16 object-contain mb-3 mix-blend-multiply" />
            <h1 className="font-display font-bold text-4xl text-[var(--ink)] tracking-tight leading-tight mb-2">
              BSF E-Voting
            </h1>
            <p className="text-sm text-[var(--ink)]/70 font-medium">
              Secure, Transparent, Digital Voting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">IDENTITY</label>
              <input
                type="text"
                placeholder="USER ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 px-4 border-2 border-[#E2E8F0] rounded-xl text-base bg-white text-[var(--ink)] outline-none focus:border-[var(--secondary)] focus:ring-4 focus:ring-[#3498DB]/10 transition-all placeholder:text-[var(--ink)]/35 font-sans"
              />
            </div>

            <div>
              <label className="label">CREDENTIAL</label>
              <input
                type="password"
                placeholder="SECRET KEY"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 px-4 border-2 border-[#E2E8F0] rounded-xl text-base bg-white text-[var(--ink)] outline-none focus:border-[var(--secondary)] focus:ring-4 focus:ring-[#3498DB]/10 transition-all placeholder:text-[var(--ink)]/35 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3.5 bg-[var(--accent)] hover:opacity-90 text-white border-none rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowHowToVote(true)}
              className="text-xs text-[var(--ink)] underline hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer font-sans"
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

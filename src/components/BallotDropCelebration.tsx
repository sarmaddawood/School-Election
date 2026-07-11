import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Sparkles, Check, Lock, Database, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ConfettiParticle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  fallY: number;
  sway: number;
  color: string;
  size: number;
  rotate: number;
  delay: number;
  duration: number;
  shape: "circle" | "square" | "triangle" | "star" | "ribbon";
}

interface BallotDropCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  positionName: string;
}

export default function BallotDropCelebration({
  isOpen,
  onClose,
  candidateName,
  positionName,
}: BallotDropCelebrationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [step, setStep] = useState<"floating" | "dropping" | "burst" | "secured">("floating");
  const [auditHash, setAuditHash] = useState("");

  const colors = [
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#a855f7", // Purple
  ];

  useEffect(() => {
    if (isOpen) {
      setStep("floating");
      
      // Generate unique cryptographic hash for this "ballot audit"
      const chars = "ABCDEF0123456789";
      let hash = "SHA256-VOTE-";
      for (let i = 0; i < 16; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
      }
      setAuditHash(hash);

      // Transition timeline for physical ballot dropping simulation
      const dropTimer = setTimeout(() => {
        setStep("dropping");
      }, 1500);

      const burstTimer = setTimeout(() => {
        setStep("burst");
        // Generate particles
        const list: ConfettiParticle[] = [];
        const shapes: ("circle" | "square" | "triangle" | "star" | "ribbon")[] = [
          "circle",
          "square",
          "triangle",
          "star",
          "ribbon",
        ];
        const extendedColors = [
          "#8b5cf6", // Violet
          "#ec4899", // Pink
          "#3b82f6", // Blue
          "#10b981", // Emerald
          "#f59e0b", // Amber
          "#a855f7", // Purple
          "#06b6d4", // Cyan
          "#f43f5e", // Rose
          "#e9d5ff", // Light purple
          "#fbbf24", // Gold
          "#34d399", // Mint
          "#ffffff", // Sparkle White
        ];

        let idCounter = 0;

        // 1. Central Ballot Box Burst (from slot)
        for (let i = 0; i < 65; i++) {
          list.push({
            id: idCounter++,
            startX: 0,
            startY: 120,
            endX: (Math.random() - 0.5) * 420, // wide horizontal launch spread
            endY: -100 - Math.random() * 320,  // high upward vertical launch
            fallY: 220 + Math.random() * 260,  // falling down
            sway: (Math.random() - 0.5) * 120, // side-to-side flutter
            color: extendedColors[Math.floor(Math.random() * extendedColors.length)],
            size: Math.random() * 9 + 6,        // varying sizes
            rotate: Math.random() * 720 - 360, // multiple complete rotations
            delay: Math.random() * 0.12,       // slight stagger
            duration: Math.random() * 1.8 + 1.4, // float duration
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }

        // 2. Left Side Cannon (diagonal shoot-in)
        for (let i = 0; i < 35; i++) {
          list.push({
            id: idCounter++,
            startX: -380,
            startY: 280,
            endX: -180 + Math.random() * 320,  // shoot inward to the right
            endY: -80 - Math.random() * 260,   // shoot upward
            fallY: 220 + Math.random() * 260,  // fall down
            sway: 40 + Math.random() * 80,     // drift rightward
            color: extendedColors[Math.floor(Math.random() * extendedColors.length)],
            size: Math.random() * 10 + 5,
            rotate: Math.random() * 720 - 360,
            delay: 0.1 + Math.random() * 0.2,  // staggered delay
            duration: Math.random() * 2.0 + 1.5,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }

        // 3. Right Side Cannon (diagonal shoot-in)
        for (let i = 0; i < 35; i++) {
          list.push({
            id: idCounter++,
            startX: 380,
            startY: 280,
            endX: 180 - Math.random() * 320,   // shoot inward to the left
            endY: -80 - Math.random() * 260,   // shoot upward
            fallY: 220 + Math.random() * 260,  // fall down
            sway: -40 - Math.random() * 80,    // drift leftward
            color: extendedColors[Math.floor(Math.random() * extendedColors.length)],
            size: Math.random() * 10 + 5,
            rotate: Math.random() * 720 - 360,
            delay: 0.1 + Math.random() * 0.2,  // staggered delay
            duration: Math.random() * 2.0 + 1.5,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }

        setParticles(list);
      }, 2600);

      const securedTimer = setTimeout(() => {
        setStep("secured");
      }, 3400);

      return () => {
        clearTimeout(dropTimer);
        clearTimeout(burstTimer);
        clearTimeout(securedTimer);
      };
    } else {
      setParticles([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 md:p-6 scroll-smooth select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[var(--ink)] backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          layout
          className="relative w-full max-w-sm flex flex-col items-center my-auto py-8"
        >
          {/* Confetti particles container */}
          {step === "burst" || step === "secured" ? (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    x: p.startX,
                    y: p.startY,
                    scale: 0.1,
                    rotate: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: [p.startX, p.endX, p.endX + p.sway],
                    y: [p.startY, p.endY, p.fallY],
                    rotate: [0, p.rotate / 2, p.rotate],
                    opacity: [1, 1, 0.8, 0],
                    scale: [0.1, 1.2, 1, 0.4],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    times: [0, 0.3, 1], // rapid launch, then slow fall
                    ease: "easeOut",
                  }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: p.shape === "ribbon" ? p.size * 0.4 : p.size,
                    height: p.shape === "ribbon" ? p.size * 1.5 : p.size,
                    backgroundColor: p.color,
                    borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0px",
                    clipPath: p.shape === "triangle"
                      ? "polygon(50% 0%, 0% 100%, 100% 100%)"
                      : p.shape === "star"
                      ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                      : "none",
                    transform: "translate(-50%, -50%)",
                    boxShadow: p.shape === "star" ? `0 0 10px ${p.color}` : "none",
                  }}
                />
              ))}
            </div>
          ) : null}

          {/* Core Interactive Stage */}
          <div className="w-full relative flex flex-col items-center justify-center z-10">
            {/* The Digital Ballot Box */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl relative flex flex-col items-center justify-center space-y-6 overflow-hidden"
            >
              {/* Status ring overlay */}
              <div className="relative">
                <motion.div
                  animate={
                    step === "dropping"
                      ? { rotate: 360 }
                      : step === "burst" || step === "secured"
                      ? { scale: [1, 1.1, 1], borderColor: "var(--accent)" }
                      : {}
                  }
                  transition={step === "dropping" ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.5 }}
                  className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-colors ${
                    step === "burst" || step === "secured"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--bg)] text-zinc-400"
                  }`}
                >
                  {step === "burst" || step === "secured" ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    >
                      <Check size={40} />
                    </motion.div>
                  ) : (
                    <Database size={32} className={step === "dropping" ? "animate-pulse" : ""} />
                  )}
                </motion.div>

                {/* Shockwave circle during slot insertion */}
                {step === "burst" && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-[var(--accent)] pointer-events-none"
                  />
                )}
              </div>

              <div className="text-center space-y-2 z-10">
                <p className="text-lg font-display font-bold text-[var(--ink)]">
                  {step === "floating" && "Preparing Ballot..."}
                  {step === "dropping" && "Casting Vote..."}
                  {step === "burst" && "Vote Accepted!"}
                  {step === "secured" && "Vote Successfully Cast"}
                </p>
                
                {step !== "secured" && (
                   <p className="text-sm text-zinc-500">
                     Recording your selection for {positionName}
                   </p>
                )}
              </div>

              <AnimatePresence>
                {step === "secured" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full pt-4 border-t border-[var(--border)]"
                  >
                    <div className="space-y-3 text-center mb-6">
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        You have successfully voted for <span className="font-bold text-[var(--ink)]">{candidateName}</span> for {positionName}.
                      </p>
                      <div className="inline-block bg-[var(--bg)] rounded-lg px-4 py-2 border border-[var(--border)]">
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                          Receipt: {auditHash.substring(0, 16)}...
                        </span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="w-full py-3.5 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-lg shadow-[var(--accent-soft)] cursor-pointer"
                    >
                      Close & Continue
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

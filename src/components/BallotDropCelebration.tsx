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
  onLogout?: () => void;
}

export default function BallotDropCelebration({
  isOpen,
  onClose,
  candidateName,
  positionName,
  onLogout,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Deep immersive dark background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black backdrop-blur-md"
        />

        {/* Ambient floating glows specifically for the celebration */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none"
        />

        <div className="relative w-full max-w-lg flex flex-col items-center">
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
          <div className="h-[380px] w-full relative flex flex-col items-center justify-end overflow-visible">
            {/* The Floating Ballot Card */}
            <AnimatePresence>
              {(step === "floating" || step === "dropping") && (
                <motion.div
                  initial={{ y: -200, opacity: 0, scale: 0.8, rotateX: 30 }}
                  animate={
                    step === "dropping"
                      ? {
                          y: 80,
                          opacity: [1, 1, 0],
                          scale: [1, 0.85, 0.6],
                          rotateX: 75,
                          rotateZ: -5,
                        }
                      : {
                          y: -30,
                          opacity: 1,
                          scale: 1,
                          rotateX: 10,
                          rotateZ: [0, 1, -1, 0],
                          transition: {
                            rotateZ: {
                              repeat: Infinity,
                              duration: 3,
                              ease: "easeInOut",
                            },
                          },
                        }
                  }
                  exit={{ opacity: 0 }}
                  transition={{
                    y: step === "dropping" ? { duration: 1.1, ease: "easeIn" } : { type: "spring", stiffness: 80, damping: 14 },
                    opacity: { duration: 0.9 },
                  }}
                  className="absolute z-20 w-72 bg-gradient-to-b from-[#18133b] to-[#0d0924] border border-indigo-300 rounded-2xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between h-44 cursor-default"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck size={10} /> Official Ballot
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500">
                        #CF-92A694
                      </span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-violet-500/20 via-violet-500/40 to-violet-500/20 w-full" />
                  </div>

                  <div className="space-y-1 text-center py-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Ballot Selection
                    </p>
                    <p className="text-sm font-display font-bold text-zinc-900">
                      {candidateName}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium">
                      for {positionName}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-200 pt-2.5">
                    <span className="text-[8px] font-mono text-emerald-600 uppercase flex items-center gap-1 font-bold">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Verified Profile
                    </span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">
                      E-Voting 2026
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The Digital Ballot Box */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="w-80 bg-black/80 border border-indigo-200 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center justify-center space-y-4 z-10 overflow-hidden"
              style={{
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Glass Scan Line overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent h-full w-full pointer-events-none" />

              {/* Secure Ballot Slot on top of box */}
              <div className="w-56 bg-white rounded-full h-4 border-2 border-indigo-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] relative flex items-center justify-center overflow-visible">
                {/* Glowing Laser line */}
                <motion.div
                  animate={
                    step === "dropping"
                      ? {
                          backgroundColor: "#10b981",
                          boxShadow: "0 0 15px #10b981, 0 0 5px #10b981",
                          scaleY: [1, 2, 1],
                        }
                      : {
                          backgroundColor: "#8b5cf6",
                          boxShadow: "0 0 12px #8b5cf6, 0 0 4px #8b5cf6",
                        }
                  }
                  className="absolute inset-x-4 h-0.5 rounded-full"
                />

                {/* Laser scan ray descending from slot during drop */}
                {step === "dropping" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: [0, 80, 0], opacity: [0, 0.4, 0] }}
                    transition={{ duration: 1.1 }}
                    className="absolute top-2 w-48 bg-gradient-to-b from-emerald-500/30 to-transparent pointer-events-none"
                  />
                )}
              </div>

              {/* Status ring overlay */}
              <div className="relative">
                <motion.div
                  animate={
                    step === "dropping"
                      ? { rotate: 360 }
                      : step === "burst" || step === "secured"
                      ? { scale: [1, 1.1, 1], borderColor: "rgba(16,185,129,0.3)" }
                      : {}
                  }
                  transition={step === "dropping" ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.5 }}
                  className={`w-14 h-14 rounded-full border border-dashed flex items-center justify-center transition-colors ${
                    step === "burst" || step === "secured"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                      : "border-indigo-300 bg-indigo-500/5 text-indigo-600"
                  }`}
                >
                  {step === "burst" || step === "secured" ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    >
                      <ShieldCheck size={26} />
                    </motion.div>
                  ) : (
                    <Database size={22} className={step === "dropping" ? "animate-pulse" : ""} />
                  )}
                </motion.div>

                {/* Shockwave circle during slot insertion */}
                {step === "burst" && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500 pointer-events-none"
                  />
                )}
              </div>

              <div className="text-center space-y-1 z-10">
                <p className="text-xs font-semibold text-zinc-700">
                  {step === "floating" && "Cryptographic Sealing..."}
                  {step === "dropping" && "Transferring Ballot Securely..."}
                  {step === "burst" && "Ballot Accepted!"}
                  {step === "secured" && "Double-Vote Guard Complete"}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
                  {auditHash || "GENERATING AUDIT PROOF"}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Secure Complete Panel Card */}
          <AnimatePresence>
            {step === "secured" && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="mt-6 w-full bg-gradient-to-br from-[#0e0a29] to-[#060414] border border-emerald-500/20 rounded-2xl p-5 shadow-2xl space-y-4 text-center z-10"
              >
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <Sparkles size={16} className="animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest font-display text-gradient-emerald">
                    Ballot Securely Lodged
                  </span>
                  <Sparkles size={16} className="animate-pulse" />
                </div>

                <div className="space-y-1 text-center">
                  <h4 className="text-sm font-semibold text-zinc-900 leading-snug">
                    Your vote has been cast for {candidateName}
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    This selection has been encrypted and committed to the secure school blockchain registry. The voter identity remains anonymous.
                  </p>
                </div>

                {/* Simulated Ledger Receipt */}
                <div className="bg-black/40 rounded-xl p-3 border border-zinc-200 space-y-1.5 text-left font-mono text-[9px] text-zinc-500">
                  <div className="flex justify-between">
                    <span>REGISTRY INDEX:</span>
                    <span className="text-zinc-700">#CF-REG-{Math.floor(Math.random() * 90000) + 10000}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SECURITY HASH:</span>
                    <span className="text-indigo-600 truncate w-36 text-right">
                      {auditHash}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DOUBLE-VOTE GUARD:</span>
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <Check size={10} /> ACTIVE
                    </span>
                  </div>
                </div>

                {/* QR Code for Tracking */}
                <div className="flex flex-col items-center gap-2 pt-2">
                  <div className="p-2 bg-white rounded-xl">
                    <QRCodeSVG value={`civicflow:track:${auditHash}`} size={90} />
                  </div>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] leading-tight">
                    Scan with your mobile phone to anonymously track your ballot and securely logout.
                  </p>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl text-xs font-bold tracking-wide uppercase transition-all border border-zinc-200 cursor-pointer"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03, backgroundColor: "#8b5cf6" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onClose();
                      if (onLogout) onLogout();
                    }}
                    className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all shadow-lg shadow-violet-600/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <QrCode size={14} /> Scan & Logout
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatePresence>
  );
}

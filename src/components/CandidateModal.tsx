import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Flag } from "lucide-react";
import { Candidate, Position } from "../types";

interface CandidateModalProps {
  candidate: Candidate | null;
  positionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateModal({ candidate, positionName, isOpen, onClose }: CandidateModalProps) {
  if (!candidate) return null;

  // Generate a pseudo-random party color based on the candidate's ID
  const hash = candidate.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-600",
    "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-600",
    "from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-600",
    "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-600",
    "from-violet-500/20 to-purple-500/20 border-indigo-300 text-indigo-600",
  ];
  
  const partyNames = [
    "Progressive Student Union",
    "Campus Reform Coalition",
    "Future Leaders Initiative",
    "United Students Alliance",
    "Independent",
  ];

  const colorClass = colors[hash % colors.length];
  const partyName = partyNames[hash % partyNames.length];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 p-4"
          >
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 relative flex flex-col max-h-[85vh]">
              {/* Background Party Header */}
              <div className={`h-32 w-full bg-gradient-to-br ${colorClass.split(" ")[0]} ${colorClass.split(" ")[1]} relative`}>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-zinc-900 rounded-full transition-colors backdrop-blur-md"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photo Placeholder */}
              <div className="px-6 pb-6 pt-0 relative flex-1 overflow-y-auto">
                <div className="flex justify-between items-end -mt-12 mb-4 relative z-10">
                  <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white flex items-center justify-center shadow-xl overflow-hidden relative">
                    {candidate.photoUrl ? (
                      <img src={candidate.photoUrl} alt={candidate.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
                        <User size={40} className="text-zinc-400" />
                      </>
                    )}
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border bg-black/40 backdrop-blur-md flex items-center gap-2 mb-2 ${colorClass.split(" ").slice(2).join(" ")}`}>
                    <Flag size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{partyName}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-display font-semibold text-zinc-900 tracking-tight leading-tight">
                      {candidate.fullName}
                    </h2>
                    <p className="text-sm font-medium text-indigo-600 mt-1 uppercase tracking-wider text-[11px]">
                      Candidate for {positionName}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-2">
                      Campaign Platform & Manifesto
                    </h3>
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                      {candidate.manifesto || "No campaign platform details provided."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

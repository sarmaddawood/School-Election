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

  const displayParty = (candidate.partyListName || candidate.party || "Independent").toUpperCase();
  const isIndependent = displayParty === "INDEPENDENT";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
          >
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[85vh]">
              {/* Header Banner */}
              <div className="h-28 w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 relative p-4 flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
                  Candidate Profile
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photo & Identity */}
              <div className="px-6 pb-6 pt-0 relative flex-1 overflow-y-auto">
                <div className="flex justify-between items-end -mt-12 mb-4 relative z-10">
                  <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white flex items-center justify-center shadow-xl overflow-hidden relative">
                    {candidate.photoUrl && candidate.photoUrl !== "null" && candidate.photoUrl !== "" && candidate.photoUrl !== "undefined" ? (
                      <img src={candidate.photoUrl} alt={candidate.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-sky-50 flex items-center justify-center font-black text-3xl text-sky-600">
                        {candidate.fullName[0]}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm text-xs font-bold uppercase tracking-wider ${
                    isIndependent
                      ? "bg-slate-100 border-slate-200 text-slate-700"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  }`}>
                    <Flag size={13} className={isIndependent ? "text-slate-500" : "text-indigo-600"} />
                    <span>{displayParty}</span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                      {candidate.fullName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                        Candidate for {positionName}
                      </span>
                      {candidate.yearLevel && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-500">
                            Grade {candidate.yearLevel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      Campaign Platform & Manifesto
                    </h3>
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                        "{candidate.manifesto || "No campaign platform details provided."}"
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

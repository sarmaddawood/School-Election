import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Loader2, X, AlertTriangle, User, Award, Flag, Calendar } from "lucide-react";
import { Candidate, Position, Election } from "../types";

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidate: Candidate | null;
  position: Position | null;
  election: Election | null;
  isSubmitting: boolean;
}

export default function VoteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  candidate,
  position,
  election,
  isSubmitting,
}: VoteConfirmationModalProps) {
  if (!isOpen || !candidate || !position || !election) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            id="vote-confirmation-backdrop"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#161618] max-w-lg w-full border border-[rgba(255,255,255,0.15)] rounded-none p-6 md:p-8 space-y-6 relative text-white font-mono shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              id="vote-confirmation-modal-box"
            >
              {/* Close Button */}
              {!isSubmitting && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-[#E6FE52] transition-colors cursor-pointer"
                  aria-label="Close confirmation"
                  id="vote-confirmation-close-btn"
                >
                  <X size={16} />
                </button>
              )}

              {/* Warning Header Accent */}
              <div className="flex flex-col items-center text-center space-y-3 pb-2 border-b border-[rgba(255,255,255,0.1)]">
                <div className="h-14 w-14 bg-[#E6FE52]/10 text-[#E6FE52] border border-[#E6FE52]/30 flex items-center justify-center shadow-[0_0_15px_rgba(230,254,82,0.15)] animate-pulse">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#E6FE52] tracking-widest uppercase">BALLOT_VALIDATION_STATION</span>
                  <h3 className="font-display font-black text-white text-lg tracking-wider uppercase mt-1">
                    Confirm Your Selection
                  </h3>
                  <p className="text-[10px] text-[rgba(255,255,255,0.45)] uppercase tracking-wider mt-1">
                    Audit election parameters and nominee credentials below.
                  </p>
                </div>
              </div>

              {/* Structured Ballot Sheet details */}
              <div className="space-y-4">
                {/* Election info */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#E6FE52] uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={11} />
                    ELECTION_LEDGER
                  </span>
                  <div className="bg-[#0D0D0E] border border-[rgba(255,255,255,0.08)] p-3 text-xs font-bold text-white uppercase tracking-wider">
                    {election.title}
                  </div>
                </div>

                {/* Position info */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#E6FE52] uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={11} />
                    TARGET_OFFICE_NOMINATED
                  </span>
                  <div className="bg-[#0D0D0E] border border-[rgba(255,255,255,0.08)] p-3 text-xs font-bold text-[#E6FE52] uppercase tracking-wider">
                    {position.name}
                  </div>
                </div>

                {/* Candidate detailed info */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-[#E6FE52] uppercase tracking-widest flex items-center gap-1.5">
                    <User size={11} />
                    VERIFIED_NOMINEE_CREDENTIALS
                  </span>
                  
                  <div className="bg-[#0D0D0E] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Proper profile picture / avatar */}
                    <div className="shrink-0">
                      {candidate.photoUrl ? (
                        <img
                          src={candidate.photoUrl}
                          alt={candidate.fullName}
                          className="w-20 h-20 border border-[#E6FE52]/40 object-cover rounded-none bg-[#161618]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-20 h-20 border border-[#E6FE52]/40 bg-[#161618] text-[#E6FE52] flex items-center justify-center font-display font-black text-2xl rounded-none">
                          {candidate.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="font-display font-black text-white text-base tracking-wider uppercase truncate">
                        {candidate.fullName}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.45)]">
                        <div>
                          <span>School Year: </span>
                          <span className="text-white font-bold">YEAR {candidate.yearLevel || "ALL COHORTS"}</span>
                        </div>
                        <div>
                          <span>Party: </span>
                          <span className="text-white font-bold">{candidate.party ? candidate.party.toUpperCase() : "INDEPENDENT"}</span>
                        </div>
                        <div className="sm:col-span-2 mt-1">
                          <span>Nominated for: </span>
                          <span className="text-[#E6FE52] font-bold">{position.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manifesto readout */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#E6FE52] uppercase tracking-widest flex items-center gap-1.5">
                    <Flag size={11} />
                    CAMPAIGN_PLATFORM_MANIFESTO
                  </span>
                  <div className="bg-[#0D0D0E] border border-[rgba(255,255,255,0.08)] p-3 text-[11px] text-[rgba(255,255,255,0.7)] leading-relaxed italic max-h-24 overflow-y-auto">
                    "{candidate.manifesto || "No campaign platform details provided."}"
                  </div>
                </div>
              </div>

              {/* Critical Notice */}
              <div className="bg-[#E6FE52]/5 border border-amber-500/20 p-3.5 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-[#E6FE52] shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/90 leading-relaxed font-bold uppercase tracking-wide">
                  CRITICAL_WARNING: Secure session locks active. This ballot transaction is final and cannot be modified or reversed after submission.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-transparent border border-[rgba(255,255,255,0.15)] hover:border-white text-white text-xs font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer text-center disabled:opacity-40"
                  id="vote-confirmation-cancel-btn"
                >
                  GO_BACK
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-[#E6FE52] hover:bg-[#d6ec3d] text-black text-xs font-bold uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#E6FE52]/10 disabled:opacity-55"
                  id="vote-confirmation-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-black" />
                      CASTING_BALLOT...
                    </>
                  ) : (
                    "SUBMIT_BALLOT"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-white max-w-md w-full border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-5 relative text-slate-800 font-sans shadow-2xl max-h-[90vh] overflow-y-auto"
              id="vote-confirmation-modal-box"
            >
              {/* Close Button */}
              {!isSubmitting && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close confirmation"
                  id="vote-confirmation-close-btn"
                >
                  <X size={18} />
                </button>
              )}

              {/* Header Accent */}
              <div className="flex flex-col items-center text-center space-y-2 pb-2 border-b border-slate-100">
                <div className="h-12 w-12 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 flex items-center justify-center shadow-sm">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    Ballot Confirmation
                  </span>
                  <h3 className="font-display font-black text-slate-900 text-xl tracking-tight mt-1.5 uppercase">
                    Confirm Selection
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Review your choice carefully before casting your official vote.
                  </p>
                </div>
              </div>

              {/* Ballot Sheet details */}
              <div className="space-y-3.5">
                {/* Election & Position Badges */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Calendar size={12} className="text-sky-600" />
                    <span>Election</span>
                  </div>
                  <p className="font-display font-extrabold text-xs uppercase tracking-wide text-slate-800 truncate">
                    {election.title}
                  </p>
                </div>

                {/* Candidate detailed info */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {candidate.photoUrl && candidate.photoUrl !== "null" && candidate.photoUrl !== "" && candidate.photoUrl !== "undefined" ? (
                        <img
                          src={candidate.photoUrl}
                          alt={candidate.fullName}
                          className="w-14 h-14 border border-slate-200 object-cover rounded-2xl bg-white shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center font-display font-black text-xl rounded-2xl shadow-sm">
                          {candidate.fullName[0]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {position.name}
                      </span>
                      <h4 className="font-display font-extrabold text-slate-900 text-base tracking-tight uppercase truncate mt-1">
                        {candidate.fullName}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {candidate.party ? candidate.party.toUpperCase() : "INDEPENDENT"} {candidate.yearLevel ? `• GRADE ${candidate.yearLevel}` : ""}
                      </p>
                    </div>
                  </div>

                  {candidate.manifesto && (
                    <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 leading-relaxed italic line-clamp-3">
                      "{candidate.manifesto}"
                    </div>
                  )}
                </div>
              </div>

              {/* Critical Notice */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                  Once submitted, this ballot is securely recorded and cannot be changed or recalled.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center disabled:opacity-40"
                  id="vote-confirmation-cancel-btn"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-sky-900/20 disabled:opacity-55"
                  id="vote-confirmation-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      Casting...
                    </>
                  ) : (
                    "Submit Ballot"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

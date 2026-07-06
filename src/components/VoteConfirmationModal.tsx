import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Loader2, X, AlertTriangle } from "lucide-react";

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidateName: string;
  positionName: string;
  isSubmitting: boolean;
}

export default function VoteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  positionName,
  isSubmitting,
}: VoteConfirmationModalProps) {
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            id="vote-confirmation-backdrop"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="glass-panel max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 p-6 md:p-8 space-y-6 relative"
              id="vote-confirmation-modal-box"
            >
              {/* Close Button */}
              {!isSubmitting && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all cursor-pointer"
                  aria-label="Close confirmation"
                  id="vote-confirmation-close-btn"
                >
                  <X size={16} />
                </button>
              )}

              {/* Warning Header Accent */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-14 w-14 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-200 shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse">
                  <ShieldAlert size={28} />
                </div>
                <h3 className="font-display font-semibold text-zinc-900 text-xl tracking-tight">
                  Confirm Your Ballot
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Please review your selection below before submitting.
                </p>
              </div>

              {/* Selection Summary */}
              <div className="bg-white/3 border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Position
                  </span>
                  <p className="text-sm font-semibold text-indigo-500">
                    {positionName}
                  </p>
                </div>
                <div className="border-t border-zinc-200 pt-3 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Candidate Choice
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-200 flex items-center justify-center font-bold font-display text-xs">
                      {candidateName.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <p className="text-sm font-bold text-zinc-900">
                      {candidateName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Notice */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/80 leading-relaxed font-medium">
                  This action is permanent and cannot be reversed. Once submitted, your vote is registered securely.
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
                  className="py-3 px-4 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-40"
                  id="vote-confirmation-cancel-btn"
                >
                  Go Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/20 disabled:opacity-55"
                  id="vote-confirmation-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Casting Ballot...
                    </>
                  ) : (
                    "Submit Vote"
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

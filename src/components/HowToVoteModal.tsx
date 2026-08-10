import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2, Search, Hand, FileLock2 } from "lucide-react";

interface HowToVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToVoteModal({ isOpen, onClose }: HowToVoteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 px-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-panel relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 p-0 shadow-2xl z-10"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-zinc-50">
            <h3 className="font-display text-lg font-semibold text-zinc-900">How to Cast Your Ballot</h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <p className="text-sm text-zinc-700 leading-relaxed">
              Voting in this election is simple and secure. Follow these steps to make your voice heard:
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-300 flex items-center justify-center text-indigo-600 font-display font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-zinc-900 font-medium text-sm flex items-center gap-2">
                    <Search size={16} className="text-indigo-600" />
                    Review Candidates
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Browse the list of positions and candidates. Click on any candidate's profile card to read their full manifesto and platform.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 font-display font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-zinc-900 font-medium text-sm flex items-center gap-2">
                    <Hand size={16} className="text-blue-600" />
                    Make Your Selection
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    When you are ready, click the "Cast Vote" button under your chosen candidate. You can have one effective selection per position.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-display font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-zinc-900 font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-orange-400" />
                    Confirm Your Choice
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    A confirmation window will appear. Click "Confirm Vote" to proceed. If you later choose another candidate while voting is open, the new valid selection replaces your earlier one.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 font-display font-bold">
                  4
                </div>
                <div>
                  <h4 className="text-zinc-900 font-medium text-sm flex items-center gap-2">
                    <FileLock2 size={16} className="text-emerald-600" />
                    Online or Encrypted Offline Ballot
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Online votes are recorded immediately. If your device goes offline, make your selections and download the encrypted JSON ballot, then send it to a Teacher or Admin for authenticated import.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium rounded-xl transition-colors border border-zinc-200 cursor-pointer"
            >
              Got it, let's vote!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

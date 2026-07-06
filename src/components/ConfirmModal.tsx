import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-6 rounded-3xl shadow-2xl glass-panel border border-zinc-200 flex flex-col items-center gap-5"
          >
            <div className="h-16 w-16 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
              <LogOut size={32} />
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="text-xl font-display font-semibold text-zinc-900 tracking-tight">Sign Out?</h3>
              <p className="text-sm text-zinc-700 leading-relaxed font-medium">Are you sure you want to sign out?</p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer bg-rose-600 hover:bg-rose-700 text-zinc-900 shadow-lg shadow-rose-500/25"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

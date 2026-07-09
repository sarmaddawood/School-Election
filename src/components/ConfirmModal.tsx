import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Trash2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  icon?: React.ReactNode;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Sign Out?",
  message = "Are you sure you want to sign out?",
  confirmText = "Sign Out",
  cancelText = "Cancel",
  isDanger = true,
  icon,
}: ConfirmModalProps) {
  const displayIcon = icon || (isDanger ? <Trash2 size={32} /> : <LogOut size={32} />);

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
            <div className={`h-16 w-16 ${isDanger ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'bg-[#E6FE52]/10 text-black border-[#E6FE52]/20 shadow-[0_0_20px_rgba(230,254,82,0.15)]'} rounded-2xl flex items-center justify-center border animate-pulse`}>
              {displayIcon}
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="text-xl font-display font-semibold text-zinc-900 tracking-tight">{title}</h3>
              <p className="text-sm text-zinc-700 leading-relaxed font-medium">{message}</p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                  isDanger
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/25"
                    : "bg-[#E6FE52] hover:bg-[#d6ec3d] text-black shadow-lg shadow-[#E6FE52]/25"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


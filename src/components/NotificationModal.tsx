import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle } from "lucide-react";

interface NotificationModalProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function NotificationModal({ message, type, onClose }: NotificationModalProps) {
  return (
    <AnimatePresence>
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
          {type === "success" ? (
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <CheckCircle size={32} />
            </div>
          ) : (
            <div className="h-16 w-16 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
              <AlertCircle size={32} />
            </div>
          )}
          
          <div className="space-y-1.5 text-center">
            <h3 className="text-xl font-display font-semibold text-zinc-900 tracking-tight">
              {type === "success" ? "Success" : "Error"}
            </h3>
            <p className="text-sm text-zinc-700 leading-relaxed font-medium">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-lg ${
              type === "success"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-violet-500/25"
                : "bg-rose-600 hover:bg-rose-700 text-zinc-900 shadow-rose-500/25"
            }`}
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

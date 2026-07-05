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
          className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border flex flex-col items-center gap-4 ${
            type === "success"
              ? "bg-white text-zinc-900 border-zinc-100"
              : "bg-white text-zinc-900 border-red-200"
          }`}
        >
          {type === "success" ? (
            <CheckCircle className="text-emerald-500" size={48} />
          ) : (
            <AlertCircle className="text-red-500" size={48} />
          )}
          <h3 className="text-lg font-bold">
            {type === "success" ? "Success" : "Error"}
          </h3>
          <p className="text-sm text-center opacity-80">{message}</p>
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              type === "success"
                ? "bg-zinc-900 text-white hover:bg-zinc-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

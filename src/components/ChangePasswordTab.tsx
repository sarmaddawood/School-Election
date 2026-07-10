import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Loader2, ShieldCheck } from "lucide-react";

interface ChangePasswordTabProps {
  token: string;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  onSuccess?: () => void;
}

export default function ChangePasswordTab({
  token,
  setErrorNotification,
  setSuccessNotification,
  onSuccess,
}: ChangePasswordTabProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setErrorNotification("Please fill in both current and new passwords");
      return;
    }
    setUpdatingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      setSuccessNotification("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 pt-10 font-mono text-[var(--ink)]"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-[var(--accent-soft)] text-[var(--accent)] rounded-none flex items-center justify-center mx-auto mb-4 border border-[var(--accent)]/30">
          <ShieldCheck size={32} />
        </div>
        <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">SECURITY_ENCRYPT_09</span>
        <h2 className="text-2xl font-display font-black text-[var(--ink)] uppercase tracking-wider">
          ACCOUNT PASSWORD SECURITY
        </h2>
        <p className="text-xs text-zinc-500">
          Update authorization password variables to keep your voting ledger secure.
        </p>
      </div>

      <div className="glass-panel p-6 md:p-8">
        <form onSubmit={handlePasswordChange} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={updatingPassword}
              className="w-full py-3 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] rounded-none font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center transition-all"
            >
              {updatingPassword ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  UPDATING_SECURITY_KEY...
                </>
              ) : (
                "UPDATE PASSWORD VARIABLES"
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

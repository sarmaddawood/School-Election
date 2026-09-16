import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setErrorNotification("Please fill in both current and new passwords");
      return;
    }
    if (newPassword.length < 8) {
      setErrorNotification("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorNotification("New password and confirmation password do not match");
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
      setConfirmPassword("");
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
      className="max-w-xl mx-auto space-y-6 pt-4 sm:pt-8 font-mono text-[var(--ink)]"
    >
      <div className="text-center space-y-2 mb-6">
        <div className="h-16 w-16 bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[var(--accent)]/30 shadow-xs">
          <ShieldCheck size={32} />
        </div>
        <span className="text-[10px] font-bold text-[var(--accent)] tracking-widest uppercase bg-[var(--accent-soft)] px-2.5 py-1 rounded-md border border-[var(--accent)]/20">
          ACCOUNT SECURITY
        </span>
        <h2 className="text-2xl font-display font-bold text-[var(--ink)] uppercase tracking-wider mt-2">
          CHANGE ACCOUNT PASSWORD
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Update your authentication credentials to protect your student or administrative account.
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showOld ? "text" : "password"}
                required
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                aria-label={showOld ? "Hide current password" : "Show current password"}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              New Password (8+ characters)
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showNew ? "text" : "password"}
                required
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {newPassword && confirmPassword && (
            <div className="pt-1">
              {newPassword === confirmPassword ? (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={13} /> Passwords match
                </p>
              ) : (
                <p className="text-[11px] text-rose-500 font-medium">
                  Passwords do not match
                </p>
              )}
            </div>
          )}

          <div className="pt-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={updatingPassword}
              className="w-full py-3 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center transition-all shadow-sm"
            >
              {updatingPassword ? (
                <>
                  <Loader2 size={15} className="animate-spin mr-2" />
                  UPDATING PASSWORD...
                </>
              ) : (
                "UPDATE PASSWORD"
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

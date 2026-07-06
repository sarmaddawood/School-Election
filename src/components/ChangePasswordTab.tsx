import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, Loader2, ShieldCheck } from "lucide-react";

interface ChangePasswordTabProps {
  token: string;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

export default function ChangePasswordTab({
  token,
  setErrorNotification,
  setSuccessNotification,
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
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 pt-10"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-200 shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-display font-semibold text-gradient">
          Account Security
        </h2>
        <p className="text-sm text-zinc-500">
          Update your password to keep your account secure.
        </p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-3xl shadow-xl border border-zinc-200">
        <form onSubmit={handlePasswordChange} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={updatingPassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer flex items-center justify-center shadow-lg shadow-violet-500/25 transition-colors"
            >
              {updatingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Updating Security Settings...
                </>
              ) : (
                "Update Password"
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Search, Users, Shield } from "lucide-react";
import { User as UserType, UserRole } from "../types";

interface UsersTabProps {
  users: UserType[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function UsersTab({
  users,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: UsersTabProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !password || !role) {
      setErrorNotification("All fields are required to create a user");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, fullName, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccessNotification(`User "${fullName}" created successfully`);
      setUsername("");
      setFullName("");
      setPassword("");
      setRole("student");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === "admin-1") {
      setErrorNotification("Cannot delete the root administrator");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccessNotification(`User "${name}" deleted successfully`);
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h2 className="font-display font-semibold text-2xl text-white tracking-tight">
          Voter Account Registry
        </h2>
        <p className="text-sm text-zinc-400">Manage students, teachers, and custom profiles</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Register panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl h-fit space-y-4 border border-white/5"
        >
          <h3 className="font-display font-semibold text-gradient text-base border-b border-white/5 pb-3">
            Register New User
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                Full Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                type="text"
                required
                placeholder="e.g. Liam Henderson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                Username / Roll Number
              </label>
              <motion.input
                whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                type="text"
                required
                placeholder={role === "teacher" ? "e.g. Teacher ID" : "e.g. Student ID"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                Assign Password
              </label>
              <motion.input
                whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    role === "student"
                      ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                      : "bg-white/2 border-white/5 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  Student
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    role === "teacher"
                      ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                      : "bg-white/2 border-white/5 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  Teacher
                </motion.button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
            >
              <Plus size={14} />
              {submitting ? "Creating..." : "Create Account"}
            </motion.button>
          </form>
        </motion.div>

        {/* Directory Panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-7 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 border border-white/5"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
            <h3 className="font-display font-semibold text-gradient text-base">
              Voter Directory
            </h3>

            <div className="relative max-w-xs w-full">
              <motion.input
                whileFocus={{ scale: 1.02, borderColor: "rgba(139,92,246,0.3)" }}
                type="text"
                placeholder="Search name/username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 glass-input rounded-xl text-xs outline-none transition-all"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 uppercase font-bold tracking-wider">
                  <th className="py-3 px-2">Voter Profile</th>
                  <th className="py-3 px-2">Username</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3 px-2 font-medium text-zinc-200 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-violet-500/10 text-violet-300 flex items-center justify-center font-bold font-display uppercase border border-violet-500/20 shadow-sm shrink-0">
                          {u.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                        </div>
                        <span className="truncate max-w-[120px] sm:max-w-none">{u.fullName}</span>
                      </td>
                      <td className="py-3 px-2 text-zinc-400 font-mono">
                        {u.username}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                            u.role === "admin"
                              ? "bg-white/10 text-white border-white/20"
                              : u.role === "teacher"
                              ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {u.id !== "admin-1" ? (
                          <motion.button
                            whileHover={{ scale: 1.1, color: "#f87171" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(u.id, u.fullName)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic font-semibold">Protected</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-400">
                      <Users size={24} className="mx-auto mb-2 text-zinc-500 animate-pulse" />
                      <p>No user accounts matched your search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

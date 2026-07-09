import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Search, Users } from "lucide-react";
import { User as UserType, UserRole, Candidate, Position, Election, Vote } from "../types";
import ConfirmModal from "./ConfirmModal";
import UserDetailModal from "./UserDetailModal";

interface UsersTabProps {
  users: UserType[];
  candidates: Candidate[];
  positions: Position[];
  elections: Election[];
  votes: Vote[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function UsersTab({
  users,
  candidates,
  positions,
  elections,
  votes,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: UsersTabProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [yearLevel, setYearLevel] = useState<number | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState<UserType | null>(null);

  const handleSeedUsers = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/users/seed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to seed dummy users");
      }
      setSuccessNotification(data.message || "Database seeded with dummy users!");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred during seeding");
    } finally {
      setSeeding(false);
    }
  };

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
        body: JSON.stringify({ username, fullName, password, role, yearLevel, photoUrl }),
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
      setYearLevel(undefined);
      setPhotoUrl("");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (id === "admin-1") {
      setErrorNotification("Cannot delete the root administrator");
      return;
    }
    setDeleteConfirmUser({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    const { id, name } = deleteConfirmUser;

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

      setSuccessNotification(`User "${name}" and cascading records deleted successfully`);
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmUser(null);
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
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 18 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 font-mono text-white"
    >
      <motion.div variants={itemVariants} className="border-b border-[rgba(255,255,255,0.1)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-bold text-[#E6FE52] tracking-widest uppercase">REGISTRY_MODULE_02</span>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider">
            USER ACCOUNT REGISTRY
          </h2>
          <p className="text-xs text-[rgba(255,255,255,0.45)]">Manage credentials, roles, and cohort permissions for school students and faculty.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSeedUsers}
          disabled={seeding}
          className="px-4 py-2.5 bg-[#E6FE52] hover:bg-[#d6ec3d] disabled:bg-[#a6b44c] text-black text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none"
        >
          {seeding ? "SEEDING_DATABASE..." : "SEED_DUMMY_USERS"}
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Register panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 glass-panel p-5 md:p-6 space-y-4"
        >
          <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-b border-[rgba(255,255,255,0.1)] pb-3">
            REGISTER NEW ACCOUNT
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                Full Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                required
                placeholder="e.g. Liam Henderson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none transition-all focus:border-[#E6FE52]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                Username / Roll Number
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                required
                placeholder={role === "teacher" ? "e.g. Teacher ID" : "e.g. Student ID"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none transition-all focus:border-[#E6FE52]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                Assign Password
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none transition-all focus:border-[#E6FE52]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2.5 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all border cursor-pointer ${
                    role === "student"
                      ? "bg-[#E6FE52] border-[#E6FE52] text-black"
                      : "bg-[#0D0D0E] border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.6)] hover:border-[#E6FE52]"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`py-2.5 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all border cursor-pointer ${
                    role === "teacher"
                      ? "bg-[#E6FE52] border-[#E6FE52] text-black"
                      : "bg-[#0D0D0E] border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.6)] hover:border-[#E6FE52]"
                  }`}
                >
                  Teacher
                </button>
              </div>
            </div>

            <AnimatePresence>
              {role === "student" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                    Year Level (Optional)
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01 }}
                    type="number"
                    min="1"
                    max="12"
                    placeholder="e.g. 10"
                    value={yearLevel || ""}
                    onChange={(e) => setYearLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none transition-all focus:border-[#E6FE52]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase">
                Photo URL (Optional)
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none transition-all focus:border-[#E6FE52]"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#E6FE52] hover:bg-[#d6ec3d] text-black rounded-none font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={14} />
              {submitting ? "REGISTER_ACCOUNTING..." : "REGISTER_ACCOUNT"}
            </motion.button>
          </form>
        </motion.div>

        {/* Directory Panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-7 glass-panel p-5 md:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[rgba(255,255,255,0.1)] pb-3">
            <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
              VOTER DIRECTORY
            </h3>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="SEARCH_REGISTRY_LOGS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] rounded-none text-xs text-white outline-none focus:border-[#E6FE52]"
              />
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)] pointer-events-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.45)] uppercase font-bold tracking-widest text-[9px]">
                  <th className="py-3 px-2">VOTER_PROFILE</th>
                  <th className="py-3 px-2">USERNAME</th>
                  <th className="py-3 px-2">ROLE</th>
                  <th className="py-3 px-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.12 }}
                      onClick={() => setSelectedDetailUser(u)}
                      className="hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-2 font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-none bg-[#0D0D0E] text-[#E6FE52] flex items-center justify-center font-bold text-xs border border-[rgba(255,255,255,0.1)] shrink-0">
                          {u.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                        </div>
                        <span className="truncate max-w-[120px] sm:max-w-none">{u.fullName}</span>
                      </td>
                      <td className="py-3 px-2 text-[rgba(255,255,255,0.5)] font-mono text-xs uppercase">
                        {u.username}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-none font-bold uppercase text-[8px] border tracking-wider ${
                            u.role === "admin"
                              ? "bg-white text-black border-white"
                              : u.role === "teacher"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-[#E6FE52]/10 text-[#E6FE52] border-[#E6FE52]/30"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(u.id, u.fullName);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        ) : (
                          <span className="text-[9px] text-[rgba(255,255,255,0.4)] italic font-bold uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>SYSTEM_LOCK</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[rgba(255,255,255,0.4)]">
                      <Users size={24} className="mx-auto mb-2 text-[#E6FE52]" />
                      <p className="text-[10px] uppercase tracking-wider">No registry files found matching request query.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirmUser !== null}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Account?"
        message={`Are you sure you want to delete user account "${deleteConfirmUser?.name || ""}"? This will also cascade delete any nominated candidates or cast ballots corresponding to this user profile.`}
        confirmText="DELETE ACCOUNT"
        cancelText="CANCEL"
        isDanger={true}
      />

      <UserDetailModal
        user={selectedDetailUser}
        candidates={candidates}
        positions={positions}
        elections={elections}
        votes={votes}
        isOpen={selectedDetailUser !== null}
        onClose={() => setSelectedDetailUser(null)}
      />
    </motion.div>
  );
}

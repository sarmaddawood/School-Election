import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, Calendar, Clock, X, AlertCircle } from "lucide-react";
import { Election, ElectionPhase } from "../types";

interface ElectionTabProps {
  elections: Election[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function ElectionTab({
  elections,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: ElectionTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getPhase = (startStr: string, endStr: string): ElectionPhase => {
    const now = new Date();
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  const handleOpenCreate = () => {
    setEditingElection(null);
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setShowForm(true);
  };

  const handleOpenEdit = (el: Election) => {
    setEditingElection(el);
    setTitle(el.title);
    setDescription(el.description || "");

    const toLocalISOString = (dateStr: string) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setStartsAt(toLocalISOString(el.startsAt));
    setEndsAt(toLocalISOString(el.endsAt));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startsAt || !endsAt) {
      setErrorNotification("Title, start date, and end date are required");
      return;
    }

    const startVal = new Date(startsAt);
    const endVal = new Date(endsAt);

    if (endVal <= startVal) {
      setErrorNotification("End date must be strictly after start date");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingElection
        ? `/api/elections/${editingElection.id}`
        : "/api/elections";
      const method = editingElection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          startsAt: startVal.toISOString(),
          endsAt: endVal.toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save election");
      }

      setSuccessNotification(
        editingElection
          ? "Election updated successfully"
          : "New election created successfully"
      );
      setShowForm(false);
      setEditingElection(null);
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this election? This will cascade delete all associated positions, candidates, and votes!"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/elections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete election");
      }

      setSuccessNotification("Election and all cascading records deleted");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <motion.div
        variants={cardVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="font-display font-semibold text-2xl text-white tracking-tight">
            Election Management
          </h2>
          <p className="text-sm text-zinc-400">Configure election names, dates, and settings</p>
        </div>
        {!showForm && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer transition-all"
          >
            <Plus size={16} />
            Create Election
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, height: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, scale: 0.95, y: -20, height: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="glass-panel rounded-2xl p-6 space-y-5 shadow-2xl border border-white/10"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-display font-semibold text-gradient text-base">
                  {editingElection ? "Edit Election" : "New Election Details"}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                    Election Title
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                    type="text"
                    required
                    placeholder="e.g. Student Council Elections 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">
                    Description
                  </label>
                  <motion.textarea
                    whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                    rows={3}
                    placeholder="Provide a description of this election..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                    <Calendar size={14} /> Starts At
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                    <Clock size={14} /> Ends At
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  {submitting ? "Saving..." : "Save Election"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {elections.map((el) => {
          const phase = getPhase(el.startsAt, el.endsAt);
          return (
            <motion.div
              key={el.id}
              variants={cardVariants}
              whileHover={{
                scale: 1.03,
                y: -6,
                borderColor: "rgba(139,92,246,0.35)",
                boxShadow: "0 12px 24px -10px rgba(139, 92, 246, 0.45)",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl border border-white/5 transition-all"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-display font-semibold text-white text-base leading-snug">
                    {el.title}
                  </h3>
                  <motion.span
                    animate={phase === "live" ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      phase === "live"
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : phase === "upcoming"
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        : "bg-white/5 text-zinc-400 border border-white/5"
                    }`}
                  >
                    {phase}
                  </motion.span>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                  {el.description || "No description provided."}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-zinc-400 font-medium">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Starts:</span>
                    <span>{new Date(el.startsAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ends:</span>
                    <span>{new Date(el.endsAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleOpenEdit(el)}
                    className="p-2 hover:bg-white/5 border border-white/5 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit2 size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(el.id)}
                    className="p-2 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {elections.length === 0 && (
          <motion.div
            variants={cardVariants}
            className="col-span-1 md:col-span-2 glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-white/5"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="p-4 bg-white/3 border border-white/5 rounded-2xl text-zinc-400 shadow-md"
            >
              <Calendar size={32} className="text-zinc-400" />
            </motion.div>
            <div className="space-y-1">
              <p className="font-semibold text-white">No Elections Configured</p>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Get started by creating your first school election. Add positions and candidates afterward.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-600/20"
            >
              Create First Election
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

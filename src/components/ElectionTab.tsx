import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, Calendar, Clock, X, AlertCircle } from "lucide-react";
import { Election, ElectionPhase } from "../types";
import ConfirmModal from "./ConfirmModal";

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
  const [deleteConfirmElection, setDeleteConfirmElection] = useState<{ id: string; title: string } | null>(null);

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

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmElection({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmElection) return;
    const { id } = deleteConfirmElection;

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

      setSuccessNotification("Election and all cascading records deleted successfully");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmElection(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
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
      className="space-y-6 font-mono text-[var(--ink)]"
    >
      <motion.div
        variants={cardVariants}
        className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">ELECTION ADMIN 03</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider">
            ELECTION MANAGEMENT
          </h2>
          <p className="text-xs text-zinc-500">Configure and orchestrate secure polling events and active timelines.</p>
        </div>
        {!showForm && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer rounded-none"
          >
            <Plus size={14} />
            CREATE ELECTION
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="glass-panel p-6 space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider">
                  {editingElection ? "EDIT ELECTION PARAMETERS" : "INITIALIZE NEW ELECTION"}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-[var(--surface)] border border-[var(--border)] rounded-none text-zinc-500 hover:text-[var(--ink)] cursor-pointer"
                >
                  <X size={15} />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                    Election Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Student Council Elections 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                    Description / Polling Directives
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a description of this election..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                    <Calendar size={13} /> Starts At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                    <Clock size={13} /> Ends At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--ink)] text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none disabled:opacity-50"
                >
                  {submitting ? "SAVING..." : "SAVE ELECTION"}
                </button>
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
              whileHover={{ scale: 1.01 }}
              className="glass-panel p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-display font-bold text-[var(--ink)] text-sm uppercase tracking-wide leading-snug">
                    {el.title}
                  </h3>
                  <motion.span
                    animate={phase === "live" ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                      phase === "live"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : phase === "upcoming"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-neutral-100 text-neutral-500 border-neutral-200"
                    }`}
                  >
                    {phase}
                  </motion.span>
                </div>
                <p className="text-xs text-[var(--ink)] opacity-70 line-clamp-3 leading-relaxed">
                  {el.description || "No description provided."}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="border-t border-[var(--border)] pt-3 space-y-1.5 text-[10px] text-neutral-500 uppercase">
                  <div className="flex justify-between">
                    <span>Starts:</span>
                    <span className="text-[var(--ink)] font-bold">{new Date(el.startsAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends:</span>
                    <span className="text-[var(--ink)] font-bold">{new Date(el.endsAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenEdit(el)}
                    className="p-2 hover:bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--ink)] cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(el.id, el.title)}
                    className="p-2 hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {elections.length === 0 && (
          <motion.div
            variants={cardVariants}
            className="col-span-1 md:col-span-2 glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4"
          >
            <AlertCircle size={32} className="text-[var(--accent)]" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--ink)] uppercase tracking-wider text-xs">NO ELECTIONS PROGRAMMED</p>
              <p className="text-[10px] text-zinc-500 max-w-sm leading-relaxed">
                Initialize a secure election module to begin registering polling options and recording votes.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              CREATE FIRST ELECTION
            </motion.button>
          </motion.div>
        )}
      </motion.div>
      <ConfirmModal
        isOpen={deleteConfirmElection !== null}
        onClose={() => setDeleteConfirmElection(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Election?"
        message={`Are you sure you want to delete the election "${deleteConfirmElection?.title}"? This will cascade delete all associated positions, candidates, and cast votes!`}
        confirmText="DELETE"
        cancelText="CANCEL"
        isDanger={true}
      />
    </motion.div>
  );
}

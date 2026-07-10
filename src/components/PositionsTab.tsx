import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown } from "lucide-react";
import { Election, Position } from "../types";
import ConfirmModal from "./ConfirmModal";

interface PositionsTabProps {
  elections: Election[];
  positions: Position[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function PositionsTab({
  elections,
  positions,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: PositionsTabProps) {
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmPosition, setDeleteConfirmPosition] = useState<{ id: string; name: string } | null>(null);

  React.useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      setSelectedElectionId(elections[0].id);
    }
  }, [elections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElectionId || !name) {
      setErrorNotification("Please select an election and enter a position name");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/positions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ electionId: selectedElectionId, name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add position");
      }

      setSuccessNotification(`Added position "${name}"`);
      setName("");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, posName: string) => {
    setDeleteConfirmPosition({ id, name: posName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPosition) return;
    const { id } = deleteConfirmPosition;

    try {
      const response = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete position");
      }

      setSuccessNotification("Position and cascading records deleted successfully");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmPosition(null);
    }
  };

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
      className="space-y-6 font-mono text-[var(--ink)]"
    >
      <motion.div variants={itemVariants} className="border-b border-[var(--border)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">ELECTION_MODULE_01</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider">
            POLLING POSITIONS
          </h2>
          <p className="text-xs text-zinc-500">Configure ballot positions for active and upcoming elections.</p>
        </div>
      </motion.div>

      {elections.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="glass-panel p-8 text-center flex flex-col items-center justify-center space-y-3"
        >
          <Award size={32} className="text-[var(--accent)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO_ELECTIONS_FOUND</p>
          <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
            You must configure an election registry before establishing active polling positions.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 glass-panel p-5 md:p-6 space-y-4"
          >
            <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider border-b border-[var(--border)] pb-3">
              ADD NEW POSITION
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Select Election
                </label>
                <div className="relative">
                  <select
                    value={selectedElectionId}
                    onChange={(e) => setSelectedElectionId(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] appearance-none cursor-pointer pr-10 outline-none focus:border-[var(--accent)]"
                  >
                    {elections.map((el) => (
                      <option key={el.id} value={el.id} className="bg-[var(--surface)] text-[var(--ink)]">
                        {el.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Position Title / Name
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  required
                  placeholder="e.g. Sports Captain, Head Prefect"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--surface)] rounded-none font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus size={14} />
                {submitting ? "ADDING_POSITION..." : "ADD_POSITION"}
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 glass-panel p-5 md:p-6 space-y-6"
          >
            <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider border-b border-[var(--border)] pb-3">
              ACTIVE POSITIONS DIRECTORY
            </h3>

            <div className="space-y-6">
              {elections.map((el) => {
                const electionPositions = positions.filter((p) => p.electionId === el.id);
                return (
                  <motion.div
                    key={el.id}
                    variants={itemVariants}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5">
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-1.5 w-1.5 rounded-none bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                      />
                      <h4 className="font-display font-bold text-[10px] text-zinc-500 uppercase tracking-widest">
                        {el.title}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <AnimatePresence mode="popLayout">
                        {electionPositions.map((pos) => (
                          <motion.div
                            key={pos.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            whileHover={{ scale: 1.01 }}
                            className="flex justify-between items-center bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-none transition-all"
                          >
                            <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                              {pos.name}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1, color: "#e11d48" }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(pos.id, pos.name)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-all cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </motion.button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {electionPositions.length === 0 && (
                        <p className="text-[10px] text-zinc-500 italic py-1 pl-1">
                          No configured polling positions found.
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
      <ConfirmModal
        isOpen={deleteConfirmPosition !== null}
        onClose={() => setDeleteConfirmPosition(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Position?"
        message={`Are you sure you want to delete the position "${deleteConfirmPosition?.name}"? This will cascade delete any registered candidates or submitted votes!`}
        confirmText="DELETE"
        cancelText="CANCEL"
        isDanger={true}
      />
    </motion.div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown } from "lucide-react";
import { Election, Position } from "../types";

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

  const handleDelete = async (id: string, posName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete position "${posName}"? This will cascade delete any nominated candidates and votes for this position!`
      )
    ) {
      return;
    }

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

      setSuccessNotification("Position and cascading records deleted");
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
        <h2 className="font-display font-semibold text-2xl text-zinc-900 tracking-tight">
          Polling Positions
        </h2>
        <p className="text-sm text-zinc-500">Configure ballot titles for each active election</p>
      </motion.div>

      {elections.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-xl border border-zinc-200"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Award size={32} className="text-zinc-500" />
          </motion.div>
          <p className="font-medium text-zinc-700">No Elections Found</p>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
            You must create an election before configuring polling positions.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl h-fit space-y-4 border border-zinc-200"
          >
            <h3 className="font-display font-semibold text-gradient text-base border-b border-zinc-200 pb-3">
              Add New Position
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase">
                  Select Election
                </label>
                <div className="relative">
                  <select
                    value={selectedElectionId}
                    onChange={(e) => setSelectedElectionId(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer pr-10 text-zinc-900 outline-none"
                  >
                    {elections.map((el) => (
                      <option key={el.id} value={el.id} className="bg-black text-zinc-900">
                        {el.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase">
                  Position Title / Name
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                  type="text"
                  required
                  placeholder="e.g. Sports Captain, Head Prefect"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm outline-none transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-violet-400 text-zinc-900 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
              >
                <Plus size={14} />
                {submitting ? "Adding..." : "Add Position"}
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl space-y-6 border border-zinc-200"
          >
            <h3 className="font-display font-semibold text-gradient text-base border-b border-zinc-200 pb-3">
              Position Directory
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
                    <div className="flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6]"
                      />
                      <h4 className="font-display font-semibold text-xs text-zinc-500 uppercase tracking-wider">
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
                            whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.04)" }}
                            className="flex justify-between items-center bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-xl transition-all shadow-sm"
                          >
                            <span className="text-sm font-medium text-zinc-900">
                              {pos.name}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1, color: "#f87171" }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(pos.id, pos.name)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {electionPositions.length === 0 && (
                        <p className="text-xs text-zinc-500 italic py-1 pl-1">
                          No positions configured for this election yet.
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
    </motion.div>
  );
}

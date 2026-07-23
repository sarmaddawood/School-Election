import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown, Check, X, Edit2, Save } from "lucide-react";
import { Election, Position } from "../types";
import ConfirmModal from "./ConfirmModal";

const STANDARD_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Information Officer",
  "Peace Officer",
  "Grade 7 Representative",
  "Grade 8 Representative",
  "Grade 9 Representative",
  "Grade 10 Representative",
  "Grade 11 Representative",
  "Grade 12 Representative",
];

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
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [customPosition, setCustomPosition] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmPosition, setDeleteConfirmPosition] = useState<{ id: string; name: string } | null>(null);
  
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionName, setEditingPositionName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      setSelectedElectionId(elections[0].id);
    }
  }, [elections]);

  const togglePosition = (pos: string) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(selectedPositions.filter((p) => p !== pos));
    } else {
      setSelectedPositions([...selectedPositions, pos]);
    }
  };

  const removePosition = (pos: string) => {
    setSelectedPositions(selectedPositions.filter((p) => p !== pos));
  };

  const handleCustomPositionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = customPosition.trim();
      if (val && !selectedPositions.includes(val)) {
        setSelectedPositions([...selectedPositions, val]);
        setCustomPosition("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalPositions = [...selectedPositions];
    const val = customPosition.trim();
    if (val && !finalPositions.includes(val)) {
      finalPositions.push(val);
    }

    if (!selectedElectionId || finalPositions.length === 0) {
      setErrorNotification("Please select an election and select/enter at least one position name");
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        finalPositions.map(async (name) => {
          const response = await fetch("/api/positions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ electionId: selectedElectionId, name }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to add position "${name}"`);
          }
        })
      );

      setSuccessNotification(`Added ${finalPositions.length} position(s) successfully`);
      setSelectedPositions([]);
      setCustomPosition("");
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

  const startEditing = (id: string, name: string) => {
    setEditingPositionId(id);
    setEditingPositionName(name);
  };

  const cancelEditing = () => {
    setEditingPositionId(null);
    setEditingPositionName("");
  };

  const handleEditSubmit = async (id: string) => {
    if (!editingPositionName.trim()) {
      setErrorNotification("Position name cannot be empty");
      return;
    }
    
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editingPositionName.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update position");
      }

      setSuccessNotification("Position updated successfully");
      await onRefreshData();
      cancelEditing();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSavingEdit(false);
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
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">ELECTION MODULE 01</span>
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
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO ELECTIONS FOUND</p>
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

              <div className="space-y-1.5" ref={dropdownRef}>
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Select or Enter Positions
                </label>
                
                <div className="relative">
                  <div 
                    className="w-full min-h-[44px] bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] flex flex-wrap gap-2 p-2 cursor-text transition-all focus-within:border-[var(--accent)]"
                    onClick={() => setIsDropdownOpen(true)}
                  >
                    <AnimatePresence>
                      {selectedPositions.map((pos) => (
                        <motion.div
                          key={pos}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex items-center gap-1 bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-1 rounded-sm text-[10px] font-bold uppercase"
                        >
                          {pos}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePosition(pos);
                            }}
                            className="hover:bg-[var(--accent)] hover:text-[var(--surface)] rounded-full p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    <input
                      id="custom-position-input"
                      type="text"
                      placeholder={selectedPositions.length === 0 ? "Select or type (press Enter)" : ""}
                      value={customPosition}
                      onChange={(e) => setCustomPosition(e.target.value)}
                      onKeyDown={handleCustomPositionKeyDown}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-[var(--ink)] placeholder:text-zinc-400"
                    />
                    
                    <button 
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-none shadow-xl max-h-60 overflow-y-auto"
                      >
                        <div className="p-1">
                          {!customPosition.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById("custom-position-input")?.focus();
                              }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors text-[var(--accent)] hover:bg-[var(--accent-soft)] font-bold border-b border-[var(--border)] mb-1"
                            >
                              <Plus size={14} />
                              <span>Create New Position</span>
                            </button>
                          )}
                          {customPosition.trim() && !STANDARD_POSITIONS.find(p => p.toLowerCase() === customPosition.trim().toLowerCase()) && !selectedPositions.includes(customPosition.trim()) && (
                            <button
                              type="button"
                              onClick={() => {
                                const val = customPosition.trim();
                                if (val && !selectedPositions.includes(val)) {
                                  setSelectedPositions([...selectedPositions, val]);
                                  setCustomPosition("");
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors text-[var(--accent)] hover:bg-[var(--accent-soft)] font-bold border-b border-[var(--border)] mb-1"
                            >
                              <Plus size={14} />
                              <span>Create "{customPosition.trim()}"</span>
                            </button>
                          )}
                          {STANDARD_POSITIONS.filter(pos => pos.toLowerCase().includes(customPosition.toLowerCase())).map((pos) => {
                            const isSelected = selectedPositions.includes(pos);
                            return (
                              <button
                                type="button"
                                key={pos}
                                onClick={() => togglePosition(pos)}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                  isSelected 
                                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold" 
                                    : "text-[var(--ink)] hover:bg-neutral-100"
                                }`}
                              >
                                <span>{pos}</span>
                                {isSelected && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--surface)] rounded-none font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus size={14} />
                {submitting ? "ADDING POSITION..." : "ADD POSITION"}
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
                            whileHover={editingPositionId === pos.id ? {} : { scale: 1.01 }}
                            className="flex justify-between items-center bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-none transition-all"
                          >
                            {editingPositionId === pos.id ? (
                              <div className="flex-1 flex items-center gap-2 mr-4">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingPositionName}
                                  onChange={(e) => setEditingPositionName(e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--accent)] rounded-none text-xs text-[var(--ink)] outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSubmit(pos.id);
                                    if (e.key === "Escape") cancelEditing();
                                  }}
                                />
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleEditSubmit(pos.id)}
                                  disabled={savingEdit}
                                  className="p-1.5 bg-[var(--accent)] text-[var(--surface)] hover:opacity-90 rounded-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Save size={13} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={cancelEditing}
                                  disabled={savingEdit}
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <X size={13} />
                                </motion.button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                                  {pos.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <motion.button
                                    whileHover={{ scale: 1.1, color: "var(--accent)" }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => startEditing(pos.id, pos.name)}
                                    className="p-1.5 text-zinc-400 hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-sm transition-all cursor-pointer"
                                  >
                                    <Edit2 size={13} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1, color: "#e11d48" }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDelete(pos.id, pos.name)}
                                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-all cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </motion.button>
                                </div>
                              </>
                            )}
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

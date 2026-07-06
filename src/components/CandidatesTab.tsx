import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown, UserPlus, Sparkles, Search } from "lucide-react";
import { Election, Position, Candidate, User } from "../types";
import CandidateModal from "./CandidateModal";

interface CandidatesTabProps {
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  users: User[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function CandidatesTab({
  elections,
  positions,
  candidates,
  users,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: CandidatesTabProps) {
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalPosition, setModalPosition] = useState("");

  const handleAiPolish = async () => {
    if (!selectedPositionId) {
      setErrorNotification("Please select a position first");
      return;
    }
    const pos = positions.find((p) => p.id === selectedPositionId);
    const positionName = pos ? pos.name : "";

    setIsPolishing(true);
    try {
      const response = await fetch("/api/ai/suggest-manifesto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          positionName,
          draft: manifesto,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to suggest manifesto");
      }

      setManifesto(data.manifesto);
      setSuccessNotification("Manifesto polished successfully by Gemini!");
    } catch (err: any) {
      setErrorNotification(err.message || "Could not polish manifesto");
    } finally {
      setIsPolishing(false);
    }
  };

  useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      setSelectedElectionId(elections[0].id);
    }
  }, [elections]);

  useEffect(() => {
    if (selectedElectionId) {
      const electionPositions = positions.filter((p) => p.electionId === selectedElectionId);
      if (electionPositions.length > 0) {
        setSelectedPositionId(electionPositions[0].id);
      } else {
        setSelectedPositionId("");
      }
    }
  }, [selectedElectionId, positions]);

  const nonAdmins = users.filter((u) => u.role !== "admin");

  useEffect(() => {
    if (nonAdmins.length > 0 && !selectedUserId) {
      setSelectedUserId(nonAdmins[0].id);
    }
  }, [nonAdmins, selectedUserId]);

  const filteredPositions = positions.filter((p) => p.electionId === selectedElectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElectionId || !selectedPositionId || !selectedUserId) {
      setErrorNotification("Please select an election, position, and user");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          electionId: selectedElectionId,
          positionId: selectedPositionId,
          userId: selectedUserId,
          manifesto,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to nominate candidate");
      }

      setSuccessNotification("Candidate nominated successfully!");
      setManifesto("");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the ballot?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove candidate");
      }

      setSuccessNotification("Candidate removed from ballot");
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
          Nominate Candidates
        </h2>
        <p className="text-sm text-zinc-500">Nominate eligible students or teachers to positions</p>
      </motion.div>

      {elections.length === 0 || positions.length === 0 ? (
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
          <p className="font-medium text-zinc-700">Setup Prerequisite Required</p>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
            You must have at least one election and one position configured before you can nominate candidates.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl h-fit space-y-4 border border-zinc-200"
          >
            <h3 className="font-display font-semibold text-gradient text-base border-b border-zinc-200 pb-3">
              Nomination Panel
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
                  Select Position
                </label>
                <div className="relative">
                  <select
                    value={selectedPositionId}
                    onChange={(e) => setSelectedPositionId(e.target.value)}
                    disabled={filteredPositions.length === 0}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer pr-10 text-zinc-900 disabled:opacity-50 outline-none"
                  >
                    {filteredPositions.map((pos) => (
                      <option key={pos.id} value={pos.id} className="bg-black text-zinc-900">
                        {pos.name}
                      </option>
                    ))}
                    {filteredPositions.length === 0 && (
                      <option value="" className="bg-black text-zinc-900">No positions configured</option>
                    )}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase">
                  Nominee / User Profile
                </label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={nonAdmins.length === 0}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer pr-10 text-zinc-900 disabled:opacity-50 outline-none"
                  >
                    {nonAdmins.map((u) => (
                      <option key={u.id} value={u.id} className="bg-black text-zinc-900">
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                    {nonAdmins.length === 0 && (
                      <option value="" className="bg-black text-zinc-900">No eligible students/teachers found</option>
                    )}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase">
                    Manifesto / Campaign Pledge
                  </label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleAiPolish}
                    disabled={isPolishing || !selectedPositionId}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 disabled:text-zinc-500 transition-colors flex items-center gap-1 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-200 shadow-sm"
                  >
                    <Sparkles size={11} className={isPolishing ? "animate-spin" : ""} />
                    {isPolishing ? "Polishing..." : "Gemini Polish"}
                  </motion.button>
                </div>
                <motion.textarea
                  whileFocus={{ scale: 1.01, borderColor: "rgba(139,92,246,0.3)" }}
                  rows={4}
                  required
                  placeholder="e.g. My goals are to host better student events and support extracurricular programs..."
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none outline-none transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting || filteredPositions.length === 0 || nonAdmins.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-violet-400/20 text-zinc-900 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
              >
                <UserPlus size={14} />
                {submitting ? "Nominating..." : "Nominate Candidate"}
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 glass-panel rounded-2xl p-5 md:p-6 shadow-2xl space-y-6 border border-zinc-200"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 pb-3 gap-3">
              <h3 className="font-display font-semibold text-gradient text-base">
                Ballot Nominees
              </h3>
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search name, position, or manifesto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-4 py-1.5 bg-black/20 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder-zinc-500 outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-8">
              {elections.map((el) => {
                const electionPositions = positions.filter((p) => p.electionId === el.id);
                const electionCandidates = candidates.filter((c) => {
                  if (c.electionId !== el.id) return false;
                  if (!searchQuery.trim()) return true;
                  
                  const query = searchQuery.toLowerCase();
                  const pos = positions.find(p => p.id === c.positionId);
                  const positionName = pos ? pos.name.toLowerCase() : "";
                  
                  return (
                    c.fullName.toLowerCase().includes(query) ||
                    (c.manifesto && c.manifesto.toLowerCase().includes(query)) ||
                    positionName.includes(query)
                  );
                });

                if (electionCandidates.length === 0) return null;

                return (
                  <motion.div key={el.id} variants={itemVariants} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                      <h4 className="font-display font-semibold text-sm text-zinc-900">
                        {el.title}
                      </h4>
                    </div>

                    <div className="space-y-4 pl-2">
                      {electionPositions.map((pos) => {
                        const positionCandidates = electionCandidates.filter(
                           (c) => c.positionId === pos.id
                        );

                        if (positionCandidates.length === 0) return null;

                        return (
                          <div key={pos.id} className="space-y-2">
                            <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1 border-l-2 border-violet-500/40">
                              {pos.name}
                            </h5>

                            <div className="grid grid-cols-1 gap-2">
                              <AnimatePresence mode="popLayout">
                                {positionCandidates.map((cand) => (
                                  <motion.div
                                    key={cand.id}
                                    initial={{ opacity: 0, scale: 0.98, x: -10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, x: 10 }}
                                    whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.04)" }}
                                    className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-4 rounded-xl transition-all shadow-sm"
                                  >
                                    <div
                                      className="cursor-pointer group flex-1"
                                      onClick={() => {
                                        setModalCandidate(cand);
                                        setModalPosition(pos.name);
                                      }}
                                    >
                                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-500 transition-colors">
                                        {cand.fullName}
                                      </p>
                                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2 italic leading-relaxed max-w-md group-hover:text-zinc-700 transition-colors">
                                        "{cand.manifesto}"
                                      </p>
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.1, color: "#f87171" }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDelete(cand.id, cand.fullName)}
                                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0 ml-4"
                                    >
                                      <Trash2 size={14} />
                                    </motion.button>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

              {candidates.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <Award size={28} className="mx-auto text-zinc-600" />
                  <p className="text-xs">No nominees are currently on the ballot board.</p>
                </div>
              ) : (
                elections.every(el => {
                  const electionCandidates = candidates.filter((c) => {
                    if (c.electionId !== el.id) return false;
                    if (!searchQuery.trim()) return true;
                    
                    const query = searchQuery.toLowerCase();
                    const pos = positions.find(p => p.id === c.positionId);
                    const positionName = pos ? pos.name.toLowerCase() : "";
                    
                    return (
                      c.fullName.toLowerCase().includes(query) ||
                      (c.manifesto && c.manifesto.toLowerCase().includes(query)) ||
                      positionName.includes(query)
                    );
                  });
                  return electionCandidates.length === 0;
                }) && searchQuery.trim() !== "" && (
                  <div className="text-center py-12 text-zinc-500 space-y-2">
                    <Search size={28} className="mx-auto text-zinc-600" />
                    <p className="text-xs">No nominees match your search.</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
      <CandidateModal
        candidate={modalCandidate}
        positionName={modalPosition}
        isOpen={modalCandidate !== null}
        onClose={() => setModalCandidate(null)}
      />
    </motion.div>
  );
}

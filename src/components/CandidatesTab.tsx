import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown, UserPlus, Sparkles, Search } from "lucide-react";
import { Election, Position, Candidate, User, Vote } from "../types";
import CandidateModal from "./CandidateModal";
import ConfirmModal from "./ConfirmModal";
import UserDetailModal from "./UserDetailModal";

interface CandidatesTabProps {
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  users: User[];
  votes: Vote[];
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
  votes,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: CandidatesTabProps) {
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalPosition, setModalPosition] = useState("");
  const [selectedDetailUser, setSelectedDetailUser] = useState<User | null>(null);
  const [deleteConfirmCandidate, setDeleteConfirmCandidate] = useState<{ id: string; name: string } | null>(null);

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

  // Nominal student filtering based on year constraint
  const availableStudents = users.filter((u) => u.role === "student" && (selectedYearLevel ? u.yearLevel === parseInt(selectedYearLevel) : true));

  useEffect(() => {
    if (availableStudents.length > 0) {
      // Auto-select first available student
      if (!selectedUserId || !availableStudents.some(u => u.id === selectedUserId)) {
        setSelectedUserId(availableStudents[0].id);
      }
    } else {
      setSelectedUserId("");
    }
  }, [availableStudents, selectedUserId, selectedYearLevel]);

  const filteredPositions = positions.filter((p) => p.electionId === selectedElectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElectionId || !selectedPositionId || !selectedUserId) {
      setErrorNotification("Please select an election, position, and user nominee");
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
          targetYearLevel: selectedYearLevel ? parseInt(selectedYearLevel) : null,
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

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmCandidate({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmCandidate) return;
    const { id } = deleteConfirmCandidate;

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
    } finally {
      setDeleteConfirmCandidate(null);
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
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">REGISTRY MODULE 02</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider">
            NOMINATE CANDIDATES
          </h2>
          <p className="text-xs text-zinc-500">Nominate eligible students to positions with voter cohort locks.</p>
        </div>
      </motion.div>

      {elections.length === 0 || positions.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="glass-panel p-8 text-center flex flex-col items-center justify-center space-y-3"
        >
          <Award size={32} className="text-[var(--accent)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">SETUP PREREQUISITE REQUIRED</p>
          <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
            You must have at least one active election and one position configured before you can nominate candidates.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 glass-panel p-5 md:p-6 space-y-4"
          >
            <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider border-b border-[var(--border)] pb-3">
              NOMINATION BALLOT PANEL
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
                      <option key={el.id} value={el.id}>
                        {el.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Select Position
                </label>
                <div className="relative">
                  <select
                    value={selectedPositionId}
                    onChange={(e) => setSelectedPositionId(e.target.value)}
                    disabled={filteredPositions.length === 0}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] appearance-none cursor-pointer pr-10 outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  >
                    {filteredPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                    {filteredPositions.length === 0 && (
                      <option value="">No positions configured</option>
                    )}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Voter Cohort Lock (Target Year Level)
                </label>
                <div className="relative">
                  <select
                    value={selectedYearLevel}
                    onChange={(e) => setSelectedYearLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] appearance-none cursor-pointer pr-10 outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">All Years (Any student can vote)</option>
                    {[7, 8, 9, 10, 11, 12].map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr} Students Only
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 leading-relaxed">
                  Only students matching the selected year level are allowed to vote for this nominee. Leave unselected for an open ballot.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                  Nominee Student
                </label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={availableStudents.length === 0}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] appearance-none cursor-pointer pr-10 outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  >
                    {availableStudents.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} {u.yearLevel ? `(Year ${u.yearLevel})` : ""}
                      </option>
                    ))}
                    {availableStudents.length === 0 && (
                      <option value="">No eligible students found</option>
                    )}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                    Campaign Manifesto
                  </label>
                </div>
                <motion.textarea
                  rows={4}
                  required
                  placeholder="Manifesto details, pledge statements, and policy goals..."
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)] resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting || filteredPositions.length === 0 || availableStudents.length === 0}
                className="w-full py-3 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--surface)] rounded-none font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <UserPlus size={14} />
                {submitting ? "NOMINATING..." : "NOMINATE CANDIDATE"}
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 glass-panel p-5 md:p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border)] pb-3 gap-3">
              <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider">
                ACTIVE BALLOT REGISTRATION
              </h3>
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search nominees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-4 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs text-[var(--ink)] placeholder-zinc-500 outline-none focus:border-[var(--accent)] transition-colors"
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
                    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                      <h4 className="font-display font-bold text-xs text-[var(--accent)] uppercase tracking-wider">
                        {el.title}
                      </h4>
                    </div>

                    <div className="space-y-4 pl-1">
                      {electionPositions.map((pos) => {
                        const positionCandidates = electionCandidates.filter(
                           (c) => c.positionId === pos.id
                        );

                        if (positionCandidates.length === 0) return null;

                        return (
                          <div key={pos.id} className="space-y-2">
                            <h5 className="text-[10px] font-bold text-[var(--ink)] uppercase tracking-wider pl-1.5 border-l-2 border-[var(--accent)]/50">
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
                                    whileHover={{ scale: 1.01 }}
                                    className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] p-4 rounded-none transition-all hover:border-[var(--accent)] group"
                                  >
                                    <div
                                      className="cursor-pointer group flex-1"
                                      onClick={() => {
                                        const foundUser = users.find(u => u.id === cand.userId);
                                        if (foundUser) {
                                          setSelectedDetailUser(foundUser);
                                        } else {
                                          setModalCandidate(cand);
                                          setModalPosition(pos.name);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        {cand.photoUrl && cand.photoUrl !== "null" && cand.photoUrl !== "" && cand.photoUrl !== "undefined" ? (
                                          <img src={cand.photoUrl} alt={cand.fullName} className="w-10 h-10 rounded-sm object-cover border border-[var(--border)]" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-sm bg-neutral-100 border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--accent)]">
                                            {cand.fullName[0]}
                                          </div>
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                                              {cand.fullName}
                                            </p>
                                            {cand.yearLevel && (
                                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
                                                YEAR {cand.yearLevel} LOCK
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 italic leading-relaxed max-w-md group-hover:text-zinc-700 transition-colors">
                                            "{cand.manifesto}"
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.1, color: "#e11d48" }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDelete(cand.id, cand.fullName)}
                                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-all cursor-pointer shrink-0 ml-4"
                                    >
                                      <Trash2 size={13} />
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
                <div className="text-center py-12 text-zinc-400 space-y-2">
                  <Award size={28} className="mx-auto" />
                  <p className="text-[10px]">No nominees are currently on the ballot board.</p>
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
                  <div className="text-center py-12 text-zinc-400 space-y-2">
                    <Search size={28} className="mx-auto" />
                    <p className="text-[10px]">No nominees match your search.</p>
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
      <UserDetailModal
        user={selectedDetailUser}
        candidates={candidates}
        positions={positions}
        elections={elections}
        votes={votes}
        isOpen={selectedDetailUser !== null}
        onClose={() => setSelectedDetailUser(null)}
      />
      <ConfirmModal
        isOpen={deleteConfirmCandidate !== null}
        onClose={() => setDeleteConfirmCandidate(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Candidate?"
        message={`Are you sure you want to remove ${deleteConfirmCandidate?.name} from the ballot?`}
        confirmText="REMOVE"
        cancelText="CANCEL"
        isDanger={true}
      />
    </motion.div>
  );
}

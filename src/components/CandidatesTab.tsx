import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown, UserPlus, Sparkles, Search, CheckCircle, Flag } from "lucide-react";
import { Election, Position, Candidate, User, Vote, PartyList } from "../types";
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
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Direct Student Search for Nomination
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [partyLists, setPartyLists] = useState<PartyList[]>([]);
  const [selectedPartyListId, setSelectedPartyListId] = useState("");

  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalPosition, setModalPosition] = useState("");
  const [selectedDetailUser, setSelectedDetailUser] = useState<User | null>(null);
  const [deleteConfirmCandidate, setDeleteConfirmCandidate] = useState<{ id: string; name: string } | null>(null);

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

      // Fetch party lists for selected election
      fetch(`/api/partylists?electionId=${selectedElectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setPartyLists(data);
        })
        .catch(() => setPartyLists([]));
    }
  }, [selectedElectionId, positions, token]);

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

  // Direct Nominate Action for a specific student
  const handleNominateStudent = async (studentId: string, studentName: string) => {
    if (!selectedElectionId || !selectedPositionId) {
      setErrorNotification("Please select an election and position first");
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
          userId: studentId,
          targetYearLevel: selectedYearLevel ? parseInt(selectedYearLevel) : null,
          partyListId: selectedPartyListId || null,
          manifesto: manifesto || `${studentName}'s campaign platform.`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to nominate candidate");
      }

      setSuccessNotification(`Successfully nominated ${studentName} to the ballot!`);
      setManifesto("");
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred during nomination");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPositions = positions.filter((p) => p.electionId === selectedElectionId);

  // Search matching students for nomination
  const searchedStudents = users
    .filter((u) => u.role === "student")
    .filter((u) => (selectedYearLevel ? u.yearLevel === parseInt(selectedYearLevel) : true))
    .filter((u) => {
      if (!studentSearchTerm.trim()) return true;
      const term = studentSearchTerm.toLowerCase();
      const sNum = (u.studentNumber || u.username || "").toLowerCase();
      const name = (u.fullName || "").toLowerCase();
      const sec = (u.section || "").toLowerCase();
      return sNum.includes(term) || name.includes(term) || sec.includes(term);
    });

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
      className="space-y-6 font-sans text-slate-800"
    >
      <motion.div variants={itemVariants} className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">CANDIDATE MANAGEMENT</span>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight mt-1">
            Nominate Candidates
          </h2>
          <p className="text-xs text-slate-500">Search student accounts and nominate them directly with instant button actions.</p>
        </div>
      </motion.div>

      {elections.length === 0 || positions.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center space-y-3 shadow-sm"
        >
          <Award size={36} className="text-sky-600" />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-800">Prerequisite Required</p>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Please configure at least one active election and position before nominating candidate nominees.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* NOMINATION PANEL */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-5 shadow-sm"
          >
            <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Nomination Settings
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Election
                </label>
                <div className="relative">
                  <select
                    value={selectedElectionId}
                    onChange={(e) => setSelectedElectionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 appearance-none cursor-pointer pr-10 outline-none focus:border-sky-500 focus:bg-white"
                  >
                    {elections.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.title} ({el.scope ? el.scope.toUpperCase() : "SCHOOLWIDE"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Position
                </label>
                <div className="relative">
                  <select
                    value={selectedPositionId}
                    onChange={(e) => setSelectedPositionId(e.target.value)}
                    disabled={filteredPositions.length === 0}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 appearance-none cursor-pointer pr-10 outline-none focus:border-sky-500 focus:bg-white disabled:opacity-50"
                  >
                    {filteredPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                    {filteredPositions.length === 0 && (
                      <option value="">No positions available</option>
                    )}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {partyLists.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Flag size={12} className="text-sky-600" />
                    <span>Party-List Affiliation (Optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPartyListId}
                      onChange={(e) => setSelectedPartyListId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 appearance-none cursor-pointer pr-10 outline-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="">Independent (No Party-List)</option>
                      {partyLists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({pl.acronym})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Manifesto / Platform
                  </label>
                  <button
                    type="button"
                    onClick={handleAiPolish}
                    disabled={isPolishing}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>{isPolishing ? "Polishing..." : "AI Polish"}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Platform statement or pledges..."
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white resize-none"
                />
              </div>

              {/* INSTANT SEARCH & NOMINATE DIRECT BUTTONS */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Search & Nominate Student
                </label>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Student Number or Name..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-sans"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {searchedStudents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No matching student accounts found.
                    </div>
                  ) : (
                    searchedStudents.map((st) => {
                      const isAlreadyCandidate = candidates.some(
                        (c) => c.positionId === selectedPositionId && c.userId === st.id
                      );

                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-200">
                              {st.fullName[0]}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 truncate">{st.fullName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {st.studentNumber || st.username} {st.section ? `• Sec: ${st.section}` : ""}
                              </p>
                            </div>
                          </div>

                          {isAlreadyCandidate ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0">
                              <CheckCircle size={12} />
                              Nominated
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleNominateStudent(st.id, st.fullName)}
                              disabled={submitting || !selectedPositionId}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                            >
                              <UserPlus size={12} />
                              <span>Nominate</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ACTIVE CANDIDATE BALLOT BOARD */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
              <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Official Candidate Roster
              </h3>
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter nominees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-60 pl-8 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-6">
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
                    (c.party && c.party.toLowerCase().includes(query)) ||
                    positionName.includes(query)
                  );
                });

                if (electionCandidates.length === 0) return null;

                return (
                  <motion.div key={el.id} variants={itemVariants} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <h4 className="font-display font-bold text-xs text-sky-600 uppercase tracking-wider">
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
                            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-2 border-l-2 border-sky-500">
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
                                    whileHover={{ scale: 1.005 }}
                                    className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-xl transition-all hover:border-sky-300 group"
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
                                          <img src={cand.photoUrl} alt={cand.fullName} className="w-10 h-10 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center font-bold text-xs text-sky-700">
                                            {cand.fullName[0]}
                                          </div>
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
                                              {cand.fullName}
                                            </p>
                                            {cand.party && (
                                              <span className="text-[9px] font-semibold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                                                {cand.party}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic leading-relaxed max-w-md">
                                            "{cand.manifesto}"
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.1, color: "#e11d48" }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDelete(cand.id, cand.fullName)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0 ml-3"
                                    >
                                      <Trash2 size={15} />
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

              {candidates.length === 0 && (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Award size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">No candidate nominees on the ballot board.</p>
                </div>
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


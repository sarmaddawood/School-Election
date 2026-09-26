import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Award, ChevronDown, UserPlus, Sparkles, Search, CheckCircle, Flag, Filter, X, RotateCcw } from "lucide-react";
import { Election, Position, Candidate, User, Vote, PartyList } from "../types";
import CandidateModal from "./CandidateModal";
import ConfirmModal from "./ConfirmModal";
import UserDetailModal from "./UserDetailModal";

interface CandidatesTabProps {
  
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
  currentUser?: User;
}

export default function CandidatesTab({
  setErrorNotification,
  setSuccessNotification,
  token,
  currentUser,
}: CandidatesTabProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  const fetchLocalData = async () => {
    try {
      const [elRes, posRes, candRes, usersRes, votesRes] = await Promise.all([
        fetch("/api/elections", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/positions", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/candidates", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/votes", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (elRes.ok) {
        const d = await elRes.json();
        setElections(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      }
      if (posRes.ok) {
        const d = await posRes.json();
        setPositions(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      }
      if (candRes.ok) {
        const d = await candRes.json();
        setCandidates(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      }
      if (votesRes.ok) {
        const d = await votesRes.json();
        setVotes(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
      }
    } catch (err) {
      console.error("Failed to fetch local data:", err);
    }
  };

  useEffect(() => {
    fetchLocalData();
  }, [token]);

  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedNominationStatus, setSelectedNominationStatus] = useState<"all" | "unnominated" | "nominated">("all");
  const [studentSortBy, setStudentSortBy] = useState<"name-asc" | "name-desc" | "section-asc" | "lrn-asc">("name-asc");
  const [manifesto, setManifesto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Direct Student Search for Nomination
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [partyLists, setPartyLists] = useState<PartyList[]>([]);
  const [selectedPartyListId, setSelectedPartyListId] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyAcronym, setNewPartyAcronym] = useState("");
  const [savingParty, setSavingParty] = useState(false);

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
      setSelectedSection("");
      const election = elections.find((e) => e.id === selectedElectionId);
      if (election?.scope === "grade") {
        const rawGrade = election.targetGradeLevel ?? election.scopeValue;
        const g = typeof rawGrade === "number" ? rawGrade : Number.parseInt(String(rawGrade ?? "").replace(/\D+/g, ""), 10);
        setSelectedYearLevel(Number.isFinite(g) ? String(g) : "");
      } else {
        setSelectedYearLevel("");
      }
      if (election?.scope === "section") {
        setSelectedSection(election.targetSection || election.scopeValue || "");
      }

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
  }, [selectedElectionId, positions, token, elections]);

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

  const refreshPartyLists = async () => {
    if (!selectedElectionId) return;
    const response = await fetch(`/api/partylists?electionId=${selectedElectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data)) setPartyLists(data);
  };

  const handleCreatePartyList = async () => {
    if (!newPartyName.trim()) return;
    setSavingParty(true);
    try {
      const response = await fetch("/api/partylists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ electionId: selectedElectionId, name: newPartyName, acronym: newPartyAcronym }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create Party-List");
      setNewPartyName("");
      setNewPartyAcronym("");
      await refreshPartyLists();
      setSuccessNotification("Party-List created successfully");
    } catch (error: any) {
      setErrorNotification(error.message || "Could not create Party-List");
    } finally {
      setSavingParty(false);
    }
  };

  const handleDeletePartyList = async (id: string) => {
    try {
      const response = await fetch(`/api/partylists/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove Party-List");
      if (selectedPartyListId === id) setSelectedPartyListId("");
      await refreshPartyLists();
    } catch (error: any) {
      setErrorNotification(error.message || "Could not remove Party-List");
    }
  };

  // Candidates in the selected election
  const currentElectionCandidates = useMemo(() => {
    return (Array.isArray(candidates) ? candidates : []).filter(
      (c) => c.electionId === selectedElectionId
    );
  }, [candidates, selectedElectionId]);

  // Direct Nominate Action for a specific student
  const handleNominateStudent = async (studentId: string, studentName: string) => {
    if (!selectedElectionId || !selectedPositionId) {
      setErrorNotification("Please select an election and position first");
      return;
    }

    const alreadyNominated = currentElectionCandidates.find(
      (c) =>
        c.userId === studentId ||
        (c.fullName && studentName && c.fullName.trim().toLowerCase() === studentName.trim().toLowerCase())
    );
    if (alreadyNominated) {
      const pos = positions.find((p) => p.id === alreadyNominated.positionId);
      setErrorNotification(`${studentName} is already nominated as ${pos?.name || "a candidate"} in this election.`);
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
      
      await fetchLocalData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred during nomination");
    } finally {
      setSubmitting(false);
    }
  };

  const currentElection = elections.find((e) => e.id === selectedElectionId);

  const isStudentEligible = (student: User, el?: Election): { eligible: boolean; reason?: string } => {
    if (!el) return { eligible: true };
    if (student.role !== "student") return { eligible: false, reason: "Not a student" };
    const scope = el.scope || "all";
    const value = (el.scopeValue || "").trim();

    if (scope === "grade") {
      const rawGrade = el.targetGradeLevel ?? value;
      const targetGrade = typeof rawGrade === "number" ? rawGrade : Number.parseInt(String(rawGrade ?? "").replace(/\D+/g, ""), 10);
      const eligible = Number.isFinite(targetGrade) && student.yearLevel === targetGrade;
      return { eligible, reason: eligible ? undefined : `Requires Grade ${targetGrade}` };
    }
    if (scope === "section") {
      const targetSec = (el.targetSection || value).trim().toLowerCase();
      if (!targetSec || !student.section) return { eligible: false, reason: "Outside section scope" };
      const uSec = student.section.trim().toLowerCase();
      const eligible = uSec === targetSec || uSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim() === targetSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim();
      return { eligible, reason: eligible ? undefined : `Requires Sec ${el.targetSection || value}` };
    }
    if (scope === "room") {
      const targetRoom = (el.targetRoom || value).trim().toLowerCase();
      if (!targetRoom || !student.room) return { eligible: false, reason: "Outside room scope" };
      const uRoom = student.room.trim().toLowerCase();
      const eligible = uRoom === targetRoom || uRoom.replace(/^room\s*/i, "").trim() === targetRoom.replace(/^room\s*/i, "").trim();
      return { eligible, reason: eligible ? undefined : `Requires Room ${el.targetRoom || value}` };
    }
    return { eligible: true };
  };

  const filteredPositions = positions.filter((p) => p.electionId === selectedElectionId);

  // Available grade levels from student accounts
  const availableGrades = useMemo(() => {
    const grades = new Set<number>();
    users.forEach((u) => {
      if (u.role === "student" && typeof u.yearLevel === "number" && !isNaN(u.yearLevel)) {
        grades.add(u.yearLevel);
      }
    });
    return Array.from(grades).sort((a, b) => a - b);
  }, [users]);

  // Available sections from student accounts, dynamically filtered by selected grade or scope
  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    const targetGrade = currentElection?.scope === "grade"
      ? (currentElection.targetGradeLevel ?? Number.parseInt(String(currentElection.scopeValue ?? "").replace(/\D+/g, ""), 10))
      : (selectedYearLevel ? parseInt(selectedYearLevel) : null);

    users.forEach((u) => {
      if (u.role === "student" && u.section && u.section.trim()) {
        const sec = u.section.trim();
        if (targetGrade && Number.isFinite(targetGrade)) {
          if (u.yearLevel === targetGrade) {
            sections.add(sec);
          }
        } else {
          sections.add(sec);
        }
      }
    });
    return Array.from(sections).sort((a, b) => a.localeCompare(b));
  }, [users, selectedYearLevel, currentElection]);

  // Search, filter, and sort matching students for nomination based on the election scope
  const searchedStudents = useMemo(() => {
    return users
      .filter((u) => u.role === "student")
      // 1. Election Scope Filtering:
      // - overall ("all" or undefined): all students appear
      // - grade ("grade"): only students of that grade appear
      // - section ("section"): only students of that section appear
      // - room ("room"): only students of that room appear
      .filter((u) => {
        if (!currentElection) return true;
        const scope = currentElection.scope || "all";
        const val = (currentElection.scopeValue || "").trim();

        if (scope === "grade") {
          const rawGrade = currentElection.targetGradeLevel ?? val;
          const targetGrade = typeof rawGrade === "number" ? rawGrade : Number.parseInt(String(rawGrade ?? "").replace(/\D+/g, ""), 10);
          return Number.isFinite(targetGrade) && u.yearLevel === targetGrade;
        }
        if (scope === "section") {
          const targetSec = (currentElection.targetSection || val).toLowerCase();
          if (!targetSec || !u.section) return false;
          const uSec = u.section.trim().toLowerCase();
          return uSec === targetSec || uSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim() === targetSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim();
        }
        if (scope === "room") {
          const targetRoom = (currentElection.targetRoom || val).toLowerCase();
          if (!targetRoom || !u.room) return false;
          const uRoom = u.room.trim().toLowerCase();
          return uRoom === targetRoom || uRoom.replace(/^room\s*/i, "").trim() === targetRoom.replace(/^room\s*/i, "").trim();
        }
        return true;
      })
      // 2. Secondary Year Level filter (for overall elections)
      .filter((u) => {
        if (currentElection?.scope === "grade") return true;
        return selectedYearLevel ? u.yearLevel === parseInt(selectedYearLevel) : true;
      })
      // 3. Secondary Section filter (for overall or grade-level elections)
      .filter((u) => {
        if (currentElection?.scope === "section") return true;
        if (!selectedSection) return true;
        return (u.section || "").trim().toLowerCase() === selectedSection.trim().toLowerCase();
      })
      // 4. Search input by name, student number, section, or room
      .filter((u) => {
        if (!studentSearchTerm.trim()) return true;
        const term = studentSearchTerm.toLowerCase().trim();
        const sNum = (u.studentNumber || "").toLowerCase();
        const name = (u.fullName || "").toLowerCase();
        const sec = (u.section || "").toLowerCase();
        const rm = (u.room || "").toLowerCase();
        return sNum.includes(term) || name.includes(term) || sec.includes(term) || rm.includes(term);
      })
      // 5. Nomination Status filter (All, Not Nominated, Nominated)
      .filter((u) => {
        if (selectedNominationStatus === "all") return true;
        const isNominatedInElection = currentElectionCandidates.some(
          (c) =>
            c.userId === u.id ||
            (u.studentNumber && c.userId === u.studentNumber) ||
            (c.fullName && u.fullName && c.fullName.trim().toLowerCase() === u.fullName.trim().toLowerCase())
        );
        if (selectedNominationStatus === "unnominated") {
          return !isNominatedInElection;
        }
        if (selectedNominationStatus === "nominated") {
          return isNominatedInElection;
        }
        return true;
      })
      .sort((a, b) => {
        if (studentSortBy === "name-asc") {
          return (a.fullName || "").localeCompare(b.fullName || "");
        }
        if (studentSortBy === "name-desc") {
          return (b.fullName || "").localeCompare(a.fullName || "");
        }
        if (studentSortBy === "section-asc") {
          const secCompare = (a.section || "").localeCompare(b.section || "");
          if (secCompare !== 0) return secCompare;
          return (a.fullName || "").localeCompare(b.fullName || "");
        }
        if (studentSortBy === "lrn-asc") {
          return (a.studentNumber || "").localeCompare(b.studentNumber || "");
        }
        return 0;
      });
  }, [
    users,
    currentElection,
    selectedYearLevel,
    selectedSection,
    studentSearchTerm,
    selectedNominationStatus,
    studentSortBy,
    currentElectionCandidates,
  ]);

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
      
      await fetchLocalData();
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
                    {(Array.isArray(elections) ? elections : []).map((el) => (
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
                {currentElection && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scope:</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      currentElection.scope === "grade"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : currentElection.scope === "section"
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : currentElection.scope === "room"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}>
                      {currentElection.scope === "grade"
                        ? `Grade ${currentElection.targetGradeLevel || currentElection.scopeValue}`
                        : currentElection.scope === "section"
                        ? `Section ${currentElection.targetSection || currentElection.scopeValue}`
                        : currentElection.scope === "room"
                        ? `Room ${currentElection.targetRoom || currentElection.scopeValue}`
                        : "School-Wide (All Eligible Students)"}
                    </span>
                  </div>
                )}
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

              {elections.find((e) => e.id === selectedElectionId)?.hasPartyList && (
                <div className="space-y-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Flag size={12} /> Manage Party-Lists
                  </label>
                  <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                    <input type="text" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder="Party-List name (e.g. LEAD, AGILA)" className="min-w-0 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
                    <input type="text" value={newPartyAcronym} onChange={(e) => setNewPartyAcronym(e.target.value.toUpperCase())} placeholder="Acronym" maxLength={12} className="min-w-0 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
                    <button type="button" onClick={handleCreatePartyList} disabled={!newPartyName.trim() || savingParty} className="px-3 py-2 bg-indigo-600 disabled:bg-indigo-200 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed">ADD</button>
                  </div>
                  {partyLists.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {partyLists.map((partyList) => (
                        <span key={partyList.id} className="inline-flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-800 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {partyList.name}{partyList.acronym ? ` (${partyList.acronym})` : ""}
                          <button type="button" onClick={() => handleDeletePartyList(partyList.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer" aria-label={`Remove ${partyList.name}`}><Trash2 size={11} /></button>
                        </span>
                      ))}
                    </div>
                  )}
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
                  placeholder="Platform statement, advocacies, or pledges..."
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white resize-none"
                />
              </div>

              {/* INSTANT SEARCH & NOMINATE DIRECT BUTTONS */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Search & Nominate Student
                    </label>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                      {searchedStudents.length}
                    </span>
                  </div>
                  {currentElection && currentElection.scope && currentElection.scope !== "all" ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>Scope:</span>
                      <span>
                        {currentElection.scope === "grade"
                          ? `Grade ${currentElection.targetGradeLevel || currentElection.scopeValue} only`
                          : currentElection.scope === "section"
                          ? `Section ${currentElection.targetSection || currentElection.scopeValue} only`
                          : `Room ${currentElection.targetRoom || currentElection.scopeValue} only`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      Overall (All Students)
                    </span>
                  )}
                </div>

                {/* Search Bar with Clear Button */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by student name, 12-digit LRN, or section..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-sans transition-all"
                  />
                  {studentSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer transition-colors"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Controls: Grade Level, Section, Nomination Status */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Grade Level Dropdown */}
                    <div className="relative">
                      {currentElection?.scope === "grade" ? (
                        <div className="w-full px-2.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 truncate flex items-center justify-between">
                          <span>Grade {currentElection.targetGradeLevel || currentElection.scopeValue}</span>
                          <span className="text-[9px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Scope</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedYearLevel}
                            onChange={(e) => {
                              setSelectedYearLevel(e.target.value);
                              setSelectedSection("");
                            }}
                            className="w-full px-2.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-sky-500 focus:bg-white appearance-none cursor-pointer pr-7 transition-colors truncate"
                          >
                            <option value="">All Grades</option>
                            {availableGrades.map((g) => (
                              <option key={g} value={g}>
                                Grade {g}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={13}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </>
                      )}
                    </div>

                    {/* Section Dropdown */}
                    <div className="relative">
                      {currentElection?.scope === "section" ? (
                        <div className="w-full px-2.5 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs font-bold text-violet-800 truncate flex items-center justify-between">
                          <span>Section {currentElection.targetSection || currentElection.scopeValue}</span>
                          <span className="text-[9px] uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">Scope</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-sky-500 focus:bg-white appearance-none cursor-pointer pr-7 transition-colors truncate"
                          >
                            <option value="">All Sections</option>
                            {availableSections.map((sec) => (
                              <option key={sec} value={sec}>
                                {sec}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={13}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </>
                      )}
                    </div>

                    {/* Nomination Status */}
                    <div className="relative col-span-2 sm:col-span-1">
                      <select
                        value={selectedNominationStatus}
                        onChange={(e) => setSelectedNominationStatus(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-sky-500 focus:bg-white appearance-none cursor-pointer pr-7 transition-colors truncate"
                      >
                        <option value="all">All Status</option>
                        <option value="unnominated">Not Nominated</option>
                        <option value="nominated">Nominated</option>
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Quick Section Filter Chips for 1-tap filtering */}
                  {availableSections.length > 0 && availableSections.length <= 8 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setSelectedSection("")}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                          !selectedSection
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        All
                      </button>
                      {availableSections.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSelectedSection(selectedSection === sec ? "" : sec)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                            selectedSection === sec
                              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Filter Bar & Reset */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-0.5">
                    <span className="font-medium text-slate-600">
                      Showing <strong className="text-slate-900">{searchedStudents.length}</strong> {searchedStudents.length === 1 ? "student" : "students"}
                    </span>
                    {(studentSearchTerm || (currentElection?.scope !== "grade" && selectedYearLevel) || (currentElection?.scope !== "section" && selectedSection) || selectedNominationStatus !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentSearchTerm("");
                          if (currentElection?.scope !== "grade") setSelectedYearLevel("");
                          if (currentElection?.scope !== "section") setSelectedSection("");
                          setSelectedNominationStatus("all");
                        }}
                        className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <RotateCcw size={11} />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {searchedStudents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      {currentElection?.scope === "grade"
                        ? `No Grade ${currentElection.targetGradeLevel || currentElection.scopeValue} students found matching your filters.`
                        : currentElection?.scope === "section"
                        ? `No Section ${currentElection.targetSection || currentElection.scopeValue} students found matching your filters.`
                        : currentElection?.scope === "room"
                        ? `No Room ${currentElection.targetRoom || currentElection.scopeValue} students found matching your filters.`
                        : "No matching student accounts found."}
                    </div>
                  ) : (
                    searchedStudents.map((st) => {
                      const nominatedCandidate = currentElectionCandidates.find(
                        (c) =>
                          c.userId === st.id ||
                          (st.studentNumber && c.userId === st.studentNumber) ||
                          (c.fullName && st.fullName && c.fullName.trim().toLowerCase() === st.fullName.trim().toLowerCase())
                      );
                      const isNominatedThisPosition = nominatedCandidate && nominatedCandidate.positionId === selectedPositionId;
                      const nominatedPos = nominatedCandidate ? positions.find((p) => p.id === nominatedCandidate.positionId) : null;
                      const nominatedPosName = nominatedPos?.name || "Another Position";

                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-3 border rounded-xl transition-all bg-slate-50 hover:bg-slate-100 border-slate-200"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-200 overflow-hidden">
                              {st.photoUrl && st.photoUrl !== "null" && st.photoUrl !== "" && st.photoUrl !== "undefined" ? (
                                <img src={st.photoUrl} alt={st.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                st.fullName[0]
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 truncate">{st.fullName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {st.studentNumber} {st.section ? `• Sec: ${st.section}` : ""} {st.yearLevel ? `• Gr: ${st.yearLevel}` : ""}
                              </p>
                            </div>
                          </div>

                          {isNominatedThisPosition ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0">
                              <CheckCircle size={12} />
                              Nominated
                            </span>
                          ) : nominatedCandidate ? (
                            <span
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 shrink-0"
                              title={`Already nominated for ${nominatedPosName} in this election`}
                            >
                              <Award size={12} />
                              Nominated ({nominatedPosName})
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
                  placeholder="Filter roster by nominee or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-60 pl-8 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-6">
              {(Array.isArray(elections) ? elections : []).map((el) => {
                const electionPositions = (Array.isArray(positions) ? positions : []).filter((p) => p.electionId === el.id);
                const electionCandidates = (Array.isArray(candidates) ? candidates : []).filter((c) => {
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
        token={token}
        onRefreshData={fetchLocalData}
        setErrorNotification={setErrorNotification}
        setSuccessNotification={setSuccessNotification}
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


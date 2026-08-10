import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart3, ChevronDown, Award, Lock, Trophy, Users, AlertCircle, CheckCircle2, Search, XCircle } from "lucide-react";
import { Election, Position, Candidate, User, ElectionPhase } from "../types";
import Countdown from "./Countdown";
import { PodiumSkeleton } from "./Skeleton";
import CandidateDonutChart from "./CandidateDonutChart";

interface ResultsPageProps {
  user: User;
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  token: string;
}

export default function ResultsPage({
  user,
  elections,
  positions,
  candidates,
  token,
}: ResultsPageProps) {
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  // Unvoted Students & Turnout State
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [votedUserIds, setVotedUserIds] = useState<string[]>([]);
  const [unvotedSearchTerm, setUnvotedSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"tally" | "unvoted">("tally");

  const getPhase = (startsAt: string, endsAt: string): ElectionPhase => {
    const now = new Date();
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      const activeOrLast =
        elections.find((e) => getPhase(e.startsAt, e.endsAt) === "live") ||
        elections[elections.length - 1];
      setSelectedElectionId(activeOrLast.id);
    }
  }, [elections]);

  const fetchLatestCandidates = async (electionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/candidates?electionId=${electionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setLocalCandidates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch voters status for Admin / Teacher turnout analysis
  const fetchVoterTurnoutData = async (electionId: string) => {
    try {
      const response = await fetch(`/api/elections/${electionId}/turnout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load turnout");
      const students = Array.isArray(data.students) ? data.students : [];
      setAllStudents(students);
      setVotedUserIds(students.filter((student: any) => student.hasVoted).map((student: User) => student.id));
    } catch (err) {
      console.error("Turnout fetch error", err);
    }
  };

  useEffect(() => {
    if (selectedElectionId) {
      fetchLatestCandidates(selectedElectionId);
      if (user.role === "admin" || user.role === "teacher") {
        fetchVoterTurnoutData(selectedElectionId);
      }
    }
  }, [selectedElectionId, candidates, user.role]);

  const currentElection = elections.find((e) => e.id === selectedElectionId);
  const phase = currentElection ? getPhase(currentElection.startsAt, currentElection.endsAt) : "ended";

  const isSealed = phase !== "ended" && user.role !== "admin" && user.role !== "teacher";

  const electionPositions = selectedElectionId
    ? positions.filter((p) => p.electionId === selectedElectionId)
    : [];

  const getSortedCandidates = (posId: string) => {
    return localCandidates
      .filter((c) => c.positionId === posId)
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  };

  // Filter non-voted students
  const unvotedStudents = allStudents.filter((st) => !votedUserIds.includes(st.id)).filter((st) => {
    if (!unvotedSearchTerm.trim()) return true;
    const term = unvotedSearchTerm.toLowerCase();
    return (
      (st.studentNumber || "").toLowerCase().includes(term) ||
      (st.fullName || "").toLowerCase().includes(term) ||
      (st.section || "").toLowerCase().includes(term) ||
      (st.room || "").toLowerCase().includes(term)
    );
  });

  const turnoutPercentage = allStudents.length > 0
    ? Math.round((votedUserIds.length / allStudents.length) * 100)
    : 0;

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
      className="space-y-6 max-w-5xl mx-auto font-sans text-slate-800"
    >
      <motion.div
        variants={itemVariants}
        className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">AUDIT & RESULTS</span>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="text-sky-600" size={24} />
            Election Tally & Turnout
          </h2>
          <p className="text-xs text-slate-500">Live vote counts, turnout analytics, and unvoted student tracking.</p>
        </div>

        {elections.length > 0 && (
          <div className="relative w-full sm:w-64">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase appearance-none cursor-pointer pr-10 outline-none focus:border-sky-500"
            >
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        )}
      </motion.div>

      {(user.role === "admin" || user.role === "teacher") && (
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab("tally")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "tally"
                ? "bg-white text-sky-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={14} />
            <span>Candidate Tallies</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("unvoted")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "unvoted"
                ? "bg-white text-sky-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={14} />
            <span>Unvoted Students ({unvotedStudents.length})</span>
            <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full text-[10px]">
              {turnoutPercentage}% Turnout
            </span>
          </button>
        </div>
      )}

      {elections.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-16 text-center space-y-4 border border-slate-200 shadow-sm"
        >
          <BarChart3 size={36} className="mx-auto text-sky-600" />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-800">No Elections Configured</p>
          <p className="text-xs text-slate-500">Configure elections to view live vote analytics.</p>
        </motion.div>
      ) : activeSubTab === "unvoted" && (user.role === "admin" || user.role === "teacher") ? (
        /* UNVOTED STUDENTS TAB FOR TEACHERS/ADMINS */
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Non-Voted Student Roster
              </h3>
              <p className="text-xs text-slate-500">
                {votedUserIds.length} of {allStudents.length} students have cast their vote ({turnoutPercentage}% turnout)
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search non-voted students..."
                value={unvotedSearchTerm}
                onChange={(e) => setUnvotedSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unvotedStudents.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                {allStudents.length === 0
                  ? "No student accounts found."
                  : "All eligible students have successfully cast their ballots!"}
              </div>
            ) : (
              unvotedStudents.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-200">
                    <XCircle size={18} />
                  </div>
                  <div className="overflow-hidden text-xs">
                    <p className="font-bold text-slate-800 truncate">{st.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {st.studentNumber}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                      {st.yearLevel && <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Gr. {st.yearLevel}</span>}
                      {st.section && <span>Sec: {st.section}</span>}
                      {st.room && <span>Rm: {st.room}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      ) : isSealed ? (
        /* SEALED RESULT SHIELD FOR REGULAR STUDENTS */
        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="bg-slate-900 text-white rounded-2xl p-8 md:p-12 relative overflow-hidden border border-slate-800 shadow-xl"
          >
            <div className="relative z-10 space-y-5 max-w-xl">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Lock size={26} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                  ELECTION INTEGRITY SEALED
                </span>
                <h3 className="font-display font-extrabold text-xl md:text-2xl text-white tracking-tight">
                  Ballot tallies are sealed while voting is in progress.
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  To ensure complete election integrity and prevent bandwagon effects, running totals are sealed during active voting. Results will be published automatically once the scheduled election ends.
                </p>
              </div>
            </div>
          </motion.div>

          {currentElection && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <Countdown
                startsAt={currentElection.startsAt}
                endsAt={currentElection.endsAt}
                onFinished={() => fetchLatestCandidates(selectedElectionId)}
              />
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <PodiumSkeleton key={i} />
          ))}
        </div>
      ) : (
        /* CANDIDATE TALLY & PODIUM BOARD */
        <div className="space-y-8">
          {electionPositions.map((pos, posIdx) => {
            const sorted = getSortedCandidates(pos.id);
            const totalVotes = sorted.reduce((sum, c) => sum + (c.voteCount || 0), 0);

            const first = sorted[0];
            const second = sorted[1];
            const third = sorted[2];

            return (
              <motion.div
                key={pos.id}
                variants={itemVariants}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm"
              >
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Award className="text-sky-600" size={18} />
                      {pos.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {totalVotes} total verified votes cast for this position
                    </p>
                  </div>

                  {phase === "ended" && first && first.voteCount > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg w-fit">
                      <Trophy size={14} className="text-amber-600" />
                      ELECTED: {first.fullName.toUpperCase()}
                    </span>
                  )}
                </div>

                {sorted.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    {/* Podium columns */}
                    <div className="md:col-span-5 flex justify-center pt-6 order-last md:order-first">
                      <div className="flex items-end justify-center w-full max-w-xs gap-3">
                        {/* 2nd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {second ? (
                            <>
                              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-300 font-bold text-xs flex items-center justify-center mb-1 overflow-hidden">
                                {second.photoUrl && second.photoUrl !== "null" && second.photoUrl !== "" ? (
                                  <img src={second.photoUrl} alt={second.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  second.fullName[0]
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 truncate max-w-full pb-0.5">
                                {second.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-bold text-slate-500 pb-2">
                                {second.voteCount} v
                              </span>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-t-xl h-20 flex items-center justify-center font-bold text-slate-500 text-xs">
                                2ND
                              </div>
                            </>
                          ) : (
                            <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-t-xl h-12" />
                          )}
                        </div>

                        {/* 1st place */}
                        <div className="flex flex-col items-center w-1/3">
                          {first ? (
                            <>
                              <Trophy size={18} className="text-amber-500 mb-1 animate-bounce" />
                              <div className="h-11 w-11 rounded-full bg-amber-100 border-2 border-amber-400 font-bold text-sm flex items-center justify-center mb-1 overflow-hidden shadow-sm">
                                {first.photoUrl && first.photoUrl !== "null" && first.photoUrl !== "" ? (
                                  <img src={first.photoUrl} alt={first.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  first.fullName[0]
                                )}
                              </div>
                              <span className="text-xs font-extrabold text-slate-900 truncate max-w-full pb-0.5">
                                {first.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-black text-amber-600 pb-2">
                                {first.voteCount} v
                              </span>
                              <div className="w-full bg-amber-100 border-2 border-amber-300 rounded-t-xl h-28 flex items-center justify-center font-black text-amber-800 text-sm shadow-inner">
                                1ST
                              </div>
                            </>
                          ) : (
                            <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-t-xl h-12" />
                          )}
                        </div>

                        {/* 3rd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {third ? (
                            <>
                              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-300 font-bold text-xs flex items-center justify-center mb-1 overflow-hidden">
                                {third.photoUrl && third.photoUrl !== "null" && third.photoUrl !== "" ? (
                                  <img src={third.photoUrl} alt={third.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  third.fullName[0]
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 truncate max-w-full pb-0.5">
                                {third.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-bold text-slate-500 pb-2">
                                {third.voteCount} v
                              </span>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-t-xl h-14 flex items-center justify-center font-bold text-slate-500 text-xs">
                                3RD
                              </div>
                            </>
                          ) : (
                            <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-t-xl h-12" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bars visualizer list */}
                    <div className="md:col-span-7 space-y-3.5">
                      {sorted.map((cand, candIdx) => {
                        const pct = totalVotes > 0 ? Math.round((cand.voteCount / totalVotes) * 100) : 0;
                        return (
                          <div key={cand.id} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                              <span className="flex items-center gap-2">
                                <span>{cand.fullName}</span>
                                {cand.party && <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-normal">{cand.party}</span>}
                              </span>
                              <span className="text-sky-600 font-mono">
                                {cand.voteCount} {cand.voteCount === 1 ? "vote" : "votes"} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: candIdx * 0.03 }}
                                className="bg-sky-600 h-full rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sorted.length > 0 && (
                  <div className="border-t border-slate-100 pt-5">
                    <CandidateDonutChart
                      totalVotes={totalVotes}
                      data={sorted.map((cand) => ({
                        id: cand.id,
                        name: cand.fullName,
                        votes: cand.voteCount || 0,
                        percentage: totalVotes > 0 ? Math.round(((cand.voteCount || 0) / totalVotes) * 100) : 0,
                      }))}
                    />
                  </div>
                )}

                {sorted.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    No candidates nominated for this position.
                  </div>
                )}
              </motion.div>
            );
          })}

          {electionPositions.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              No positions configured for this election.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


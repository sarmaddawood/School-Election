import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart3, ChevronDown, Award, Lock, Trophy } from "lucide-react";
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

  useEffect(() => {
    if (selectedElectionId) {
      fetchLatestCandidates(selectedElectionId);
    }
  }, [selectedElectionId, candidates]);

  const currentElection = elections.find((e) => e.id === selectedElectionId);
  const phase = currentElection ? getPhase(currentElection.startsAt, currentElection.endsAt) : "ended";

  const isSealed = phase !== "ended" && user.role !== "admin";

  const electionPositions = selectedElectionId
    ? positions.filter((p) => p.electionId === selectedElectionId)
    : [];

  const getSortedCandidates = (posId: string) => {
    return localCandidates
      .filter((c) => c.positionId === posId)
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
      className="space-y-8 max-w-4xl mx-auto"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="font-display font-semibold text-2xl text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-violet-400 animate-pulse" size={24} />
            Election Results
          </h2>
          <p className="text-sm text-zinc-400">Live counts for administrators and finalized tallies for voters</p>
        </div>

        {elections.length > 0 && (
          <div className="relative w-full sm:w-64">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full px-4 py-2.5 glass-input rounded-xl text-xs font-semibold appearance-none cursor-pointer pr-10 text-white outline-none"
            >
              {elections.map((el) => (
                <option key={el.id} value={el.id} className="bg-black text-white">
                  {el.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
          </div>
        )}
      </motion.div>

      {elections.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-16 text-center space-y-4 shadow-2xl border border-white/5"
        >
          <BarChart3 size={32} className="mx-auto text-zinc-500" />
          <p className="font-medium text-zinc-300">No Elections Created Yet</p>
          <p className="text-xs text-zinc-400">Elections and ballot boards must exist to see analytics.</p>
        </motion.div>
      ) : isSealed ? (
        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="glass-panel text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl border border-white/10"
          >
            <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[80px]" />

            <div className="relative z-10 space-y-6 max-w-xl">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-violet-400 w-fit shadow-md"
              >
                <Lock size={28} />
              </motion.div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">
                  Election Integrity Guard
                </span>
                <h3 className="font-display font-semibold text-2xl md:text-3xl text-white tracking-tight">
                  Ballot tallies are sealed until voting completes.
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed pt-1">
                  To ensure complete election integrity, results are cryptographically isolated and will be released simultaneously to all students and faculty once the final voting deadline expires.
                </p>
              </div>
            </div>
          </motion.div>

          {currentElection && (
            <div className="glass-panel rounded-2xl p-6 shadow-xl">
              <Countdown
                startsAt={currentElection.startsAt}
                endsAt={currentElection.endsAt}
                onFinished={() => fetchLatestCandidates(selectedElectionId)}
              />
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="space-y-8 animate-fade-in">
          {[1, 2].map((i) => (
            <PodiumSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
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
                className="glass-panel rounded-2xl p-6 shadow-2xl space-y-8 border border-white/5"
              >
                <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-white text-lg flex items-center gap-2">
                      <Award className="text-violet-400" size={20} />
                      {pos.name}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Winner determination board • {totalVotes} total votes cast
                    </p>
                  </div>

                  {phase === "ended" && first && first.voteCount > 0 && (
                    <motion.span
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_8px_#8b5cf622]"
                    >
                      <Trophy size={12} className="text-amber-400" />
                      Winner: {first.fullName.split(" ")[0]}
                    </motion.span>
                  )}
                </div>

                {sorted.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    {/* Podium columns */}
                    <div className="md:col-span-5 flex justify-center pt-8 order-last md:order-first">
                      <div className="flex items-end justify-center w-full max-w-xs gap-3">
                        {/* 2nd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {second ? (
                            <>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.1 + 0.2 }}
                                className="h-8 w-8 rounded-full bg-white/5 text-zinc-300 font-bold text-xs flex items-center justify-center font-display mb-2 border border-white/10 shadow-md"
                              >
                                {second.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                              </motion.div>
                              <span className="text-[10px] font-semibold text-zinc-300 truncate max-w-full pb-1 text-center">
                                {second.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-bold text-zinc-400 font-mono pb-2">
                                {second.voteCount}
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 96 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: posIdx * 0.1 }}
                                className="w-full bg-white/5 border border-white/10 rounded-t-xl flex items-center justify-center font-bold text-zinc-400 text-sm shadow-md"
                              >
                                2nd
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-white/2 border border-dashed border-white/10 rounded-t-xl h-12" />
                          )}
                        </div>

                        {/* 1st place */}
                        <div className="flex flex-col items-center w-1/3">
                          {first ? (
                            <>
                              <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                              >
                                <Trophy size={20} className="text-amber-400 mb-1" />
                              </motion.div>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.1 + 0.1 }}
                                className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-300 font-bold text-xs flex items-center justify-center font-display mb-2 border border-amber-500/30 shadow-[0_0_12px_#f59e0b22]"
                              >
                                {first.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                              </motion.div>
                              <span className="text-xs font-semibold text-zinc-100 truncate max-w-full pb-1 text-center">
                                {first.fullName.split(" ")[0]}
                              </span>
                              <span className="text-sm font-bold text-amber-400 font-mono pb-2">
                                {first.voteCount}
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 144 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: posIdx * 0.1 }}
                                className="w-full bg-amber-500/10 border border-amber-500/30 rounded-t-xl flex items-center justify-center font-bold text-amber-300 text-base shadow-lg"
                              >
                                1st
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-white/2 border border-dashed border-white/10 rounded-t-xl h-12" />
                          )}
                        </div>

                        {/* 3rd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {third ? (
                            <>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.1 + 0.3 }}
                                className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-400 font-bold text-xs flex items-center justify-center font-display mb-2 border border-orange-500/30 shadow-[0_0_12px_#f9731622]"
                              >
                                {third.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                              </motion.div>
                              <span className="text-[10px] font-semibold text-zinc-300 truncate max-w-full pb-1 text-center">
                                {third.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-bold text-orange-400 font-mono pb-2">
                                {third.voteCount}
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 64 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: posIdx * 0.1 }}
                                className="w-full bg-orange-500/10 border border-orange-500/20 rounded-t-xl flex items-center justify-center font-bold text-orange-400 text-xs shadow-md"
                              >
                                3rd
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-white/2 border border-dashed border-white/10 rounded-t-xl h-12" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bars visualizer list */}
                    <div className="md:col-span-7 space-y-4">
                      {sorted.map((cand, candIdx) => {
                        const pct = totalVotes > 0 ? Math.round((cand.voteCount / totalVotes) * 100) : 0;
                        return (
                          <div key={cand.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-semibold text-zinc-300">
                              <span>{cand.fullName}</span>
                              <span className="font-mono text-zinc-400">
                                {cand.voteCount} {cand.voteCount === 1 ? "vote" : "votes"} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: candIdx * 0.05 }}
                                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full shadow-[0_0_8px_#8b5cf666]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sorted.length > 0 && (
                  <div className="border-t border-white/5 pt-6 mt-2">
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
                  <div className="text-center py-6 text-zinc-500 text-xs italic">
                    No candidates nominated for this position.
                  </div>
                )}
              </motion.div>
            );
          })}

          {electionPositions.length === 0 && (
            <div className="glass-panel rounded-2xl p-16 text-center text-zinc-400 shadow-xl border border-white/5">
              No positions configured for this election.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

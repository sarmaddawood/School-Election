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
      className="space-y-8 max-w-4xl mx-auto font-mono text-[var(--ink)]"
    >
      <motion.div
        variants={itemVariants}
        className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">RESULTS_LEDGER_05</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="text-[var(--accent)] animate-pulse" size={24} />
            ELECTION RESULTS BOARD
          </h2>
          <p className="text-xs text-zinc-500">Real-time counts for auditing administrators and finalized tallies for eligible voters.</p>
        </div>

        {elections.length > 0 && (
          <div className="relative w-full sm:w-64">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-none text-xs font-bold text-[var(--ink)] uppercase tracking-wider appearance-none cursor-pointer pr-10 outline-none focus:border-[var(--accent)]"
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
        )}
      </motion.div>

      {elections.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="glass-panel p-16 text-center space-y-4"
        >
          <BarChart3 size={32} className="mx-auto text-[var(--accent)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO_ELECTIONS_AUDITED</p>
          <p className="text-[10px] text-zinc-500">Configure elections and ballot boards to initialize analytical result displays.</p>
        </motion.div>
      ) : isSealed ? (
        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="glass-panel p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-soft)] blur-[80px]" />

            <div className="relative z-10 space-y-6 max-w-xl">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="p-3 bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent)] w-fit"
              >
                <Lock size={28} />
              </motion.div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest block">
                  ELECTION_INTEGRITY_SHIELD
                </span>
                <h3 className="font-display font-black text-xl md:text-2xl text-[var(--ink)] uppercase tracking-wider">
                  Ballot tallies are sealed until voting completes.
                </h3>
                <p className="text-zinc-600 text-xs leading-relaxed pt-1">
                  To ensure complete election integrity, current running totals are isolated. Results will be authorized and decrypted for all students and faculty once the scheduled voting phase reaches absolute completion.
                </p>
              </div>
            </div>
          </motion.div>

          {currentElection && (
            <div className="glass-panel p-6">
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
                className="glass-panel p-6 space-y-8"
              >
                <div className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-display font-bold text-[var(--ink)] text-sm uppercase tracking-wider flex items-center gap-2">
                      <Award className="text-[var(--accent)]" size={18} />
                      {pos.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                      Winner determination matrix • {totalVotes} total votes verified
                    </p>
                  </div>

                  {phase === "ended" && first && first.voteCount > 0 && (
                    <motion.span
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent)] text-[9px] font-bold uppercase tracking-widest"
                    >
                      <Trophy size={11} className="text-[var(--accent)]" />
                      WINNER: {first.fullName.toUpperCase()}
                    </motion.span>
                  )}
                </div>

                {sorted.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    {/* Podium columns */}
                    <div className="md:col-span-5 flex justify-center pt-8 order-last md:order-first">
                      <div className="flex items-end justify-center w-full max-w-xs gap-3 font-mono">
                        {/* 2nd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {second ? (
                            <>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.05 + 0.1 }}
                                className="h-8 w-8 bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] font-bold text-[10px] flex items-center justify-center mb-2"
                              >
                                {second.photoUrl ? (
                                  <img src={second.photoUrl} alt={second.fullName} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                                ) : (
                                  second.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")
                                )}
                              </motion.div>
                              <span className="text-[9px] font-bold text-zinc-600 truncate max-w-full pb-1 uppercase">
                                {second.fullName.split(" ")[0]}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 pb-2">
                                {second.voteCount} V
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 80 }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: posIdx * 0.05 }}
                                className="w-full bg-neutral-100 border border-[var(--border)] flex items-center justify-center font-bold text-zinc-400 text-[10px] uppercase"
                              >
                                2ND
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-[var(--bg)] border border-dashed border-[var(--border)] h-12" />
                          )}
                        </div>

                        {/* 1st place */}
                        <div className="flex flex-col items-center w-1/3">
                          {first ? (
                            <>
                              <motion.div
                                animate={{ y: [0, -2, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                              >
                                <Trophy size={16} className="text-[var(--accent)] mb-1" />
                              </motion.div>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.05 }}
                                className="h-10 w-10 bg-[var(--accent-soft)] border-2 border-[var(--accent)] text-[var(--accent)] font-bold text-xs flex items-center justify-center mb-2"
                              >
                                {first.photoUrl ? (
                                  <img src={first.photoUrl} alt={first.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  first.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")
                                )}
                              </motion.div>
                              <span className="text-[10px] font-extrabold text-[var(--ink)] truncate max-w-full pb-1 uppercase">
                                {first.fullName.split(" ")[0]}
                              </span>
                              <span className="text-xs font-black text-[var(--accent)] pb-2">
                                {first.voteCount} V
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 120 }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: posIdx * 0.05 }}
                                className="w-full bg-[var(--accent-soft)] border-2 border-[var(--accent)] flex items-center justify-center font-black text-[var(--accent)] text-xs uppercase"
                              >
                                1ST
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-[var(--bg)] border border-dashed border-[var(--border)] h-12" />
                          )}
                        </div>

                        {/* 3rd place */}
                        <div className="flex flex-col items-center w-1/3">
                          {third ? (
                            <>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: posIdx * 0.05 + 0.15 }}
                                className="h-8 w-8 bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] font-bold text-[10px] flex items-center justify-center mb-2"
                              >
                                {third.photoUrl ? (
                                  <img src={third.photoUrl} alt={third.fullName} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                                ) : (
                                  third.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")
                                )}
                              </motion.div>
                              <span className="text-[9px] font-bold text-zinc-500 truncate max-w-full pb-1 uppercase">
                                {third.fullName.split(" ")[0]}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 pb-2">
                                {third.voteCount} V
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 50 }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: posIdx * 0.05 }}
                                className="w-full bg-neutral-100 border border-[var(--border)] flex items-center justify-center font-bold text-zinc-400 text-[10px] uppercase"
                              >
                                3RD
                              </motion.div>
                            </>
                          ) : (
                            <div className="w-full bg-[var(--bg)] border border-dashed border-[var(--border)] h-12" />
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
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                              <span>{cand.fullName}</span>
                              <span className="text-[var(--accent)]">
                                {cand.voteCount} {cand.voteCount === 1 ? "VOTE" : "VOTES"} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-[var(--bg)] h-3 border border-[var(--border)] overflow-hidden">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: candIdx * 0.03 }}
                                className="bg-[var(--accent)] h-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sorted.length > 0 && (
                  <div className="border-t border-[var(--border)] pt-6 mt-2">
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
                  <div className="text-center py-6 text-zinc-400 text-[10px] uppercase tracking-wider italic">
                    No candidates nominated for this position.
                  </div>
                )}
              </motion.div>
            );
          })}

          {electionPositions.length === 0 && (
            <div className="glass-panel p-16 text-center text-zinc-400 uppercase text-[10px] tracking-wider">
              No positions configured for this election.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

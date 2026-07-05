import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Vote as VoteIcon, Check, Award, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Election, Position, Candidate, Vote, User } from "../types";
import Countdown from "./Countdown";
import BallotDropCelebration from "./BallotDropCelebration";
import CandidateModal from "./CandidateModal";
import VoteConfirmationModal from "./VoteConfirmationModal";
import { CandidateVoteGridSkeleton } from "./Skeleton";

interface VotePageProps {
  user: User;
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  token: string;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

export default function VotePage({
  user,
  elections,
  positions,
  candidates,
  token,
  setErrorNotification,
  setSuccessNotification,
}: VotePageProps) {
  const [activeElection, setActiveElection] = useState<Election | null>(null);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [confirmingVote, setConfirmingVote] = useState<{
    positionId: string;
    candidateId: string;
    candidateName: string;
    positionName: string;
  } | null>(null);
  const [castingVoteId, setCastingVoteId] = useState<string | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCandidate, setCelebrationCandidate] = useState("");
  const [celebrationPosition, setCelebrationPosition] = useState("");

  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalPosition, setModalPosition] = useState("");

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPhase = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "live";
    return "ended";
  };

  useEffect(() => {
    const liveEl = elections.find((e) => getPhase(e.startsAt, e.endsAt) === "live");
    // Only set if changed to avoid unnecessary re-renders
    if (liveEl?.id !== activeElection?.id) {
      setActiveElection(liveEl || null);
    }
  }, [elections, currentTime, activeElection]);

  const fetchMyVotes = async (electionId: string) => {
    setLoadingVotes(true);
    try {
      const response = await fetch(`/api/votes/my?electionId=${electionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMyVotes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVotes(false);
    }
  };

  useEffect(() => {
    if (activeElection) {
      fetchMyVotes(activeElection.id);
    } else {
      setMyVotes([]);
    }
  }, [activeElection]);

  const handleCastVote = async (positionId: string, candidateId: string) => {
    if (!activeElection) return;
    setCastingVoteId(candidateId);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          electionId: activeElection.id,
          positionId,
          candidateId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit vote");
      }

      // Capture name details for the animated ballot drop celebration
      const foundCand = candidates.find((c) => c.id === candidateId);
      const foundPos = positions.find((p) => p.id === positionId);
      if (foundCand && foundPos) {
        setCelebrationCandidate(foundCand.fullName);
        setCelebrationPosition(foundPos.name);
        setShowCelebration(true);
      } else {
        setSuccessNotification("Your ballot has been cast and recorded!");
      }

      setConfirmingVote(null);
      await fetchMyVotes(activeElection.id);
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setCastingVoteId(null);
    }
  };

  const electionPositions = activeElection
    ? positions.filter((p) => p.electionId === activeElection.id)
    : [];

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
      <motion.div variants={itemVariants} className="space-y-2">
        <h2 className="font-display font-semibold text-2xl text-white tracking-tight flex items-center gap-2">
          <VoteIcon className="text-violet-400 animate-pulse" size={24} />
          Cast Your Vote
        </h2>
        <p className="text-sm text-zinc-400">Secure digital polling station. One vote permitted per position.</p>
      </motion.div>

      {activeElection ? (
        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="glass-panel rounded-2xl p-6 shadow-2xl space-y-4 border border-white/5"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_8px_#10b98122]"
                >
                  Live Election
                </motion.span>
                <h3 className="font-display font-semibold text-white text-lg mt-1.5">
                  {activeElection.title}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {activeElection.description || "No description provided."}
                </p>
              </div>
            </div>

            <Countdown
              startsAt={activeElection.startsAt}
              endsAt={activeElection.endsAt}
              onFinished={() => setActiveElection(null)}
            />
          </motion.div>

          {loadingVotes ? (
            <div className="space-y-6 animate-fade-in">
              <CandidateVoteGridSkeleton />
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {electionPositions.map((pos) => {
              const positionCandidates = candidates.filter((c) => c.positionId === pos.id);
              const voteForThisPos = myVotes.find((v) => v.positionId === pos.id);

              return (
                <motion.div key={pos.id} variants={itemVariants} className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="font-display font-semibold text-white text-base flex items-center gap-2">
                      <Award size={18} className="text-violet-400" />
                      {pos.name}
                    </h4>

                    {voteForThisPos && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_#10b98122]"
                      >
                        <Check size={12} />
                        Ballot Cast
                      </motion.span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {positionCandidates.map((cand) => {
                      const isCandidateVoted = voteForThisPos?.candidateId === cand.id;

                      return (
                        <motion.div
                          layout
                          key={cand.id}
                          className={`glass-panel rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col justify-between space-y-4 min-h-[220px] border ${
                            isCandidateVoted
                              ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                              : voteForThisPos
                              ? "opacity-40 border-white/5"
                              : "glass-panel-hover border-white/5"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setModalCandidate(cand); setModalPosition(pos.name); }}>
                              <div className="h-10 w-10 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors text-violet-300 flex items-center justify-center font-bold font-display text-sm border border-white/10 shadow-md shrink-0">
                                {cand.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm leading-tight group-hover:text-violet-300 transition-colors">
                                  {cand.fullName}
                                </p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 group-hover:text-violet-400/70 transition-colors">
                                  View Platform Profile
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-300 leading-relaxed italic">
                              "{cand.manifesto}"
                            </p>
                          </div>

                          <div className="pt-2">
                            <AnimatePresence mode="wait">
                              {isCandidateVoted ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="w-full py-2.5 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20"
                                >
                                  <ShieldCheck size={14} />
                                  Your Registered Vote
                                </motion.div>
                              ) : voteForThisPos ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="w-full py-2.5 bg-white/3 text-zinc-500 text-xs font-bold rounded-xl text-center border border-white/5"
                                >
                                  Ballot Complete
                                </motion.div>
                              ) : (
                                <motion.button
                                  key="vote-btn"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  type="button"
                                  onClick={() => setConfirmingVote({
                                    positionId: pos.id,
                                    candidateId: cand.id,
                                    candidateName: cand.fullName,
                                    positionName: pos.name,
                                  })}
                                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium text-xs transition-all cursor-pointer shadow-md"
                                >
                                  Vote for {cand.fullName.split(" ")[0]}
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}

                    {positionCandidates.length === 0 && (
                      <div className="col-span-1 md:col-span-2 bg-white/2 border border-white/5 border-dashed rounded-2xl p-6 text-center text-zinc-400">
                        <p className="text-xs">No candidates nominated for this position yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {electionPositions.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="glass-panel rounded-2xl p-12 text-center text-zinc-400 space-y-2 shadow-xl border border-white/5"
              >
                <AlertCircle size={32} className="mx-auto text-zinc-500" />
                <p className="font-semibold text-white">No Positions Configured</p>
                <p className="text-xs text-zinc-400">This election has no voting positions defined yet.</p>
              </motion.div>
            )}
          </div>
          )}
        </div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-16 text-center space-y-4 shadow-2xl flex flex-col items-center justify-center border border-white/5"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-4 bg-white/3 border border-white/5 rounded-3xl text-zinc-400 shadow-md"
          >
            <AlertCircle size={36} className="text-zinc-500" />
          </motion.div>
          <div className="space-y-1">
            <p className="font-display font-semibold text-white text-lg">No Active Election</p>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              There is currently no live election accepting votes. We will notify you once a polling schedule starts.
            </p>
          </div>
        </motion.div>
      )}

      <BallotDropCelebration
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        candidateName={celebrationCandidate}
        positionName={celebrationPosition}
      />
      <CandidateModal
        candidate={modalCandidate}
        positionName={modalPosition}
        isOpen={modalCandidate !== null}
        onClose={() => setModalCandidate(null)}
      />
      <VoteConfirmationModal
        isOpen={confirmingVote !== null}
        onClose={() => setConfirmingVote(null)}
        onConfirm={() => {
          if (confirmingVote) {
            handleCastVote(confirmingVote.positionId, confirmingVote.candidateId);
          }
        }}
        candidateName={confirmingVote?.candidateName || ""}
        positionName={confirmingVote?.positionName || ""}
        isSubmitting={castingVoteId !== null}
      />
    </motion.div>
  );
}

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Vote as VoteIcon, Check, Award, AlertCircle, ShieldCheck, Loader2, Info, Lock } from "lucide-react";
import { Election, Position, Candidate, Vote, User } from "../types";
import Countdown from "./Countdown";
import BallotDropCelebration from "./BallotDropCelebration";
import CandidateModal from "./CandidateModal";
import VoteConfirmationModal from "./VoteConfirmationModal";
import HowToVoteModal from "./HowToVoteModal";
import { CandidateVoteGridSkeleton } from "./Skeleton";

interface VotePageProps {
  user: User;
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  token: string;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  onLogout: () => void;
}

export default function VotePage({
  user,
  elections,
  positions,
  candidates,
  token,
  setErrorNotification,
  setSuccessNotification,
  onLogout,
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
  const [showHowToVote, setShowHowToVote] = useState(false);

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
      <motion.div variants={itemVariants} className="space-y-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
            <VoteIcon className="text-indigo-600 animate-pulse" size={24} />
            Cast Your Vote
          </h2>
          <p className="text-sm text-zinc-500">Secure digital polling station. One vote permitted per position.</p>
        </div>
        <button
          onClick={() => setShowHowToVote(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl border border-zinc-200 text-sm font-medium transition-colors cursor-pointer shrink-0"
        >
          <Info size={16} className="text-indigo-600" />
          How to Vote
        </button>
      </motion.div>

      {activeElection ? (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
          <motion.div
            variants={itemVariants}
            className="glass-panel rounded-2xl p-6 shadow-2xl space-y-4 border border-zinc-200"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-200 pb-4">
              <div>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_8px_#10b98122]"
                >
                  Live Election
                </motion.span>
                <h3 className="font-display font-semibold text-zinc-900 text-lg mt-1.5">
                  {activeElection.title}
                </h3>
                <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
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
              const positionCandidates = candidates.filter(
                (c) => c.positionId === pos.id && (!c.yearLevel || c.yearLevel === user.yearLevel)
              );
              const voteForThisPos = myVotes.find((v) => v.positionId === pos.id);

              if (positionCandidates.length === 0) return null;

              return (
                <motion.div key={pos.id} variants={itemVariants} className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <h4 className="font-display font-semibold text-zinc-900 text-base flex items-center gap-2">
                      <Award size={18} className="text-indigo-600" />
                      {pos.name}
                    </h4>

                    {voteForThisPos && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-600 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_#10b98122]"
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
                              ? "opacity-40 border-zinc-200"
                              : "glass-panel-hover border-zinc-200"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setModalCandidate(cand); setModalPosition(pos.name); }}>
                              {cand.photoUrl ? (
                                <img src={cand.photoUrl} alt={cand.fullName} className="h-10 w-10 rounded-xl object-cover border border-zinc-200 shadow-md shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-10 w-10 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 transition-colors text-indigo-500 flex items-center justify-center font-bold font-display text-sm border border-zinc-200 shadow-md shrink-0">
                                  {cand.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-zinc-900 text-sm leading-tight group-hover:text-indigo-500 transition-colors">
                                  {cand.fullName}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                  {cand.party ? cand.party : "Independent"} {cand.yearLevel ? `• Year ${cand.yearLevel}` : ""}
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-700 leading-relaxed italic">
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
                                  className="w-full py-2.5 bg-emerald-500/10 text-emerald-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20"
                                >
                                  <ShieldCheck size={14} />
                                  Your Registered Vote
                                </motion.div>
                              ) : voteForThisPos ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="w-full py-2.5 bg-white/3 text-zinc-500 text-xs font-bold rounded-xl text-center border border-zinc-200"
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
                                  className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-xl font-medium text-xs transition-all cursor-pointer shadow-md"
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
                      <div className="col-span-1 md:col-span-2 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl p-6 text-center text-zinc-500">
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
                className="glass-panel rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-xl border border-zinc-200"
              >
                <AlertCircle size={32} className="mx-auto text-zinc-500" />
                <p className="font-semibold text-zinc-900">No Positions Configured</p>
                <p className="text-xs text-zinc-500">This election has no voting positions defined yet.</p>
              </motion.div>
            )}
          </div>
          )}
          </div>

          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <motion.div
              variants={itemVariants}
              className="glass-panel p-5 rounded-2xl border border-zinc-200 sticky top-6 space-y-4"
            >
              <h4 className="font-display font-semibold text-zinc-900 text-sm flex items-center gap-2 border-b border-zinc-200 pb-3">
                <Info size={16} className="text-indigo-600" />
                Voting Rules
              </h4>
              <ul className="space-y-3 text-xs text-zinc-500 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  You may only cast one vote per position.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  Votes are final once confirmed and cannot be changed.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  You only see candidates eligible for your year level.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  Track your ballot anonymously via the QR code upon completion.
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-16 text-center space-y-4 shadow-2xl flex flex-col items-center justify-center border border-zinc-200"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-4 bg-white/3 border border-zinc-200 rounded-3xl text-zinc-500 shadow-md"
          >
            <AlertCircle size={36} className="text-zinc-500" />
          </motion.div>
          <div className="space-y-1">
            <p className="font-display font-semibold text-zinc-900 text-lg">No Active Election</p>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
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
        onLogout={onLogout}
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
      <HowToVoteModal
        isOpen={showHowToVote}
        onClose={() => setShowHowToVote(false)}
      />
    </motion.div>
  );
}

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
      className="space-y-6 max-w-4xl mx-auto font-mono text-[var(--ink)]"
    >
      <motion.div variants={itemVariants} className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">BALLOT_STATION_04</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
            <VoteIcon className="text-[var(--accent)]" size={24} />
            CAST YOUR VOTE
          </h2>
          <p className="text-xs text-zinc-500">Secure cryptographic polling station. Double-ballot protections active.</p>
        </div>
        <button
          onClick={() => setShowHowToVote(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] hover:bg-[var(--accent)] hover:text-[var(--surface)] text-[var(--ink)] rounded-none border border-[var(--border)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
        >
          <Info size={14} />
          HOW_TO_VOTE
        </button>
      </motion.div>

      {activeElection ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <motion.div
              variants={itemVariants}
              className="glass-panel p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <motion.span
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_8px_var(--accent-soft)]"
                  >
                    LIVE_POLLING_STATION
                  </motion.span>
                  <h3 className="font-display font-extrabold text-[var(--ink)] text-base uppercase tracking-wider mt-2.5">
                    {activeElection.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
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
                      <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                        <h4 className="font-display font-extrabold text-[var(--ink)] text-xs uppercase tracking-widest flex items-center gap-1.5 pl-1.5 border-l-2 border-[var(--accent)]">
                          {pos.name}
                        </h4>

                        {voteForThisPos && (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase tracking-wider"
                          >
                            <Check size={11} />
                            BALLOT_REGISTERED
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
                              className={`glass-panel p-5 transition-all relative overflow-hidden flex flex-col justify-between space-y-4 min-h-[220px] ${
                                isCandidateVoted
                                  ? "border-emerald-500/40 bg-emerald-50/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                                  : voteForThisPos
                                  ? "opacity-40 border-[var(--border)]"
                                  : "glass-panel-hover"
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setModalCandidate(cand); setModalPosition(pos.name); }}>
                                  {cand.photoUrl && cand.photoUrl !== "null" && cand.photoUrl !== "" && cand.photoUrl !== "undefined" ? (
                                    <img src={cand.photoUrl} alt={cand.fullName} className="h-10 w-10 rounded-sm object-cover border border-[var(--border)] shrink-0" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-sm bg-neutral-100 group-hover:bg-neutral-200 text-[var(--accent)] flex items-center justify-center font-bold text-xs border border-[var(--border)] shrink-0">
                                      {cand.fullName[0]}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-[var(--ink)] text-xs group-hover:text-[var(--accent)] transition-colors uppercase tracking-wider">
                                      {cand.fullName}
                                    </p>
                                    <p className="text-[9px] font-bold text-zinc-500 mt-0.5">
                                      {cand.party ? cand.party.toUpperCase() : "INDEPENDENT"} {cand.yearLevel ? `• YEAR ${cand.yearLevel} LOCK` : ""}
                                    </p>
                                  </div>
                                </div>

                                <p className="text-[11px] text-zinc-600 leading-relaxed italic">
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
                                      className="w-full py-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 border border-emerald-200"
                                    >
                                      <ShieldCheck size={12} />
                                      SESSION_BALLOT_CAST
                                    </motion.div>
                                  ) : voteForThisPos ? (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="w-full py-2 bg-transparent text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center border border-[var(--border)]"
                                    >
                                      BALLOT_LOCKED
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      key="vote-btn"
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      type="button"
                                      onClick={() => setConfirmingVote({
                                        positionId: pos.id,
                                        candidateId: cand.id,
                                        candidateName: cand.fullName,
                                        positionName: pos.name,
                                      })}
                                      className="w-full py-2 bg-transparent hover:bg-[var(--accent)] hover:text-[var(--surface)] text-[var(--accent)] border border-[var(--accent)]/40 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                                    >
                                      CAST_VOTE
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          );
                        })}

                        {positionCandidates.length === 0 && (
                          <div className="col-span-1 md:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-none p-6 text-center text-zinc-500">
                            <p className="text-[10px] uppercase tracking-wider">No active nominees for this position.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {electionPositions.length === 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="glass-panel p-12 text-center text-zinc-500 space-y-2"
                  >
                    <AlertCircle size={32} className="mx-auto text-[var(--accent)]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO_POSITIONS_CONFIGURED</p>
                    <p className="text-[10px]">This active election currently has no active polling positions defined.</p>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <motion.div
              variants={itemVariants}
              className="glass-panel p-5 sticky top-6 space-y-4"
            >
              <h4 className="font-display font-extrabold text-[var(--ink)] text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-[var(--border)] pb-3">
                <Info size={14} className="text-[var(--accent)]" />
                VOTING_PROTOCOL
              </h4>
              <ul className="space-y-3 text-[10px] text-zinc-500 leading-relaxed uppercase font-mono">
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Strict limit: 1 vote cast per polling position.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Confirmed ballots are final and immutable.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Nominees filtered by student cohort lock.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Zero-Knowledge tracking QR active upon submittal.
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="glass-panel p-16 text-center space-y-4 flex flex-col items-center justify-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-none"
          >
            <AlertCircle size={36} className="text-zinc-500" />
          </motion.div>
          <div className="space-y-1">
            <p className="font-display font-extrabold text-[var(--ink)] text-sm uppercase tracking-wider">NO ACTIVE ELECTIONS</p>
            <p className="text-[10px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Secure polling services are offline. We will notify you when a school-wide election window is scheduled.
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
        candidate={confirmingVote ? candidates.find(c => c.id === confirmingVote.candidateId) || null : null}
        position={confirmingVote ? positions.find(p => p.id === confirmingVote.positionId) || null : null}
        election={activeElection}
        isSubmitting={castingVoteId !== null}
      />
      <HowToVoteModal
        isOpen={showHowToVote}
        onClose={() => setShowHowToVote(false)}
      />
    </motion.div>
  );
}

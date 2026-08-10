import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Vote as VoteIcon, Check, AlertCircle, ShieldCheck, Info, Search, DoorOpen, ArrowRight, Sparkles, WifiOff, Download, FileLock2 } from "lucide-react";
import { Election, Position, Candidate, Vote, User, OfflineBallotCredential } from "../types";
import Countdown from "./Countdown";
import BallotDropCelebration from "./BallotDropCelebration";
import CandidateModal from "./CandidateModal";
import VoteConfirmationModal from "./VoteConfirmationModal";
import HowToVoteModal from "./HowToVoteModal";
import { CandidateVoteGridSkeleton } from "./Skeleton";
import { downloadOfflineBallot, encryptOfflineBallot } from "../lib/offlineBallot";

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
  const [roomQuery, setRoomQuery] = useState(user.room || "");
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [offlineCredential, setOfflineCredential] = useState<OfflineBallotCredential | null>(null);
  const [offlineSelections, setOfflineSelections] = useState<Record<string, string>>({});
  const [preparingOfflineFile, setPreparingOfflineFile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getPhase = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "live";
    return "ended";
  };

  // Find active live or upcoming elections
  const isEligible = (election: Election) => {
    const scope = election.scope || "all";
    const value = (election.scopeValue || "").trim().toLowerCase();
    if (scope === "grade") return user.yearLevel === (election.targetGradeLevel || Number.parseInt(value, 10));
    if (scope === "section") return Boolean(user.section) && user.section!.trim().toLowerCase() === (election.targetSection || value).trim().toLowerCase();
    if (scope === "room") return Boolean(user.room) && user.room!.trim().toLowerCase() === (election.targetRoom || value).trim().toLowerCase();
    return true;
  };

  const availableElections = elections.filter(
    (e) => getPhase(e.startsAt, e.endsAt) !== "ended" && isEligible(e)
  );

  useEffect(() => {
    if (!activeElection && availableElections.length > 0) {
      // Auto pick user's room election or first live election
      const roomEl = user.room
        ? availableElections.find((e) => {
            const r = (e.scopeValue || e.targetRoom || "").toLowerCase();
            const uRoom = user.room?.toLowerCase() || "";
            return r === uRoom || uRoom.includes(r) || r.includes(uRoom);
          })
        : null;

      const defaultEl = roomEl || availableElections.find((e) => getPhase(e.startsAt, e.endsAt) === "live") || availableElections[0];
      if (defaultEl) {
        setActiveElection(defaultEl);
      }
    }
  }, [elections, user.room, activeElection]);

  const handleRoomSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchFeedback(null);

    const query = roomQuery.trim().toLowerCase();
    if (!query) {
      const live = availableElections.find((el) => getPhase(el.startsAt, el.endsAt) === "live") || availableElections[0];
      if (live) setActiveElection(live);
      return;
    }

    const matched = availableElections.find((el) => {
      const title = (el.title || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      const scopeVal = (el.scopeValue || "").toLowerCase();
      const targetRoom = (el.targetRoom || "").toLowerCase();
      const targetSec = (el.targetSection || "").toLowerCase();
      const targetGrade = el.targetGradeLevel ? String(el.targetGradeLevel) : "";

      return (
        title.includes(query) ||
        id.includes(query) ||
        scopeVal === query ||
        targetRoom === query ||
        `room ${scopeVal}` === query ||
        `room ${targetRoom}` === query ||
        scopeVal.includes(query) ||
        targetRoom.includes(query) ||
        targetSec.includes(query) ||
        targetGrade === query
      );
    });

    if (matched) {
      setActiveElection(matched);
      setSuccessNotification(`Entered polling station for: ${matched.title}`);
    } else {
      setSearchFeedback(`No active election found for Room or Code "${roomQuery.trim()}". Displaying available elections.`);
    }
  };

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
      setOfflineSelections({});
    } else {
      setMyVotes([]);
    }
  }, [activeElection]);

  useEffect(() => {
    if (!activeElection) {
      setOfflineCredential(null);
      return;
    }
    const storageKey = `offline_ballot_credential:${user.id}:${activeElection.id}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        setOfflineCredential(JSON.parse(cached));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    if (!isOnline || getPhase(activeElection.startsAt, activeElection.endsAt) !== "live") return;

    fetch(`/api/offline/credentials?electionId=${encodeURIComponent(activeElection.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((credential) => {
        if (!credential) return;
        localStorage.setItem(storageKey, JSON.stringify(credential));
        setOfflineCredential(credential);
      })
      .catch(() => undefined);
  }, [activeElection, isOnline, token, user.id]);

  const handleCastVote = async (positionId: string, candidateId: string) => {
    if (!activeElection) return;
    if (!isOnline) {
      if (!offlineCredential) {
        setErrorNotification("Offline voting was not prepared on this device. Reconnect briefly while the election is live, then try again.");
        setConfirmingVote(null);
        return;
      }
      setOfflineSelections((current) => ({ ...current, [positionId]: candidateId }));
      setConfirmingVote(null);
      setSuccessNotification("Selection added to the encrypted offline ballot. Download the file when finished.");
      return;
    }
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

  const handleDownloadOfflineBallot = async () => {
    if (!activeElection || !offlineCredential) return;
    const votes = (Object.entries(offlineSelections) as Array<[string, string]>).map(([positionId, candidateId]) => ({ positionId, candidateId }));
    if (votes.length === 0) {
      setErrorNotification("Select at least one candidate before downloading the offline ballot.");
      return;
    }
    setPreparingOfflineFile(true);
    try {
      const ballot = await encryptOfflineBallot(offlineCredential, {
        voterId: user.id,
        studentNumber: user.studentNumber,
        electionId: activeElection.id,
        votes,
        timestamp: new Date().toISOString(),
      });
      const safeElection = activeElection.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      downloadOfflineBallot(ballot, `${safeElection || "election"}-${user.studentNumber}-offline-ballot.json`);
      setSuccessNotification("Encrypted ballot downloaded. Send this JSON file to your teacher for import.");
    } catch (error: any) {
      setErrorNotification(error.message || "Could not create the encrypted offline ballot");
    } finally {
      setPreparingOfflineFile(false);
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

  // Collect distinct room badges for quick selection
  const roomBadges = Array.from(
    new Set(
      elections
        .map((e) => e.scopeValue || e.targetRoom)
        .filter((r): r is string => Boolean(r && r.trim()))
    )
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 max-w-5xl mx-auto font-mono text-[var(--ink)]"
    >
      <motion.div variants={itemVariants} className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">BALLOT STATION 04</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
            <VoteIcon className="text-[var(--accent)]" size={24} />
            STUDENT POLLING STATION
          </h2>
          <p className="text-xs text-zinc-500">Vote via Room Number or Election Code. Double-ballot cryptographic protection active.</p>
        </div>
        <button
          onClick={() => setShowHowToVote(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] hover:bg-[var(--accent)] hover:text-[var(--surface)] text-[var(--ink)] rounded-none border border-[var(--border)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
        >
          <Info size={14} />
          HOW TO VOTE
        </button>
      </motion.div>

      {!isOnline && (
        <motion.div
          variants={itemVariants}
          className="border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <WifiOff size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Encrypted Offline Voting</p>
              <p className="text-[11px] text-amber-800 mt-1">
                Select candidates below, download the tamper-protected JSON ballot, and send it to a teacher for import.
              </p>
              {!offlineCredential && (
                <p className="text-[10px] text-rose-700 font-bold mt-1">This device did not cache a live-election offline credential before losing its connection.</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadOfflineBallot}
            disabled={!offlineCredential || Object.keys(offlineSelections).length === 0 || preparingOfflineFile}
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-amber-200 disabled:text-amber-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {preparingOfflineFile ? <FileLock2 size={14} className="animate-pulse" /> : <Download size={14} />}
            Download Encrypted Ballot ({Object.keys(offlineSelections).length})
          </button>
        </motion.div>
      )}

      {/* Room Number / Vote Code Quick Search Panel */}
      <motion.div variants={itemVariants} className="glass-panel p-5 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <DoorOpen size={18} className="text-[var(--accent)]" />
            <h3 className="font-display font-black text-xs text-[var(--ink)] uppercase tracking-wider">
              ENTER VIA ROOM NUMBER OR ELECTION CODE
            </h3>
          </div>
          {user.room && (
            <button
              type="button"
              onClick={() => {
                setRoomQuery(user.room || "");
                const matched = availableElections.find((el) => {
                  const r = (el.scopeValue || el.targetRoom || "").toLowerCase();
                  return r === user.room?.toLowerCase();
                });
                if (matched) setActiveElection(matched);
              }}
              className="text-[10px] font-bold px-2.5 py-1 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={12} />
              MY ASSIGNED ROOM: {user.room}
            </button>
          )}
        </div>

        <form onSubmit={handleRoomSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={roomQuery}
              onChange={(e) => {
                setRoomQuery(e.target.value);
                setSearchFeedback(null);
              }}
              placeholder="Enter Room # or Vote Code (e.g., 101, 204, Room 101, or Election ID)..."
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span>ENTER ROOM</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {searchFeedback && (
          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {searchFeedback}
          </p>
        )}

        {/* Quick Room Badges */}
        {roomBadges.length > 0 && (
          <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">AVAILABLE ROOMS:</span>
            {roomBadges.map((room) => {
              const matchedEl = availableElections.find(
                (el) => (el.scopeValue || el.targetRoom || "").toLowerCase() === room.toLowerCase()
              );
              const isActive = activeElection && (activeElection.scopeValue === room || activeElection.targetRoom === room);
              return (
                <button
                  key={room}
                  type="button"
                  onClick={() => {
                    setRoomQuery(room);
                    if (matchedEl) setActiveElection(matchedEl);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--surface)] border-[var(--accent)]"
                      : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  ROOM {room}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Available Elections Switcher (if multiple exist) */}
      {availableElections.length > 1 && (
        <motion.div variants={itemVariants} className="space-y-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">SELECT ELECTION POLLING STATION:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableElections.map((el) => {
              const isSelected = activeElection?.id === el.id;
              const phase = getPhase(el.startsAt, el.endsAt);
              const roomInfo = el.scopeValue || el.targetRoom;

              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setActiveElection(el)}
                  className={`p-3 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase ${phase === "live" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
                        {phase}
                      </span>
                      {roomInfo && (
                        <span className="text-[9px] font-bold text-[var(--accent)]">
                          ROOM {roomInfo}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs text-[var(--ink)] truncate">{el.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeElection ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <motion.div
              variants={itemVariants}
              className="glass-panel p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_8px_var(--accent-soft)]"
                    >
                      LIVE POLLING STATION
                    </motion.span>
                    {(activeElection.scopeValue || activeElection.targetRoom) && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[9px] font-bold uppercase">
                        📍 ROOM {activeElection.scopeValue || activeElection.targetRoom}
                      </span>
                    )}
                  </div>
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
                    (c) => c.positionId === pos.id && c.electionId === activeElection.id
                  );
                  const voteForThisPos = myVotes.find((v) => v.positionId === pos.id);
                  const selectedCandidateId = !isOnline
                    ? (offlineSelections[pos.id] || voteForThisPos?.candidateId)
                    : voteForThisPos?.candidateId;

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
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[8px] font-bold uppercase tracking-wider"
                          >
                            <Check size={11} />
                            BALLOT REGISTERED
                          </motion.span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {positionCandidates.map((cand) => {
                          const isCandidateVoted = selectedCandidateId === cand.id;

                          return (
                            <motion.div
                              layout
                              key={cand.id}
                              animate={{ scale: isCandidateVoted ? 1.025 : 1 }}
                              transition={{ type: "spring", stiffness: 350, damping: 22 }}
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.985 }}
                              className={`glass-panel p-5 transition-all relative overflow-hidden flex flex-col justify-between space-y-4 min-h-[220px] ${
                                isCandidateVoted
                                  ? "border-emerald-500/50 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-[0_8px_25px_rgba(16,185,129,0.12)]"
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
                                      {isOnline ? "CURRENT BALLOT SELECTION" : "OFFLINE SELECTION SAVED"}
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      key="vote-btn"
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      type="button"
                                      disabled={getPhase(activeElection.startsAt, activeElection.endsAt) !== "live"}
                                      onClick={() => setConfirmingVote({
                                        positionId: pos.id,
                                        candidateId: cand.id,
                                        candidateName: cand.fullName,
                                        positionName: pos.name,
                                      })}
                                      className="w-full py-2 bg-transparent hover:bg-[var(--accent)] hover:text-[var(--surface)] disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:text-zinc-400 disabled:border-zinc-300 text-[var(--accent)] border border-[var(--accent)]/40 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:cursor-not-allowed"
                                    >
                                      {getPhase(activeElection.startsAt, activeElection.endsAt) !== "live" ? "VOTING NOT OPEN" : !isOnline ? "SELECT FOR OFFLINE BALLOT" : voteForThisPos ? "CHANGE VOTE" : "CAST VOTE"}
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
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO POSITIONS CONFIGURED</p>
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
                VOTING PROTOCOL
              </h4>
              <ul className="space-y-3 text-[10px] text-zinc-500 leading-relaxed uppercase font-mono">
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Strict limit: 1 vote cast per polling position.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  A later valid selection replaces the earlier effective vote.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Nominees filtered by room or student cohort.
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  Offline files are encrypted and checked for tampering on import.
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
            <p className="font-display font-extrabold text-[var(--ink)] text-sm uppercase tracking-wider">NO ACTIVE ELECTIONS FOR THIS ROOM</p>
            <p className="text-[10px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
              No live polling station was found matching room number or code "{roomQuery}". Please check the room number or select an election from above.
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

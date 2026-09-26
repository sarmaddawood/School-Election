import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Vote as VoteIcon, Check, AlertCircle, ShieldCheck, Info, Search, DoorOpen, ArrowRight, Sparkles, WifiOff, Download, FileLock2, Trophy, Crown, Megaphone } from "lucide-react";
import { Election, Position, Candidate, Vote, User } from "../types";
import Countdown from "./Countdown";
import BallotDropCelebration from "./BallotDropCelebration";
import CandidateModal from "./CandidateModal";
import VoteConfirmationModal from "./VoteConfirmationModal";
import HowToVoteModal from "./HowToVoteModal";
import { CandidateVoteGridSkeleton } from "./Skeleton";

interface VotePageProps {
  user: User;
  token: string;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  onLogout: () => void;
}

export default function VotePage({
  user,
  token,
  setErrorNotification,
  setSuccessNotification,
  onLogout,
}: VotePageProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [activeElection, setActiveElection] = useState<Election | null>(null);
  const [roomQuery, setRoomQuery] = useState(user.room || "");
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [activeView, setActiveView] = useState<"ballot" | "winners">("ballot");
  const [selectedWinnerElectionId, setSelectedWinnerElectionId] = useState<string>("");
  const [winnerCandidates, setWinnerCandidates] = useState<Candidate[]>([]);
  const [loadingWinnerCandidates, setLoadingWinnerCandidates] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [elRes, posRes, candRes] = await Promise.all([
          fetch("/api/elections", { headers }),
          fetch("/api/positions", { headers }),
          fetch("/api/candidates", { headers }),
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
      } catch (err) {
        console.error("Failed to fetch vote data", err);
        setErrorNotification("Failed to load voting data.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [token, setErrorNotification]);

  const getPhase = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "live";
    return "ended";
  };

  // Find active live or upcoming elections
  const isEligible = (election: Election) => {
    if (user.role !== "student") return false;
    const scope = election.scope || "all";
    const value = (election.scopeValue || "").trim();
    if (scope === "grade") {
      const rawGrade = election.targetGradeLevel ?? value;
      const grade = typeof rawGrade === "number" ? rawGrade : Number.parseInt(String(rawGrade ?? "").replace(/\D+/g, ""), 10);
      return Number.isFinite(grade) && user.yearLevel === grade;
    }
    if (scope === "section") {
      const targetSec = (election.targetSection || value).trim().toLowerCase();
      if (!targetSec || !user.section) return false;
      const uSec = user.section.trim().toLowerCase();
      return uSec === targetSec || uSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim() === targetSec.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim();
    }
    if (scope === "room") {
      const targetRoom = (election.targetRoom || value).trim().toLowerCase();
      if (!targetRoom || !user.room) return false;
      const uRoom = user.room.trim().toLowerCase();
      return uRoom === targetRoom || uRoom.replace(/^room\s*/i, "").trim() === targetRoom.replace(/^room\s*/i, "").trim();
    }
    return true;
  };

  const availableElections = (Array.isArray(elections) ? elections : []).filter(
    (e) => getPhase(e.startsAt, e.endsAt) !== "ended" && isEligible(e)
  );

  const endedElections = (Array.isArray(elections) ? elections : []).filter(
    (e) => getPhase(e.startsAt, e.endsAt) === "ended" && isEligible(e)
  );
  const allEndedElections = (Array.isArray(elections) ? elections : []).filter(
    (e) => getPhase(e.startsAt, e.endsAt) === "ended"
  );
  const displayEndedElections = endedElections.length > 0 ? endedElections : allEndedElections;

  // Smart default view: if no active/live elections available, default to "winners"
  useEffect(() => {
    if (!loadingData) {
      if (availableElections.length === 0 && displayEndedElections.length > 0) {
        setActiveView("winners");
      }
    }
  }, [loadingData, availableElections.length, displayEndedElections.length]);

  // Auto-select initial concluded election
  useEffect(() => {
    if (displayEndedElections.length > 0 && !selectedWinnerElectionId) {
      const matchedEnded = displayEndedElections.find((e) => {
        if (e.scope === "room" && user.room) {
          const r = (e.targetRoom || e.scopeValue || "").toLowerCase().trim();
          const u = user.room.toLowerCase().trim();
          return Boolean(r && u && (r === u || r.replace(/^room\s*/i, "") === u.replace(/^room\s*/i, "")));
        }
        if (e.scope === "section" && user.section) {
          const s = (e.targetSection || e.scopeValue || "").toLowerCase().trim();
          const u = user.section.toLowerCase().trim();
          return Boolean(s && u && (s === u || s.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "") === u.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "")));
        }
        return false;
      });
      setSelectedWinnerElectionId(matchedEnded ? matchedEnded.id : displayEndedElections[0].id);
    }
  }, [displayEndedElections, selectedWinnerElectionId, user.room, user.section]);

  // Fetch verified candidates and vote counts for selected concluded election
  const fetchWinnerCandidates = async (electionId: string) => {
    if (!electionId) return;
    setLoadingWinnerCandidates(true);
    try {
      let fetched: Candidate[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const url = new URL("/api/candidates", window.location.origin);
        url.searchParams.append("electionId", electionId);
        url.searchParams.append("limit", "100");
        if (cursor) url.searchParams.append("cursor", cursor);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) break;

        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          fetched = [...fetched, ...data.data];
          cursor = data.nextCursor;
          hasMore = Boolean(cursor);
        } else {
          hasMore = false;
        }
      }
      setWinnerCandidates(fetched);
    } catch (err) {
      console.error("Failed to load winner candidates", err);
    } finally {
      setLoadingWinnerCandidates(false);
    }
  };

  useEffect(() => {
    if (selectedWinnerElectionId) {
      fetchWinnerCandidates(selectedWinnerElectionId);
    }
  }, [selectedWinnerElectionId]);

  useEffect(() => {
    if (!activeElection && availableElections.length > 0) {
      // Auto pick user's room or section election or first live election
      const matchedEl = availableElections.find((e) => {
        if (e.scope === "room" && user.room) {
          const r = (e.targetRoom || e.scopeValue || "").toLowerCase().trim();
          const u = user.room.toLowerCase().trim();
          return Boolean(r && u && (r === u || r.replace(/^room\s*/i, "") === u.replace(/^room\s*/i, "")));
        }
        if (e.scope === "section" && user.section) {
          const s = (e.targetSection || e.scopeValue || "").toLowerCase().trim();
          const u = user.section.toLowerCase().trim();
          return Boolean(s && u && (s === u || s.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "") === u.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "")));
        }
        return false;
      });

      const defaultEl = matchedEl || availableElections.find((e) => getPhase(e.startsAt, e.endsAt) === "live") || availableElections[0];
      if (defaultEl) {
        setActiveElection(defaultEl);
      }
    }
  }, [elections, user.room, user.section, activeElection, availableElections]);

  const handleRoomSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchFeedback(null);

    const query = roomQuery.trim()?.toString().toLowerCase();
    if (!query) {
      if (activeView === "ballot") {
        const live = availableElections.find((el) => getPhase(el.startsAt, el.endsAt) === "live") || availableElections[0];
        if (live) setActiveElection(live);
      } else {
        if (displayEndedElections.length > 0) {
          setSelectedWinnerElectionId(displayEndedElections[0].id);
        }
      }
      return;
    }

    const matchFn = (el: Election) => {
      const title = (el.title || "")?.toString().toLowerCase();
      const id = (el.id || "")?.toString().toLowerCase();
      const scopeVal = (el.scopeValue || "")?.toString().toLowerCase();
      const targetRoom = (el.targetRoom || "")?.toString().toLowerCase();
      const targetSec = (el.targetSection || "")?.toString().toLowerCase();
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
    };

    const matchedLive = availableElections.find(matchFn);
    if (matchedLive) {
      setActiveView("ballot");
      setActiveElection(matchedLive);
      setSuccessNotification(`Entered polling station for: ${matchedLive.title}`);
      return;
    }

    const matchedEnded = displayEndedElections.find(matchFn);
    if (matchedEnded) {
      setActiveView("winners");
      setSelectedWinnerElectionId(matchedEnded.id);
      setSuccessNotification(`Showing official winners for: ${matchedEnded.title}`);
      return;
    }

    setSearchFeedback(`No election found for Room or Code "${roomQuery.trim()}". Displaying available elections.`);
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

  const selectedWinnerElection =
    displayEndedElections.find((e) => e.id === selectedWinnerElectionId) ||
    displayEndedElections[0] ||
    null;

  const winnerElectionPositions = selectedWinnerElection
    ? positions.filter((p) => p.electionId === selectedWinnerElection.id)
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

  const getScopeBadge = (el: Election) => {
    const scope = el.scope || "all";
    if (scope === "grade") {
      const g = el.targetGradeLevel ?? (el.scopeValue || "").replace(/\D+/g, "");
      return { label: `GRADE ${g}`, className: "bg-emerald-100 text-emerald-800" };
    }
    if (scope === "section") {
      const s = el.targetSection || el.scopeValue || "";
      return { label: `SEC: ${s}`, className: "bg-violet-100 text-violet-800" };
    }
    if (scope === "room") {
      const r = el.targetRoom || el.scopeValue || "";
      return { label: `ROOM ${r}`, className: "bg-amber-100 text-amber-800" };
    }
    return { label: "SCHOOL-WIDE", className: "bg-sky-100 text-sky-800" };
  };

  // Collect distinct room badges for quick selection (specifically from room-scoped elections or user assigned room)
  const roomBadges = Array.from(
    new Set(
      [
        user.room ? user.room.trim() : null,
        ...(Array.isArray(elections) ? elections : [])
          .filter((e) => e.scope === "room")
          .map((e) => e.targetRoom || e.scopeValue)
      ].filter((r): r is string => Boolean(r && r.trim()))
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

      {/* View Switcher: Cast Ballot vs Winner Candidates */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-none shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveView("ballot")}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeView === "ballot"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-zinc-600 hover:text-[var(--ink)]"
            }`}
          >
            <VoteIcon size={14} />
            <span>Cast Ballot</span>
            {availableElections.length > 0 && (
              <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold ${activeView === "ballot" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                {availableElections.length} LIVE
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView("winners")}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeView === "winners"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-[var(--ink)]"
            }`}
          >
            <Trophy size={14} className={activeView === "winners" ? "text-white" : "text-amber-600"} />
            <span>Winner Candidates</span>
            {displayEndedElections.length > 0 && (
              <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold ${activeView === "winners" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
                {displayEndedElections.length} CONCLUDED
              </span>
            )}
          </button>
        </div>

        {activeView === "winners" && selectedWinnerElection && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5">
            <Trophy size={13} className="text-amber-600 fill-amber-500" />
            <span className="uppercase tracking-wider">OFFICIAL WINNERS ONLY</span>
          </div>
        )}
      </motion.div>

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
                const matchedLive = availableElections.find((el) => {
                  const r = (el.scopeValue || el.targetRoom || "")?.toString().toLowerCase();
                  return r === user.room?.toString().toLowerCase();
                });
                if (matchedLive) {
                  setActiveView("ballot");
                  setActiveElection(matchedLive);
                  return;
                }
                const matchedEnded = displayEndedElections.find((el) => {
                  const r = (el.scopeValue || el.targetRoom || "")?.toString().toLowerCase();
                  return r === user.room?.toString().toLowerCase();
                });
                if (matchedEnded) {
                  setActiveView("winners");
                  setSelectedWinnerElectionId(matchedEnded.id);
                  return;
                }
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
              const matchedLive = availableElections.find(
                (el) => (el.scopeValue || el.targetRoom || "")?.toString().toLowerCase() === room?.toString().toLowerCase()
              );
              const matchedEnded = displayEndedElections.find(
                (el) => (el.scopeValue || el.targetRoom || "")?.toString().toLowerCase() === room?.toString().toLowerCase()
              );
              const isActive =
                (activeView === "ballot" && activeElection && (activeElection.scopeValue === room || activeElection.targetRoom === room)) ||
                (activeView === "winners" && selectedWinnerElectionId === matchedEnded?.id);

              return (
                <button
                  key={room}
                  type="button"
                  onClick={() => {
                    setRoomQuery(room);
                    if (matchedLive) {
                      setActiveView("ballot");
                      setActiveElection(matchedLive);
                      return;
                    }
                    if (matchedEnded) {
                      setActiveView("winners");
                      setSelectedWinnerElectionId(matchedEnded.id);
                    }
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

      {activeView === "ballot" ? (
        <>
          {/* Available Elections Switcher (if multiple exist) */}
          {availableElections.length > 1 && (
            <motion.div variants={itemVariants} className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">SELECT ELECTION POLLING STATION:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableElections.map((el) => {
                  const isSelected = activeElection?.id === el.id;
                  const phase = getPhase(el.startsAt, el.endsAt);

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
                          {(() => {
                            const badge = getScopeBadge(el);
                            return (
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-transparent ${badge.className}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
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
                        {(() => {
                          const badge = getScopeBadge(activeElection);
                          return (
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border border-slate-300 ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
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
                      const selectedCandidateId = voteForThisPos?.candidateId;

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
                                        <img src={cand.photoUrl} alt={cand.fullName} className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-sm" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="h-12 w-12 rounded-xl bg-sky-50 group-hover:bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm border border-sky-100 shrink-0">
                                          {cand.fullName[0]}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-bold text-[var(--ink)] text-xs group-hover:text-sky-600 transition-colors uppercase tracking-wider">
                                          {cand.fullName}
                                        </p>
                                        <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
                                          {cand.party ? cand.party.toUpperCase() : "INDEPENDENT"} {cand.yearLevel ? `• GRADE ${cand.yearLevel}` : ""}
                                        </p>
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-zinc-600 leading-relaxed italic line-clamp-3">
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
                                          className="w-full py-2.5 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-200 rounded-xl"
                                        >
                                          <ShieldCheck size={14} />
                                          Current Ballot Selection
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
                                          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm ${
                                            voteForThisPos
                                              ? "bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100"
                                              : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/15"
                                          } disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200`}
                                        >
                                          {getPhase(activeElection.startsAt, activeElection.endsAt) !== "live" ? "Voting Closed" : voteForThisPos ? "Change Selection" : "Select Candidate"}
                                        </motion.button>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {positionCandidates.length === 0 && (
                              <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 text-center text-zinc-500">
                                <p className="text-xs uppercase tracking-wider font-semibold">No active nominees for this position.</p>
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
              {displayEndedElections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveView("winners")}
                  className="mt-3 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Trophy size={14} className="fill-white" />
                  <span>VIEW CONCLUDED ELECTION WINNERS ({displayEndedElections.length})</span>
                </button>
              )}
            </motion.div>
          )}
        </>
      ) : (
        /* WINNER CANDIDATES SHOWCASE - ONLY THE WINNERS */
        <div className="space-y-6">
          {/* Concluded Elections Switcher (if multiple exist) */}
          {displayEndedElections.length > 1 && (
            <motion.div variants={itemVariants} className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">SELECT CONCLUDED ELECTION:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayEndedElections.map((el) => {
                  const isSelected = selectedWinnerElection?.id === el.id;
                  const badge = getScopeBadge(el);

                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => setSelectedWinnerElectionId(el.id)}
                      className={`p-3 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[var(--surface)] border-amber-500 ring-2 ring-amber-500/30 shadow-xs"
                          : "bg-[var(--surface)] border-[var(--border)] hover:border-amber-400/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="px-2 py-0.5 text-[8px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Trophy size={10} className="text-amber-600 fill-amber-500" />
                            CONCLUDED
                          </span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border border-transparent ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-[var(--ink)] truncate">{el.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {selectedWinnerElection ? (
            <div className="space-y-6">
              {/* Concluded Election Header Banner */}
              <motion.div
                variants={itemVariants}
                className="glass-panel p-6 space-y-4 border-2 border-amber-300/60 bg-gradient-to-br from-amber-50/30 via-[var(--surface)] to-[var(--surface)]"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[var(--border)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Trophy size={12} className="text-amber-600 fill-amber-500" />
                        OFFICIAL ELECTION WINNERS
                      </span>
                      {(() => {
                        const badge = getScopeBadge(selectedWinnerElection);
                        return (
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border border-slate-300 ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="font-display font-black text-[var(--ink)] text-xl uppercase tracking-wider mt-2.5">
                      {selectedWinnerElection.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      {selectedWinnerElection.description || "Official certified winners and elected officers for this election."}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">STATUS</span>
                    <span className="text-xs font-black text-emerald-600 uppercase flex items-center sm:justify-end gap-1 mt-0.5">
                      <Check size={14} /> ELECTION CONCLUDED
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-600 font-medium">
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-100/60 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase">
                    <Trophy size={13} className="text-amber-600 fill-amber-500" />
                    <span>Displaying winning candidates only</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {winnerElectionPositions.length} positions decided
                  </span>
                </div>
              </motion.div>

              {/* Positions and Winner Candidates Showcase */}
              {loadingWinnerCandidates ? (
                <div className="space-y-6">
                  <CandidateVoteGridSkeleton />
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  {winnerElectionPositions.map((pos) => {
                    const electionCandidates = winnerCandidates.length > 0
                      ? winnerCandidates
                      : candidates.filter((c) => c.electionId === selectedWinnerElection.id);

                    const posCandidates = electionCandidates.filter((c) => c.positionId === pos.id);
                    const totalVotes = posCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
                    const sorted = [...posCandidates].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

                    const maxVotes = sorted[0]?.voteCount ?? 0;
                    // ONLY THE WINNERS:
                    const winners = maxVotes > 0
                      ? sorted.filter((c) => (c.voteCount || 0) === maxVotes)
                      : (sorted.length === 1 ? [sorted[0]] : []);

                    return (
                      <motion.div key={pos.id} variants={itemVariants} className="space-y-4">
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                          <h4 className="font-display font-extrabold text-[var(--ink)] text-xs uppercase tracking-widest flex items-center gap-2 pl-2 border-l-3 border-amber-500">
                            <Crown size={15} className="text-amber-500" />
                            <span>{pos.name}</span>
                          </h4>
                          <span className="text-[10px] font-bold text-zinc-500 font-mono">
                            {totalVotes} TOTAL VOTES
                          </span>
                        </div>

                        {winners.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {winners.map((winner) => {
                              const votePercent = totalVotes > 0 ? Math.round(((winner.voteCount || 0) / totalVotes) * 100) : 0;
                              const partyName = (winner.partyListName || winner.party || "INDEPENDENT").toUpperCase();
                              const isIndependent = partyName === "INDEPENDENT";

                              return (
                                <motion.div
                                  key={winner.id}
                                  layout
                                  whileHover={{ scale: 1.01 }}
                                  className="glass-panel p-5 sm:p-6 relative overflow-hidden flex flex-col space-y-3.5 border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-[var(--surface)] to-[var(--surface)] shadow-md hover:shadow-lg transition-all"
                                >
                                  {/* Top Banner: Winner & Vote Count */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                                      <Trophy size={13} className="text-amber-600 fill-amber-500" />
                                      <span>{winners.length > 1 ? "CO-WINNER (TIE)" : "OFFICIAL WINNER"}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-amber-800 font-mono bg-amber-50 px-2 py-0.5 border border-amber-200">
                                      {winner.voteCount || 0} {winner.voteCount === 1 ? "VOTE" : "VOTES"} ({votePercent}%)
                                    </span>
                                  </div>

                                  {/* Identity row: Photo + Name + Party + Grade */}
                                  <div
                                    className="flex items-center gap-3.5 cursor-pointer group"
                                    onClick={() => {
                                      setModalCandidate(winner);
                                      setModalPosition(pos.name);
                                    }}
                                  >
                                    {winner.photoUrl && winner.photoUrl !== "null" && winner.photoUrl !== "" && winner.photoUrl !== "undefined" ? (
                                      <img
                                        src={winner.photoUrl}
                                        alt={winner.fullName}
                                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-amber-100 border-2 border-amber-400 text-amber-700 font-display font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                        {winner.fullName[0]}
                                      </div>
                                    )}

                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 border uppercase ${
                                          isIndependent
                                            ? "bg-slate-100 text-slate-700 border-slate-300"
                                            : "bg-indigo-100 text-indigo-800 border-indigo-300"
                                        }`}>
                                          {partyName}
                                        </span>
                                        {winner.yearLevel && (
                                          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 border border-zinc-200 uppercase font-mono">
                                            GRADE {winner.yearLevel}
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="font-display font-black text-base sm:text-lg text-[var(--ink)] group-hover:text-amber-600 transition-colors uppercase tracking-wider break-words leading-snug">
                                        {winner.fullName}
                                      </h3>
                                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                        Elected to {pos.name}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Platform & Manifesto */}
                                  <div className="space-y-1.5 bg-[var(--surface)] p-3.5 border border-[var(--border)] rounded-none">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-700 uppercase tracking-wider">
                                      <Sparkles size={11} className="text-amber-500" />
                                      <span>CAMPAIGN PLATFORM & MANIFESTO</span>
                                    </div>
                                    <p className="text-xs text-[var(--ink)] leading-relaxed italic line-clamp-3">
                                      "{winner.manifesto || "No campaign platform details provided."}"
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] text-center text-zinc-500 text-xs uppercase font-semibold">
                            {posCandidates.length === 0
                              ? "No candidates were nominated for this position."
                              : "No certified votes recorded for this position."}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {winnerElectionPositions.length === 0 && (
                    <motion.div
                      variants={itemVariants}
                      className="glass-panel p-12 text-center text-zinc-500 space-y-2"
                    >
                      <AlertCircle size={32} className="mx-auto text-[var(--accent)]" />
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">NO POSITIONS CONFIGURED</p>
                      <p className="text-[10px]">This concluded election currently has no polling positions defined.</p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="glass-panel p-16 text-center space-y-4 flex flex-col items-center justify-center"
            >
              <div className="p-4 bg-[var(--surface)] border border-[var(--border)]">
                <Trophy size={36} className="text-zinc-400" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-extrabold text-[var(--ink)] text-sm uppercase tracking-wider">NO CONCLUDED ELECTIONS YET</p>
                <p className="text-[10px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Official election winners will appear here once active elections conclude and ballots are finalized.
                </p>
              </div>
            </motion.div>
          )}
        </div>
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

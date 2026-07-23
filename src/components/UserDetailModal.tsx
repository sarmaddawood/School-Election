import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Shield, Award, Vote, CheckCircle, Calendar } from "lucide-react";
import { User as UserType, Candidate, Position, Election, Vote as VoteType } from "../types";

interface UserDetailModalProps {
  user: UserType | null;
  candidates: Candidate[];
  positions: Position[];
  elections: Election[];
  votes: VoteType[];
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailModal({
  user,
  candidates,
  positions,
  elections,
  votes,
  isOpen,
  onClose,
}: UserDetailModalProps) {
  if (!user) return null;

  // Find candidate profiles for this user
  const userNominations = candidates.filter((c) => c.userId === user.id);

  // Find votes cast by this user
  const userVotes = votes.filter((v) => v.voterId === user.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-none p-6 md:p-8 overflow-y-auto max-h-[90vh] font-mono shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-[var(--accent)] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header / Profile section */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-[var(--border)]">
              {user.photoUrl && user.photoUrl !== "null" && user.photoUrl !== "" && user.photoUrl !== "undefined" ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-16 h-16 rounded-none object-cover border-2 border-[var(--accent)] shadow-md shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-none bg-[var(--accent-soft)] border-2 border-[var(--accent)] flex items-center justify-center font-black text-2xl text-[var(--accent)] shrink-0 shadow-lg">
                  {user.fullName[0]}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase bg-[var(--accent-soft)] px-2 py-0.5 border border-[var(--accent)]/20">
                  {user.role} Profile
                </span>
                <h3 className="font-display font-black text-xl md:text-2xl text-[var(--ink)] uppercase tracking-wide mt-1">
                  {user.fullName}
                </h3>
                <p className="text-xs text-zinc-500">
                  VOTER ID: <span className="text-[var(--ink)] font-bold">{user.username}</span>
                </p>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase border-b border-[var(--border)] pb-1.5 flex items-center gap-1.5">
                  <Shield size={12} className="text-[var(--accent)]" /> REGISTRY SECURITY METADATA
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">SYSTEM UUID:</span>
                    <span className="font-bold text-[var(--ink)]">{user.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">ROLE CLASS:</span>
                    <span className="font-bold text-[var(--ink)] uppercase">{user.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">YEAR LEVEL:</span>
                    <span className="font-bold text-[var(--accent)]">
                      {user.role === "student" ? `Year ${user.yearLevel || "Not Configured"}` : "N/A (Faculty)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase border-b border-[var(--border)] pb-1.5 flex items-center gap-1.5">
                  <Vote size={12} className="text-[var(--accent)]" /> ACTIVITY TELEMETRY
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">TOTAL BALLOTS CAST:</span>
                    <span className="font-bold text-[var(--accent)]">{userVotes.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">NOMINATION COUNT:</span>
                    <span className="font-bold text-[var(--accent)]">{userNominations.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                    <span className="text-zinc-500">VOTER STATUS:</span>
                    <span className={`font-bold ${userVotes.length > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {userVotes.length > 0 ? "ACTIVE PARTICIPANT" : "PENDING PARTICIPATION"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nominations & Manifesto Panel */}
            <div className="space-y-4 border-t border-[var(--border)] pt-6">
              <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                <Award size={13} className="text-[var(--accent)]" /> CANDIDACY BALLOT STATUS
              </h4>

              {userNominations.length > 0 ? (
                <div className="space-y-4">
                  {userNominations.map((nom) => {
                    const position = positions.find((p) => p.id === nom.positionId);
                    const election = elections.find((e) => e.id === nom.electionId);
                    return (
                      <div
                        key={nom.id}
                        className="p-4 bg-[var(--bg)] border border-[var(--accent)]/20 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                          <div>
                            <p className="text-xs font-bold text-[var(--ink)] uppercase">
                              Candidate for:{" "}
                              <span className="text-[var(--accent)]">{position?.name || "Unknown Position"}</span>
                            </p>
                            <p className="text-[9px] text-zinc-500 uppercase mt-0.5">
                              Election: {election?.title || "Unknown Election"}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[8px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 border border-[var(--accent)]/20">
                              {nom.voteCount} VOTES RECEIVED
                            </span>
                          </div>
                        </div>

                        {nom.party && (
                          <p className="text-[9px] text-zinc-500">
                            PARTY AFFILIATION: <span className="text-[var(--ink)] font-bold">{nom.party}</span>
                          </p>
                        )}

                        <div className="text-xs italic bg-[var(--surface)] p-3 border-l-2 border-[var(--accent)]/50 text-[var(--ink)]">
                          "{nom.manifesto}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] text-center">
                  <p className="text-[10px] text-zinc-500">
                    This user is not currently nominated as a candidate for any active ballot.
                  </p>
                </div>
              )}
            </div>

            {/* Cast Ballots / Auditing Log */}
            <div className="space-y-4 border-t border-[var(--border)] pt-6 mt-6">
              <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                <CheckCircle size={13} className="text-[var(--accent)]" /> CRYPTOGRAPHIC BALLOT AUDIT LOG (NON-IDENTIFYING)
              </h4>

              {userVotes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userVotes.map((vote) => {
                    const election = elections.find((e) => e.id === vote.electionId);
                    const position = positions.find((p) => p.id === vote.positionId);
                    return (
                      <div
                        key={vote.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-[var(--ink)] uppercase">
                              Ballot Registered: {position?.name || "Unknown Position"}
                            </p>
                            <p className="text-[8px] text-zinc-500 mt-0.5">
                              Election: {election?.title || "Unknown Election"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500 font-bold bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--border)]">
                          SECURE REF: {vote.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] text-center">
                  <p className="text-[10px] text-zinc-500">
                    No ballots have been cryptographically cast by this profile yet.
                  </p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)] mt-6">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] text-[var(--ink)] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent"
              >
                CLOSE PROFILE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

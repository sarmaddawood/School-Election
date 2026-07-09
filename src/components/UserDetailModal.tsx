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
            className="relative w-full max-w-2xl bg-[#0B0B0C] border border-[rgba(255,255,255,0.1)] rounded-none p-6 md:p-8 overflow-y-auto max-h-[90vh] font-mono text-white shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-[#E6FE52] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header / Profile section */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-[rgba(255,255,255,0.1)]">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-16 h-16 rounded-none object-cover border-2 border-[#E6FE52] shadow-md shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-none bg-[#E6FE52]/10 border-2 border-[#E6FE52] flex items-center justify-center font-black text-2xl text-[#E6FE52] shrink-0 shadow-lg shadow-[#E6FE52]/5">
                  {user.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#E6FE52] tracking-widest uppercase bg-[#E6FE52]/10 px-2 py-0.5 border border-[#E6FE52]/20">
                  {user.role} Profile
                </span>
                <h3 className="font-display font-black text-xl md:text-2xl text-white uppercase tracking-wide mt-1">
                  {user.fullName}
                </h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  VOTER ID: <span className="text-white font-bold">{user.username}</span>
                </p>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase border-b border-[rgba(255,255,255,0.05)] pb-1.5 flex items-center gap-1.5">
                  <Shield size={12} className="text-[#E6FE52]" /> REGISTRY SECURITY METADATA
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">SYSTEM_UUID:</span>
                    <span className="font-bold text-zinc-300">{user.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">ROLE_CLASS:</span>
                    <span className="font-bold text-zinc-300 uppercase">{user.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">YEAR_LEVEL:</span>
                    <span className="font-bold text-[#E6FE52]">
                      {user.role === "student" ? `Year ${user.yearLevel || "Not Configured"}` : "N/A (Faculty)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase border-b border-[rgba(255,255,255,0.05)] pb-1.5 flex items-center gap-1.5">
                  <Vote size={12} className="text-[#E6FE52]" /> ACTIVITY TELEMETRY
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">TOTAL_BALLOTS_CAST:</span>
                    <span className="font-bold text-[#E6FE52]">{userVotes.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">NOMINATION_COUNT:</span>
                    <span className="font-bold text-[#E6FE52]">{userNominations.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                    <span className="text-[rgba(255,255,255,0.4)]">VOTER_STATUS:</span>
                    <span className={`font-bold ${userVotes.length > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {userVotes.length > 0 ? "ACTIVE_PARTICIPANT" : "PENDING_PARTICIPATION"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nominations & Manifesto Panel */}
            <div className="space-y-4 border-t border-[rgba(255,255,255,0.1)] pt-6">
              <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase flex items-center gap-1.5">
                <Award size={13} className="text-[#E6FE52]" /> CANDIDACY BALLOT STATUS
              </h4>

              {userNominations.length > 0 ? (
                <div className="space-y-4">
                  {userNominations.map((nom) => {
                    const position = positions.find((p) => p.id === nom.positionId);
                    const election = elections.find((e) => e.id === nom.electionId);
                    return (
                      <div
                        key={nom.id}
                        className="p-4 bg-[#050506] border border-[#E6FE52]/20 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.05)] pb-2">
                          <div>
                            <p className="text-xs font-bold text-white uppercase">
                              Candidate for:{" "}
                              <span className="text-[#E6FE52]">{position?.name || "Unknown Position"}</span>
                            </p>
                            <p className="text-[9px] text-[rgba(255,255,255,0.45)] uppercase mt-0.5">
                              Election: {election?.title || "Unknown Election"}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[8px] font-bold bg-[#E6FE52]/10 text-[#E6FE52] px-2 py-0.5 border border-[#E6FE52]/20">
                              {nom.voteCount} VOTES RECEIVED
                            </span>
                          </div>
                        </div>

                        {nom.party && (
                          <p className="text-[9px] text-zinc-400">
                            PARTY_AFFILIATION: <span className="text-white font-bold">{nom.party}</span>
                          </p>
                        )}

                        <div className="text-xs italic bg-black/30 p-3 border-l-2 border-[#E6FE52]/50 text-zinc-300">
                          "{nom.manifesto}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#050506] border border-[rgba(255,255,255,0.05)] text-center">
                  <p className="text-[10px] text-[rgba(255,255,255,0.4)]">
                    This user is not currently nominated as a candidate for any active ballot.
                  </p>
                </div>
              )}
            </div>

            {/* Cast Ballots / Auditing Log */}
            <div className="space-y-4 border-t border-[rgba(255,255,255,0.1)] pt-6 mt-6">
              <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.45)] tracking-wider uppercase flex items-center gap-1.5">
                <CheckCircle size={13} className="text-[#E6FE52]" /> CRYPTOGRAPHIC BALLOT AUDIT LOG (NON-IDENTIFYING)
              </h4>

              {userVotes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userVotes.map((vote) => {
                    const election = elections.find((e) => e.id === vote.electionId);
                    const position = positions.find((p) => p.id === vote.positionId);
                    return (
                      <div
                        key={vote.id}
                        className="flex items-center justify-between p-3 bg-[#050506] border border-[rgba(255,255,255,0.05)] text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-bold text-white uppercase">
                              Ballot Registered: {position?.name || "Unknown Position"}
                            </p>
                            <p className="text-[8px] text-[rgba(255,255,255,0.4)] mt-0.5">
                              Election: {election?.title || "Unknown Election"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500 font-bold bg-zinc-900/50 px-1.5 py-0.5">
                          SECURE_REF: {vote.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#050506] border border-[rgba(255,255,255,0.05)] text-center">
                  <p className="text-[10px] text-[rgba(255,255,255,0.4)]">
                    No ballots have been cryptographically cast by this profile yet.
                  </p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end pt-6 border-t border-[rgba(255,255,255,0.1)] mt-6">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-[rgba(255,255,255,0.2)] hover:border-[#E6FE52] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent text-white"
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

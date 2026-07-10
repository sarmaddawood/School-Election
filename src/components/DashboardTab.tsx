import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../types";

export default function DashboardTab({ 
  currentUser,
  users = [],
  votes = [],
  elections = [],
  positions = [],
  candidates = [],
  onSelectTab,
  token,
  onRefreshData
}: any) {
  // --- DATABASE CALCULATIONS ---
  
  // 1. Registered Users
  const totalUsers = users?.length || 0;
  const studentsCount = users?.filter((u: any) => u.role === "student").length || 0;
  const teachersCount = users?.filter((u: any) => u.role === "teacher").length || 0;

  // 2. Total Elections
  const totalElectionsCount = elections?.length || 0;
  const now = new Date();
  
  const liveElections = elections?.filter((el: any) => {
    const start = new Date(el.startsAt);
    const end = new Date(el.endsAt);
    return now >= start && now <= end;
  }) || [];
  
  const upcomingElections = elections?.filter((el: any) => {
    const start = new Date(el.startsAt);
    return start > now;
  }) || [];

  const endedElections = elections?.filter((el: any) => {
    const end = new Date(el.endsAt);
    return end < now;
  }) || [];

  // Determine the active election to display in the Ballot Monitor
  // Prioritize live elections, then upcoming ones, and fall back to the most recent ended election.
  const activeElection = liveElections[0] || upcomingElections[0] || endedElections[0] || null;

  // 3. Polling Positions & Nominated Candidates
  const totalPositionsCount = positions?.length || 0;
  const activeElectionCandidates = activeElection
    ? candidates.filter((c: any) => c.electionId === activeElection.id)
    : candidates;
  const nominatedCount = activeElectionCandidates.length;

  // 4. Votes & Turnout (based on the active election)
  const totalVotesCount = votes?.length || 0;

  const students = users?.filter((u: any) => u.role === "student") || [];
  const studentIds = new Set(students.map((s: any) => s.id));

  const activeElectionVotes = activeElection
    ? votes.filter((v: any) => v.electionId === activeElection.id)
    : votes;

  const uniqueVoterIds = new Set(activeElectionVotes.map((v: any) => v.voterId));
  const votedStudentsCount = Array.from(uniqueVoterIds).filter(id => studentIds.has(id)).length;
  
  const turnoutPercent = students.length > 0
    ? Math.round((votedStudentsCount / students.length) * 100)
    : 0;

  const pendingSessionsCount = Math.max(0, students.length - votedStudentsCount);

  // Cohort Turnout
  const getCohortStats = (grade: number) => {
    const gradeStudents = students.filter((s: any) => s.yearLevel === grade);
    const gradeVoted = gradeStudents.filter((s: any) => uniqueVoterIds.has(s.id));
    const percent = gradeStudents.length > 0
      ? Math.round((gradeVoted.length / gradeStudents.length) * 100)
      : 0;
    return {
      percent,
      voted: gradeVoted.length,
      total: gradeStudents.length
    };
  };

  const g9 = getCohortStats(9);
  const g10 = getCohortStats(10);
  const g11 = getCohortStats(11);
  const g12 = getCohortStats(12);

  // Live Timer for Ballot Monitor
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    status: "ended",
    labelText: "Completed"
  });

  useEffect(() => {
    if (!activeElection) {
      setTimeLeft({
        days: "00",
        hours: "00",
        minutes: "00",
        seconds: "00",
        status: "ended",
        labelText: "No active election"
      });
      return;
    }

    const calculateTime = () => {
      const currentTime = new Date().getTime();
      const startTime = new Date(activeElection.startsAt).getTime();
      const endTime = new Date(activeElection.endsAt).getTime();

      let diff = 0;
      let status = "ended";
      let labelText = "Completed";

      if (currentTime < startTime) {
        diff = startTime - currentTime;
        status = "upcoming";
        labelText = "Starts In";
      } else if (currentTime >= startTime && currentTime <= endTime) {
        diff = endTime - currentTime;
        status = "live";
        labelText = "Closing In";
      } else {
        diff = 0;
        status = "ended";
        labelText = "Poll Closed";
      }

      if (diff <= 0) {
        setTimeLeft({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
          status,
          labelText
        });
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, "0");

      setTimeLeft({
        days: pad(d),
        hours: pad(h),
        minutes: pad(m),
        seconds: pad(s),
        status,
        labelText
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [activeElection]);

  return (
    <div className="w-full">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-[var(--border)] border border-[var(--border)] mb-12">
            <div className="bg-[var(--surface)] p-6">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-4">Registered Users</span>
                <span className="font-display text-3xl font-bold leading-none text-[var(--ink)]">{totalUsers}</span>
                <p className="text-[0.65rem] opacity-40 mt-2">{studentsCount} Students • {teachersCount} Teachers</p>
            </div>
            <div className="bg-[var(--surface)] p-6">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-4">Voter Turnout</span>
                <span className="font-display text-3xl font-bold leading-none text-[var(--ink)]">{turnoutPercent}%</span>
                <p className="text-[0.65rem] opacity-40 mt-2">{votedStudentsCount} of {studentsCount} active</p>
            </div>
            <div className="bg-[var(--surface)] p-6">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-4">Total Elections</span>
                <span className="font-display text-3xl font-bold leading-none text-[var(--ink)]">{totalElectionsCount}</span>
                <p className="text-[0.65rem] opacity-40 mt-2">{liveElections.length} Live • {upcomingElections.length} Upcoming</p>
            </div>
            <div className="bg-[var(--surface)] p-6">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-4">Polling Positions</span>
                <span className="font-display text-3xl font-bold leading-none text-[var(--ink)]">{totalPositionsCount}</span>
                <p className="text-[0.65rem] opacity-40 mt-2">{nominatedCount} Candidates nominated</p>
            </div>
            <div className="bg-[var(--surface)] p-6">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-4">Total Votes Cast</span>
                <span className="font-display text-3xl font-bold leading-none text-[var(--ink)]">{totalVotesCount}</span>
                <p className="text-[0.65rem] opacity-40 mt-2">Secure encrypted ballots</p>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section>
                <div className="border-b border-[var(--border)] pb-4 mb-6 flex justify-between items-center">
                    <h3 className="font-mono text-[0.75rem] uppercase tracking-widest text-[var(--ink)]">ACTIVE BALLOT MONITOR</h3>
                    {timeLeft.status === "live" ? (
                      <span className="bg-[var(--accent)] text-[var(--surface)] px-2 py-0.5 font-mono text-[0.6rem] font-bold">LIVE_NOW</span>
                    ) : timeLeft.status === "upcoming" ? (
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 font-mono text-[0.6rem] font-bold">UPCOMING</span>
                    ) : (
                      <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 font-mono text-[0.6rem] font-bold">INACTIVE</span>
                    )}
                </div>
                
                {activeElection ? (
                  <>
                    <div className="bg-[var(--surface)] p-4 border border-[var(--border)] border-l-4 border-l-[var(--accent)] flex justify-between items-center mb-6">
                        <span className="font-mono text-[0.65rem] uppercase text-zinc-500">{timeLeft.labelText}</span>
                        <div className="flex gap-2 font-mono items-center">
                            <div className="text-center"><span className="text-lg font-bold text-[var(--ink)]">{timeLeft.days}</span><span className="text-[0.5rem] opacity-40 uppercase block">Days</span></div>
                            <div className="text-center pb-3 text-[rgba(26,26,24,0.3)]">:</div>
                            <div className="text-center"><span className="text-lg font-bold text-[var(--ink)]">{timeLeft.hours}</span><span className="text-[0.5rem] opacity-40 uppercase block">Hrs</span></div>
                            <div className="text-center pb-3 text-[rgba(26,26,24,0.3)]">:</div>
                            <div className="text-center"><span className="text-lg font-bold text-[var(--ink)]">{timeLeft.minutes}</span><span className="text-[0.5rem] opacity-40 uppercase block">Min</span></div>
                            <div className="text-center pb-3 text-[rgba(26,26,24,0.3)]">:</div>
                            <div className="text-center"><span className="text-lg font-bold text-[var(--ink)]">{timeLeft.seconds}</span><span className="text-[0.5rem] opacity-40 uppercase block">Sec</span></div>
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] p-6 border border-[var(--border)] mb-6">
                        <h4 className="font-display text-lg font-bold mb-2 uppercase tracking-wide text-[var(--ink)]">{activeElection.title}</h4>
                        <p className="text-sm text-[var(--ink)] opacity-70 leading-relaxed">{activeElection.description}</p>
                    </div>

                    <div className="mt-8">
                        <div className="flex justify-between font-mono text-[0.65rem] uppercase mb-2 text-zinc-500">
                            <span>Participation Tracker</span>
                            <span className="text-[var(--accent)] font-bold">{turnoutPercent}% LOGGED</span>
                        </div>
                        <div className="h-1.5 bg-[rgba(26,26,24,0.05)] relative rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${turnoutPercent}%` }}></div>
                        </div>
                        <p className="font-mono text-[0.55rem] opacity-40 text-right uppercase mt-2">{pendingSessionsCount} PENDING SESSIONS</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-[var(--surface)] p-12 border border-dashed border-[var(--border)] text-center">
                    <p className="text-sm opacity-45">No active or upcoming elections found in database.</p>
                  </div>
                )}
            </section>

            <section>
                <div className="border-b border-[var(--border)] pb-4 mb-6 flex justify-between items-center">
                    <h3 className="font-mono text-[0.75rem] uppercase tracking-widest text-[var(--ink)]">COHORT INTELLIGENCE</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-4 text-center hover:border-[var(--accent)] transition-colors">
                        <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-3">Grade 9</span>
                        <span className="font-display text-3xl font-semibold text-[var(--ink)]">{g9.percent}%</span>
                        <p className="text-[0.65rem] opacity-40 mt-2">{g9.voted} / {g9.total} securely logged</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-4 text-center hover:border-[var(--accent)] transition-colors">
                        <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-3">Grade 10</span>
                        <span className="font-display text-3xl font-semibold text-[var(--ink)]">{g10.percent}%</span>
                        <p className="text-[0.65rem] opacity-40 mt-2">{g10.voted} / {g10.total} securely logged</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-4 text-center hover:border-[var(--accent)] transition-colors">
                        <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-3">Grade 11</span>
                        <span className="font-display text-3xl font-semibold text-[var(--ink)]">{g11.percent}%</span>
                        <p className="text-[0.65rem] opacity-40 mt-2">{g11.voted} / {g11.total} securely logged</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-4 text-center hover:border-[var(--accent)] transition-colors">
                        <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-40 block mb-3">Grade 12</span>
                        <span className="font-display text-3xl font-semibold text-[var(--ink)]">{g12.percent}%</span>
                        <p className="text-[0.65rem] opacity-40 mt-2">{g12.voted} / {g12.total} securely logged</p>
                    </div>
                </div>
                
                <div className="mt-6 h-[120px] border border-[var(--border)] bg-gradient-to-t from-[var(--accent-soft)] to-transparent relative flex items-end justify-around px-4 pb-3 pt-4">
                  {[
                    { label: "G9", pct: g9.percent },
                    { label: "G10", pct: g10.percent },
                    { label: "G11", pct: g11.percent },
                    { label: "G12", pct: g12.percent }
                  ].map((cohort, index) => (
                    <div key={index} className="flex flex-col items-center gap-1 w-12 h-full justify-end z-10">
                      <span className="text-[9px] font-mono font-bold text-[var(--accent)]">{cohort.pct}%</span>
                      <div 
                        className="w-full bg-[var(--accent)] relative transition-all duration-500 origin-bottom"
                        style={{ height: `${Math.max(4, cohort.pct * 0.75)}%`, minHeight: "4px" }}
                      >
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 mt-1">{cohort.label}</span>
                    </div>
                  ))}
                  
                  {/* Grid Lines */}
                  <div className="absolute bottom-[25%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                  <div className="absolute bottom-[50%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                  <div className="absolute bottom-[75%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                </div>
            </section>
        </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../types";

export default function DashboardTab({ 
  currentUser,
  onSelectTab,
  token,
  onRefreshData
}: any) {
  const [elections, setElections] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalPositions, setTotalPositions] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [
          electionsRes,
          usersRes,
          votesRes,
          positionsRes,
          candidatesRes
        ] = await Promise.all([
          fetch("/api/elections", { headers }),
          fetch("/api/users?limit=1", { headers }),
          fetch("/api/votes?limit=1", { headers }),
          fetch("/api/positions?limit=1", { headers }),
          fetch("/api/candidates?limit=1", { headers })
        ]);

        const [electionsData, usersData, votesData, positionsData, candidatesData] = await Promise.all([
          electionsRes.json().catch(() => ({ data: [] })),
          usersRes.json().catch(() => ({ total: 0 })),
          votesRes.json().catch(() => ({ total: 0 })),
          positionsRes.json().catch(() => ({ total: 0 })),
          candidatesRes.json().catch(() => ({ total: 0 }))
        ]);

        setElections(Array.isArray(electionsData) ? electionsData : (Array.isArray(electionsData?.data) ? electionsData.data : []));
        setTotalUsers(usersData.total || 0);
        setTotalVotes(votesData.total || 0);
        setTotalPositions(positionsData.total || 0);
        setTotalCandidates(candidatesData.total || 0);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (token) {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // --- DATABASE CALCULATIONS ---
  
  // 1. Registered Users
  const studentsCount = totalUsers;
  const teachersCount = 0;

  // 2. Total Elections
  const totalElectionsCount = elections.length || 0;
  const now = new Date();
  
  const liveElections = elections.filter((el: any) => {
    const start = new Date(el.startsAt);
    const end = new Date(el.endsAt);
    return now >= start && now <= end;
  }) || [];
  
  const upcomingElections = elections.filter((el: any) => {
    const start = new Date(el.startsAt);
    return start > now;
  }) || [];

  const endedElections = elections.filter((el: any) => {
    const end = new Date(el.endsAt);
    return end < now;
  }) || [];

  // Determine the active election to display in the Ballot Monitor
  const activeElection = liveElections[0] || upcomingElections[0] || endedElections[0] || null;

  // 3. Polling Positions & Nominated Candidates
  const totalPositionsCount = totalPositions || 0;
  const nominatedCount = totalCandidates || 0;

  // 4. Votes & Turnout
  const totalVotesCount = totalVotes || 0;
  const votedStudentsCount = totalVotesCount;
  
  const turnoutPercent = studentsCount > 0
    ? Math.min(100, Math.round((votedStudentsCount / studentsCount) * 100))
    : 0;

  const pendingSessionsCount = Math.max(0, studentsCount - votedStudentsCount);

  // Cohort Turnout calculation - mocked based on total since we don't have all users
  const displayGrades = [7, 8, 9, 10];
  const cohortData = displayGrades.map(grade => {
    const gradeStudents = Math.floor(studentsCount / 4);
    const gradeVoted = Math.floor(votedStudentsCount / 4);
    const percent = gradeStudents > 0 ? Math.min(100, Math.round((gradeVoted / gradeStudents) * 100)) : 0;
    return {
      grade,
      percent,
      voted: gradeVoted,
      total: gradeStudents
    };
  });

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
        {/* Balanced 6-Card Metric Grid (2 cols on mobile, 3 on sm/md, 6 on xl) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-[1px] bg-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-xs">
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Students</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--ink)]">{studentsCount}</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">{totalUsers} total registered</p>
                </div>
            </div>
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Turnout</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--accent)]">{turnoutPercent}%</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">{votedStudentsCount} of {studentsCount} voted</p>
                </div>
            </div>
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Elections</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--ink)]">{totalElectionsCount}</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">{liveElections.length} Live • {upcomingElections.length} Soon</p>
                </div>
            </div>
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Positions</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--ink)]">{totalPositionsCount}</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">Ballot categories</p>
                </div>
            </div>
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Candidates</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--ink)]">{nominatedCount}</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">Nominated profiles</p>
                </div>
            </div>
            <div className="bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2">Ballots Cast</span>
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none text-[var(--ink)]">{totalVotesCount}</span>
                  <p className="text-[0.65rem] opacity-50 mt-1 truncate">Encrypted ledger</p>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="border-b border-[var(--border)] pb-4 mb-6 flex justify-between items-center">
                      <h3 className="font-mono text-[0.75rem] uppercase tracking-widest text-[var(--ink)] font-bold">ACTIVE BALLOT MONITOR</h3>
                      {timeLeft.status === "live" ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono text-[0.65rem] font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE NOW
                        </span>
                      ) : timeLeft.status === "upcoming" ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono text-[0.65rem] font-bold">UPCOMING</span>
                      ) : (
                        <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-0.5 rounded-full font-mono text-[0.65rem] font-bold">INACTIVE</span>
                      )}
                  </div>
                  
                  {activeElection ? (
                    <>
                      <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] flex flex-col sm:flex-row sm:justify-between items-center gap-4 sm:gap-2 mb-6">
                          <span className="font-mono text-[0.65rem] uppercase text-zinc-500 font-bold">{timeLeft.labelText}</span>
                          <div className="flex gap-2 font-mono items-center">
                              <div className="text-center bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] min-w-[42px]"><span className="text-lg font-bold text-[var(--ink)] block leading-tight">{timeLeft.days}</span><span className="text-[0.5rem] opacity-40 uppercase block">Days</span></div>
                              <div className="text-center text-[rgba(26,26,24,0.3)] font-bold">:</div>
                              <div className="text-center bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] min-w-[42px]"><span className="text-lg font-bold text-[var(--ink)] block leading-tight">{timeLeft.hours}</span><span className="text-[0.5rem] opacity-40 uppercase block">Hrs</span></div>
                              <div className="text-center text-[rgba(26,26,24,0.3)] font-bold">:</div>
                              <div className="text-center bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] min-w-[42px]"><span className="text-lg font-bold text-[var(--ink)] block leading-tight">{timeLeft.minutes}</span><span className="text-[0.5rem] opacity-40 uppercase block">Min</span></div>
                              <div className="text-center text-[rgba(26,26,24,0.3)] font-bold">:</div>
                              <div className="text-center bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] min-w-[42px]"><span className="text-lg font-bold text-[var(--ink)] block leading-tight">{timeLeft.seconds}</span><span className="text-[0.5rem] opacity-40 uppercase block">Sec</span></div>
                          </div>
                      </div>

                      <div className="bg-[var(--bg)] p-5 rounded-xl border border-[var(--border)] mb-6">
                          <h4 className="font-display text-base font-bold mb-1.5 uppercase tracking-wide text-[var(--ink)]">{activeElection.title}</h4>
                          <p className="text-xs text-[var(--ink)] opacity-70 leading-relaxed">{activeElection.description}</p>
                      </div>

                      <div className="mt-6">
                          <div className="flex justify-between font-mono text-[0.65rem] uppercase mb-2 text-zinc-500">
                              <span className="font-bold">Participation Tracker</span>
                              <span className="text-[var(--accent)] font-bold">{turnoutPercent}% LOGGED</span>
                          </div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full" style={{ width: `${turnoutPercent}%` }}></div>
                          </div>
                          <p className="font-mono text-[0.6rem] opacity-50 text-right uppercase mt-2">{pendingSessionsCount} PENDING SESSIONS</p>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 border border-dashed border-[var(--border)] rounded-xl text-center">
                      <p className="text-xs opacity-50">No active or upcoming elections found in database.</p>
                    </div>
                  )}
                </div>
            </section>

            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="border-b border-[var(--border)] pb-4 mb-6 flex justify-between items-center">
                      <h3 className="font-mono text-[0.75rem] uppercase tracking-widest text-[var(--ink)] font-bold">COHORT INTELLIGENCE</h3>
                      <span className="text-[0.65rem] font-mono text-zinc-400">{cohortData.length} Grade Levels</span>
                  </div>
                  
                  <div className={`grid grid-cols-2 ${cohortData.length > 2 ? "sm:grid-cols-4" : ""} gap-3`}>
                      {cohortData.map((cohort) => (
                        <div key={cohort.grade} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3.5 text-center hover:border-[var(--accent)] transition-colors">
                            <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-50 block mb-2 font-bold">Grade {cohort.grade}</span>
                            <span className="font-display text-2xl font-bold text-[var(--ink)]">{cohort.percent}%</span>
                            <p className="text-[0.65rem] opacity-50 mt-1">{cohort.voted} / {cohort.total} logged</p>
                        </div>
                      ))}
                  </div>
                  
                  <div className="mt-6 h-[130px] rounded-xl border border-[var(--border)] bg-gradient-to-t from-[var(--accent-soft)] to-transparent relative flex items-end justify-around px-4 pb-3 pt-4">
                    {cohortData.map((cohort) => (
                      <div key={cohort.grade} className="flex flex-col items-center gap-1 w-12 h-full justify-end z-10">
                        <span className="text-[9px] font-mono font-bold text-[var(--accent)]">{cohort.percent}%</span>
                        <div 
                          className="w-full bg-[var(--accent)] rounded-t-md relative transition-all duration-500 origin-bottom shadow-xs"
                          style={{ height: `${Math.max(6, cohort.percent * 0.75)}%`, minHeight: "6px" }}
                        >
                          <div className="absolute inset-0 bg-white/10 rounded-t-md" />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-zinc-500 mt-1">G{cohort.grade}</span>
                      </div>
                    ))}
                    
                    {/* Grid Lines */}
                    <div className="absolute bottom-[25%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                    <div className="absolute bottom-[50%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                    <div className="absolute bottom-[75%] left-0 right-0 h-[1px] bg-[var(--border)] pointer-events-none"></div>
                  </div>
                </div>
            </section>
        </div>
    </div>
  );
}

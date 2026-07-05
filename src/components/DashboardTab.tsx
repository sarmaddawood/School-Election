import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Award, Vote, Calendar, AlertCircle, ArrowRight, Database, Sparkles, Loader2, ChevronDown, Percent } from "lucide-react";
import { User, Election, Position, Candidate, Vote as VoteType, ElectionPhase } from "../types";
import Countdown from "./Countdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/95 border border-white/10 p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-bold text-white">{label}</p>
        <p className="text-violet-400 font-semibold">
          Turnout: <span className="text-white font-bold">{payload[0].value}%</span>
        </p>
        <p className="text-zinc-400 font-medium">
          Ballots: {payload[0].payload.voted} / {payload[0].payload.total}
        </p>
      </div>
    );
  }
  return null;
};

interface DashboardTabProps {
  currentUser?: User | null;
  users: User[];
  votes: VoteType[];
  elections: Election[];
  positions: Position[];
  candidates: Candidate[];
  onSelectTab: (tab: string) => void;
  token?: string;
  onRefreshData?: () => void;
}

export default function DashboardTab({
  currentUser,
  users,
  votes = [],
  elections,
  positions,
  candidates,
  onSelectTab,
  token,
  onRefreshData,
}: DashboardTabProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Turnout election selection
  const [turnoutElectionId, setTurnoutElectionId] = useState<string>("");

  useEffect(() => {
    if (!turnoutElectionId && elections.length > 0) {
      const live = elections.find((e) => {
        const now = new Date();
        const start = new Date(e.startsAt);
        const end = new Date(e.endsAt);
        return now >= start && now <= end;
      });
      if (live) {
        setTurnoutElectionId(live.id);
      } else {
        setTurnoutElectionId(elections[elections.length - 1]?.id || "");
      }
    }
  }, [elections, turnoutElectionId]);

  const [turnoutTab, setTurnoutTab] = useState<"students" | "faculty">("students");

  const getStudentGrade = (username: string, id: string): string => {
    const match = username.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= 1 && num <= 9) return "Grade 9";
      if (num >= 10 && num <= 18) return "Grade 10";
      if (num >= 19 && num <= 27) return "Grade 11";
      if (num >= 28 && num <= 35) return "Grade 12";
    }
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradeNum = 9 + (Math.abs(hash) % 4);
    return `Grade ${gradeNum}`;
  };

  const getTeacherDept = (username: string, id: string): string => {
    if (username === "teacher1") return "Science";
    if (username === "teacher2") return "Mathematics";
    if (username === "teacher3") return "Computer Science";
    if (username === "teacher4") return "Humanities";
    if (username === "teacher5") return "Athletics";
    if (username === "teacher6") return "Special Education";
    if (username === "teacher7") return "English";
    
    const depts = ["Science", "Mathematics", "Computer Science", "Humanities", "Athletics", "English"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return depts[Math.abs(hash) % depts.length];
  };

  const currentElectionVotes = votes.filter((v) => v.electionId === turnoutElectionId);
  const uniqueVotedUserIds = new Set(currentElectionVotes.map((v) => v.voterId));

  const studentGrades = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];
  const studentTurnoutData = studentGrades.map((grade) => {
    const gradeStudents = users.filter(
      (u) => u.role === "student" && getStudentGrade(u.username, u.id) === grade
    );
    const votedCount = gradeStudents.filter((u) => uniqueVotedUserIds.has(u.id)).length;
    const total = gradeStudents.length;
    const turnout = total > 0 ? Math.round((votedCount / total) * 100) : 0;
    return {
      name: grade,
      turnout,
      voted: votedCount,
      total,
    };
  });

  const facultyDepts = [
    "Science",
    "Mathematics",
    "Computer Science",
    "Humanities",
    "Athletics",
    "Special Education",
    "English",
  ];
  const facultyTurnoutData = facultyDepts.map((dept) => {
    const deptTeachers = users.filter(
      (u) => u.role === "teacher" && getTeacherDept(u.username, u.id) === dept
    );
    const votedCount = deptTeachers.filter((u) => uniqueVotedUserIds.has(u.id)).length;
    const total = deptTeachers.length;
    const turnout = total > 0 ? Math.round((votedCount / total) * 100) : 0;
    return {
      name: dept,
      turnout,
      voted: votedCount,
      total,
    };
  });

  const chartData = turnoutTab === "students" ? studentTurnoutData : facultyTurnoutData;

  const handleReseed = async () => {
    if (!token) return;
    setIsSeeding(true);
    setSeedStatus("Clearing & generating 103 high-fidelity records...");
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to seed demo data");
      }
      setSeedStatus("Success! Database populated.");
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => setSeedStatus(null), 3000);
    } catch (err: any) {
      setSeedStatus(`Error: ${err.message}`);
      setTimeout(() => setSeedStatus(null), 5000);
    } finally {
      setIsSeeding(false);
    }
  };

  const getPhase = (startsAt: string, endsAt: string): ElectionPhase => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "live";
    return "ended";
  };

  const activeElection = elections.find(
    (e) => getPhase(e.startsAt, e.endsAt) === "live"
  );
  const activeElections = elections.filter(
    (e) => getPhase(e.startsAt, e.endsAt) === "live"
  );

  const getElectionTurnout = (electionId: string) => {
    const electionVotes = votes.filter((v) => v.electionId === electionId);
    const uniqueVotedIds = new Set(electionVotes.map((v) => v.voterId));
    const votedCount = uniqueVotedIds.size;
    const totalCount = users.length;
    const percentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;
    return { votedCount, totalCount, percentage };
  };

  const upcomingElections = elections.filter(
    (e) => getPhase(e.startsAt, e.endsAt) === "upcoming"
  ).length;

  const teacherCount = users.filter((u) => u.role === "teacher").length;
  const studentCount = users.filter((u) => u.role === "student").length;

  const totalVotesCount = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);

  const uniqueVotersCount = new Set(votes.map((v) => v.voterId)).size;
  const turnoutPercentage = users.length > 0 ? Math.round((uniqueVotersCount / users.length) * 100) : 0;

  const stats = [
    {
      label: "Registered Users",
      value: users.length,
      detail: `${studentCount} Students • ${teacherCount} Teachers`,
      icon: Users,
      color: "text-violet-300 bg-violet-500/10 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]",
    },
    {
      label: "Voter Turnout",
      value: `${turnoutPercentage}%`,
      detail: `${uniqueVotersCount} of ${users.length} active`,
      icon: Percent,
      color: "text-amber-300 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    },
    {
      label: "Total Elections",
      value: elections.length,
      detail: `${activeElection ? "1 Live" : "0 Live"} • ${upcomingElections} Upcoming`,
      icon: Calendar,
      color: "text-blue-300 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    },
    {
      label: "Polling Positions",
      value: positions.length,
      detail: `${candidates.length} Candidates nominated`,
      icon: Award,
      color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    },
    {
      label: "Total Votes Cast",
      value: totalVotesCount,
      detail: "Secure encrypted ballots",
      icon: Vote,
      color: "text-pink-300 bg-pink-500/10 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]",
    },
  ];

  // Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
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
      className="space-y-8"
    >
      {/* Title */}
      <motion.div variants={itemVariants}>
        <h2 className="font-display font-semibold text-2xl text-white tracking-tight">
          System Administration Dashboard
        </h2>
        <p className="text-sm text-zinc-400">At-a-glance telemetry of real-time polling metrics and system registries</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4, borderColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.98 }}
            className="p-5 glass-panel rounded-2xl flex items-center justify-between cursor-pointer border border-white/5 transition-colors"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {stat.label}
              </span>
              <p className="text-3xl font-display font-bold text-white leading-tight">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-300 font-medium">{stat.detail}</p>
            </div>
            <div className={`p-3 rounded-xl border ${stat.color} shrink-0`}>
              <stat.icon size={22} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Election status */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-12 glass-panel rounded-2xl p-6 space-y-6 border border-white/5 shadow-2xl"
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-white tracking-tight">
                Active Election Status
              </h3>
              <p className="text-xs text-zinc-400">Current ongoing polling operations</p>
            </div>
            {activeElection && (
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                Live Now
              </motion.span>
            )}
          </div>

          {activeElection ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <Countdown startsAt={activeElection.startsAt} endsAt={activeElection.endsAt} />

              <div className="bg-white/3 rounded-2xl border border-white/5 p-5 space-y-3 shadow-md">
                <h4 className="font-display font-semibold text-gradient text-base">
                  {activeElection.title}
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {activeElection.description || "No description provided."}
                </p>
                <div className="pt-2 text-xs text-zinc-400 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5">
                  <span>
                    <strong>Starts:</strong>{" "}
                    {new Date(activeElection.startsAt).toLocaleString()}
                  </span>
                  <span>
                    <strong>Ends:</strong>{" "}
                    {new Date(activeElection.endsAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  {
                    label: "Election Positions",
                    value: positions.filter((p) => p.electionId === activeElection.id).length
                  },
                  {
                    label: "Total Nominated",
                    value: candidates.filter((c) => c.electionId === activeElection.id).length
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-white/2 rounded-xl border border-white/5 text-center shadow-inner transition-all"
                  >
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {item.label}
                    </span>
                    <span className="text-2xl font-bold text-white mt-1 block">
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Turnout Progress Bars for Active Elections */}
              <div className="space-y-4 border-t border-white/5 pt-5" id="active-elections-turnout-progress">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Percent size={12} className="text-violet-400 animate-pulse" />
                  Real-time Voter Turnout Progress
                </h4>
                
                <div className="space-y-3">
                  {activeElections.map((el) => {
                    const { votedCount, totalCount, percentage } = getElectionTurnout(el.id);
                    return (
                      <div key={el.id} className="space-y-2 bg-white/2 rounded-xl p-4 border border-white/5 shadow-inner">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-200 truncate max-w-[200px]" title={el.title}>
                            {el.title}
                          </span>
                          <span className="font-mono font-bold text-violet-300">
                            {percentage}% Voted
                          </span>
                        </div>
                        
                        {/* Progress Track */}
                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                            style={{
                              boxShadow: "0 0 10px rgba(139, 92, 246, 0.5)",
                            }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
                          <span>{votedCount} votes cast</span>
                          <span>{totalCount - votedCount} pending</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="p-4 bg-white/3 border border-white/5 rounded-2xl text-zinc-400 shadow-md"
              >
                <AlertCircle size={32} className="text-zinc-500" />
              </motion.div>
              <div className="space-y-1">
                <p className="font-medium text-zinc-200">No active election</p>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  There are no live elections accepting votes right now. Prepare or schedule one from the Elections control center.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectTab("elections")}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-600/25"
              >
                Go to Elections
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Voter Turnout Visualization Card */}
      {currentUser?.role === "admin" && (
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-6 border border-white/5 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-white tracking-tight flex items-center gap-2">
                <Award className="text-violet-400" size={20} />
                Voter Turnout Intelligence
              </h3>
              <p className="text-xs text-zinc-400">
                Real-time voter participation percentages by grade level or faculty departments
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Election Selector */}
              {elections.length > 0 && (
                <div className="relative">
                  <select
                    value={turnoutElectionId}
                    onChange={(e) => setTurnoutElectionId(e.target.value)}
                    className="px-3.5 py-1.5 bg-white/3 border border-white/5 hover:border-white/10 rounded-xl text-xs font-semibold appearance-none cursor-pointer pr-8 text-white outline-none transition-colors"
                  >
                    {elections.map((el) => (
                      <option key={el.id} value={el.id} className="bg-black text-white">
                        {el.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                </div>
              )}

              {/* Toggle tabs */}
              <div className="p-0.5 bg-white/3 border border-white/5 rounded-xl flex">
                <button
                  onClick={() => setTurnoutTab("students")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    turnoutTab === "students"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/15"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Student Grades
                </button>
                <button
                  onClick={() => setTurnoutTab("faculty")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    turnoutTab === "faculty"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/15"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Faculty Depts
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Chart */}
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  fontWeight={500}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="turnout" radius={[8, 8, 0, 0]} maxBarSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        turnoutTab === "students"
                          ? `url(#studentGrad)`
                          : `url(#facultyGrad)`
                      }
                    />
                  ))}
                </Bar>
                {/* Define gradients */}
                <defs>
                  <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="facultyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {chartData.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-1 text-center"
              >
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block truncate">
                  {item.name}
                </span>
                <span className="text-lg font-display font-bold text-white block">
                  {item.turnout}%
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {item.voted} of {item.total} voted
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

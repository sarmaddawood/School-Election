import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CalendarDays, Clock, CheckCircle2, CircleDashed } from "lucide-react";
import { Election } from "../types";

interface CalendarTabProps {
  elections: Election[];
}

export default function CalendarTab({ elections }: CalendarTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
  };

  const sortedElections = [...elections].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const getElectionStatus = (election: Election) => {
    const start = new Date(election.startsAt);
    const end = new Date(election.endsAt);

    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "active";
    return "completed";
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-8 font-mono text-white"
    >
      <motion.div variants={itemVariants} className="border-b border-[rgba(255,255,255,0.1)] pb-4">
        <span className="text-[9px] font-bold text-[#E6FE52] tracking-widest uppercase">SCHEDULER_INDEX_06</span>
        <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="text-[#E6FE52]" size={24} />
          ELECTION TIMELINE CALENDAR
        </h2>
        <p className="text-xs text-[rgba(255,255,255,0.45)]">
          Audit scheduling intervals, polling availability windows, and historical archives.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="relative">
        {sortedElections.length === 0 ? (
          <div className="text-center py-12 glass-panel">
            <CalendarDays size={32} className="mx-auto text-[#E6FE52] mb-4 animate-pulse" />
            <p className="text-white font-bold text-xs uppercase tracking-widest">NO_SCHEDULING_RECORDS</p>
            <p className="text-[10px] text-[rgba(255,255,255,0.45)] mt-1">No upcoming or past elections have been written to the database.</p>
          </div>
        ) : (
          <div className="absolute left-6 md:left-[50%] top-0 bottom-0 w-px bg-[rgba(255,255,255,0.1)] -translate-x-[0.5px]"></div>
        )}

        <div className="space-y-8">
          {sortedElections.map((election, index) => {
            const status = getElectionStatus(election);
            const isLeft = index % 2 === 0;

            let StatusIcon = CircleDashed;
            let statusColor = "text-[rgba(255,255,255,0.4)]";
            let statusBg = "bg-[rgba(255,255,255,0.05)]";
            let statusBorder = "border-[rgba(255,255,255,0.1)]";
            let statusText = "Upcoming";

            if (status === "active") {
              StatusIcon = Clock;
              statusColor = "text-emerald-400";
              statusBg = "bg-emerald-500/10";
              statusBorder = "border-emerald-500/30";
              statusText = "Active Now";
            } else if (status === "completed") {
              StatusIcon = CheckCircle2;
              statusColor = "text-[#E6FE52]";
              statusBg = "bg-[#E6FE52]/10";
              statusBorder = "border-[#E6FE52]/30";
              statusText = "Completed";
            }

            return (
              <motion.div
                key={election.id}
                variants={itemVariants}
                className={`relative flex items-center justify-between md:justify-normal w-full ${
                  isLeft ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                {/* Center marker */}
                <div className="absolute left-6 md:left-1/2 w-8 h-8 rounded-none bg-[#0D0D0E] border border-[rgba(255,255,255,0.15)] flex items-center justify-center transform -translate-x-1/2 z-10">
                  <div className={`w-2.5 h-2.5 ${status === 'active' ? 'bg-emerald-400 animate-ping' : status === 'completed' ? 'bg-[#E6FE52]' : 'bg-[rgba(255,255,255,0.35)]'}`} />
                </div>

                {/* Timeline content */}
                <div className={`w-full md:w-5/12 pl-16 md:pl-0 ${isLeft ? "md:pr-12 md:text-right" : "md:pl-12 text-left"}`}>
                  <div className="glass-panel p-5 border border-[rgba(255,255,255,0.1)] hover:border-[#E6FE52]/30 transition-all">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border ${statusBg} ${statusBorder} mb-3`}>
                      <StatusIcon size={12} className={statusColor} />
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    
                    <h3 className="font-display font-extrabold text-sm text-white mb-2 uppercase tracking-wide">
                      {election.title}
                    </h3>
                    
                    <div className={`flex flex-col gap-1.5 text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.45)] ${isLeft ? "md:items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2">
                        <span>Starts:</span>
                        <span className="text-white font-bold">
                          {new Date(election.startsAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Ends:</span>
                        <span className="text-white font-bold">
                          {new Date(election.endsAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

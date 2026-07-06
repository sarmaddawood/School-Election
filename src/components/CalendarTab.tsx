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
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  // Sort elections by start date
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
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <h2 className="font-display font-semibold text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
          <CalendarDays className="text-indigo-600" size={24} />
          Election Calendar
        </h2>
        <p className="text-sm text-zinc-500">
          Track upcoming, active, and past election windows.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="relative">
        {sortedElections.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl border border-zinc-200">
            <CalendarDays size={32} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-500 font-medium text-sm">No elections scheduled</p>
          </div>
        ) : (
          <div className="absolute left-6 md:left-[50%] top-0 bottom-0 w-px bg-zinc-100 -translate-x-[0.5px]"></div>
        )}

        <div className="space-y-8">
          {sortedElections.map((election, index) => {
            const status = getElectionStatus(election);
            const isLeft = index % 2 === 0;

            let StatusIcon = CircleDashed;
            let statusColor = "text-zinc-500";
            let statusBg = "bg-zinc-500/10";
            let statusBorder = "border-zinc-500/30";
            let statusText = "Upcoming";

            if (status === "active") {
              StatusIcon = Clock;
              statusColor = "text-emerald-600";
              statusBg = "bg-emerald-500/10";
              statusBorder = "border-emerald-500/30";
              statusText = "Active Now";
            } else if (status === "completed") {
              StatusIcon = CheckCircle2;
              statusColor = "text-indigo-600";
              statusBg = "bg-indigo-500/10";
              statusBorder = "border-indigo-300";
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
                <div className="absolute left-6 md:left-1/2 w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center transform -translate-x-1/2 z-10">
                  <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-emerald-400 animate-pulse' : status === 'completed' ? 'bg-violet-400' : 'bg-zinc-500'}`} />
                </div>

                {/* Timeline content */}
                <div className={`w-full md:w-5/12 pl-16 md:pl-0 ${isLeft ? "md:pr-12 md:text-right" : "md:pl-12 text-left"}`}>
                  <div className="glass-panel p-5 rounded-2xl border border-zinc-200 hover:border-zinc-200 transition-colors">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusBg} ${statusBorder} mb-3`}>
                      <StatusIcon size={14} className={statusColor} />
                      <span className={`text-xs font-medium ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    
                    <h3 className="font-display font-semibold text-lg text-zinc-900 mb-2">
                      {election.title}
                    </h3>
                    
                    <div className={`flex flex-col gap-1.5 text-sm ${isLeft ? "md:items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="text-zinc-500">Starts:</span>
                        <span className="text-zinc-700 font-medium">
                          {new Date(election.startsAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="text-zinc-500">Ends:</span>
                        <span className="text-zinc-700 font-medium">
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

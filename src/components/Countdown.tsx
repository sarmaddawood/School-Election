import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock } from "lucide-react";

interface CountdownProps {
  startsAt: string;
  endsAt: string;
  onFinished?: () => void;
}

export default function Countdown({ startsAt, endsAt, onFinished }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: "upcoming" as "upcoming" | "live" | "ended",
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();

      let difference = 0;
      let currentStatus: "upcoming" | "live" | "ended" = "ended";

      if (now < start) {
        difference = start - now;
        currentStatus = "upcoming";
      } else if (now >= start && now <= end) {
        difference = end - now;
        currentStatus = "live";
      } else {
        difference = 0;
        currentStatus = "ended";
      }

      if (difference === 0 && currentStatus === "ended") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, status: "ended" });
        if (onFinished) {
          onFinished();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, status: currentStatus });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [startsAt, endsAt]);

  const padZero = (num: number) => {
    return num.toString().padStart(2, "0");
  };

  const segments = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg)] p-4 sm:p-5 border border-[var(--border)] font-mono text-[var(--ink)]"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: timeLeft.status === "live" ? 360 : 0 }}
          transition={timeLeft.status === "live" ? { duration: 15, repeat: Infinity, ease: "linear" } : {}}
          className="p-2.5 bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent)]"
        >
          <Clock size={16} />
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink)]">
              {timeLeft.status === "upcoming"
                ? "Starts In"
                : timeLeft.status === "live"
                ? "Voting Window Closes In"
                : "Voting Completed"}
            </span>
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  timeLeft.status === "live"
                    ? "bg-emerald-400"
                    : timeLeft.status === "upcoming"
                    ? "bg-amber-400"
                    : "bg-zinc-500"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  timeLeft.status === "live"
                    ? "bg-emerald-500"
                    : timeLeft.status === "upcoming"
                    ? "bg-amber-500"
                    : "bg-zinc-600"
                }`}
              />
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            {timeLeft.status === "upcoming"
              ? `Starts: ${new Date(startsAt).toLocaleString()}`
              : timeLeft.status === "live"
              ? `Ends: ${new Date(endsAt).toLocaleString()}`
              : "Poll Closed. Ledger final."}
          </p>
        </div>
      </div>

      {timeLeft.status !== "ended" && (
        <div className="flex items-center gap-2">
          {segments.map((seg, i) => (
            <React.Fragment key={seg.label}>
              <div className="flex flex-col items-center">
                <div className="bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-center min-w-[50px]">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={seg.value}
                      initial={{ y: 3, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -3, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="font-mono text-base font-bold text-[var(--ink)] leading-none block"
                    >
                      {padZero(seg.value)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <span className="text-[8px] text-zinc-500 font-bold uppercase mt-1 tracking-wider">
                  {seg.label}
                </span>
              </div>
              {i < segments.length - 1 && (
                <span className="font-mono text-zinc-500 text-sm font-bold pb-4">:</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </motion.div>
  );
}

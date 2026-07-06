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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, borderColor: "rgba(255,255,255,0.08)" }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xl transition-all"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: timeLeft.status === "live" ? 360 : 0 }}
          transition={timeLeft.status === "live" ? { duration: 15, repeat: Infinity, ease: "linear" } : {}}
          className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-indigo-600 shadow-sm"
        >
          <Clock size={18} />
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
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
          <p className="text-xs text-zinc-500 font-medium">
            {timeLeft.status === "upcoming"
              ? `Starts on ${new Date(startsAt).toLocaleDateString()} at ${new Date(
                  startsAt
                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : timeLeft.status === "live"
              ? `Ends on ${new Date(endsAt).toLocaleDateString()} at ${new Date(
                  endsAt
                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Poll closed. Results released."}
          </p>
        </div>
      </div>

      {timeLeft.status !== "ended" && (
        <div className="flex items-center gap-2">
          {segments.map((seg, i) => (
            <React.Fragment key={seg.label}>
              <div className="flex flex-col items-center">
                <div className="bg-white/3 border border-zinc-200 rounded-xl px-3 py-2 text-center min-w-[50px] shadow-inner">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={seg.value}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="font-mono text-lg font-bold text-zinc-900 leading-none block"
                    >
                      {padZero(seg.value)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-wide">
                  {seg.label}
                </span>
              </div>
              {i < segments.length - 1 && (
                <span className="font-mono text-zinc-500 text-lg font-bold pb-5">:</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </motion.div>
  );
}

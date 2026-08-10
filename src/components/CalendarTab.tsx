import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, CalendarDays, Clock, CheckCircle2, CircleDashed, ChevronLeft, ChevronRight, Filter, Info } from "lucide-react";
import { Election } from "../types";

interface CalendarTabProps {
  elections: Election[];
}

export default function CalendarTab({ elections }: CalendarTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">("calendar");

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

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(now);
  };

  // Helper to check if election occurs on a given date
  const getElectionsForDate = (date: Date) => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    return elections.filter((el) => {
      const elStart = new Date(el.startsAt);
      const elEnd = new Date(el.endsAt);
      return elStart <= endOfDay && elEnd >= startOfDay;
    });
  };

  const selectedDateElections = selectedDate ? getElectionsForDate(selectedDate) : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6 font-sans text-slate-800"
    >
      <motion.div variants={itemVariants} className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">SCHOOL CALENDAR</span>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CalendarDays className="text-sky-600" size={24} />
            Election Timeline & Events
          </h2>
          <p className="text-xs text-slate-500">
            Interactive schedule for school elections, polling windows, and deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "calendar" ? "bg-white text-sky-700 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Grid Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "timeline" ? "bg-white text-sky-700 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Timeline View
          </button>
        </div>
      </motion.div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Grid Calendar */}
          <motion.div variants={itemVariants} className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  {monthNames[month]} {year}
                </h3>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold rounded-lg border border-sky-200 transition-all cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1 border-b border-slate-100">
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Blank offset cells */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="h-20 bg-slate-50/50 rounded-xl border border-slate-100/50 opacity-40" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const dayElections = getElectionsForDate(cellDate);

                const isToday =
                  cellDate.getDate() === currentTime.getDate() &&
                  cellDate.getMonth() === currentTime.getMonth() &&
                  cellDate.getFullYear() === currentTime.getFullYear();

                const isSelected =
                  selectedDate &&
                  cellDate.getDate() === selectedDate.getDate() &&
                  cellDate.getMonth() === selectedDate.getMonth() &&
                  cellDate.getFullYear() === selectedDate.getFullYear();

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDate(cellDate)}
                    className={`h-20 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 border-sky-400 ring-2 ring-sky-400/20 shadow-sm"
                        : isToday
                        ? "bg-amber-50/60 border-amber-300"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-amber-500 text-white font-extrabold"
                            : isSelected
                            ? "bg-sky-600 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayElections.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayElections.slice(0, 2).map((el) => {
                        const st = getElectionStatus(el);
                        return (
                          <div
                            key={el.id}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${
                              st === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : st === "upcoming"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {el.title}
                          </div>
                        );
                      })}
                      {dayElections.length > 2 && (
                        <span className="text-[9px] text-slate-500 font-bold block">
                          +{dayElections.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Selected Date Details Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">SELECTED DATE</span>
                <h3 className="font-display font-extrabold text-slate-900 text-base mt-0.5">
                  {selectedDate
                    ? selectedDate.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No Date Selected"}
                </h3>
              </div>

              <div className="space-y-3">
                {selectedDateElections.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs space-y-1">
                    <Info size={24} className="mx-auto text-slate-300" />
                    <p className="font-bold">No elections scheduled</p>
                    <p className="text-[11px] text-slate-400">Select another date to view active or upcoming events.</p>
                  </div>
                ) : (
                  selectedDateElections.map((el) => {
                    const st = getElectionStatus(el);
                    return (
                      <div key={el.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-slate-900 text-xs leading-snug">{el.title}</h4>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase shrink-0 ${
                              st === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : st === "upcoming"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {st}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{el.description || "No description provided."}</p>
                        <div className="text-[10px] text-slate-600 font-mono space-y-0.5 border-t border-slate-200/60 pt-2">
                          <div>Starts: {new Date(el.startsAt).toLocaleString()}</div>
                          <div>Ends: {new Date(el.endsAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-sky-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
              <h4 className="font-bold text-xs uppercase tracking-wider text-sky-300">Total Elections</h4>
              <div className="text-3xl font-black">{elections.length}</div>
              <p className="text-xs text-sky-200">
                {elections.filter((e) => getElectionStatus(e) === "active").length} active now •{" "}
                {elections.filter((e) => getElectionStatus(e) === "upcoming").length} upcoming
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Timeline View */
        <motion.div variants={itemVariants} className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {sortedElections.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays size={32} className="mx-auto text-sky-600 mb-3" />
              <p className="text-slate-800 font-bold text-xs uppercase tracking-wider">No Scheduling Records</p>
              <p className="text-xs text-slate-500 mt-1">No upcoming or past elections configured.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedElections.map((election) => {
                const status = getElectionStatus(election);
                return (
                  <div key={election.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "upcoming"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {status}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm">{election.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500">{election.description || "No description provided."}</p>
                    </div>

                    <div className="text-xs font-mono text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shrink-0">
                      <div>Start: {new Date(election.startsAt).toLocaleString()}</div>
                      <div>End: {new Date(election.endsAt).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}


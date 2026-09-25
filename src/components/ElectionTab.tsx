import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, Calendar, Clock, X, AlertCircle, Shield, Flag, Filter, StopCircle, CheckCircle2 } from "lucide-react";
import { Election, ElectionPhase, User } from "../types";
import ConfirmModal from "./ConfirmModal";

interface ElectionTabProps {
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
  initialDate?: string | null;
  onInitialDateConsumed?: () => void;
}

export default function ElectionTab({
  setErrorNotification,
  setSuccessNotification,
  token,
  initialDate,
  onInitialDateConsumed,
}: ElectionTabProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchElections = async () => {
    try {
      const res = await fetch("/api/elections", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch elections");
      const data = await res.json();
      setElections(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.elections || [])));
    } catch (err: any) {
      setErrorNotification(err.message || "Failed to load elections");
    }
  };

  const fetchUsers = async () => {
    try {
      let allUsers: User[] = [];
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const url = new URL("/api/users", window.location.origin);
        if (cursor) url.searchParams.append("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) break;
        const data = await res.json();
        
        const fetchedUsers = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.users || []));
        allUsers = [...allUsers, ...fetchedUsers];
        
        if (data.nextCursor) {
          cursor = data.nextCursor;
        } else {
          hasMore = false;
        }
      }
      setUsers(allUsers);
    } catch (err: any) {
      console.error("Failed to load users for options", err);
    }
  };

  useEffect(() => {
    fetchElections();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const [showForm, setShowForm] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"all" | "grade" | "section" | "room">("all");
  const [scopeValue, setScopeValue] = useState("");
  const [hasPartyList, setHasPartyList] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmElection, setDeleteConfirmElection] = useState<{ id: string; title: string } | null>(null);
  const [endConfirmElection, setEndConfirmElection] = useState<{ id: string; title: string } | null>(null);
  const [endingElectionId, setEndingElectionId] = useState<string | null>(null);

  const availableGrades = useMemo(() => {
    const grades = new Set<string>(["7", "8", "9", "10", "11", "12"]);
    users.forEach((u) => {
      if (u.yearLevel != null) grades.add(String(u.yearLevel));
    });
    return Array.from(grades).sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
  }, [users]);

  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    users.forEach((u) => {
      if (u.section) sections.add(u.section.trim());
    });
    if (editingElection?.targetSection) sections.add(editingElection.targetSection.trim());
    if (editingElection?.scope === "section" && editingElection.scopeValue) sections.add(editingElection.scopeValue.trim());
    return Array.from(sections).filter(Boolean).sort();
  }, [users, editingElection]);

  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    users.forEach((u) => {
      if (u.room) rooms.add(u.room.trim());
    });
    if (editingElection?.targetRoom) rooms.add(editingElection.targetRoom.trim());
    if (editingElection?.scope === "room" && editingElection.scopeValue) rooms.add(editingElection.scopeValue.trim());
    return Array.from(rooms).filter(Boolean).sort();
  }, [users, editingElection]);

  const getPhase = (startStr: string, endStr: string): ElectionPhase => {
    const now = new Date();
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  const handleOpenCreate = () => {
    setEditingElection(null);
    setTitle("");
    setDescription("");
    setScope("all");
    setScopeValue("");
    setHasPartyList(false);
    setStartsAt("");
    setEndsAt("");
    setShowForm(true);
  };

  useEffect(() => {
    if (!initialDate) return;
    const selected = new Date(initialDate);
    if (!Number.isFinite(selected.getTime())) return;
    selected.setHours(8, 0, 0, 0);
    const end = new Date(selected);
    end.setHours(17, 0, 0, 0);
    const toLocalInput = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60_000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setEditingElection(null);
    setTitle("");
    setDescription("");
    setScope("all");
    setScopeValue("");
    setHasPartyList(false);
    setStartsAt(toLocalInput(selected));
    setEndsAt(toLocalInput(end));
    setShowForm(true);
    onInitialDateConsumed?.();
  }, [initialDate, onInitialDateConsumed]);

  const handleOpenEdit = (el: Election) => {
    setEditingElection(el);
    setTitle(el.title);
    setDescription(el.description || "");
    const electionScope = el.scope || "all";
    setScope(electionScope);
    const initialScopeValue =
      electionScope === "grade"
        ? (el.targetGradeLevel != null ? String(el.targetGradeLevel) : (el.scopeValue || "").replace(/\D+/g, "") || "")
        : electionScope === "section"
        ? (el.targetSection || el.scopeValue || "")
        : electionScope === "room"
        ? (el.targetRoom || el.scopeValue || "")
        : "";
    setScopeValue(initialScopeValue);
    setHasPartyList(!!el.hasPartyList);

    const toLocalISOString = (dateStr: string) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setStartsAt(toLocalISOString(el.startsAt));
    setEndsAt(toLocalISOString(el.endsAt));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startsAt || !endsAt) {
      setErrorNotification("Title, start date, and end date are required");
      return;
    }

    const finalScopeValue = scope === "grade" ? scopeValue.replace(/\D+/g, "") : scopeValue.trim();

    if (scope !== "all" && !finalScopeValue) {
      setErrorNotification(`Please enter the required ${scope} designation (e.g. Grade '10', Section '10-A', or Room '204')`);
      return;
    }

    const startVal = new Date(startsAt);
    const endVal = new Date(endsAt);

    if (endVal <= startVal) {
      setErrorNotification("End date must be strictly after start date");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingElection
        ? `/api/elections/${editingElection.id}`
        : "/api/elections";
      const method = editingElection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          scope,
          scopeValue: scope !== "all" ? finalScopeValue : null,
          hasPartyList,
          startsAt: startVal.toISOString(),
          endsAt: endVal.toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save election");
      }

      setSuccessNotification(
        editingElection
          ? "Election updated successfully"
          : "New election created successfully"
      );
      setShowForm(false);
      setEditingElection(null);
      await fetchElections();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmElection({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmElection) return;
    const { id } = deleteConfirmElection;

    try {
      const response = await fetch(`/api/elections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete election");
      }

      setSuccessNotification("Election and all cascading records deleted successfully");
      await fetchElections();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmElection(null);
    }
  };

  const handleOpenEndElection = (el: Election) => {
    setEndConfirmElection({ id: el.id, title: el.title });
  };

  const handleConfirmEndElection = async () => {
    if (!endConfirmElection) return;
    const { id, title } = endConfirmElection;
    setEndingElectionId(id);

    try {
      let response = await fetch(`/api/elections/${id}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Resilient fallback to PUT if /api/elections/:id/end returns 404
      if (!response.ok && response.status === 404) {
        const el = elections.find((e) => e.id === id);
        if (el) {
          const now = new Date();
          const start = new Date(el.startsAt);
          const startsAt = start >= now ? new Date(now.getTime() - 1000).toISOString() : el.startsAt;
          const endsAt = now.toISOString();

          response = await fetch(`/api/elections/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: el.title,
              description: el.description || "",
              scope: el.scope || "all",
              scopeValue: el.scopeValue || "",
              hasPartyList: !!el.hasPartyList,
              startsAt,
              endsAt,
            }),
          });
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end election");
      }

      setSuccessNotification(`Election "${title}" has ended successfully`);
      if (editingElection?.id === id) {
        setShowForm(false);
        setEditingElection(null);
      }
      await fetchElections();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred while ending the election");
    } finally {
      setEndConfirmElection(null);
      setEndingElectionId(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 18 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 font-sans text-slate-800"
    >
      <motion.div
        variants={cardVariants}
        className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">ELECTION ADMINISTRATION</span>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight mt-1">
            Election Management
          </h2>
          <p className="text-xs text-slate-500">Configure elections by grade level, section, room, or school-wide scopes.</p>
        </div>
        {!showForm && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-sky-900/10 transition-all"
          >
            <Plus size={15} />
            CREATE ELECTION
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    {editingElection ? "Edit Election Parameters" : "Initialize New Election"}
                  </h3>
                  {editingElection && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                        getPhase(editingElection.startsAt, editingElection.endsAt) === "live"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : getPhase(editingElection.startsAt, editingElection.endsAt) === "upcoming"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {getPhase(editingElection.startsAt, editingElection.endsAt)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {editingElection && getPhase(editingElection.startsAt, editingElection.endsAt) === "live" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Active Election</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        This election is currently active. Adjusting dates or election parameters will take effect immediately.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEndElection(editingElection)}
                    className="self-start sm:self-auto shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <StopCircle size={13} />
                    End Election Now
                  </button>
                </div>
              )}
              {editingElection && getPhase(editingElection.startsAt, editingElection.endsAt) === "ended" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Concluded Election</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      This election has concluded. You may update its metadata or extend the end date to reopen voting.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Election Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SSLG General Election or Grade 7 Representative"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Description / Polling Directives
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide a description or guidelines for voters..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white resize-none"
                  />
                </div>

                {/* ELECTION SCOPE SELECTION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter size={13} className="text-sky-600" />
                    <span>Eligibility Scope</span>
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value as any);
                      setScopeValue("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                  >
                    <option value="all">School-Wide (All Eligible Students)</option>
                    <option value="grade">Grade Level Specific</option>
                    <option value="section">Class / Section Specific</option>
                    <option value="room">Room Number Specific</option>
                  </select>
                </div>

                {scope !== "all" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Target {scope === "grade" ? "Grade Level" : scope === "section" ? "Section Name" : "Room Number"}
                      </label>
                      {scope !== "grade" && (
                        <span className="text-[10px] text-slate-400 font-medium">Select suggestion or type custom</span>
                      )}
                    </div>
                    {scope === "grade" ? (
                      <select
                        required
                        value={scopeValue}
                        onChange={(e) => setScopeValue(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                      >
                        <option value="" disabled>Select Grade Level...</option>
                        {availableGrades.map((g) => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          required
                          list={`available-${scope}-datalist`}
                          value={scopeValue}
                          onChange={(e) => setScopeValue(e.target.value)}
                          placeholder={scope === "section" ? "e.g. GLASSFISH, SAILFISH, GARFISH..." : "e.g. Room 101, Lab 2, 204..."}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                        />
                        <datalist id={`available-${scope}-datalist`}>
                          {(scope === "section" ? availableSections : availableRooms).map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                        {(scope === "section" ? availableSections : availableRooms).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Suggestions:</span>
                            {(scope === "section" ? availableSections : availableRooms).slice(0, 8).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setScopeValue(opt)}
                                className={`px-2 py-0.5 text-[10px] rounded-md border transition-all cursor-pointer font-semibold ${
                                  scopeValue.toLowerCase() === opt.toLowerCase()
                                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Flag size={13} className="text-sky-600" />
                      <span>Party-List Support</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="hasPartyList"
                        checked={hasPartyList}
                        onChange={(e) => setHasPartyList(e.target.checked)}
                        className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                      />
                      <label htmlFor="hasPartyList" className="text-xs text-slate-700 font-medium cursor-pointer">
                        Enable Party-List alliances for candidate slates
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-sky-600" /> Starts At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-sky-600" /> Ends At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-sky-900/10"
                >
                  {submitting ? "Saving..." : "Save Election"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {(Array.isArray(elections) ? elections : []).map((el) => {
          const phase = getPhase(el.startsAt, el.endsAt);
          return (
            <motion.div
              key={el.id}
              variants={cardVariants}
              whileHover={{ scale: 1.005 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm tracking-tight leading-snug">
                      {el.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 uppercase">
                        Scope: {el.scope ? el.scope.toUpperCase() : "ALL"} {el.scopeValue ? `(${el.scopeValue})` : ""}
                      </span>
                      {el.hasPartyList && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase">
                          Party-List Active
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                      phase === "live"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : phase === "upcoming"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {phase}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                  {el.description || "No description provided."}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="border-t border-slate-100 pt-3 space-y-1 text-[11px] text-slate-500 font-mono">
                  <div className="flex justify-between">
                    <span>Starts:</span>
                    <span className="text-slate-800 font-semibold">{new Date(el.startsAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends:</span>
                    <span className="text-slate-800 font-semibold">{new Date(el.endsAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div>
                    {phase !== "ended" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEndElection(el)}
                        disabled={endingElectionId === el.id}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="End this election immediately"
                      >
                        <StopCircle size={13} className="text-rose-600" />
                        <span>{endingElectionId === el.id ? "Ending..." : "End Election"}</span>
                      </button>
                    ) : (
                      <span
                        className="px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 select-none"
                        title="This election has concluded"
                      >
                        <CheckCircle2 size={12} className="text-slate-400" />
                        Ended
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(el)}
                      className="p-2 hover:bg-sky-50 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-600 cursor-pointer transition-all"
                      title="Edit Election"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(el.id, el.title)}
                      className="p-2 hover:bg-rose-50 rounded-lg border border-rose-200 text-rose-600 cursor-pointer transition-all"
                      title="Delete Election"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {(!Array.isArray(elections) || elections.length === 0) && (
          <motion.div
            variants={cardVariants}
            className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm"
          >
            <AlertCircle size={32} className="text-sky-600" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-xs">No Elections Configured</p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Initialize an election module to begin registering candidates and accepting votes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md"
            >
              Create First Election
            </button>
          </motion.div>
        )}
      </motion.div>
      <ConfirmModal
        isOpen={endConfirmElection !== null}
        onClose={() => setEndConfirmElection(null)}
        onConfirm={handleConfirmEndElection}
        title="End Election Early?"
        message={`Are you sure you want to end "${endConfirmElection?.title}" immediately? Voting will be closed right away and results will be finalized.`}
        confirmText="END ELECTION NOW"
        cancelText="CANCEL"
        isDanger={true}
        icon={<StopCircle size={32} className="text-rose-600" />}
      />
      <ConfirmModal
        isOpen={deleteConfirmElection !== null}
        onClose={() => setDeleteConfirmElection(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Election?"
        message={`Are you sure you want to delete the election "${deleteConfirmElection?.title}"? This will cascade delete all associated positions, candidates, and cast votes!`}
        confirmText="DELETE"
        cancelText="CANCEL"
        isDanger={true}
      />
    </motion.div>
  );
}


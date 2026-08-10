import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, Calendar, Clock, X, AlertCircle, Shield, Flag, Filter } from "lucide-react";
import { Election, ElectionPhase } from "../types";
import ConfirmModal from "./ConfirmModal";

interface ElectionTabProps {
  elections: Election[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
}

export default function ElectionTab({
  elections,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
}: ElectionTabProps) {
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

  const handleOpenEdit = (el: Election) => {
    setEditingElection(el);
    setTitle(el.title);
    setDescription(el.description || "");
    setScope(el.scope || "all");
    setScopeValue(el.scopeValue || "");
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

    if (scope !== "all" && !scopeValue.trim()) {
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
          scopeValue: scope !== "all" ? scopeValue.trim() : null,
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
      await onRefreshData();
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
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmElection(null);
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
                <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  {editingElection ? "Edit Election Parameters" : "Initialize New Election"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Election Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade 10 Representative Election 2026"
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
                    onChange={(e) => setScope(e.target.value as any)}
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
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target {scope === "grade" ? "Grade Level" : scope === "section" ? "Section Name" : "Room Number"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={scope === "grade" ? "e.g. 10" : scope === "section" ? "e.g. Grade 10-Aquarius" : "e.g. Room 204"}
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                    />
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
        {elections.map((el) => {
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

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(el)}
                    className="p-2 hover:bg-sky-50 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-600 cursor-pointer transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(el.id, el.title)}
                    className="p-2 hover:bg-rose-50 rounded-lg border border-rose-200 text-rose-600 cursor-pointer transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {elections.length === 0 && (
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


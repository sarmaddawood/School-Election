import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Search, Users, Upload, X, Image as ImageIcon, Download, FileSpreadsheet, Camera, FileLock2 } from "lucide-react";
import { User as UserType, UserRole, Candidate, Position, Election, Vote } from "../types";
import ConfirmModal from "./ConfirmModal";
import UserDetailModal from "./UserDetailModal";
import BulkImportModal from "./BulkImportModal";
import ImageCropModal from "./ImageCropModal";


interface UsersTabProps {
  users: UserType[];
  candidates: Candidate[];
  positions: Position[];
  elections: Election[];
  votes: Vote[];
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
  currentUser: UserType;
}

export default function UsersTab({
  users,
  candidates,
  positions,
  elections,
  votes,
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
  currentUser,
}: UsersTabProps) {
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [yearLevel, setYearLevel] = useState<number | undefined>(undefined);
  const [section, setSection] = useState("");
  const [room, setRoom] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState<UserType | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isAddUserCropOpen, setIsAddUserCropOpen] = useState(false);


  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      setErrorNotification("No user accounts registered to export");
      return;
    }

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ["ID", "Student Number", "Full Name", "Role", "Grade Level", "Section", "Room", "Photo URL"];
    const rows = users.map((u) => [
      escapeCSV(u.id),
      escapeCSV(u.studentNumber),
      escapeCSV(u.fullName),
      escapeCSV(u.role),
      escapeCSV(u.yearLevel || ""),
      escapeCSV(u.section || ""),
      escapeCSV(u.room || ""),
      escapeCSV(u.photoUrl || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `civicflow_users_registry_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessNotification(`Exported ${users.length} user records to CSV.`);
  };

  const handleExportJSON = () => {
    if (!users || users.length === 0) {
      setErrorNotification("No user accounts registered to export");
      return;
    }

    const jsonContent = JSON.stringify(users, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `civicflow_users_registry_${timestamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessNotification(`Exported ${users.length} user records to JSON.`);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorNotification("Please upload an image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber || !fullName || !role) {
      setErrorNotification("Student Number, Full Name, and Role are required");
      return;
    }
    if (role === "student" && !yearLevel) {
      setErrorNotification("Grade Level is required for student accounts");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl = "";
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(uploadData.error || "Failed to upload file to Appwrite storage");
        }

        const uploadData = await uploadRes.json();
        uploadedUrl = uploadData.url;
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          studentNumber,
          fullName, 
          password, 
          role, 
          yearLevel, 
          section,
          room,
          photoUrl: uploadedUrl || null 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccessNotification(`User "${fullName}" created successfully`);
      setStudentNumber("");
      setFullName("");
      setPassword("");
      setRole("student");
      setYearLevel(undefined);
      setSection("");
      setRoom("");
      setPhotoFile(null);
      setPhotoPreview(null);
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (id === "admin-1") {
      setErrorNotification("Cannot delete the root administrator");
      return;
    }
    setDeleteConfirmUser({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    const { id, name } = deleteConfirmUser;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccessNotification(`User "${name}" and cascading records deleted successfully`);
      await onRefreshData();
    } catch (err: any) {
      setErrorNotification(err.message || "An error occurred");
    } finally {
      setDeleteConfirmUser(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.studentNumber.toLowerCase().includes(q);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
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
      className="space-y-6 font-mono text-[var(--ink)]"
    >
      <motion.div variants={itemVariants} className="border-b border-[var(--border)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">REGISTRY MODULE 02</span>
          <h2 className="font-display font-black text-2xl text-[var(--ink)] uppercase tracking-wider">
            USER ACCOUNT REGISTRY
          </h2>
          <p className="text-xs text-zinc-500">Manage credentials, roles, and cohort permissions for school students and faculty.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsBulkImportOpen(true)}
            className="px-3.5 py-2.5 bg-[var(--accent)] text-[var(--surface)] hover:opacity-90 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Upload size={14} /> Bulk Import
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download size={14} className="text-emerald-600" /> Export CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportJSON}
            className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} className="text-blue-600" /> Export JSON
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Register panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 space-y-4 shadow-xs"
        >
          <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider border-b border-[var(--border)] pb-3">
            REGISTER NEW ACCOUNT
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                Full Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                required
                placeholder="e.g. Liam Henderson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                {role === "teacher" ? "DepEd Email" : "Student Number (LRN)"}
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type={role === "teacher" ? "email" : "text"}
                required
                placeholder={role === "teacher" ? "e.g. teacher@deped.gov.ph" : "e.g. 101338190001 (LRN)"}
                value={studentNumber}
                onChange={(e) => setStudentNumber(role === "teacher" ? e.target.value.trim() : e.target.value.toUpperCase().replace(/\s+/g, ""))}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                Assign Password (Optional, 8+ characters)
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="password"
                placeholder="•••••••• (Optional - user sets on 1st login)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2.5 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                    role === "student"
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--surface)] shadow-xs"
                      : "bg-[var(--surface)] border-[var(--border)] text-zinc-500 hover:border-[var(--accent)]"
                  }`}
                >
                  Student
                </button>
                {currentUser.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => setRole("teacher")}
                    className={`py-2.5 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                      role === "teacher"
                        ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--surface)] shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border)] text-zinc-500 hover:border-[var(--accent)]"
                    }`}
                  >
                    Teacher
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {role === "student" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">Grade Level</label>
                      <motion.input whileFocus={{ scale: 1.01 }} type="number" min="1" max="12" required placeholder="10" value={yearLevel || ""} onChange={(e) => setYearLevel(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">Section</label>
                      <motion.input whileFocus={{ scale: 1.01 }} type="text" placeholder="Rizal" value={section} onChange={(e) => setSection(e.target.value)} className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">Room</label>
                      <motion.input whileFocus={{ scale: 1.01 }} type="text" placeholder="Room 204" value={room} onChange={(e) => setRoom(e.target.value)} className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none transition-all focus:border-[var(--accent)]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                Profile Photo (Optional)
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative border border-[var(--border)] bg-[var(--surface)] rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-[var(--border)]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[var(--ink)] font-mono truncate max-w-[150px]">
                        {photoFile?.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono">
                        {photoFile ? (photoFile.size / 1024).toFixed(1) : 0} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddUserCropOpen(true)}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all cursor-pointer rounded-lg text-[9px] font-bold flex items-center gap-1"
                      title="Crop Photo"
                    >
                      <Camera size={11} /> CROP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="p-1 hover:bg-rose-50 text-rose-500 border border-transparent hover:border-rose-200 transition-all cursor-pointer rounded-lg"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center min-h-[100px] ${
                    isDragging
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-neutral-50"
                  }`}
                >
                  <Upload size={20} className={isDragging ? "text-[var(--accent)] animate-bounce" : "text-zinc-400"} />
                  <div>
                    <p className="text-[10px] text-[var(--ink)] font-bold uppercase tracking-wider">
                      Drag & Drop Photo
                    </p>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono mt-0.5">
                      or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              {submitting ? "REGISTERING ACCOUNT..." : "REGISTER ACCOUNT"}
            </motion.button>
          </form>
        </motion.div>

        {/* Directory Panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 space-y-4 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[var(--border)] pb-3">
            <h3 className="font-display font-extrabold text-sm text-[var(--ink)] uppercase tracking-wider">
              VOTER DIRECTORY ({filteredUsers.length})
            </h3>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="SEARCH REGISTRY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Mobile Card View (renders on screens < md to prevent 604px table horizontal overflow) */}
          <div className="block md:hidden space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((u) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => setSelectedDetailUser(u)}
                  className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer shadow-xs hover:border-[var(--accent)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center font-bold text-sm border border-[var(--border)] shrink-0">
                      {u.photoUrl && u.photoUrl !== "null" && u.photoUrl !== "" && u.photoUrl !== "undefined" ? (
                        <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        u.fullName[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[var(--ink)] truncate max-w-[150px]">{u.fullName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md font-bold uppercase text-[8px] border tracking-wider shrink-0 ${
                            u.role === "admin"
                              ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                              : u.role === "teacher"
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                        {u.studentNumber} {u.yearLevel ? `• Gr. ${u.yearLevel}` : ""} {u.section ? `(${u.section})` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {u.id !== "admin-1" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(u.id, u.fullName);
                        }}
                        className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        aria-label={`Delete ${u.fullName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200" onClick={(e) => e.stopPropagation()}>LOCK</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-zinc-500 bg-[var(--bg)] rounded-xl border border-dashed border-[var(--border)]">
                <Users size={24} className="mx-auto mb-2 text-[var(--accent)]" />
                <p className="text-[10px] uppercase tracking-wider">No registry files found matching request query.</p>
              </div>
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-zinc-500 uppercase font-bold tracking-widest text-[9px]">
                  <th className="py-3 px-2">VOTER PROFILE</th>
                  <th className="py-3 px-2">STUDENT NUMBER</th>
                  <th className="py-3 px-2">ROLE</th>
                  <th className="py-3 px-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.12 }}
                      onClick={() => setSelectedDetailUser(u)}
                      className="hover:bg-[var(--bg)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-2 font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center font-bold text-xs border border-[var(--border)] shrink-0">
                          {u.photoUrl && u.photoUrl !== "null" && u.photoUrl !== "" && u.photoUrl !== "undefined" ? (
                            <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            u.fullName[0]
                          )}
                        </div>
                        <span className="truncate max-w-[160px]">{u.fullName}</span>
                      </td>
                      <td className="py-3 px-2 text-zinc-500 font-mono text-xs uppercase">
                        {u.studentNumber}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold uppercase text-[8px] border tracking-wider ${
                            u.role === "admin"
                              ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                              : u.role === "teacher"
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {u.id !== "admin-1" ? (
                          <motion.button
                            whileHover={{ scale: 1.1, color: "#e11d48" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(u.id, u.fullName);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            aria-label={`Delete ${u.fullName}`}
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        ) : (
                          <span className="text-[9px] text-zinc-400 italic font-bold uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>SYSTEM LOCK</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">
                      <Users size={24} className="mx-auto mb-2 text-[var(--accent)]" />
                      <p className="text-[10px] uppercase tracking-wider">No registry files found matching request query.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirmUser !== null}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Account?"
        message={`Are you sure you want to delete user account "${deleteConfirmUser?.name || ""}"? This will also cascade delete any nominated candidates or cast ballots corresponding to this user profile.`}
        confirmText="DELETE ACCOUNT"
        cancelText="CANCEL"
        isDanger={true}
      />

      <UserDetailModal
        user={selectedDetailUser}
        candidates={candidates}
        positions={positions}
        elections={elections}
        votes={votes}
        isOpen={selectedDetailUser !== null}
        onClose={() => setSelectedDetailUser(null)}
        token={token}
        onRefreshData={onRefreshData}
        setErrorNotification={setErrorNotification}
        setSuccessNotification={setSuccessNotification}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        token={token}
        existingUsers={users}
        onSuccess={onRefreshData}
        setErrorNotification={setErrorNotification}
        setSuccessNotification={setSuccessNotification}
      />

      <ImageCropModal
        isOpen={isAddUserCropOpen}
        onClose={() => setIsAddUserCropOpen(false)}
        onCropSave={async (croppedDataUrl, blob) => {
          setPhotoPreview(croppedDataUrl);
          if (blob) {
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
            setPhotoFile(file);
          }
        }}
        title="Crop New User Photo"
      />
    </motion.div>
  );
}

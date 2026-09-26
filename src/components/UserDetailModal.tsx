import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Shield,
  Award,
  Vote,
  CheckCircle,
  Calendar,
  Camera,
  RefreshCw,
  Pencil,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle
} from "lucide-react";
import { User as UserType, Candidate, Position, Election, Vote as VoteType, UserRole } from "../types";
import ImageCropModal from "./ImageCropModal";

interface UserDetailModalProps {
  user: UserType | null;
  candidates: Candidate[];
  positions: Position[];
  elections: Election[];
  votes: VoteType[];
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onRefreshData?: () => Promise<void>;
  onUserUpdated?: (updatedUser: UserType) => void;
  initialEditMode?: boolean;
  initialResetPassword?: boolean;
  setErrorNotification?: (msg: string) => void;
  setSuccessNotification?: (msg: string) => void;
}

export default function UserDetailModal({
  user,
  candidates,
  positions,
  elections,
  votes,
  isOpen,
  onClose,
  token,
  onRefreshData,
  onUserUpdated,
  initialEditMode = false,
  initialResetPassword = false,
  setErrorNotification,
  setSuccessNotification,
}: UserDetailModalProps) {
  const [currentUser, setCurrentUser] = useState<UserType | null>(user);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  // Edit details state
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("student");
  const [editYearLevel, setEditYearLevel] = useState<number | string>(7);
  const [editSection, setEditSection] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset password state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetMode, setResetMode] = useState<"force_setup" | "direct_password">("force_setup");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
    setCurrentPhotoUrl(null);
    setIsEditing(initialEditMode);
    setIsResetPasswordOpen(initialResetPassword);
    if (user) {
      setEditFullName(user.fullName || "");
      setEditStudentNumber(user.studentNumber || "");
      setEditRole(user.role || "student");
      setEditYearLevel(user.yearLevel ?? 7);
      setEditSection(user.section || "");
      setEditRoom(user.room ? user.room.replace(/^room\s*/i, "") : "");
    }
  }, [user, initialEditMode, initialResetPassword]);

  if (!user) return null;

  const activeUser = currentUser || user;
  const photoToDisplay = currentPhotoUrl || activeUser.photoUrl;

  const handleStartEdit = () => {
    setEditFullName(activeUser.fullName || "");
    setEditStudentNumber(activeUser.studentNumber || "");
    setEditRole(activeUser.role || "student");
    setEditYearLevel(activeUser.yearLevel ?? 7);
    setEditSection(activeUser.section || "");
    setEditRoom(activeUser.room ? activeUser.room.replace(/^room\s*/i, "") : "");
    setIsEditing(true);
    setIsResetPasswordOpen(false);
  };

  const handleCancelEdit = () => {
    setEditFullName(activeUser.fullName || "");
    setEditStudentNumber(activeUser.studentNumber || "");
    setEditRole(activeUser.role || "student");
    setEditYearLevel(activeUser.yearLevel ?? 7);
    setEditSection(activeUser.section || "");
    setEditRoom(activeUser.room ? activeUser.room.replace(/^room\s*/i, "") : "");
    setIsEditing(false);
  };

  const handleSaveCroppedPhoto = async (croppedDataUrl: string, fileBlob?: Blob) => {
    try {
      if (!token) {
        throw new Error("Missing auth token");
      }

      let photoUrlToSave = croppedDataUrl;

      if (fileBlob) {
        try {
          const formData = new FormData();
          formData.append("file", fileBlob, "profile.jpg");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              photoUrlToSave = uploadData.url;
            }
          }
        } catch (uploadErr) {
          console.warn("Direct blob upload failed, falling back to server processing:", uploadErr);
        }
      }

      const res = await fetch(`/api/users/${activeUser.id}/photo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoUrl: photoUrlToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user photo");
      }

      const newUrl = data.user?.photoUrl || photoUrlToSave;
      setCurrentPhotoUrl(newUrl);
      if (data.user) {
        setCurrentUser(data.user);
        if (onUserUpdated) onUserUpdated(data.user);
      }
      if (setSuccessNotification) {
        setSuccessNotification(`Updated profile photo for ${activeUser.fullName}`);
      }
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      if (setErrorNotification) {
        setErrorNotification(err.message || "Failed to update profile photo");
      }
    }
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      if (setErrorNotification) setErrorNotification("Missing authentication token");
      return;
    }

    const trimmedName = editFullName.trim();
    const trimmedNumber = editStudentNumber.trim();

    if (!trimmedName) {
      if (setErrorNotification) setErrorNotification("Full Name is required");
      return;
    }
    if (!trimmedNumber) {
      if (setErrorNotification) setErrorNotification("Student Number is required");
      return;
    }

    let parsedYear: number | null = null;
    if (editRole === "student") {
      parsedYear = Number.parseInt(String(editYearLevel), 10);
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 12) {
        if (setErrorNotification) setErrorNotification("A valid grade level between 1 and 12 is required for students");
        return;
      }
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/users/${activeUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: trimmedName,
          studentNumber: trimmedNumber,
          role: editRole,
          yearLevel: parsedYear,
          section: editSection.trim() || null,
          room: editRoom.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user details");
      }

      const updatedUser = data.user || {
        ...activeUser,
        fullName: trimmedName,
        studentNumber: trimmedNumber,
        role: editRole,
        yearLevel: parsedYear ?? undefined,
        section: editSection.trim() || undefined,
        room: editRoom.trim() || undefined,
      };

      setCurrentUser(updatedUser);
      setIsEditing(false);
      if (setSuccessNotification) {
        setSuccessNotification(`Details updated successfully for ${updatedUser.fullName}`);
      }
      if (onUserUpdated) onUserUpdated(updatedUser);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      if (setErrorNotification) {
        setErrorNotification(err.message || "Failed to update user details");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const cleanStudentNum = (activeUser.studentNumber || "").replace(/\D+/g, "");
    const generated = `BSF-${cleanStudentNum.slice(-4) || "2026"}-${rand}`;
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleConfirmResetPassword = async () => {
    if (!token) {
      if (setErrorNotification) setErrorNotification("Missing authentication token");
      return;
    }

    if (resetMode === "direct_password") {
      const trimmed = newPassword.trim();
      if (!trimmed) {
        if (setErrorNotification) setErrorNotification("Please enter a new password");
        return;
      }
      if (trimmed.length < 6) {
        if (setErrorNotification) setErrorNotification("Password must be at least 6 characters long");
        return;
      }
      if (trimmed !== confirmPassword.trim()) {
        if (setErrorNotification) setErrorNotification("New password and confirm password do not match");
        return;
      }
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${activeUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          forceSetup: resetMode === "force_setup",
          newPassword: resetMode === "direct_password" ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setIsResetPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      if (setSuccessNotification) {
        setSuccessNotification(data.message || `Password reset successfully for ${activeUser.fullName}`);
      }
      if (data.user) {
        setCurrentUser(data.user);
        if (onUserUpdated) onUserUpdated(data.user);
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      if (setErrorNotification) {
        setErrorNotification(err.message || "Failed to reset password");
      }
    } finally {
      setResettingPassword(false);
    }
  };

  // Find candidate profiles for this user
  const userNominations = candidates.filter((c) => c.userId === activeUser.id);

  // Find votes cast by this user
  const userVotes = votes.filter((v) => v.voterId === activeUser.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 overflow-y-auto max-h-[88vh] font-mono shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2.5 text-zinc-400 hover:text-[var(--ink)] hover:bg-[var(--bg)] rounded-full transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header / Profile section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[var(--border)]">
              <div className="relative group shrink-0">
                {photoToDisplay && photoToDisplay !== "null" && photoToDisplay !== "" && photoToDisplay !== "undefined" ? (
                  <img
                    src={photoToDisplay}
                    alt={activeUser.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[var(--accent)] shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] border-2 border-[var(--accent)] flex items-center justify-center font-black text-2xl text-[var(--accent)] shadow-md">
                    {activeUser.fullName[0]}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsCropOpen(true)}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  title="Change & Crop Profile Picture"
                >
                  <Camera size={18} />
                </button>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase bg-[var(--accent-soft)] px-2 py-0.5 rounded-md border border-[var(--accent)]/20">
                    {activeUser.role} Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCropOpen(true)}
                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Camera size={11} /> CHANGE PHOTO
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        handleCancelEdit();
                      } else {
                        handleStartEdit();
                      }
                    }}
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer border ${
                      isEditing
                        ? "text-zinc-600 bg-zinc-100 hover:bg-zinc-200 border-zinc-300"
                        : "text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-200"
                    }`}
                  >
                    <Pencil size={11} /> {isEditing ? "CANCEL EDIT" : "EDIT DETAILS"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsResetPasswordOpen(!isResetPasswordOpen);
                    }}
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer border ${
                      isResetPasswordOpen
                        ? "text-zinc-600 bg-zinc-100 hover:bg-zinc-200 border-zinc-300"
                        : "text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200"
                    }`}
                  >
                    <KeyRound size={11} /> RESET PASSWORD
                  </button>
                </div>

                {!isEditing ? (
                  <>
                    <h3 className="font-display font-black text-xl md:text-2xl text-[var(--ink)] uppercase tracking-wide mt-1">
                      {activeUser.fullName}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      STUDENT NUMBER: <span className="text-[var(--ink)] font-bold">{activeUser.studentNumber}</span>
                    </p>
                  </>
                ) : (
                  <div className="pt-2 space-y-2">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="e.g. Juan Dela Cruz"
                        className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-xs font-bold text-[var(--ink)] uppercase tracking-wide outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                        Student Number (LRN / ID)
                      </label>
                      <input
                        type="text"
                        value={editStudentNumber}
                        onChange={(e) => setEditStudentNumber(e.target.value)}
                        placeholder="e.g. 1010101010"
                        className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-xs font-mono font-bold text-[var(--ink)] uppercase outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Password Panel (Accordion / Console) */}
            <AnimatePresence>
              {isResetPasswordOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.2 }}
                  className="my-5 p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-4 text-xs font-mono"
                >
                  <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <KeyRound size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-rose-900 uppercase text-xs">Reset User Password</h4>
                        <p className="text-[10px] text-rose-700">Account: {activeUser.fullName} ({activeUser.studentNumber})</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsResetPasswordOpen(false)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Mode 1: First time setup */}
                    <label
                      onClick={() => setResetMode("force_setup")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        resetMode === "force_setup"
                          ? "bg-white border-rose-400 shadow-xs"
                          : "bg-rose-50/50 border-rose-200/70 hover:bg-white/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === "force_setup"}
                        onChange={() => setResetMode("force_setup")}
                        className="mt-0.5 text-rose-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900 uppercase text-[11px]">Require Password Setup on Next Login</span>
                          <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Recommended</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                          Clears this student's password. When they sign in with their Student Number, they will immediately be prompted to create their own new password securely.
                        </p>
                      </div>
                    </label>

                    {/* Mode 2: Direct new password */}
                    <label
                      onClick={() => setResetMode("direct_password")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        resetMode === "direct_password"
                          ? "bg-white border-rose-400 shadow-xs"
                          : "bg-rose-50/50 border-rose-200/70 hover:bg-white/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === "direct_password"}
                        onChange={() => setResetMode("direct_password")}
                        className="mt-0.5 text-rose-600"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-zinc-900 uppercase text-[11px]">Set a Specific Password Now</span>
                        <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                          Directly assign a known password for this user account.
                        </p>

                        {resetMode === "direct_password" && (
                          <div className="mt-3 pt-3 border-t border-rose-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">New Password</label>
                                <button
                                  type="button"
                                  onClick={handleGeneratePassword}
                                  className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Sparkles size={11} /> Generate Random
                                </button>
                              </div>
                              <div className="relative">
                                <input
                                  type={showNewPassword ? "text" : "password"}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Minimum 6 characters"
                                  className="w-full px-3 py-2 pr-20 bg-zinc-50 border border-zinc-200 focus:border-rose-400 rounded-lg text-xs font-mono font-bold text-zinc-900 outline-none"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  {newPassword && (
                                    <button
                                      type="button"
                                      onClick={handleCopyPassword}
                                      className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                      title="Copy password"
                                    >
                                      {copiedPassword ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                  >
                                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-600 uppercase">Confirm Password</label>
                              <div className="relative">
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repeat new password"
                                  className="w-full px-3 py-2 pr-10 bg-zinc-50 border border-zinc-200 focus:border-rose-400 rounded-lg text-xs font-mono font-bold text-zinc-900 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                >
                                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              {newPassword && confirmPassword && (
                                <p className={`text-[9px] font-bold mt-1 ${newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                                  {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={() => setIsResetPasswordOpen(false)}
                      className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 rounded-xl font-bold text-[10px] uppercase transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetPassword}
                      disabled={resettingPassword}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {resettingPassword ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Resetting...
                        </>
                      ) : (
                        <>
                          <KeyRound size={12} /> Confirm Password Reset
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Core Details Grid */}
            <div className={`grid grid-cols-1 ${activeUser.role === "student" ? "md:grid-cols-2" : ""} gap-6 py-6`}>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase border-b border-[var(--border)] pb-1.5 flex items-center gap-1.5">
                  <Shield size={12} className="text-[var(--accent)]" /> REGISTRY SECURITY METADATA
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center">
                    <span className="text-zinc-500">SYSTEM UUID:</span>
                    <span className="font-bold text-[var(--ink)] truncate max-w-[200px]" title={activeUser.id}>
                      {activeUser.id}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center">
                    <span className="text-zinc-500">ROLE CLASS:</span>
                    {!isEditing ? (
                      <span className="font-bold text-[var(--ink)] uppercase">{activeUser.role}</span>
                    ) : (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded font-bold text-[var(--ink)] uppercase text-xs outline-none cursor-pointer"
                      >
                        <option value="student">STUDENT</option>
                        <option value="teacher">TEACHER</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    )}
                  </div>

                  {activeUser.role === "student" && !isEditing && (
                    <>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                        <span className="text-zinc-500">GRADE LEVEL:</span>
                        <span className="font-bold text-[var(--accent)]">
                          Grade {activeUser.yearLevel || "Not Configured"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                        <span className="text-zinc-500">SECTION:</span>
                        <span className="font-bold text-[var(--ink)]">
                          {activeUser.section || "Not Configured"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                        <span className="text-zinc-500">ROOM NUMBER:</span>
                        <span className="font-bold text-[var(--ink)]">
                          {activeUser.room ? activeUser.room.replace(/^room\s*/i, "") : "Not Configured"}
                        </span>
                      </div>
                    </>
                  )}

                  {isEditing && editRole === "student" && (
                    <>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center gap-3">
                        <span className="text-zinc-500 shrink-0">GRADE LEVEL:</span>
                        <select
                          value={editYearLevel}
                          onChange={(e) => setEditYearLevel(Number(e.target.value))}
                          className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded font-bold text-[var(--accent)] text-xs outline-none cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center gap-3">
                        <span className="text-zinc-500 shrink-0">SECTION:</span>
                        <input
                          type="text"
                          value={editSection}
                          onChange={(e) => setEditSection(e.target.value)}
                          placeholder="e.g. Moonfish"
                          className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded font-bold text-[var(--ink)] text-xs text-right outline-none max-w-[140px]"
                        />
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center gap-3">
                        <span className="text-zinc-500 shrink-0">ROOM NUMBER:</span>
                        <input
                          type="text"
                          value={editRoom}
                          onChange={(e) => setEditRoom(e.target.value)}
                          placeholder="e.g. 21"
                          className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded font-bold text-[var(--ink)] text-xs text-right outline-none max-w-[140px]"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)] items-center">
                    <span className="text-zinc-500">PASSWORD STATUS:</span>
                    <span className={`font-bold ${activeUser.hasSetPassword !== false ? "text-emerald-600" : "text-amber-600"}`}>
                      {activeUser.hasSetPassword !== false ? "CONFIGURED" : "REQUIRES SETUP"}
                    </span>
                  </div>
                </div>
              </div>

              {activeUser.role === "student" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase border-b border-[var(--border)] pb-1.5 flex items-center gap-1.5">
                    <Vote size={12} className="text-[var(--accent)]" /> ACTIVITY TELEMETRY
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                      <span className="text-zinc-500">TOTAL BALLOTS CAST:</span>
                      <span className="font-bold text-[var(--accent)]">{userVotes.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                      <span className="text-zinc-500">NOMINATION COUNT:</span>
                      <span className="font-bold text-[var(--accent)]">{userNominations.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed border-[var(--border)]">
                      <span className="text-zinc-500">VOTER STATUS:</span>
                      <span className={`font-bold ${userVotes.length > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {userVotes.length > 0 ? "ACTIVE PARTICIPANT" : "PENDING PARTICIPATION"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeUser.role === "student" && (
              <>
                {/* Nominations & Manifesto Panel */}
                <div className="space-y-4 border-t border-[var(--border)] pt-6">
                  <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                    <Award size={13} className="text-[var(--accent)]" /> CANDIDACY BALLOT STATUS
                  </h4>

                  {userNominations.length > 0 ? (
                    <div className="space-y-4">
                      {userNominations.map((nom) => {
                        const position = positions.find((p) => p.id === nom.positionId);
                        const election = elections.find((e) => e.id === nom.electionId);
                        return (
                          <div
                            key={nom.id}
                            className="p-4 bg-[var(--bg)] border border-[var(--accent)]/20 space-y-2 rounded-xl"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                              <div>
                                <p className="text-xs font-bold text-[var(--ink)] uppercase">
                                  Candidate for:{" "}
                                  <span className="text-[var(--accent)]">{position?.name || "Unknown Position"}</span>
                                </p>
                                <p className="text-[9px] text-zinc-500 uppercase mt-0.5">
                                  Election: {election?.title || "Unknown Election"}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-[8px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-md border border-[var(--accent)]/20">
                                  {nom.voteCount} VOTES RECEIVED
                                </span>
                              </div>
                            </div>

                            {nom.party && (
                              <p className="text-[9px] text-zinc-500">
                                PARTY AFFILIATION: <span className="text-[var(--ink)] font-bold">{nom.party}</span>
                              </p>
                            )}

                            <div className="text-xs italic bg-[var(--surface)] p-3 rounded-lg border-l-2 border-[var(--accent)]/50 text-[var(--ink)]">
                              "{nom.manifesto}"
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-center">
                      <p className="text-[10px] text-zinc-500">
                        This user is not currently nominated as a candidate for any active ballot.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cast Ballots / History Log */}
                <div className="space-y-4 border-t border-[var(--border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-[var(--accent)]" /> CAST BALLOT HISTORY (NON-IDENTIFYING)
                  </h4>

                  {userVotes.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {userVotes.map((vote) => {
                        const election = elections.find((e) => e.id === vote.electionId);
                        const position = positions.find((p) => p.id === vote.positionId);
                        return (
                          <div
                            key={vote.id}
                            className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] text-[11px] rounded-xl"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                              <div>
                                <p className="font-bold text-[var(--ink)] uppercase">
                                  Ballot Registered: {position?.name || "Unknown Position"}
                                </p>
                                <p className="text-[8px] text-zinc-500 mt-0.5">
                                  Election: {election?.title || "Unknown Election"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-500 font-bold bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                              REF: {vote.id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-center">
                      <p className="text-[10px] text-zinc-500">
                        No ballots have been cryptographically cast by this profile yet.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Footer buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[var(--border)] mt-6">
              {!isEditing ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Pencil size={13} /> EDIT DETAILS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsResetPasswordOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <KeyRound size={13} /> RESET PASSWORD
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingEdit}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg)] text-zinc-600 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit()}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={13} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] text-[var(--ink)] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-[var(--surface)] shadow-xs"
              >
                CLOSE PROFILE
              </button>
            </div>

            <ImageCropModal
              isOpen={isCropOpen}
              onClose={() => setIsCropOpen(false)}
              onCropSave={handleSaveCroppedPhoto}
              title={`Crop Photo for ${activeUser.fullName}`}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

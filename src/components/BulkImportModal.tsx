import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  HelpCircle,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { User as UserType } from "../types";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  existingUsers: UserType[];
  onSuccess: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

interface ParsedUserRow {
  rowNum: number;
  username: string;
  fullName: string;
  password: string;
  role: string;
  yearLevel?: number;
  isValid: boolean;
  validationError?: string;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  token,
  existingUsers,
  onSuccess,
  setErrorNotification,
  setSuccessNotification,
}: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ createdCount: number; errors: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent = "username,fullName,password,role,yearLevel\nstudent101,Juan Dela Cruz,pass123,student,10\nteacher202,Maria Santos,pass456,teacher,\nstudent102,Pedro Penduko,pass789,student,11\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "users_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseRawData = (text: string) => {
    const existingUsernameSet = new Set(existingUsers.map(u => u.username.toLowerCase()));
    const seenImportUsernames = new Set<string>();
    const rows: ParsedUserRow[] = [];

    const trimmed = text.trim();
    if (!trimmed) {
      setParsedRows([]);
      return;
    }

    // Check if JSON
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed);
        const list = Array.isArray(json) ? json : [json];
        list.forEach((item, index) => {
          const u = String(item.username || item.username_id || item.id || "").trim();
          const fn = String(item.fullName || item.full_name || item.name || "").trim();
          const pw = String(item.password || item.pass || "").trim();
          let r = String(item.role || "student").toLowerCase().trim();
          if (r !== "student" && r !== "teacher") r = "student";
          const yl = item.yearLevel || item.year_level || item.year ? parseInt(item.yearLevel || item.year_level || item.year) : undefined;

          let isValid = true;
          let error = "";

          if (!u || !fn || !pw) {
            isValid = false;
            error = "Missing username, full name, or password";
          } else if (existingUsernameSet.has(u.toLowerCase())) {
            isValid = false;
            error = `Username "${u}" already exists in registry`;
          } else if (seenImportUsernames.has(u.toLowerCase())) {
            isValid = false;
            error = `Duplicate username "${u}" in import file`;
          } else {
            seenImportUsernames.add(u.toLowerCase());
          }

          rows.push({
            rowNum: index + 1,
            username: u,
            fullName: fn,
            password: pw,
            role: r,
            yearLevel: yl,
            isValid,
            validationError: error,
          });
        });
        setParsedRows(rows);
        return;
      } catch (err) {
        // Not JSON, fallback to CSV parsing
      }
    }

    // CSV Parse
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Helper to parse CSV line handling quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const firstLineCols = parseCSVLine(lines[0]).map(c => c.toLowerCase());
    
    // Detect header row
    const isHeader = firstLineCols.some(col => 
      col.includes("username") || col.includes("fullname") || col.includes("name") || col.includes("password") || col.includes("role")
    );

    let usernameIdx = 0;
    let fullNameIdx = 1;
    let passwordIdx = 2;
    let roleIdx = 3;
    let yearLevelIdx = 4;

    let dataLines = lines;

    if (isHeader) {
      dataLines = lines.slice(1);
      firstLineCols.forEach((col, idx) => {
        if (col.includes("user")) usernameIdx = idx;
        else if (col.includes("full") || col.includes("name")) fullNameIdx = idx;
        else if (col.includes("pass")) passwordIdx = idx;
        else if (col.includes("role")) roleIdx = idx;
        else if (col.includes("year") || col.includes("level") || col.includes("grade")) yearLevelIdx = idx;
      });
    }

    dataLines.forEach((line, index) => {
      const cols = parseCSVLine(line);
      if (cols.length === 0 || (cols.length === 1 && cols[0] === "")) return;

      const u = (cols[usernameIdx] || "").trim();
      const fn = (cols[fullNameIdx] || "").trim();
      const pw = (cols[passwordIdx] || "").trim();
      let r = (cols[roleIdx] || "student").toLowerCase().trim();
      if (r !== "student" && r !== "teacher") r = "student";
      
      const rawYl = cols[yearLevelIdx] || "";
      const parsedYl = rawYl ? parseInt(rawYl) : undefined;
      const yl = !isNaN(parsedYl as number) ? parsedYl : undefined;

      let isValid = true;
      let error = "";

      if (!u || !fn || !pw) {
        isValid = false;
        error = "Missing username, full name, or password";
      } else if (existingUsernameSet.has(u.toLowerCase())) {
        isValid = false;
        error = `Username "${u}" already registered`;
      } else if (seenImportUsernames.has(u.toLowerCase())) {
        isValid = false;
        error = `Duplicate username "${u}" in import file`;
      } else {
        seenImportUsernames.add(u.toLowerCase());
      }

      rows.push({
        rowNum: index + 1,
        username: u,
        fullName: fn,
        password: pw,
        role: r,
        yearLevel: yl,
        isValid,
        validationError: error,
      });
    });

    setParsedRows(rows);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseRawData(content || "");
    };
    reader.readAsText(file);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      setErrorNotification("No valid user records to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map(r => ({
        username: r.username,
        fullName: r.fullName,
        password: r.password,
        role: r.role,
        yearLevel: r.yearLevel,
      }));

      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ users: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute bulk import");
      }

      setImportResult({
        createdCount: data.createdCount || 0,
        errors: data.errors || [],
      });

      setSuccessNotification(`Successfully imported ${data.createdCount} new user accounts!`);
      await onSuccess();
    } catch (err: any) {
      setErrorNotification(err.message || "Bulk import failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setPastedText("");
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#1A2B48] border border-slate-700/80 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-mono text-white"
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-700/80 flex items-center justify-between bg-[#132238]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-display font-black text-lg uppercase tracking-wider text-white">
                BULK USER REGISTRY IMPORT
              </h3>
              <p className="text-xs text-slate-300">
                Upload CSV or JSON files to batch register students and faculty members.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
          {importResult ? (
            /* Result Screen */
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h4 className="font-display font-bold text-xl uppercase text-emerald-400">
                  Import Process Completed
                </h4>
                <p className="text-sm text-slate-200">
                  Successfully registered <strong className="text-white text-base">{importResult.createdCount}</strong> new account credentials.
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-left max-h-48 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} /> Skipped Rows / Warnings:
                  </p>
                  <ul className="text-xs text-rose-300 space-y-1 list-disc list-inside">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleResetModal}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} /> Import Another Batch
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-lg"
                >
                  Close & View Registry
                </button>
              </div>
            </div>
          ) : (
            /* Input & Preview Screen */
            <>
              {/* Mode Tabs & Template Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center bg-[#132238] p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setActiveTab("file")}
                    className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === "file"
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Upload size={14} /> File Upload
                  </button>
                  <button
                    onClick={() => setActiveTab("paste")}
                    className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === "paste"
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileText size={14} /> Paste CSV / JSON
                  </button>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} className="text-blue-400" /> Download CSV Template
                </button>
              </div>

              {/* Upload Input Area */}
              {activeTab === "file" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? "border-blue-400 bg-blue-500/10"
                        : selectedFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-slate-700 bg-[#132238] hover:border-blue-500/50 hover:bg-[#162740]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Upload size={24} />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-emerald-400 truncate max-w-md">
                          Selected File: {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop another file to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-wider">
                          Drag & Drop CSV or JSON File Here
                        </p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                          or click to browse from device
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Paste Raw CSV or JSON Lines
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`username,fullName,password,role,yearLevel\nstudent101,John Doe,pass123,student,10\nteacher202,Maria Clara,pass456,teacher,`}
                    value={pastedText}
                    onChange={(e) => {
                      setPastedText(e.target.value);
                      parseRawData(e.target.value);
                    }}
                    className="w-full p-4 bg-[#132238] border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              )}

              {/* Validation Summary & Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                    <h4 className="font-display font-bold text-sm uppercase text-white flex items-center gap-2">
                      Parsed Preview Log ({parsedRows.length} Rows Detected)
                    </h4>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">
                        {validRows.length} Valid
                      </span>
                      {invalidRows.length > 0 && (
                        <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md">
                          {invalidRows.length} Invalid / Duplicate
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-xl bg-[#132238]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#0f1b2d] border-b border-slate-700 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Username</th>
                          <th className="py-2.5 px-3">Full Name</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {parsedRows.map((r) => (
                          <tr
                            key={r.rowNum}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              !r.isValid ? "bg-rose-500/10" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">
                              {r.rowNum}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] uppercase">
                                  <CheckCircle2 size={12} /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px] uppercase" title={r.validationError}>
                                  <AlertCircle size={12} /> {r.validationError || "Invalid"}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white uppercase">
                              {r.username || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200">
                              {r.fullName || "-"}
                            </td>
                            <td className="py-2.5 px-3 uppercase text-[10px]">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                r.role === "teacher" 
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}>
                                {r.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {r.yearLevel || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="p-5 md:p-6 border-t border-slate-700/80 bg-[#132238] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-blue-400 shrink-0" />
              <span>Only valid rows will be committed to the User Registry.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validRows.length === 0 || isSubmitting}
                onClick={handleExecuteImport}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Committing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Register {validRows.length} Accounts
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

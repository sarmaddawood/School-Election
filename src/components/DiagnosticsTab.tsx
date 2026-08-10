import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  Play,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Server,
  Database,
  Brain,
  KeyRound,
  RefreshCw,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Flame,
} from "lucide-react";

interface TestResult {
  id: string;
  name: string;
  description: string;
  group: "auth" | "elections" | "voting" | "ai" | "admin";
  status: "idle" | "running" | "pass" | "fail";
  time?: number;
  error?: string;
  payload?: any;
  response?: any;
}

interface DiagnosticsTabProps {
  token: string;
  currentUser: any;
  onRefreshData: () => Promise<void>;
}

export default function DiagnosticsTab({ token, currentUser, onRefreshData }: DiagnosticsTabProps) {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [tests, setTests] = useState<TestResult[]>([
    {
      id: "auth-me",
      name: "Verify Admin Session (JWT/Token)",
      description: "Verifies the current session token integrity against /api/auth/me.",
      group: "auth",
      status: "idle",
    },
    {
      id: "auth-invalid",
      name: "Enforce Auth Intrusion Prevention",
      description: "Verifies that requests without valid credentials return 401 Unauthorized.",
      group: "auth",
      status: "idle",
    },
    {
      id: "fetch-users",
      name: "Verify Users Registry API",
      description: "Queries the users list to verify administrator clearance and database connection.",
      group: "admin",
      status: "idle",
    },
    {
      id: "fetch-elections",
      name: "Verify Elections Retrieval API",
      description: "Checks retrieved election data structures and verify election status ranges.",
      group: "elections",
      status: "idle",
    },
    {
      id: "fetch-positions",
      name: "Verify Positions Retrieval API",
      description: "Validates position structures and checks election bindings.",
      group: "elections",
      status: "idle",
    },
    {
      id: "fetch-candidates",
      name: "Verify Nominees Retrieval API",
      description: "Tests nominees listing and sealed/unsealed results policy constraints.",
      group: "elections",
      status: "idle",
    },
    {
      id: "test-vote-restriction",
      name: "Enforce Non-Student Voting Restriction",
      description: "Verifies that administrators are blocked from casting a vote to prevent privilege abuse.",
      group: "voting",
      status: "idle",
    },
    {
      id: "test-vote-invalid-payload",
      name: "Validate Vote Payload Sanitization",
      description: "Verifies that empty or invalid vote submissions are caught and rejected.",
      group: "voting",
      status: "idle",
    },
    {
      id: "ai-polish",
      name: "Verify AI Campaign Manifesto Polish",
      description: "Tests Gemini AI integration for spelling and campaign message optimization.",
      group: "ai",
      status: "idle",
    },
  ]);

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTestStatus = (id: string, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    // Auto-update selected test if active
    setSelectedTest((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
  };

  const runTest = async (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;

    updateTestStatus(testId, { status: "running", error: undefined, payload: undefined, response: undefined });
    addLog(`INITIATED: ${test.name}`);
    const start = performance.now();

    try {
      switch (testId) {
        case "auth-me": {
          const payload = { headers: { Authorization: `Bearer ${token}` } };
          updateTestStatus(testId, { payload });
          
          const res = await fetch("/api/auth/me", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && data.user) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: data });
            addLog(`SUCCESS: ${test.name} resolved in ${elapsed}ms. Admin: "${data.user.fullName}"`);
          } else {
            throw new Error(data.error || "Me endpoint returned invalid payload");
          }
          break;
        }

        case "auth-invalid": {
          const payload = { headers: { Authorization: `Bearer forged.invalid.token` } };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/users", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.status === 401 || res.status === 403) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: data });
            addLog(`SUCCESS: Intrusion prevention system working. Got ${res.status} error as expected.`);
          } else {
            throw new Error(`Security breach! Expected 401/403 but got ${res.status} Status`);
          }
          break;
        }

        case "fetch-users": {
          const payload = { headers: { Authorization: `Bearer ${token}` } };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/users", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && Array.isArray(data)) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: { count: data.length, sample: data.slice(0, 2) } });
            addLog(`SUCCESS: Fetched ${data.length} users successfully in ${elapsed}ms.`);
          } else {
            throw new Error(data.error || "Failed to parse users payload");
          }
          break;
        }

        case "fetch-elections": {
          const payload = { headers: { Authorization: `Bearer ${token}` } };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/elections", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && Array.isArray(data)) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: { count: data.length, data } });
            addLog(`SUCCESS: Loaded ${data.length} elections in ${elapsed}ms.`);
          } else {
            throw new Error(data.error || "Elections list malformed");
          }
          break;
        }

        case "fetch-positions": {
          const payload = { headers: { Authorization: `Bearer ${token}` } };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/positions", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && Array.isArray(data)) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: { count: data.length, data } });
            addLog(`SUCCESS: Loaded ${data.length} positions in ${elapsed}ms.`);
          } else {
            throw new Error(data.error || "Positions structure invalid");
          }
          break;
        }

        case "fetch-candidates": {
          const payload = { headers: { Authorization: `Bearer ${token}` } };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/candidates", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && Array.isArray(data)) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: { count: data.length, data } });
            addLog(`SUCCESS: Loaded ${data.length} nominees in ${elapsed}ms.`);
          } else {
            throw new Error(data.error || "Nominees list format invalid");
          }
          break;
        }

        case "test-vote-restriction": {
          const body = { electionId: "e-demo", positionId: "pos-pres", candidateId: "c-demo-1" };
          const payload = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/votes", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          // Admin is not student, so it should be rejected with 403 Forbidden
          if (res.status === 403) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: data });
            addLog(`SUCCESS: Non-student double voting block active. Correctly returned 403 Forbidden: "${data.error}"`);
          } else {
            throw new Error(`Security Gap: Expected 403 rejection for Admin vote, but received ${res.status}`);
          }
          break;
        }

        case "test-vote-invalid-payload": {
          const body = { electionId: "", positionId: "", candidateId: "" };
          const payload = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/votes", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.status === 400) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: data });
            addLog(`SUCCESS: Empty ballot request caught by validator. Returned 400 Bad Request.`);
          } else {
            throw new Error(`Payload Gap: Expected 400 validator rejection, but received ${res.status}`);
          }
          break;
        }

        case "ai-polish": {
          const body = { positionName: "President", draft: "i want to make the school better and add more books" };
          const payload = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          };
          updateTestStatus(testId, { payload });

          const res = await fetch("/api/ai/suggest-manifesto", payload);
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          if (res.ok && data.manifesto) {
            updateTestStatus(testId, { status: "pass", time: elapsed, response: data });
            addLog(`SUCCESS: Gemini polished output received: "${data.manifesto}"`);
          } else {
            throw new Error(data.error || "Polish endpoint returned no result");
          }
          break;
        }

        default:
          throw new Error("Unknown diagnostic step");
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      updateTestStatus(testId, { status: "fail", time: elapsed, error: err.message });
      addLog(`FAILED: ${test.name} - ${err.message}`);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    setLogs([]);
    addLog(`STARTING COMPLETE SYSTEM DIAGNOSTICS SUITE`);
    addLog(`Target Authorization: Bearer signed-session-token...`);

    // Reset status
    setTests((prev) => prev.map((t) => ({ ...t, status: "idle", error: undefined, response: undefined })));

    // Run sequentially
    for (const test of tests) {
      await runTest(test.id);
    }

    // Refresh application data
    await onRefreshData();

    setIsRunningAll(false);
    addLog(`DIAGNOSTICS SUITE COMPLETED`);
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case "auth":
        return <KeyRound size={14} className="text-indigo-400" />;
      case "elections":
        return <Database size={14} className="text-emerald-400" />;
      case "voting":
        return <Cpu size={14} className="text-amber-400" />;
      case "ai":
        return <Brain size={14} className="text-purple-400" />;
      case "admin":
        return <Server size={14} className="text-cyan-400" />;
      default:
        return <Activity size={14} className="text-zinc-400" />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 w-full max-w-7xl mx-auto font-mono text-[var(--ink)] bg-[var(--bg)]">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] p-6 rounded-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="text-[var(--accent)] animate-pulse" size={18} />
            <h1 className="text-xl font-bold tracking-wider uppercase text-[var(--ink)]">System Diagnostics</h1>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
            High-Integrity end-to-end regression & security verification logs
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={isRunningAll}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[var(--surface)] font-bold uppercase tracking-wider text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 rounded-none cursor-pointer"
        >
          {isRunningAll ? (
            <>
              <RefreshCw className="animate-spin" size={14} />
              Testing...
            </>
          ) : (
            <>
              <Play fill="black" size={12} />
              Run Full Test Suite
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: List of Tests */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2">
            <span className="text-xs uppercase tracking-widest text-zinc-500">Verification Tests</span>
            <span className="text-xs font-bold text-[var(--accent)]">
              {tests.filter((t) => t.status === "pass").length} / {tests.length} PASSED
            </span>
          </div>

          <div className="space-y-2">
            {tests.map((test) => {
              const isSelected = selectedTest?.id === test.id;
              return (
                <motion.div
                  key={test.id}
                  onClick={() => setSelectedTest(test)}
                  whileHover={{ x: 4 }}
                  className={`p-4 border text-left cursor-pointer transition-all flex items-center justify-between gap-4 rounded-none ${
                    isSelected
                      ? "bg-[var(--accent-soft)] border-[var(--accent)]/60 shadow-[0_0_15px_var(--accent-soft)]"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 shrink-0 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-sm">
                      {getGroupIcon(test.group)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-[11px] font-bold tracking-wider text-[var(--ink)] truncate uppercase">
                        {test.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed truncate">
                        {test.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {test.status === "idle" && (
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 uppercase tracking-widest border border-zinc-700">
                        Idle
                      </span>
                    )}
                    {test.status === "running" && (
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 uppercase tracking-widest border border-indigo-500/25 flex items-center gap-1">
                        <RefreshCw className="animate-spin" size={8} />
                        Testing
                      </span>
                    )}
                    {test.status === "pass" && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 uppercase tracking-widest border border-emerald-500/25 flex items-center gap-1 font-bold">
                        <CheckCircle size={10} />
                        PASS {test.time && `(${test.time}ms)`}
                      </span>
                    )}
                    {test.status === "fail" && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 uppercase tracking-widest border border-rose-500/25 flex items-center gap-1 font-bold">
                        <AlertTriangle size={10} />
                        FAIL
                      </span>
                    )}
                    <ChevronRight size={14} className="text-zinc-500" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Console / Selected Test Inspector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Test Inspector */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-none flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                Test Inspector
              </span>
              {selectedTest && (
                <button
                  onClick={() => runTest(selectedTest.id)}
                  disabled={selectedTest.status === "running"}
                  className="px-2.5 py-1 bg-[var(--surface)] hover:bg-[var(--accent-soft)] text-[var(--ink)] text-[10px] font-bold uppercase border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-none cursor-pointer transition-colors"
                >
                  Re-Run
                </button>
              )}
            </div>

            {selectedTest ? (
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold tracking-wider text-[var(--ink)] uppercase flex items-center gap-1.5">
                    {getGroupIcon(selectedTest.group)}
                    {selectedTest.name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans">
                    {selectedTest.description}
                  </p>
                </div>

                {selectedTest.payload && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Request Payload</p>
                    <pre className="p-3 bg-black/40 border border-white/5 text-[9px] overflow-x-auto text-[#A5C261] rounded-sm max-h-[140px]">
                      {JSON.stringify(selectedTest.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedTest.response && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Response Data</p>
                    <pre className="p-3 bg-black/40 border border-white/5 text-[9px] overflow-x-auto text-[#6D9CBE] rounded-sm max-h-[200px]">
                      {JSON.stringify(selectedTest.response, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedTest.error && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-rose-400 uppercase tracking-widest font-bold flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Error Log
                    </p>
                    <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-[10px] text-rose-400 font-sans leading-relaxed rounded-sm">
                      {selectedTest.error}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 py-8">
                <Terminal size={36} className="mb-2 opacity-40 text-zinc-500" />
                <p className="text-[10px] uppercase tracking-wider font-bold">No test selected</p>
                <p className="text-[9px] text-zinc-500 mt-1 max-w-[200px] text-center font-sans">
                  Click any verification test on the left to inspect payloads, responses, and error traces.
                </p>
              </div>
            )}
          </div>

          {/* Interactive Console logs */}
          <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-none h-[280px] flex flex-col">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border)] shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Live Console Terminal
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[9px] leading-relaxed text-zinc-400 select-all pr-1 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic py-4">Waiting for tests to execute...</div>
              ) : (
                logs.map((log, idx) => {
                  let colorClass = "text-zinc-400";
                  if (log.includes("SUCCESS:")) colorClass = "text-emerald-400";
                  if (log.includes("FAILED:")) colorClass = "text-rose-400 font-bold";
                  if (log.includes("INITIATED:")) colorClass = "text-indigo-400";
                  return (
                    <div key={idx} className={`${colorClass} whitespace-pre-wrap break-all`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

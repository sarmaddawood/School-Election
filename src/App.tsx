import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Loader2, Vote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Election, Position, Candidate, Vote as VoteType } from "./types";
import LoginPage from "./components/LoginPage";
import AppShell from "./components/AppShell";
import NotificationModal from "./components/NotificationModal";
import DashboardTab from "./components/DashboardTab";
import ElectionTab from "./components/ElectionTab";
import PositionsTab from "./components/PositionsTab";
import CandidatesTab from "./components/CandidatesTab";
import UsersTab from "./components/UsersTab";
import VotePage from "./components/VotePage";
import ResultsPage from "./components/ResultsPage";
import CalendarTab from "./components/CalendarTab";
import ChangePasswordTab from "./components/ChangePasswordTab";
import DiagnosticsTab from "./components/DiagnosticsTab";
import { DashboardSkeletonPage } from "./components/Skeleton";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const setErrorNotification = (msg: string) => {
    setNotification({ message: msg, type: "error" });
  };

  const setSuccessNotification = (msg: string) => {
    setNotification({ message: msg, type: "success" });
  };

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const fetchGlobalData = async (authToken: string, canManageUsers: boolean) => {
    setDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      const [elRes, posRes, candRes] = await Promise.all([
        fetch("/api/elections", { headers }),
        fetch("/api/positions", { headers }),
        fetch("/api/candidates", { headers }),
      ]);

      if (elRes.ok) setElections(await elRes.json());
      if (posRes.ok) setPositions(await posRes.json());
      if (candRes.ok) setCandidates(await candRes.json());

      if (canManageUsers) {
        const [usersRes, votesRes] = await Promise.all([
          fetch("/api/users", { headers }),
          fetch("/api/votes", { headers }),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (votesRes.ok) setVotes(await votesRes.json());
      }
    } catch (err) {
      console.error("Failed to sync system data", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (token && user) {
      await fetchGlobalData(token, user.role === "admin" || user.role === "teacher");
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("civicflow_token");
    if (!savedToken) {
      setAuthLoading(false);
      return;
    }

    const verifyToken = async (attempts = 3) => {
      try {
        for (let i = 0; i < attempts; i++) {
          try {
            const response = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${savedToken}` },
            });
            if (response.ok) {
              const data = await response.json();
              if (data.user) {
                setUser(data.user);
                setToken(savedToken);
                setActiveTab(data.user.role === "admin" ? "dashboard" : data.user.role === "teacher" ? "users" : "vote");
                await fetchGlobalData(savedToken, data.user.role === "admin" || data.user.role === "teacher");
                return;
              }
            }
            // If server responded with non-200 (e.g. 401 Unauthorized)
            localStorage.removeItem("civicflow_token");
            return;
          } catch (err) {
            if (i < attempts - 1) {
              await new Promise((res) => setTimeout(res, 600));
            } else {
              console.warn("Auth token check unavailable after retries, clearing saved session.");
              localStorage.removeItem("civicflow_token");
            }
          }
        }
      } finally {
        setAuthLoading(false);
      }
    };

    verifyToken();
  }, []);

  const handleLoginSuccess = async (newUser: User, newToken: string) => {
    localStorage.setItem("civicflow_token", newToken);
    setUser(newUser);
    setToken(newToken);
    setActiveTab(newUser.role === "admin" ? "dashboard" : newUser.role === "teacher" ? "users" : "vote");
    await fetchGlobalData(newToken, newUser.role === "admin" || newUser.role === "teacher");
  };

  const handleLogout = () => {
    localStorage.removeItem("civicflow_token");
    setUser(null);
    setToken(null);
    setElections([]);
    setPositions([]);
    setCandidates([]);
    setUsers([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-main)] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-3xl shadow-md flex items-center justify-center text-violet-600 animate-pulse">
          <Vote size={32} />
        </div>
        <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs tracking-wider uppercase">
          <Loader2 className="animate-spin" size={14} />
          Connecting to Secure Gateway...
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          setErrorNotification={setErrorNotification}
          setSuccessNotification={setSuccessNotification}
        />
        {notification && (
          <NotificationModal
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </>
    );
  }

  const renderActiveContent = () => {
    if (dataLoading && elections.length === 0) {
      return <DashboardSkeletonPage />;
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            currentUser={user}
            users={users}
            votes={votes}
            elections={elections}
            positions={positions}
            candidates={candidates}
            onSelectTab={setActiveTab}
            token={token || ""}
            onRefreshData={handleRefreshData}
          />
        );
      case "elections":
        return (
          <ElectionTab
            elections={elections}
            onRefreshData={handleRefreshData}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            token={token}
          />
        );
      case "positions":
        return (
          <PositionsTab
            elections={elections}
            positions={positions}
            onRefreshData={handleRefreshData}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            token={token}
          />
        );
      case "candidates":
        return (
          <CandidatesTab
            elections={elections}
            positions={positions}
            candidates={candidates}
            users={users}
            votes={votes}
            onRefreshData={handleRefreshData}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            token={token}
          />
        );
      case "users":
        return (
          <UsersTab
            users={users}
            candidates={candidates}
            positions={positions}
            elections={elections}
            votes={votes}
            onRefreshData={handleRefreshData}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            token={token}
          />
        );
      case "vote":
        return user.role === "student" ? (
          <VotePage
            user={user}
            elections={elections}
            positions={positions}
            candidates={candidates}
            token={token}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            onLogout={handleLogout}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <AlertCircle size={48} className="mb-4 text-zinc-500" />
            <p className="font-display font-semibold text-zinc-900 text-xl">Not Authorized</p>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm text-center">Only students are permitted to cast votes in this election.</p>
          </div>
        );
      case "results":
        return (
          <ResultsPage
            user={user}
            elections={elections}
            positions={positions}
            candidates={candidates}
            token={token}
          />
        );
      case "calendar":
        return (
          <CalendarTab elections={elections} />
        );
      case "diagnostics":
        return (
          <DiagnosticsTab
            token={token || ""}
            currentUser={user}
            onRefreshData={handleRefreshData}
          />
        );
      case "password":
        return (
          <ChangePasswordTab
            token={token || ""}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            onSuccess={() => {
              const defaultTab = user.role === "admin" ? "dashboard" : user.role === "teacher" ? "users" : "vote";
              setActiveTab(defaultTab);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      user={user}
      onLogout={handleLogout}
      token={token}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      setErrorNotification={setErrorNotification}
      setSuccessNotification={setSuccessNotification}
      onUserUpdate={(updated) => setUser(updated)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="h-full"
        >
          {renderActiveContent()}
        </motion.div>
      </AnimatePresence>

      {notification && (
        <NotificationModal
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </AppShell>
  );
}

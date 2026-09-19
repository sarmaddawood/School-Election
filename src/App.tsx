import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Loader2, Vote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Election, Position, Candidate, Vote as VoteType, SchoolBranding } from "./types";
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
import { DashboardSkeletonPage } from "./components/Skeleton";
import BrandingTab from "./components/BrandingTab";

const defaultBranding: SchoolBranding = {
  schoolName: "Bolinao School of Fisheries",
  tagline: "Bolinao School of Fisheries Student E-Voting Portal",
  logoUrl: "/src/assets/images/bolinao_logo_1783614038890.png",
  primaryColor: "#0284c7",
  attributionText: "GWC Student-Built Election System\u2122 \u2022 \u00a9 2026 Golden West Colleges, Inc. student developers.",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [calendarDraftDate, setCalendarDraftDate] = useState<string | null>(null);
  const [branding, setBranding] = useState<SchoolBranding>(defaultBranding);



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

  useEffect(() => {
    fetch("/api/branding")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.schoolName) setBranding(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", branding.primaryColor);
  }, [branding.primaryColor]);

  const handleRefreshData = async () => {
    // Refresh logic is now delegated to individual tabs.
    // This is kept for compatibility with components that might trigger it.
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
  };

  const handleLogout = () => {
    localStorage.removeItem("civicflow_token");
    setUser(null);
    setToken(null);
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
          branding={branding}
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
    // Data is fetched at tab level now.

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            currentUser={user}
            onSelectTab={setActiveTab}
            token={token || ""}
            setErrorNotification={setErrorNotification}
          />
        );
      case "elections":
        return (
          <ElectionTab
            token={token || ''}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            
            initialDate={calendarDraftDate}
            onInitialDateConsumed={() => setCalendarDraftDate(null)}
          />
        );
      case "positions":
        return (
          <PositionsTab
            token={token || ''}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            
          />
        );
      case "candidates":
        return (
          <CandidatesTab
            token={token || ''}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            
            currentUser={user}
          />
        );
      case "users":
        return (
          <UsersTab
            token={token || ''}
            currentUser={user}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
            
          />
        );
      case "vote":
        return user.role === "student" ? (
          <VotePage
            token={token || ''}
            user={user}
            
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
            token={token || ''}
            user={user}
            
          />
        );
      case "calendar":
        return (
          <CalendarTab
            token={token || ''}
            currentUser={user}
            
            onCreateElectionAtDate={user.role === "admin" ? (date) => {
              setCalendarDraftDate(date.toISOString());
              setActiveTab("elections");
            } : undefined}
          />
        );
      case "branding":
        return user.role === "admin" ? (
          <BrandingTab
            token={token || ''}
            branding={branding}
            
            onUpdated={setBranding}
            setErrorNotification={setErrorNotification}
            setSuccessNotification={setSuccessNotification}
          />
        ) : null;
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
            token={token || ''}
      user={user}
      onLogout={handleLogout}
      
      activeTab={activeTab}
      onTabChange={setActiveTab}
      setErrorNotification={setErrorNotification}
      setSuccessNotification={setSuccessNotification}
      onUserUpdate={(updated) => setUser(updated)}
      branding={branding}
    >
      {renderActiveContent()}

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

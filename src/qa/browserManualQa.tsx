import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AppShell from "../components/AppShell";
import BrandingTab from "../components/BrandingTab";
import CalendarTab from "../components/CalendarTab";
import CandidatesTab from "../components/CandidatesTab";
import ElectionTab from "../components/ElectionTab";
import PositionsTab from "../components/PositionsTab";
import ResultsPage from "../components/ResultsPage";
import UsersTab from "../components/UsersTab";
import VotePage from "../components/VotePage";
import type { Candidate, Election, Position, SchoolBranding, User, Vote } from "../types";

declare global {
  interface Window {
    __schoolElectionQaSetRole?: (role: User["role"]) => void;
    __schoolElectionQaOriginalFetch?: typeof fetch;
  }
}

const now = Date.now();
const branding: SchoolBranding = {
  schoolName: "Bolinao School of Fisheries",
  tagline: "Bolinao School of Fisheries Student E-Voting Portal",
  logoUrl: "/src/assets/images/bolinao_logo_1783614038890.png",
  primaryColor: "#0284c7",
  attributionText: "Developed by students of Bolinao School of Fisheries.",
  contactEmail: "school@example.edu",
  address: "QA Campus",
};

const users: User[] = [
  { id: "admin-qa", studentNumber: "ADMIN-001", fullName: "QA Administrator", role: "admin", hasSetPassword: true },
  { id: "teacher-qa", studentNumber: "TEACHER-001", fullName: "QA Teacher", role: "teacher", hasSetPassword: true },
  { id: "student-10", studentNumber: "2026-001", fullName: "Alex Grade Ten", role: "student", yearLevel: 10, section: "Rizal", room: "101", hasSetPassword: true },
  { id: "student-11", studentNumber: "2026-002", fullName: "Blair Grade Eleven", role: "student", yearLevel: 11, section: "Bonifacio", room: "102", hasSetPassword: false },
  { id: "student-10b", studentNumber: "2026-003", fullName: "Casey Not Voted", role: "student", yearLevel: 10, section: "Rizal", room: "101", hasSetPassword: false },
];

const elections: Election[] = [
  { id: "school-live", title: "School Council Election", description: "School-wide major election", startsAt: new Date(now - 60 * 60_000).toISOString(), endsAt: new Date(now + 60 * 60_000).toISOString(), scope: "all", scopeValue: "", hasPartyList: true },
  { id: "grade-upcoming", title: "Grade 10 Representative", description: "Grade-scoped election", startsAt: new Date(now + 24 * 60 * 60_000).toISOString(), endsAt: new Date(now + 26 * 60 * 60_000).toISOString(), scope: "grade", scopeValue: "10", targetGradeLevel: 10, hasPartyList: false },
  { id: "room-ended", title: "Room 101 Election", description: "Completed room election", startsAt: new Date(now - 4 * 60 * 60_000).toISOString(), endsAt: new Date(now - 2 * 60 * 60_000).toISOString(), scope: "room", scopeValue: "101", targetRoom: "101", hasPartyList: false },
];

const positions: Position[] = [
  { id: "president", electionId: "school-live", name: "President" },
  { id: "grade-rep", electionId: "grade-upcoming", name: "Grade Representative" },
  { id: "room-lead", electionId: "room-ended", name: "Room Leader" },
];

const candidates: Candidate[] = [
  { id: "candidate-10", electionId: "school-live", positionId: "president", userId: "student-10", fullName: "Alex Grade Ten", manifesto: "Transparent and inclusive student leadership.", voteCount: 2, yearLevel: 10, party: "Unity", partyListId: "party-unity", partyListName: "Unity" },
  { id: "candidate-11", electionId: "school-live", positionId: "president", userId: "student-11", fullName: "Blair Grade Eleven", manifesto: "Better services for every student.", voteCount: 1, yearLevel: 11, party: "Forward", partyListId: "party-forward", partyListName: "Forward" },
  { id: "candidate-room", electionId: "room-ended", positionId: "room-lead", userId: "student-10", fullName: "Alex Grade Ten", manifesto: "A more organized room.", voteCount: 3, yearLevel: 10 },
];

const votes: Vote[] = [
  { id: "vote-1", electionId: "school-live", positionId: "president", voterId: "student-10", candidateId: "candidate-10", timestamp: new Date(now - 10_000).toISOString() },
];

function json(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
}

if (!window.__schoolElectionQaOriginalFetch) window.__schoolElectionQaOriginalFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("/api/candidates")) return json(candidates);
  if (url.startsWith("/api/elections/") && url.endsWith("/turnout")) {
    return json({
      eligibleCount: 4,
      votedCount: 1,
      turnoutPercentage: 25,
      students: users.filter((user) => user.role === "student").map((student) => ({
        ...student,
        hasVoted: student.id === "student-10",
        completedBallot: student.id === "student-10",
        votedPositionCount: student.id === "student-10" ? 1 : 0,
        totalPositionCount: 1,
      })),
    });
  }
  if (url.startsWith("/api/votes/my")) return json(votes);
  if (url.startsWith("/api/offline/credentials")) return json({ permit: "qa-permit", publicKey: "qa-public-key", nonce: "qa-nonce", issuedAt: new Date().toISOString(), electionEndsAt: elections[0].endsAt });
  if (url.startsWith("/api/partylists")) return json([
    { id: "party-unity", electionId: "school-live", name: "Unity", acronym: "UNITY" },
    { id: "party-forward", electionId: "school-live", name: "Forward", acronym: "FWD" },
  ]);
  if (url === "/api/branding" && init?.method === "PUT") return json(branding);
  if (url.startsWith("/api/votes") && init?.method === "POST") return json(votes[0], 201);
  if (url.startsWith("/api/candidates") && init?.method === "POST") return json(candidates[0], 201);
  return json({ message: "QA operation completed", url }, init?.method === "POST" ? 201 : 200);
}) as typeof fetch;

const notification = (message: string) => {
  const output = document.getElementById("qa-notification");
  if (output) output.textContent = message;
};

function Harness() {
  const [role, setRole] = useState<User["role"]>("admin");
  const [activeTab, setActiveTab] = useState("dashboard");
  const currentUser = users.find((user) => user.role === role)!;
  window.__schoolElectionQaSetRole = (nextRole) => {
    setRole(nextRole);
    setActiveTab(nextRole === "admin" ? "dashboard" : nextRole === "teacher" ? "users" : "vote");
  };

  const common = {
    token: "qa-token",
    setErrorNotification: notification,
    setSuccessNotification: notification,
  };

  let content: React.ReactNode = <div className="p-8 text-slate-700">Select a feature from the navigation.</div>;
  if (activeTab === "elections") content = <ElectionTab elections={elections} onRefreshData={async () => undefined} {...common} initialDate={null} onInitialDateConsumed={() => undefined} />;
  if (activeTab === "positions") content = <PositionsTab elections={elections} positions={positions} onRefreshData={async () => undefined} {...common} />;
  if (activeTab === "candidates") content = <CandidatesTab elections={elections} positions={positions} candidates={candidates} users={users} votes={votes} onRefreshData={async () => undefined} {...common} />;
  if (activeTab === "users") content = <UsersTab currentUser={currentUser} users={users} candidates={candidates} positions={positions} elections={elections} votes={votes} onRefreshData={async () => undefined} {...common} />;
  if (activeTab === "results") content = <ResultsPage user={currentUser} elections={elections} positions={positions} candidates={candidates} token="qa-token" />;
  if (activeTab === "calendar") content = <CalendarTab elections={elections} currentUser={currentUser} onCreateElectionAtDate={role === "admin" ? () => setActiveTab("elections") : undefined} />;
  if (activeTab === "branding") content = <BrandingTab branding={branding} token="qa-token" onUpdated={() => undefined} setErrorNotification={notification} setSuccessNotification={notification} />;
  if (activeTab === "vote") content = <VotePage user={currentUser} elections={elections} positions={positions} candidates={candidates} token="qa-token" setErrorNotification={notification} setSuccessNotification={notification} onLogout={() => undefined} />;

  return (
    <>
      <div className="fixed top-2 right-2 z-[200] flex gap-1 rounded-lg bg-slate-950 p-2 text-white shadow-xl">
        {(["admin", "teacher", "student"] as const).map((value) => <button key={value} type="button" onClick={() => window.__schoolElectionQaSetRole?.(value)} className="rounded bg-sky-700 px-2 py-1 text-[10px] font-bold uppercase">{value}</button>)}
        <span id="qa-notification" className="max-w-64 px-2 text-[10px] text-amber-300" />
      </div>
      <AppShell user={currentUser} onLogout={() => undefined} token="qa-token" activeTab={activeTab} onTabChange={setActiveTab} setErrorNotification={notification} setSuccessNotification={notification} branding={branding}>
        {content}
      </AppShell>
    </>
  );
}

document.getElementById("root")?.remove();
const qaRoot = document.createElement("div");
qaRoot.id = "qa-root";
document.body.appendChild(qaRoot);
createRoot(qaRoot).render(<Harness />);

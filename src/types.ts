export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  studentNumber: string; // Unique Student Number used for login
  username?: string; // Legacy read compatibility only; never used for authentication
  fullName: string;
  role: UserRole;
  yearLevel?: number; // Grade level e.g. 7, 8, 9, 10, 11, 12
  section?: string; // Class / Section e.g. "Rizal", "Gold", "A"
  room?: string; // Designated voting room e.g. "Room 101", "Lab 2"
  hasSetPassword?: boolean; // False if imported without password -> triggers first-time setup
  photoUrl?: string;
}

export type ElectionScope = "all" | "grade" | "section" | "room";

export interface Election {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  scope?: ElectionScope;
  scopeValue?: string;
  hasPartyList?: boolean;
  targetGradeLevel?: number;
  targetSection?: string;
  targetRoom?: string;
  hasPartyListSupport?: boolean;
}

export interface Position {
  id: string;
  electionId: string;
  name: string;
}

export interface PartyList {
  id: string;
  electionId: string;
  name: string;
  acronym?: string;
  logoUrl?: string;
  advocacy?: string;
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  userId: string;
  fullName: string;
  manifesto: string;
  voteCount: number;
  yearLevel?: number;
  party?: string;
  partyListId?: string;
  partyListName?: string;
  photoUrl?: string;
}

export interface Vote {
  id: string;
  electionId: string;
  positionId: string;
  voterId: string;
  candidateId: string;
  timestamp?: string;
  isOfflineImport?: boolean;
}

export interface OfflineBallot {
  version: 1;
  algorithm: "ECDH-P256/HKDF-SHA256/AES-256-GCM";
  ephemeralPublicKey: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface OfflineBallotCredential {
  permit: string;
  publicKey: string;
  nonce: string;
  issuedAt: string;
  electionEndsAt: string;
}

export interface SchoolBranding {
  schoolName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  attributionText: string;
  contactEmail?: string;
  address?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  details: string;
}

export type ElectionPhase = "upcoming" | "live" | "ended";

export interface AuthState {
  user: User | null;
  token: string | null;
}


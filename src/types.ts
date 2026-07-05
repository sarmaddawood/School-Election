export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
}

export interface Position {
  id: string;
  electionId: string;
  name: string;
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  userId: string;
  fullName: string;
  manifesto: string;
  voteCount: number;
}

export interface Vote {
  id: string;
  electionId: string;
  positionId: string;
  voterId: string;
  candidateId: string;
}

export type ElectionPhase = "upcoming" | "live" | "ended";

export interface AuthState {
  user: User | null;
  token: string | null;
}

import crypto from "crypto";

export type UserRole = "admin" | "teacher" | "student";
export type ElectionScope = "all" | "grade" | "section" | "room";

export interface ElectionLike {
  id?: string;
  startsAt: string;
  endsAt: string;
  scope?: ElectionScope;
  scopeValue?: string | null;
  targetGradeLevel?: number | null;
  targetSection?: string | null;
  targetRoom?: string | null;
}

export interface UserLike {
  id: string;
  studentNumber?: string | null;
  role: UserRole;
  yearLevel?: number | null;
  section?: string | null;
  room?: string | null;
}



export interface DatabaseSnapshot {
  users: any[];
  elections: any[];
  positions: any[];
  candidates: any[];
  votes: any[];
  partyLists: any[];
}

const PASSWORD_PREFIX = "scrypt";
const TOKEN_VERSION = 1;

export function normalizeStudentNumber(value: unknown): string {
  const str = String(value ?? "").trim().replace(/\s+/g, "");
  if (str.includes("@")) {
    return str.toLowerCase();
  }
  return str.toUpperCase();
}

export function validateStudentNumber(value: unknown): string | null {
  const normalized = normalizeStudentNumber(value);
  if (!normalized) return "Student Number or Email is required";
  return null;
}

export function validatePassword(password: unknown): string | null {
  const value = String(password ?? "");
  if (!value || !value.trim()) return "Password cannot be empty";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return password;
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
  if (!storedValue) return false;
  if (password === storedValue) return true;

  if (storedValue.startsWith(`${PASSWORD_PREFIX}$`)) {
    const [, saltValue, hashValue] = storedValue.split("$");
    if (!saltValue || !hashValue) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, expected.length, (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      });
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  const supplied = Buffer.from(password);
  const stored = Buffer.from(storedValue);
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
}

function signEncodedBody(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSignedToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    v: TOKEN_VERSION,
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  })).toString("base64url");
  return `${body}.${signEncodedBody(body, secret)}`;
}

export function verifySignedToken<T extends Record<string, unknown>>(
  token: string,
  secret: string,
  expectedPurpose: string,
): T | null {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = signEncodedBody(body, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.v !== TOKEN_VERSION || decoded.purpose !== expectedPurpose) return null;
    if (!Number.isFinite(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded as T;
  } catch {
    return null;
  }
}

export function getElectionPhase(election: ElectionLike, now = new Date()): "upcoming" | "live" | "ended" {
  const startsAt = new Date(election.startsAt);
  const endsAt = new Date(election.endsAt);
  if (now < startsAt) return "upcoming";
  if (now <= endsAt) return "live";
  return "ended";
}

export function canViewElectionResults(role: UserRole, election: ElectionLike, now = new Date()): boolean {
  return role === "admin" || role === "teacher" || getElectionPhase(election, now) === "ended";
}

function normalizeScopeString(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function stripSectionPrefix(value: string): string {
  return value.replace(/^grade\s*\d+\s*[-–—:]\s*/i, "").trim();
}

function stripRoomPrefix(value: string): string {
  return value.replace(/^room\s*/i, "").trim();
}

export function isEligibleForElection(user: UserLike, election: ElectionLike): boolean {
  if (user.role !== "student") return false;
  const scope = election.scope || "all";
  const scopeValue = election.scopeValue;

  if (scope === "grade") {
    const rawGrade = election.targetGradeLevel ?? scopeValue;
    const grade = typeof rawGrade === "number" ? rawGrade : Number.parseInt(String(rawGrade ?? "").replace(/\D+/g, ""), 10);
    return Number.isFinite(grade) && user.yearLevel === grade;
  }
  if (scope === "section") {
    const section = election.targetSection || scopeValue;
    if (!section || !user.section) return false;
    const uSec = normalizeScopeString(user.section);
    const eSec = normalizeScopeString(section);
    return uSec === eSec || stripSectionPrefix(uSec) === stripSectionPrefix(eSec);
  }
  if (scope === "room") {
    const room = election.targetRoom || scopeValue;
    if (!room || !user.room) return false;
    const uRoom = normalizeScopeString(user.room);
    const eRoom = normalizeScopeString(room);
    return uRoom === eRoom || stripRoomPrefix(uRoom) === stripRoomPrefix(eRoom);
  }
  return true;
}

export function validateElectionInput(input: Record<string, unknown>): string | null {
  const title = String(input.title ?? "").trim();
  if (!title) return "Election title is required";
  if (title.length > 255) return "Election title must not exceed 255 characters";

  const start = new Date(String(input.startsAt ?? ""));
  const end = new Date(String(input.endsAt ?? ""));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return "Valid start and end dates are required";
  }
  if (end <= start) return "End date must be after the start date";

  const scope = String(input.scope || "all") as ElectionScope;
  if (!["all", "grade", "section", "room"].includes(scope)) return "Invalid election scope";
  const scopeValue = String(input.scopeValue ?? "").trim();
  if (scope !== "all" && !scopeValue) return `A target ${scope} is required`;
  if (scopeValue.length > 255) return "Election scope target must not exceed 255 characters";
  if (scope === "grade") {
    const grade = Number.parseInt(scopeValue.replace(/\D+/g, ""), 10);
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) return "Grade must be between 1 and 12";
  }
  if (Boolean(input.hasPartyList) && scope !== "all") {
    return "Party-List support is available only for school-wide elections";
  }
  return null;
}

export function effectiveVoteDocumentId(electionId: string, positionId: string, voterId: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${electionId}\u0000${positionId}\u0000${voterId}`)
    .digest("hex")
    .slice(0, 32);
  return `v_${digest}`;
}

export function studentDocumentId(studentNumber: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(normalizeStudentNumber(studentNumber))
    .digest("hex")
    .slice(0, 32);
  return `u_${digest}`;
}

export function validateDatabaseSnapshot(snapshot: DatabaseSnapshot): string[] {
  const errors: string[] = [];
  const users = new Map(snapshot.users.map((record) => [record.id, record]));
  const elections = new Map(snapshot.elections.map((record) => [record.id, record]));
  const positions = new Map(snapshot.positions.map((record) => [record.id, record]));
  const candidates = new Map(snapshot.candidates.map((record) => [record.id, record]));
  const effectiveVotes = new Set<string>();
  const nominations = new Set<string>();

  for (const user of snapshot.users) {
    const numberError = validateStudentNumber(user.studentNumber);
    if (numberError) errors.push(`User ${user.id}: ${numberError}`);
    if (!String(user.fullName || "").trim()) errors.push(`User ${user.id}: Full Name is required`);
    if (!["admin", "teacher", "student"].includes(user.role)) errors.push(`User ${user.id}: invalid role`);
    if (user.role === "student" && (!Number.isInteger(user.yearLevel) || user.yearLevel < 1 || user.yearLevel > 12)) {
      errors.push(`User ${user.id}: student grade must be between 1 and 12`);
    }
  }

  for (const election of snapshot.elections) {
    const error = validateElectionInput(election);
    if (error) errors.push(`Election ${election.id}: ${error}`);
  }

  for (const position of snapshot.positions) {
    if (!elections.has(position.electionId)) errors.push(`Position ${position.id}: election does not exist`);
    if (!String(position.name || "").trim()) errors.push(`Position ${position.id}: name is required`);
  }

  for (const partyList of snapshot.partyLists) {
    const election = elections.get(partyList.electionId);
    if (!election) errors.push(`Party-List ${partyList.id}: election does not exist`);
    else if (election.scope !== "all" || election.hasPartyList !== true) errors.push(`Party-List ${partyList.id}: election does not allow Party-Lists`);
  }

  for (const candidate of snapshot.candidates) {
    const election = elections.get(candidate.electionId);
    const position = positions.get(candidate.positionId);
    const user = users.get(candidate.userId);
    const nominationKey = `${candidate.positionId}\u0000${candidate.userId}`;
    if (nominations.has(nominationKey)) errors.push(`Candidate ${candidate.id}: student is already nominated for the position`);
    nominations.add(nominationKey);
    if (!election) errors.push(`Candidate ${candidate.id}: election does not exist`);
    if (!position || position.electionId !== candidate.electionId) errors.push(`Candidate ${candidate.id}: position does not belong to election`);
    if (!user || user.role !== "student") errors.push(`Candidate ${candidate.id}: nominated user is not a student`);
    else if (election && !isEligibleForElection(user, election)) errors.push(`Candidate ${candidate.id}: student is outside the election scope`);
    if (candidate.partyListId) {
      const partyList = snapshot.partyLists.find((record) => record.id === candidate.partyListId);
      if (!partyList || partyList.electionId !== candidate.electionId) errors.push(`Candidate ${candidate.id}: invalid Party-List`);
    }
  }

  for (const vote of snapshot.votes) {
    const election = elections.get(vote.electionId);
    const position = positions.get(vote.positionId);
    const candidate = candidates.get(vote.candidateId);
    const voter = users.get(vote.voterId);
    const key = `${vote.electionId}\u0000${vote.positionId}\u0000${vote.voterId}`;
    if (effectiveVotes.has(key)) errors.push(`Vote ${vote.id}: duplicate effective vote`);
    effectiveVotes.add(key);
    const voteTime = new Date(vote.timestamp).getTime();
    if (!Number.isFinite(voteTime)) errors.push(`Vote ${vote.id}: invalid timestamp`);
    else if (election && (voteTime < new Date(election.startsAt).getTime() || voteTime > new Date(election.endsAt).getTime())) {
      errors.push(`Vote ${vote.id}: timestamp is outside the election window`);
    }
    if (!election) errors.push(`Vote ${vote.id}: election does not exist`);
    if (!position || position.electionId !== vote.electionId) errors.push(`Vote ${vote.id}: invalid position`);
    if (!candidate || candidate.positionId !== vote.positionId || candidate.electionId !== vote.electionId) errors.push(`Vote ${vote.id}: invalid candidate`);
    if (!voter || voter.role !== "student") errors.push(`Vote ${vote.id}: voter is not a student`);
    else if (election && !isEligibleForElection(voter, election)) errors.push(`Vote ${vote.id}: voter is outside the election scope`);
  }

  return errors;
}


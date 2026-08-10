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

export interface OfflinePermit {
  voterId: string;
  studentNumber: string;
  electionId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
}

export interface OfflineBallotPayload {
  voterId: string;
  studentNumber: string;
  electionId: string;
  votes: Array<{ positionId: string; candidateId: string }>;
  timestamp: string;
  nonce: string;
  permit: string;
}

export interface EncryptedOfflineBallot {
  version: 1;
  algorithm: "ECDH-P256/HKDF-SHA256/AES-256-GCM";
  ephemeralPublicKey: string;
  salt: string;
  iv: string;
  ciphertext: string;
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
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export function validateStudentNumber(value: unknown): string | null {
  const normalized = normalizeStudentNumber(value);
  if (!normalized) return "Student Number is required";
  if (normalized.length < 3 || normalized.length > 64) {
    return "Student Number must be between 3 and 64 characters";
  }
  if (!/^[A-Z0-9._-]+$/.test(normalized)) {
    return "Student Number may contain only letters, numbers, periods, dashes, and underscores";
  }
  return null;
}

export function validatePassword(password: unknown): string | null {
  const value = String(password ?? "");
  if (value.length < 8) return "Password must contain at least 8 characters";
  if (value.length > 128) return "Password must not exceed 128 characters";
  if (!value.trim()) return "Password must contain at least one non-space character";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
  return `${PASSWORD_PREFIX}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
  if (!storedValue) return false;

  // Existing installations stored plaintext passwords. A successful legacy login
  // is upgraded by the caller immediately after verification.
  if (!storedValue.startsWith(`${PASSWORD_PREFIX}$`)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedValue);
    return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
  }

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

function normalizedComparison(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function isEligibleForElection(user: UserLike, election: ElectionLike): boolean {
  if (user.role !== "student") return false;
  const scope = election.scope || "all";
  const scopeValue = election.scopeValue;

  if (scope === "grade") {
    const grade = election.targetGradeLevel ?? Number.parseInt(String(scopeValue ?? ""), 10);
    return Number.isFinite(grade) && user.yearLevel === grade;
  }
  if (scope === "section") {
    const section = election.targetSection || scopeValue;
    return Boolean(section) && normalizedComparison(user.section) === normalizedComparison(section);
  }
  if (scope === "room") {
    const room = election.targetRoom || scopeValue;
    return Boolean(room) && normalizedComparison(user.room) === normalizedComparison(room);
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
    const grade = Number.parseInt(scopeValue, 10);
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

export function createOfflinePermit(
  permit: OfflinePermit,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(permit)).toString("base64url");
  return `${body}.${signEncodedBody(body, secret)}`;
}

export function verifyOfflinePermit(token: string, secret: string): OfflinePermit | null {
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
    const permit = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OfflinePermit;
    if (!permit.voterId || !permit.studentNumber || !permit.electionId || !permit.nonce || !permit.issuedAt || !permit.expiresAt) return null;
    const issuedAt = new Date(permit.issuedAt).getTime();
    const expiresAt = new Date(permit.expiresAt).getTime();
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt || expiresAt < Date.now()) return null;
    if (issuedAt > Date.now() + 5 * 60 * 1000) return null;
    return permit;
  } catch {
    return null;
  }
}

function getEcdhPrivateKey(secret: string): Buffer {
  // P-256 rejects an extremely small set of 256-bit values. Rehash with a
  // counter if one is encountered so configuration remains deterministic.
  for (let counter = 0; counter < 16; counter += 1) {
    const candidate = crypto.createHash("sha256").update(`${secret}:offline-ecdh:${counter}`).digest();
    try {
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(candidate);
      return candidate;
    } catch {
      // Try the next deterministic candidate.
    }
  }
  throw new Error("Unable to derive offline ballot encryption key");
}

export function getOfflineEncryptionPublicKey(secret: string): string {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(getEcdhPrivateKey(secret));
  return ecdh.getPublicKey(undefined, "uncompressed").toString("base64");
}

export function decryptOfflineBallot(
  envelope: EncryptedOfflineBallot,
  secret: string,
): OfflineBallotPayload {
  if (
    envelope?.version !== 1 ||
    envelope?.algorithm !== "ECDH-P256/HKDF-SHA256/AES-256-GCM"
  ) throw new Error("Unsupported offline ballot format");

  if (
    typeof envelope.ephemeralPublicKey !== "string" || envelope.ephemeralPublicKey.length > 256 ||
    typeof envelope.salt !== "string" || envelope.salt.length > 256 ||
    typeof envelope.iv !== "string" || envelope.iv.length > 128 ||
    typeof envelope.ciphertext !== "string" || envelope.ciphertext.length > 350_000
  ) throw new Error("Offline ballot envelope is malformed or too large");

  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(getEcdhPrivateKey(secret));
  const ephemeralPublicKey = Buffer.from(envelope.ephemeralPublicKey, "base64");
  const salt = Buffer.from(envelope.salt, "base64");
  const iv = Buffer.from(envelope.iv, "base64");
  if (ephemeralPublicKey.length !== 65 || salt.length < 16 || salt.length > 64 || iv.length !== 12) {
    throw new Error("Offline ballot cryptographic parameters are invalid");
  }
  const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);
  const key = Buffer.from(crypto.hkdfSync("sha256", sharedSecret, salt, Buffer.from("school-election-offline-ballot-v1"), 32));
  const encrypted = Buffer.from(envelope.ciphertext, "base64");
  if (encrypted.length < 17) throw new Error("Offline ballot ciphertext is invalid");
  const tag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as OfflineBallotPayload;
}

import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  canViewElectionResults,
  createOfflinePermit,
  createSignedToken,
  decryptOfflineBallot,
  effectiveVoteDocumentId,
  getElectionPhase,
  getOfflineEncryptionPublicKey,
  hashPassword,
  isEligibleForElection,
  normalizeStudentNumber,
  studentDocumentId,
  validateDatabaseSnapshot,
  validateElectionInput,
  validatePassword,
  validateStudentNumber,
  verifyOfflinePermit,
  verifyPassword,
  verifySignedToken,
} from "../server/domain";

const secret = "test-secret-with-at-least-thirty-two-bytes";

test("Student Numbers are canonical and login-safe", () => {
  assert.equal(normalizeStudentNumber(" 2026- 001 "), "2026-001");
  assert.equal(normalizeStudentNumber("abc_01"), "ABC_01");
  assert.equal(validateStudentNumber("2026-001"), null);
  assert.match(validateStudentNumber("bad@student") || "", /only letters/i);
});

test("password validation rejects short, blank, and oversized values", () => {
  assert.match(validatePassword("short") || "", /at least 8/i);
  assert.match(validatePassword("        ") || "", /non-space/i);
  assert.match(validatePassword("x".repeat(129)) || "", /128/i);
  assert.equal(validatePassword("valid password"), null);
});

test("eligibility enforces grade, section, room, and student role", () => {
  const student = { id: "s1", role: "student" as const, yearLevel: 10, section: "Rizal", room: "Room 204" };
  const base = { startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z" };
  assert.equal(isEligibleForElection(student, { ...base, scope: "all" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", scopeValue: "10" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", scopeValue: "11" }), false);
  assert.equal(isEligibleForElection(student, { ...base, scope: "section", scopeValue: "rizal" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "room", scopeValue: "room 204" }), true);
  assert.equal(isEligibleForElection({ ...student, role: "teacher" }, { ...base, scope: "all" }), false);
});

test("database integrity validation checks references, eligibility, and duplicate effective votes", () => {
  const snapshot = {
    users: [
      { id: "admin", studentNumber: "ADMIN-1", fullName: "Admin", role: "admin" },
      { id: "s1", studentNumber: "2026-001", fullName: "Student", role: "student", yearLevel: 10, section: "Rizal", room: "101" },
    ],
    elections: [{ id: "e1", title: "Grade 10", startsAt: "2026-08-10T08:00:00.000Z", endsAt: "2026-08-10T17:00:00.000Z", scope: "grade" as const, scopeValue: "10", hasPartyList: false }],
    positions: [{ id: "p1", electionId: "e1", name: "President" }],
    candidates: [{ id: "c1", electionId: "e1", positionId: "p1", userId: "s1" }],
    votes: [{ id: "v1", electionId: "e1", positionId: "p1", voterId: "s1", candidateId: "c1", timestamp: "2026-08-10T12:00:00.000Z" }],
    partyLists: [],
  };
  assert.deepEqual(validateDatabaseSnapshot(snapshot), []);

  const invalid = {
    ...snapshot,
    votes: [
      ...snapshot.votes,
      { id: "v2", electionId: "e1", positionId: "p1", voterId: "s1", candidateId: "missing", timestamp: "2026-08-10T12:01:00.000Z" },
    ],
  };
  const errors = validateDatabaseSnapshot(invalid);
  assert.ok(errors.some((error) => /duplicate effective vote/i.test(error)));
  assert.ok(errors.some((error) => /invalid candidate/i.test(error)));
});

test("election validation rejects invalid windows and scoped Party-Lists", () => {
  const valid = { title: "Council", startsAt: "2026-01-01T08:00:00Z", endsAt: "2026-01-01T17:00:00Z", scope: "all" };
  assert.equal(validateElectionInput(valid), null);
  assert.match(validateElectionInput({ ...valid, endsAt: valid.startsAt }) || "", /after/i);
  assert.match(validateElectionInput({ ...valid, scope: "grade", scopeValue: "13" }) || "", /grade/i);
  assert.match(validateElectionInput({ ...valid, scope: "room", scopeValue: "204", hasPartyList: true }) || "", /school-wide/i);
  assert.match(validateElectionInput({ ...valid, scope: "section", scopeValue: "A".repeat(256) }) || "", /255/i);
});

test("election phases use exact start and end boundaries", () => {
  const election = { startsAt: "2026-08-10T08:00:00.000Z", endsAt: "2026-08-10T17:00:00.000Z" };
  assert.equal(getElectionPhase(election, new Date("2026-08-10T07:59:59.999Z")), "upcoming");
  assert.equal(getElectionPhase(election, new Date(election.startsAt)), "live");
  assert.equal(getElectionPhase(election, new Date(election.endsAt)), "live");
  assert.equal(getElectionPhase(election, new Date("2026-08-10T17:00:00.001Z")), "ended");
});

test("result visibility seals live tallies from students but not staff", () => {
  const election = { startsAt: "2026-08-10T08:00:00.000Z", endsAt: "2026-08-10T17:00:00.000Z" };
  const live = new Date("2026-08-10T12:00:00.000Z");
  const ended = new Date("2026-08-10T17:00:00.001Z");
  assert.equal(canViewElectionResults("student", election, live), false);
  assert.equal(canViewElectionResults("teacher", election, live), true);
  assert.equal(canViewElectionResults("admin", election, live), true);
  assert.equal(canViewElectionResults("student", election, ended), true);
});

test("passwords are salted, hashed, and verified", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.notEqual(hash, await hashPassword("correct horse battery staple"));
});

test("signed tokens reject tampering and wrong purposes", () => {
  const token = createSignedToken({ purpose: "session", sub: "student-1" }, secret, 60);
  assert.equal(verifySignedToken<{ sub: string }>(token, secret, "session")?.sub, "student-1");
  assert.equal(verifySignedToken(token, secret, "password-setup"), null);
  assert.equal(verifySignedToken(`${token}x`, secret, "session"), null);
});

test("effective vote IDs enforce one record per election, position, and voter", () => {
  const first = effectiveVoteDocumentId("e1", "p1", "s1");
  assert.equal(first, effectiveVoteDocumentId("e1", "p1", "s1"));
  assert.notEqual(first, effectiveVoteDocumentId("e1", "p2", "s1"));
  assert.ok(first.length <= 36);
  assert.equal(studentDocumentId("2026-001"), studentDocumentId(" 2026-001 "));
  assert.notEqual(studentDocumentId("2026-001"), studentDocumentId("2026-002"));
});

test("encrypted offline ballot round-trips and rejects ciphertext tampering", () => {
  const permitData = {
    voterId: "s1",
    studentNumber: "2026-001",
    electionId: "e1",
    issuedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    nonce: "nonce-1",
  };
  const permit = createOfflinePermit(permitData, secret);
  assert.deepEqual(verifyOfflinePermit(permit, secret), permitData);
  assert.equal(verifyOfflinePermit(`${permit}x`, secret), null);

  const serverPublic = Buffer.from(getOfflineEncryptionPublicKey(secret), "base64");
  const ephemeral = crypto.createECDH("prime256v1");
  ephemeral.generateKeys();
  const sharedSecret = ephemeral.computeSecret(serverPublic);
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(crypto.hkdfSync("sha256", sharedSecret, salt, Buffer.from("school-election-offline-ballot-v1"), 32));
  const payload = { ...permitData, votes: [{ positionId: "p1", candidateId: "c1" }], timestamp: new Date().toISOString(), permit };
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final(), cipher.getAuthTag()]);
  const envelope = {
    version: 1 as const,
    algorithm: "ECDH-P256/HKDF-SHA256/AES-256-GCM" as const,
    ephemeralPublicKey: ephemeral.getPublicKey().toString("base64"),
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  assert.deepEqual(decryptOfflineBallot(envelope, secret), payload);
  const tampered = Buffer.from(envelope.ciphertext, "base64");
  tampered[0] ^= 1;
  assert.throws(() => decryptOfflineBallot({ ...envelope, ciphertext: tampered.toString("base64") }, secret));
  assert.throws(() => decryptOfflineBallot({ ...envelope, iv: Buffer.alloc(2).toString("base64") }, secret), /parameters/i);
  assert.throws(() => decryptOfflineBallot({ ...envelope, ciphertext: "A".repeat(350_001) }, secret), /too large/i);
});

test("offline permits reject expired and impossible time windows", () => {
  const expired = createOfflinePermit({
    voterId: "s1",
    studentNumber: "2026-001",
    electionId: "e1",
    issuedAt: new Date(Date.now() - 120_000).toISOString(),
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    nonce: "expired",
  }, secret);
  assert.equal(verifyOfflinePermit(expired, secret), null);

  const backwards = createOfflinePermit({
    voterId: "s1",
    studentNumber: "2026-001",
    electionId: "e1",
    issuedAt: new Date(Date.now() + 120_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    nonce: "backwards",
  }, secret);
  assert.equal(verifyOfflinePermit(backwards, secret), null);
});

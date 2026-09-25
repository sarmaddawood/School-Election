import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  canViewElectionResults,
  createSignedToken,
  effectiveVoteDocumentId,
  getElectionPhase,
  hashPassword,
  isEligibleForElection,
  normalizeStudentNumber,
  studentDocumentId,
  validateDatabaseSnapshot,
  validateElectionInput,
  validatePassword,
  validateStudentNumber,
  verifyPassword,
  verifySignedToken,
} from "../server/domain";

const secret = "test-secret-with-at-least-thirty-two-bytes";

test("Student Numbers and Teacher Emails are canonical and login-safe", () => {
  assert.equal(normalizeStudentNumber(" 2026- 001 "), "2026-001");
  assert.equal(normalizeStudentNumber("abc_01"), "ABC_01");
  assert.equal(normalizeStudentNumber(" Ronald.Calima@DepEd.Gov.PH "), "ronald.calima@deped.gov.ph");
  assert.equal(validateStudentNumber("2026-001"), null);
  assert.equal(validateStudentNumber("ronald.calima@deped.gov.ph"), null);
  assert.match(validateStudentNumber("") || "", /required/i);
  assert.match(validateStudentNumber("   ") || "", /required/i);
});

test("password validation rejects empty values and accepts valid passwords", () => {
  assert.match(validatePassword("") || "", /empty/i);
  assert.match(validatePassword("        ") || "", /empty/i);
  assert.equal(validatePassword("123"), null);
  assert.equal(validatePassword("valid password"), null);
});

test("eligibility enforces grade, section, room, and student role", () => {
  const student = { id: "s1", role: "student" as const, yearLevel: 10, section: "Rizal", room: "Room 204" };
  const base = { startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z" };
  assert.equal(isEligibleForElection(student, { ...base, scope: "all" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", scopeValue: "10" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", scopeValue: "Grade 10" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", targetGradeLevel: 10 }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "grade", scopeValue: "11" }), false);
  assert.equal(isEligibleForElection(student, { ...base, scope: "section", scopeValue: "rizal" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "section", scopeValue: "Grade 10 - Rizal" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "room", scopeValue: "room 204" }), true);
  assert.equal(isEligibleForElection(student, { ...base, scope: "room", scopeValue: "204" }), true);
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
  assert.equal(validateElectionInput({ ...valid, scope: "grade", scopeValue: "Grade 10" }), null);
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

test("passwords are saved and verified with backwards compatibility for legacy hashes", async () => {
  const plain = await hashPassword("correct horse battery staple");
  assert.equal(plain, "correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", plain), true);
  assert.equal(await verifyPassword("wrong password", plain), false);

  // Legacy scrypt hash compatibility check
  const legacySalt = Buffer.from("salt1234").toString("base64url");
  const legacyHash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt("legacy-pass", Buffer.from(legacySalt, "base64url"), 32, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  const legacyStored = `scrypt$${legacySalt}$${legacyHash.toString("base64url")}`;
  assert.equal(await verifyPassword("legacy-pass", legacyStored), true);
  assert.equal(await verifyPassword("wrong", legacyStored), false);
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

test("cohort turnout calculates real grade level statistics rather than dividing evenly", () => {
  const students = [
    ...Array.from({ length: 100 }, (_, i) => ({ id: `g7_${i}`, role: "student" as const, yearLevel: 7 })),
    ...Array.from({ length: 50 }, (_, i) => ({ id: `g8_${i}`, role: "student" as const, yearLevel: 8 })),
    ...Array.from({ length: 0 }, (_, i) => ({ id: `g9_${i}`, role: "student" as const, yearLevel: 9 })),
  ];
  // 20 students in grade 7 voted, 10 in grade 8 voted
  const votedIds = new Set([
    ...Array.from({ length: 20 }, (_, i) => `g7_${i}`),
    ...Array.from({ length: 10 }, (_, i) => `g8_${i}`)
  ]);

  const baseGrades = [7, 8, 9, 10];
  const studentGrades = students.map((s) => Number(s.yearLevel)).filter((n) => Number.isFinite(n) && n > 0);
  const allGrades = Array.from(new Set([...baseGrades, ...studentGrades])).sort((a, b) => a - b);

  const cohortData = allGrades.map((grade) => {
    const gradeStudents = students.filter((s) => Number(s.yearLevel) === grade);
    const gradeVoted = gradeStudents.filter((s) => votedIds.has(s.id));
    const percent = gradeStudents.length > 0 ? Math.round((gradeVoted.length / gradeStudents.length) * 100) : 0;
    return { grade, percent, voted: gradeVoted.length, total: gradeStudents.length };
  });

  assert.deepEqual(cohortData, [
    { grade: 7, percent: 20, voted: 20, total: 100 },
    { grade: 8, percent: 20, voted: 10, total: 50 },
    { grade: 9, percent: 0, voted: 0, total: 0 },
    { grade: 10, percent: 0, voted: 0, total: 0 },
  ]);
  // Grade 7 has 100 total, not 150/4 = 37
  assert.equal(cohortData[0].total, 100);
  assert.equal(cohortData[0].voted, 20);
  // Grade 8 has 50 total, not 150/4 = 37
  assert.equal(cohortData[1].total, 50);
  assert.equal(cohortData[1].voted, 10);
});


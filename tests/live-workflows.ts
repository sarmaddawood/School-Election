import assert from "node:assert/strict";

const BASE_URL = "http://127.0.0.1:3000";
const TEST_PASSWORD = "password123";
const suffix = Date.now().toString(36).toUpperCase();
const createdElectionIds: string[] = [];
const createdUserIds: string[] = [];
const checks: string[] = [];

type ApiResult = { status: number; body: any };

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body };
}

function expect(result: ApiResult, status: number, label: string): any {
  assert.equal(result.status, status, `${label}: expected ${status}, received ${result.status}: ${JSON.stringify(result.body)}`);
  checks.push(label);
  return result.body;
}

async function login(studentNumber: string, password = TEST_PASSWORD): Promise<any> {
  return expect(await api("/api/auth/login", {
    method: "POST",
    body: { studentNumber, password },
  }), 200, `Student Number login works for ${studentNumber}`);
}

async function createElection(token: string, body: any): Promise<any> {
  const election = expect(await api("/api/elections", { method: "POST", token, body }), 201, `Create ${body.scope} election`);
  createdElectionIds.push(election.id);
  return election;
}

const health = expect(await api("/api/health"), 200, "Live Appwrite health check");
assert.equal(health.database, "appwrite");

const admin = await login("ADMIN");
const teacher = await login("TEACHER1");
const adminToken = admin.token;
const teacherToken = teacher.token;
let originalBranding: any = null;

try {
  expect(await api("/api/elections", { token: "invalid" }), 401, "Invalid sessions are rejected");

  const bulkPayload = [
    { studentNumber: `QA-${suffix}-A`, fullName: "QA Student Alpha", yearLevel: 10, section: "Rizal", room: "101" },
    { studentNumber: `QA-${suffix}-B`, fullName: "QA Student Beta", yearLevel: 10, section: "Rizal", room: "101" },
    { studentNumber: `QA-${suffix}-C`, fullName: "QA Student Gamma", yearLevel: 11, section: "Mabini", room: "202" },
    { studentNumber: `QA-${suffix}-A`, fullName: "Duplicate QA Student", yearLevel: 10, section: "Rizal", room: "101" },
  ];
  const bulk = expect(await api("/api/users/bulk", { method: "POST", token: teacherToken, body: { users: bulkPayload } }), 201, "Teacher bulk-imports students without passwords");
  assert.equal(bulk.createdCount, 3);
  assert.equal(bulk.errors.length, 1);
  assert.ok(bulk.users.every((user: any) => user.hasSetPassword === false && !("password" in user)));
  createdUserIds.push(...bulk.users.map((user: any) => user.id));
  const [alpha, beta, gamma] = bulk.users;

  expect(await api("/api/users", {
    method: "POST",
    token: adminToken,
    body: { ...bulkPayload[0], role: "student" },
  }), 409, "Duplicate Student Number is blocked by the backend");

  const firstLogin = expect(await api("/api/auth/login", {
    method: "POST",
    body: { studentNumber: alpha.studentNumber, password: "" },
  }), 200, "First login detects an account without a password");
  assert.equal(firstLogin.needsPasswordSetup, true);
  const alphaSetup = expect(await api("/api/auth/setup-password", {
    method: "POST",
    body: { setupToken: firstLogin.setupToken, newPassword: TEST_PASSWORD },
  }), 200, "First-time student creates a password");
  const alphaToken = alphaSetup.token;

  const betaFirstLogin = expect(await api("/api/auth/login", {
    method: "POST",
    body: { studentNumber: beta.studentNumber, password: "" },
  }), 200, "Second imported student reaches first-login setup");
  const betaSetup = expect(await api("/api/auth/setup-password", {
    method: "POST",
    body: { setupToken: betaFirstLogin.setupToken, newPassword: TEST_PASSWORD },
  }), 200, "Second imported student creates a password");
  const betaToken = betaSetup.token;

  const gammaFirstLogin = expect(await api("/api/auth/login", {
    method: "POST",
    body: { studentNumber: gamma.studentNumber, password: "" },
  }), 200, "Third imported student reaches first-login setup");
  const gammaSetup = expect(await api("/api/auth/setup-password", {
    method: "POST",
    body: { setupToken: gammaFirstLogin.setupToken, newPassword: TEST_PASSWORD },
  }), 200, "Third imported student creates a password");
  const gammaToken = gammaSetup.token;

  const futureStart = new Date(Date.now() + 10 * 60_000).toISOString();
  const futureEnd = new Date(Date.now() + 70 * 60_000).toISOString();
  const common = { description: "Disposable live workflow verification", startsAt: futureStart, endsAt: futureEnd, hasPartyList: false };
  const gradeElection = await createElection(adminToken, { ...common, title: `QA Grade ${suffix}`, scope: "grade", scopeValue: "10" });
  const sectionElection = await createElection(adminToken, { ...common, title: `QA Section ${suffix}`, scope: "section", scopeValue: "Rizal" });
  const roomElection = await createElection(adminToken, { ...common, title: `QA Room ${suffix}`, scope: "room", scopeValue: "101" });

  expect(await api(`/api/partylists`, {
    method: "POST", token: adminToken, body: { electionId: gradeElection.id, name: `Invalid Party ${suffix}` },
  }), 400, "Party-Lists are rejected for non-school-wide elections");
  expect(await api("/api/elections", {
    method: "POST", token: alphaToken, body: { ...common, title: "Forbidden", scope: "all", scopeValue: "" },
  }), 403, "Students cannot create elections");

  for (const [election, eligibleToken, ineligibleToken, label] of [
    [gradeElection, alphaToken, gammaToken, "grade"],
    [sectionElection, alphaToken, gammaToken, "section"],
    [roomElection, alphaToken, gammaToken, "room"],
  ] as const) {
    expect(await api("/api/votes", { method: "POST", token: ineligibleToken, body: { electionId: election.id, positionId: "none", candidateId: "none" } }), 403, `${label} scope blocks an ineligible student`);
    expect(await api("/api/votes", { method: "POST", token: eligibleToken, body: { electionId: election.id, positionId: "none", candidateId: "none" } }), 400, `${label} scope recognizes an eligible student`);
  }

  const liveElection = await createElection(adminToken, {
    ...common,
    title: `QA School-wide ${suffix}`,
    scope: "all",
    scopeValue: "",
    hasPartyList: true,
  });
  const position = expect(await api("/api/positions", {
    method: "POST", token: adminToken, body: { electionId: liveElection.id, name: `QA President ${suffix}` },
  }), 201, "Create an election position");
  const party = expect(await api("/api/partylists", {
    method: "POST", token: adminToken, body: { electionId: liveElection.id, name: `QA Unity ${suffix}`, acronym: "QAU", advocacy: "Transparent student service" },
  }), 201, "Create a Party-List for a school-wide election");
  const candidateA = expect(await api("/api/candidates", {
    method: "POST", token: adminToken, body: { electionId: liveElection.id, positionId: position.id, userId: alpha.id, partyListId: party.id, manifesto: "Alpha platform" },
  }), 201, "Nominate a student directly from the registry");
  const candidateB = expect(await api("/api/candidates", {
    method: "POST", token: adminToken, body: { electionId: liveElection.id, positionId: position.id, userId: beta.id, partyListId: party.id, manifesto: "Beta platform" },
  }), 201, "Nominate a second student");
  expect(await api("/api/candidates", {
    method: "POST", token: adminToken, body: { electionId: liveElection.id, positionId: position.id, userId: alpha.id },
  }), 400, "Duplicate nomination is rejected");

  const liveStartsAt = new Date(Date.now() - 60_000).toISOString();
  const liveEndsAt = new Date(Date.now() + 55_000).toISOString();
  expect(await api(`/api/elections/${liveElection.id}`, {
    method: "PUT",
    token: adminToken,
    body: { ...liveElection, startsAt: liveStartsAt, endsAt: liveEndsAt, scopeValue: "", hasPartyList: true },
  }), 200, "Activate the configured election");

  expect(await api("/api/votes", {
    method: "POST", token: alphaToken, body: { electionId: liveElection.id, positionId: position.id, candidateId: candidateA.id },
  }), 201, "Student casts an online vote");
  expect(await api("/api/votes", {
    method: "POST", token: alphaToken, body: { electionId: liveElection.id, positionId: position.id, candidateId: candidateB.id },
  }), 201, "A later valid vote replaces the prior selection");
  const alphaVotes = expect(await api(`/api/votes/my?electionId=${liveElection.id}`, { token: alphaToken }), 200, "Student retrieves only their effective vote");
  assert.equal(alphaVotes.length, 1);
  assert.equal(alphaVotes[0].candidateId, candidateB.id);
  const adminVotesAfterReplacement = expect(await api(`/api/votes?electionId=${liveElection.id}`, { token: adminToken }), 200, "Admin inspects live effective votes");
  assert.equal(adminVotesAfterReplacement.filter((vote: any) => vote.voterId === alpha.id).length, 1);

  const studentLiveCandidates = expect(await api(`/api/candidates?electionId=${liveElection.id}`, { token: alphaToken }), 200, "Student loads live candidates with sealed counts");
  assert.ok(studentLiveCandidates.every((candidate: any) => candidate.voteCount === 0));
  const teacherLiveCandidates = expect(await api(`/api/candidates?electionId=${liveElection.id}`, { token: teacherToken }), 200, "Teacher views live candidate counts");
  assert.ok(teacherLiveCandidates.some((candidate: any) => candidate.voteCount > 0));

  const credential = expect(await api(`/api/offline/credentials?electionId=${liveElection.id}`, { token: betaToken }), 200, "Eligible online student obtains encrypted offline-ballot credentials");
  (globalThis as any).window = globalThis;
  const { encryptOfflineBallot } = await import("../src/lib/offlineBallot.ts");
  const envelope = await encryptOfflineBallot(credential, {
    voterId: beta.id,
    studentNumber: beta.studentNumber,
    electionId: liveElection.id,
    votes: [{ positionId: position.id, candidateId: candidateA.id }],
    timestamp: new Date().toISOString(),
  });
  const imported = expect(await api("/api/votes/import-offline", { method: "POST", token: teacherToken, body: { ballot: envelope } }), 200, "Teacher imports an encrypted offline vote file");
  assert.equal(imported.importedCount, 1);
  expect(await api("/api/votes/import-offline", { method: "POST", token: teacherToken, body: { ballot: envelope } }), 409, "Offline ballot replay is rejected");
  const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -2)}AA` };
  expect(await api("/api/votes/import-offline", { method: "POST", token: teacherToken, body: { ballot: tampered } }), 400, "Tampered offline ballot is rejected");

  const turnout = expect(await api(`/api/elections/${liveElection.id}/turnout`, { token: teacherToken }), 200, "Teacher views detailed turnout and non-voter roster");
  assert.ok(Array.isArray(turnout.students));
  assert.ok(turnout.students.some((student: any) => student.studentNumber === gamma.studentNumber && student.hasVoted === false));
  assert.ok(turnout.students.some((student: any) => student.studentNumber === alpha.studentNumber && student.hasVoted === true));

  const endedElections = expect(await api("/api/elections", { token: alphaToken }), 200, "Students can view election calendar data").filter((election: any) => new Date(election.endsAt).getTime() < Date.now());
  const endedWithVotes = endedElections.find((election: any) => election.id === "e-demo") || endedElections[0];
  assert.ok(endedWithVotes, "An ended election is available for published-results verification");
  const endedStudentCounts = expect(await api(`/api/candidates?electionId=${endedWithVotes.id}`, { token: alphaToken }), 200, "Students can view results after an election ends");
  const endedAdminCounts = expect(await api(`/api/candidates?electionId=${endedWithVotes.id}`, { token: adminToken }), 200, "Admins can view ended results");
  assert.deepEqual(endedStudentCounts.map((candidate: any) => candidate.voteCount), endedAdminCounts.map((candidate: any) => candidate.voteCount));

  originalBranding = expect(await api("/api/branding"), 200, "Public school branding loads");
  const branded = expect(await api("/api/branding", {
    method: "PUT",
    token: adminToken,
    body: { ...originalBranding, schoolName: `QA School ${suffix}`, primaryColor: "#2563eb", attributionText: "Attempted replacement" },
  }), 200, "Admin updates reusable school branding");
  assert.equal(branded.schoolName, `QA School ${suffix}`);
  assert.equal(branded.attributionText, "Developed by students of Bolinao School of Fisheries.");

  const logs = expect(await api("/api/audit-logs", { token: teacherToken }), 200, "Teacher views audit logs");
  assert.ok(logs.some((entry: any) => entry.action === "VOTE_REVISED"));
  assert.ok(logs.some((entry: any) => entry.action === "OFFLINE_BALLOT_IMPORTED"));

  const waitMs = Math.max(0, new Date(liveEndsAt).getTime() - Date.now() + 1_000);
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  expect(await api(`/api/elections/${liveElection.id}`, { method: "DELETE", token: adminToken }), 200, "Delete the completed disposable election with cascades");
  createdElectionIds.splice(createdElectionIds.indexOf(liveElection.id), 1);
} finally {
  if (originalBranding) {
    await api("/api/branding", { method: "PUT", token: adminToken, body: originalBranding });
  }
  for (const electionId of [...createdElectionIds].reverse()) {
    await api(`/api/elections/${electionId}`, { method: "DELETE", token: adminToken });
  }
  for (const userId of [...createdUserIds].reverse()) {
    await api(`/api/users/${userId}`, { method: "DELETE", token: adminToken });
  }
}

console.log(`LIVE QA PASSED: ${checks.length} checks`);
for (const check of checks) console.log(`  ✓ ${check}`);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const workspace = process.cwd();
const serverSource = fs.readFileSync(path.join(workspace, "server.ts"), "utf8");

const route = (method: string, apiPath: string) =>
  new RegExp(`app\\.${method.toLowerCase()}\\(\\s*[\"']${apiPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"']`).test(serverSource);

test("every frontend API operation has a matching backend route", () => {
  const expectedRoutes: Array<[string, string]> = [
    ["GET", "/api/health"],
    ["GET", "/api/branding"],
    ["POST", "/api/auth/login"],
    ["POST", "/api/auth/setup-password"],
    ["GET", "/api/auth/me"],
    ["POST", "/api/auth/change-password"],
    ["POST", "/api/upload"],
    ["GET", "/api/users"],
    ["POST", "/api/users"],
    ["POST", "/api/users/bulk"],
    ["DELETE", "/api/users/:id"],
    ["PUT", "/api/users/:id/photo"],
    ["GET", "/api/elections"],
    ["POST", "/api/elections"],
    ["PUT", "/api/elections/:id"],
    ["DELETE", "/api/elections/:id"],
    ["GET", "/api/partylists"],
    ["POST", "/api/partylists"],
    ["DELETE", "/api/partylists/:id"],
    ["GET", "/api/positions"],
    ["POST", "/api/positions"],
    ["PUT", "/api/positions/:id"],
    ["DELETE", "/api/positions/:id"],
    ["GET", "/api/candidates"],
    ["POST", "/api/candidates"],
    ["DELETE", "/api/candidates/:id"],
    ["GET", "/api/votes"],
    ["GET", "/api/votes/my"],
    ["POST", "/api/votes"],
    ["GET", "/api/offline/credentials"],
    ["POST", "/api/votes/import-offline"],
    ["GET", "/api/elections/:id/turnout"],
    ["PUT", "/api/branding"],
    ["GET", "/api/diagnostics/run-tests"],
    ["POST", "/api/ai/suggest-manifesto"],
  ];

  for (const [method, apiPath] of expectedRoutes) {
    assert.equal(route(method, apiPath), true, `${method} ${apiPath} is missing from server.ts`);
  }
});

test("Appwrite collections contain every field consumed by the frontend and services", () => {
  const requiredFields: Record<string, string[]> = {
    users: ["studentNumber", "password", "fullName", "role", "yearLevel", "section", "room", "hasSetPassword", "photoUrl"],
    elections: ["title", "description", "startsAt", "endsAt", "scope", "scopeValue", "hasPartyList", "targetGradeLevel", "targetSection", "targetRoom"],
    positions: ["electionId", "name", "normalizedName"],
    candidates: ["electionId", "positionId", "userId", "fullName", "manifesto", "partyListId", "partyListName", "photoUrl", "yearLevel"],
    votes: ["electionId", "positionId", "voterId", "candidateId", "timestamp", "isOfflineImport"],
    partyLists: ["electionId", "name", "normalizedName", "acronym", "logoUrl", "advocacy"],
    branding: ["schoolName", "tagline", "logoUrl", "primaryColor", "attributionText", "contactEmail", "address"],
    auditLogs: ["action", "performedBy", "performedByRole", "timestamp", "details"],
    offlineBallots: ["nonce", "voterId", "electionId", "importedAt", "importedBy"],
  };

  for (const [collection, fields] of Object.entries(requiredFields)) {
    const start = serverSource.indexOf(`id: "${collection}"`);
    assert.notEqual(start, -1, `Collection ${collection} is missing`);
    const attributesStart = serverSource.indexOf("attributes: [", start);
    const attributesEnd = serverSource.indexOf("\n        ]", attributesStart);
    const block = serverSource.slice(attributesStart, attributesEnd);
    for (const field of fields) {
      assert.match(block, new RegExp(`key:\\s*[\"']${field}[\"']`), `${collection}.${field} is missing`);
    }
  }
});

test("critical Appwrite uniqueness and query indexes are declared", () => {
  const requiredIndexIds = [
    "student_number_unique",
    "positions_election_name",
    "candidates_election_position",
    "candidates_position_user",
    "votes_effective_unique",
    "votes_election_voter",
    "party_election_normalized_name",
    "offline_nonce_unique",
  ];
  for (const indexId of requiredIndexIds) {
    assert.match(serverSource, new RegExp(`id:\\s*[\"']${indexId}[\"']`), `Index ${indexId} is missing`);
  }
  assert.match(serverSource, /createTransaction\(\{ ttl: 60 \}\)/, "Offline ballot imports must be transactional");
  assert.match(serverSource, /offline_nonce_unique/, "Offline ballot replay nonces must be unique");
});

test("backend role middleware protects every privileged feature", () => {
  const protectedDeclarations = [
    `app.post("/api/users/bulk", requireAdminOrTeacher`,
    `app.post("/api/votes/import-offline", requireAdminOrTeacher`,
    `app.get("/api/elections/:id/turnout", requireAdminOrTeacher`,
    `app.get("/api/votes", requireAdminOrTeacher`,
    `app.post("/api/elections", requireAdmin`,
    `app.post("/api/positions", requireAdmin`,
    `app.post("/api/candidates", requireAdmin`,
    `app.post("/api/partylists", requireAdmin`,
    `app.put("/api/branding", requireAdmin`,
    `app.post("/api/votes", requireAuth`,
    `app.get("/api/offline/credentials", requireAuth`,
  ];
  for (const declaration of protectedDeclarations) {
    assert.ok(serverSource.includes(declaration), `Missing backend protection: ${declaration}`);
  }
});

test("public user responses never expose password or legacy username fields", () => {
  const start = serverSource.indexOf("const toPublicUser");
  const end = serverSource.indexOf("const createSessionToken", start);
  const mapper = serverSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(mapper, /^\s*password\s*:/m);
  assert.doesNotMatch(mapper, /^\s*username\s*:/m);
  assert.match(mapper, /studentNumber/);
});

test("frontend keeps the permanent attribution and Student Number login terminology", () => {
  const login = fs.readFileSync(path.join(workspace, "src", "components", "LoginPage.tsx"), "utf8");
  const shell = fs.readFileSync(path.join(workspace, "src", "components", "AppShell.tsx"), "utf8");
  const votePage = fs.readFileSync(path.join(workspace, "src", "components", "VotePage.tsx"), "utf8");
  const votingGuide = fs.readFileSync(path.join(workspace, "src", "components", "HowToVoteModal.tsx"), "utf8");
  assert.match(login, /Student Number/i);
  assert.doesNotMatch(login, /Username/i);
  assert.match(shell, /branding\.attributionText/);
  assert.doesNotMatch(votePage, /c\.yearLevel\s*===\s*user\.yearLevel/, "School-wide candidates must not be hidden by candidate grade");
  assert.match(votingGuide, /replaces your earlier one/i);
  assert.doesNotMatch(votingGuide, /cannot be changed once submitted/i);
});

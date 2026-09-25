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
    ["POST", "/api/elections/:id/end"],
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
    ["GET", "/api/elections/:id/turnout"],
    ["GET", "/api/dashboard/stats"],
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
    votes: ["electionId", "positionId", "voterId", "candidateId", "timestamp"],
    partyLists: ["electionId", "name", "normalizedName", "acronym", "logoUrl", "advocacy"],
    branding: ["schoolName", "tagline", "logoUrl", "primaryColor", "attributionText", "contactEmail", "address"],
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
  ];
  for (const indexId of requiredIndexIds) {
    assert.match(serverSource, new RegExp(`id:\\s*[\"']${indexId}[\"']`), `Index ${indexId} is missing`);
  }
});

test("backend role middleware protects every privileged feature", () => {
  const protectedDeclarations = [
    `app.post("/api/users/bulk", requireAdminOrTeacher`,
    `app.get("/api/elections/:id/turnout", requireAdminOrTeacher`,
    `app.get("/api/votes", requireAdminOrTeacher`,
    `app.post("/api/elections", requireAdmin`,
    `app.post("/api/elections/:id/end", requireAdmin`,
    `app.post("/api/positions", requireAdmin`,
    `app.post("/api/candidates", requireAdmin`,
    `app.post("/api/partylists", requireAdmin`,
    `app.put("/api/branding", requireAdmin`,
    `app.post("/api/votes", requireAuth`,
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

test("frontend keeps the permanent GWC attribution and Student Number login terminology", () => {
  const login = fs.readFileSync(path.join(workspace, "src", "components", "LoginPage.tsx"), "utf8");
  const shell = fs.readFileSync(path.join(workspace, "src", "components", "AppShell.tsx"), "utf8");
  const votePage = fs.readFileSync(path.join(workspace, "src", "components", "VotePage.tsx"), "utf8");
  const votingGuide = fs.readFileSync(path.join(workspace, "src", "components", "HowToVoteModal.tsx"), "utf8");
  assert.match(login, /Student Number/i);
  assert.doesNotMatch(login, />\s*USERNAME\s*</i);
  assert.match(shell, /branding\.attributionText/);
  assert.match(serverSource, /GWC Student-Built Election System/);
  assert.doesNotMatch(votePage, /c\.yearLevel\s*===\s*user\.yearLevel/, "School-wide candidates must not be hidden by candidate grade");
  assert.match(votingGuide, /replaces your earlier one/i);
  assert.doesNotMatch(votingGuide, /cannot be changed once submitted/i);
});

test("Vercel deploys the Vite frontend and Express API from one Git push", () => {
  const config = JSON.parse(fs.readFileSync(path.join(workspace, "vercel.json"), "utf8"));
  const apiEntry = fs.readFileSync(path.join(workspace, "api", "index.ts"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(workspace, "package.json"), "utf8"));

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(config.framework, "vite");
  assert.equal(config.buildCommand, "npm run build:client");
  assert.equal(config.outputDirectory, "dist");
  assert.deepEqual(config.regions, ["sin1"]);
  assert.equal(config.fluid, true);
  assert.equal(config.functions["api/index.ts"].maxDuration, 60);
  assert.equal(config.functions["api/index.ts"].includeFiles, "server{.ts,/**}");
  assert.equal(config.functions["api/index.ts"].memory, undefined);
  assert.deepEqual(config.rewrites[0], { source: "/api/:path*", destination: "/api/index" });
  assert.deepEqual(config.rewrites[1], { source: "/:path*", destination: "/index.html" });
  assert.equal(packageJson.scripts["vercel-build"], "npm run build:client");
  assert.match(apiEntry, /from ["']\.\.\/server\.ts["']/);
  assert.match(apiEntry, /createElectionApp\(\)/);
  assert.match(apiEntry, /export default function handler/);
  assert.match(apiEntry, /return app\(req, res\)/);
  assert.match(serverSource, /from ["']\.\/server\/domain\.ts["']/);
  assert.doesNotMatch(serverSource, /process\.env/);
});

test("deployment configuration is self-contained and does not require environment files", () => {
  assert.doesNotMatch(serverSource, /APP_SECURITY_SECRET is required in production/);
  assert.doesNotMatch(serverSource, /process\.env|dotenv/);
  assert.equal(fs.existsSync(path.join(workspace, ".env.example")), false);
});

test("elections remain editable even after voting has started", () => {
  const putStart = serverSource.indexOf('app.put("/api/elections/:id"');
  const putEnd = serverSource.indexOf('app.delete("/api/elections/:id"', putStart);
  assert.ok(putStart >= 0 && putEnd > putStart);
  const putRoute = serverSource.slice(putStart, putEnd);
  assert.doesNotMatch(putRoute, /An election cannot be edited after voting has started/);
});

test("positions remain configurable even when the election is live", () => {
  const postStart = serverSource.indexOf('app.post("/api/positions"');
  const postEnd = serverSource.indexOf('app.delete("/api/positions/:id"', postStart);
  assert.ok(postStart >= 0 && postEnd > postStart);
  const postRoute = serverSource.slice(postStart, postEnd);
  assert.doesNotMatch(postRoute, /Positions cannot be changed after voting has started/);

  const deleteStart = postEnd;
  const deleteEnd = serverSource.indexOf('app.put("/api/positions/:id"', deleteStart);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart);
  const deleteRoute = serverSource.slice(deleteStart, deleteEnd);
  assert.doesNotMatch(deleteRoute, /Positions cannot be changed after voting has started/);

  const putStart = deleteEnd;
  const putEnd = serverSource.indexOf('// --- Candidates API ---', putStart);
  assert.ok(putStart >= 0 && putEnd > putStart);
  const putRoute = serverSource.slice(putStart, putEnd);
  assert.doesNotMatch(putRoute, /Positions cannot be changed after voting has started/);
});



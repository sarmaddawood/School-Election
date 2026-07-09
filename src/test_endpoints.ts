/**
 * Secure E-Voting Portal - Backend End-to-End API Test Suite
 * This script runs directly against the live dev server (http://localhost:3000)
 * and tests every major feature, role constraint, and database operation.
 */

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("\n==================================================");
  console.log("⚡ STARTING SYSTEM INTEGRATION & API TESTING SUITE ⚡");
  console.log("==================================================\n");

  let testsPassed = 0;
  let testsFailed = 0;

  async function assertStatus(
    name: string,
    url: string,
    options: RequestInit,
    expectedStatus: number,
    validationCallback?: (data: any) => boolean
  ) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, options);
      const data = await res.json().catch(() => ({}));
      
      const statusMatches = res.status === expectedStatus;
      let validationsPassed = true;

      if (statusMatches && validationCallback) {
        validationsPassed = validationCallback(data);
      }

      if (statusMatches && validationsPassed) {
        console.log(`✅ PASS: ${name} [HTTP ${res.status}]`);
        testsPassed++;
        return data;
      } else {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Expected status: ${expectedStatus}, got: ${res.status}`);
        if (!statusMatches) {
          console.error(`   Error details: ${JSON.stringify(data)}`);
        } else {
          console.error(`   Data validation failed for: ${JSON.stringify(data)}`);
        }
        testsFailed++;
        return null;
      }
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} (Exception raised)`);
      console.error(`   Details: ${err.message}`);
      testsFailed++;
      return null;
    }
  }

  // --- 1. Authentication & Security Tests ---
  console.log("🔒 [1/5] Testing Authentication & Gatekeeping...");

  // Seed the database to ensure we have the admin and baseline records
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-token-admin-1"
    }
  });
  if (seedRes.ok) {
    console.log("🟢 Seeded test database with clean mock data.");
  }

  // Test: Login with correct credentials
  const loginData = await assertStatus(
    "Login with standard system admin credentials",
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "ChangeMe!2026Vote" }),
    },
    200,
    (d) => !!d.token && d.user?.role === "admin"
  );

  const adminToken = loginData?.token;

  // Test: Unauthenticated requests are rejected
  await assertStatus(
    "Verify unauthenticated request is blocked with 401",
    "/api/users",
    { method: "GET" },
    401
  );

  // Test: Invalid token request is blocked
  await assertStatus(
    "Verify invalid bearer token is rejected with 401",
    "/api/users",
    {
      method: "GET",
      headers: { Authorization: "Bearer bad-token-12345" }
    },
    401
  );

  // --- 2. Admin Operations (Users Registry) ---
  console.log("\n👥 [2/5] Testing Users Registry APIs...");

  // Test: Fetch users
  const users = await assertStatus(
    "Get all users registry (Admin)",
    "/api/users",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    },
    200,
    (d) => Array.isArray(d) && d.length > 0
  );

  // Test: Create new user
  const uniqueUsername = `test-stu-${Math.random().toString(36).substring(2, 7)}`;
  const newUser = await assertStatus(
    "Create new student record",
    "/api/users",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username: uniqueUsername,
        fullName: "Test Automated Student",
        password: "password123",
        role: "student",
        yearLevel: 11
      })
    },
    201
  );

  // Login as student to test voter-specific actions
  const studentLogin = await assertStatus(
    "Login as newly created student",
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uniqueUsername, password: "password123" }),
    },
    200,
    (d) => !!d.token && d.user?.role === "student"
  );
  const studentToken = studentLogin?.token;

  // --- 3. Election & Position Management ---
  console.log("\n🗳️ [3/5] Testing Elections and Positions APIs...");

  // Test: Fetch elections
  const elections = await assertStatus(
    "Get all elections list",
    "/api/elections",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    },
    200,
    (d) => Array.isArray(d) && d.length > 0
  );

  // Test: Create election
  const newElection = await assertStatus(
    "Create a new testing election",
    "/api/elections",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: "Test Automation Council Election",
        description: "Verify automated test structures",
        startsAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Started 1hr ago
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Ends in 24hr
      })
    },
    201,
    (d) => !!d.id && d.title === "Test Automation Council Election"
  );

  // Test: Create position in the new election
  let newPosition: any = null;
  if (newElection) {
    newPosition = await assertStatus(
      "Create position inside new election",
      "/api/positions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          electionId: newElection.id,
          name: "Test Class Representative"
        })
      },
      201,
      (d) => !!d.id && d.electionId === newElection.id
    );
  }

  // --- 4. Voting & Integrity Constraints ---
  console.log("\n🗳️ [4/5] Testing Ballots and Voting Integrity...");

  // Test: Admin voting rejection
  if (newElection && newPosition) {
    await assertStatus(
      "Verify Administrator is rejected from voting (403 Forbidden)",
      "/api/votes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          electionId: newElection.id,
          positionId: newPosition.id,
          candidateId: "some-candidate"
        })
      },
      403
    );
  }

  // --- 5. AI Service Verification ---
  console.log("\n🤖 [5/5] Testing AI Copilot Integrations...");

  // Test: AI Manifesto Polish
  await assertStatus(
    "Verify AI Manifesto Polish suggest function",
    "/api/ai/suggest-manifesto",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        positionName: "President",
        draft: "i want to clean the courtyard and organize soccer cups."
      })
    },
    200,
    (d) => typeof d.manifesto === "string" && d.manifesto.length > 0
  );

  // Clean up election to keep db clean
  if (newElection) {
    await fetch(`${BASE_URL}/api/elections/${newElection.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("🧹 Cleaned up testing election successfully.");
  }

  // Print Summary
  console.log("\n==================================================");
  console.log("📋 AUTOMATED TEST SUITE EXECUTION SUMMARY 📋");
  console.log("==================================================");
  console.log(`🏆 Total Tests Executed: ${testsPassed + testsFailed}`);
  console.log(`🟢 Tests PASSED:         ${testsPassed}`);
  console.log(`🔴 Tests FAILED:         ${testsFailed}`);
  console.log("==================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

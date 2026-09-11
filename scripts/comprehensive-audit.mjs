import { createRequire } from "module";
import assert from "node:assert/strict";
import path from "path";

const require = createRequire(process.cwd() + "/package.json");
const { Client, Databases, Query } = require("node-appwrite");
const XLSX = require("xlsx");
const { createSignedToken, verifySignedToken, normalizeStudentNumber, studentDocumentId } = await import("../server/domain.ts");

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";
const APP_SECURITY_SECRET = "GWC_BOLINAO_ELECTION_HMAC_SECRET_2026";
const BASE_URL = "http://127.0.0.1:3000";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function getAllAppwriteUsers() {
  const users = [];
  let cursor = null;
  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(APPWRITE_DB, "users", queries);
    users.push(...res.documents);
    cursor = res.documents.length === 100 ? res.documents[res.documents.length - 1].$id : null;
  } while (cursor);
  return users;
}

function cleanStudentName(raw) {
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "-");
  return parts.join(", ");
}

async function runAudit() {
  console.log("===============================================================================");
  console.log("             COMPREHENSIVE AUDIT & EXHAUSTIVE VERIFICATION SUITE              ");
  console.log("===============================================================================\n");

  // -------------------------------------------------------------------------
  // SECTION 1: Read all 4 Excel files & collect original student data
  // -------------------------------------------------------------------------
  console.log("[AUDIT-1] Extracting all students from source Excel files...");
  const excelFiles = [
    { filename: "SF1_2026_Grade 7 (Year I) - GLASSFISH (1).xls", section: "GLASSFISH" },
    { filename: "SF1_2026_Grade 7 (Year I) - SAILFISH (1).xls", section: "SAILFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-GARFISH.xls", section: "GARFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-MOONFIISH.xls", section: "MOONFIISH" },
  ];

  const sourceStudents = [];
  for (const cfg of excelFiles) {
    const filePath = path.resolve(process.cwd(), cfg.filename);
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let count = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const lrn = String(row[0] || "").trim();
      if (/^\d{12}$/.test(lrn)) {
        let rawName = "";
        for (let c = 1; c < 5; c++) {
          if (row[c] && typeof row[c] === "string" && row[c].includes(",")) {
            rawName = row[c].trim();
            break;
          }
        }
        const cleanedName = cleanStudentName(rawName);
        sourceStudents.push({
          lrn,
          fullName: cleanedName,
          section: cfg.section,
          filename: cfg.filename,
        });
        count++;
      }
    }
    console.log(`  - ${cfg.filename}: found ${count} students in section ${cfg.section}`);
  }
  console.log(`  Total students extracted from files: ${sourceStudents.length}\n`);
  assert.equal(sourceStudents.length, 99, "Expected exactly 99 students in the 4 files");

  // -------------------------------------------------------------------------
  // SECTION 2: Fetch all users from Appwrite & check counts & data integrity
  // -------------------------------------------------------------------------
  console.log("[AUDIT-2] Fetching all Appwrite user records for 1-to-1 matching...");
  const appwriteUsers = await getAllAppwriteUsers();
  console.log(`  Total users in Appwrite: ${appwriteUsers.length}`);
  assert.equal(appwriteUsers.length, 104, "Expected exactly 104 users (1 Admin + 4 Teachers + 99 Students)");

  const usersByRole = { admin: 0, teacher: 0, student: 0 };
  const studentMap = new Map();
  const teacherMap = new Map();
  let adminDoc = null;

  for (const u of appwriteUsers) {
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    if (u.role === "student") {
      studentMap.set(u.studentNumber, u);
    } else if (u.role === "teacher") {
      teacherMap.set(u.studentNumber.toLowerCase(), u);
    } else if (u.role === "admin") {
      adminDoc = u;
    }
  }

  console.log("  Users by role breakdown:", usersByRole);
  assert.equal(usersByRole.admin, 1, "Expected exactly 1 admin");
  assert.equal(usersByRole.teacher, 4, "Expected exactly 4 teachers");
  assert.equal(usersByRole.student, 99, "Expected exactly 99 students");

  assert.ok(adminDoc, "Administrator record must exist");
  assert.equal(adminDoc.studentNumber, "ADMIN");
  assert.equal(adminDoc.role, "admin");
  console.log(`  Admin verified: ${adminDoc.fullName} (studentNumber: ${adminDoc.studentNumber})\n`);

  // -------------------------------------------------------------------------
  // SECTION 3: 1-to-1 Exhaustive Verification of All 99 Students in Appwrite
  // -------------------------------------------------------------------------
  console.log("[AUDIT-3] Performing 1-to-1 verification for ALL 99 STUDENTS in Appwrite...");
  let studentsVerified = 0;
  for (const src of sourceStudents) {
    const doc = studentMap.get(src.lrn);
    if (!doc) {
      throw new Error(`Student LRN ${src.lrn} (${src.fullName}) not found in Appwrite!`);
    }

    // Verify document properties
    assert.equal(doc.studentNumber, src.lrn, `LRN mismatch on ${src.lrn}`);
    assert.equal(doc.fullName, src.fullName, `Full name mismatch on LRN ${src.lrn}: '${doc.fullName}' vs '${src.fullName}'`);
    assert.equal(doc.yearLevel, 7, `Grade level on ${src.lrn} must be 7`);
    assert.equal(doc.section, src.section, `Section mismatch on ${src.lrn}: '${doc.section}' vs '${src.section}'`);
    assert.equal(doc.role, "student", `Role on ${src.lrn} must be 'student'`);
    assert.equal(doc.hasSetPassword, false, `hasSetPassword must be false on ${src.lrn}`);
    assert.equal(doc.password, "", `Password must be empty on ${src.lrn}`);
    assert.equal(doc.$id, studentDocumentId(src.lrn), `Document ID on ${src.lrn} must be deterministic studentDocumentId`);

    studentsVerified++;
  }
  console.log(`  All ${studentsVerified} / 99 students verified with exact field matches in Appwrite!\n`);

  // -------------------------------------------------------------------------
  // SECTION 4: Exhaustive First-Time Login Simulation for ALL 99 Students
  // -------------------------------------------------------------------------
  console.log("[AUDIT-4] Simulating first-time login API for ALL 99 STUDENTS via local server...");
  let studentLoginsPassed = 0;

  for (let i = 0; i < sourceStudents.length; i++) {
    const s = sourceStudents[i];
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: s.lrn, password: "" }),
    });

    if (res.status !== 200) {
      const err = await res.text();
      throw new Error(`Login failed for student LRN ${s.lrn} (${s.fullName}): status ${res.status} - ${err}`);
    }

    const data = await res.json();
    assert.equal(data.needsPasswordSetup, true, `Student ${s.lrn} must need password setup`);
    assert.ok(data.setupToken, `Student ${s.lrn} must receive a setup token`);
    assert.equal(data.user.studentNumber, s.lrn);
    assert.equal(data.user.role, "student");
    assert.equal(data.user.yearLevel, 7);
    assert.equal(data.user.section, s.section);

    // Verify cryptographic signature of the token
    const claims = verifySignedToken(data.setupToken, APP_SECURITY_SECRET, "password-setup");
    assert.ok(claims, `Setup token for student ${s.lrn} failed cryptographic HMAC verification`);
    assert.equal(claims.studentNumber, s.lrn);

    studentLoginsPassed++;
    if (studentLoginsPassed % 25 === 0 || studentLoginsPassed === 99) {
      console.log(`  Verified ${studentLoginsPassed} / 99 student first-time logins...`);
    }
  }
  console.log(`  Exhaustive student login check PASSED: 99 / 99 students can authenticate successfully!\n`);

  // -------------------------------------------------------------------------
  // SECTION 5: Comprehensive Verification for All 4 DepEd Teachers
  // -------------------------------------------------------------------------
  console.log("[AUDIT-5] Testing all 4 DepEd Teachers (Email login, password creation, session verification)...");
  const expectedTeachers = [
    { email: "ronald.calima@deped.gov.ph", name: "Ronald Calima", section: "GLASSFISH" },
    { email: "judyann.carreon@deped.gov.ph", name: "Judy Ann Carreon", section: "GARFISH" },
    { email: "alaysamarie.calado@deped.gov.ph", name: "Alaysa Marie Calado", section: "MOONFIISH" },
    { email: "catherine.magrata@deped.gov.ph", name: "Catherine Magrata", section: "SAILFISH" },
  ];

  for (const t of expectedTeachers) {
    console.log(`\n  --- Verifying Teacher: ${t.name} (${t.email}) ---`);
    const doc = teacherMap.get(t.email);
    assert.ok(doc, `Teacher doc for ${t.email} must exist in Appwrite`);
    assert.equal(doc.fullName, t.name);
    assert.equal(doc.section, t.section);
    assert.equal(doc.role, "teacher");
    assert.equal(doc.hasSetPassword, false);
    assert.equal(doc.password, "");

    // 5.1 First-time login with empty password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: t.email, password: "" }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.needsPasswordSetup, true);
    assert.ok(loginData.setupToken);
    assert.equal(loginData.user.fullName, t.name);
    assert.equal(loginData.user.role, "teacher");
    assert.equal(loginData.user.section, t.section);

    // 5.2 Test case-insensitive email login
    const upperEmail = t.email.toUpperCase();
    const caseRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: upperEmail, password: "" }),
    });
    assert.equal(caseRes.status, 200, `Case-insensitive email login for ${upperEmail} must succeed`);

    // 5.3 Test invalid short password setup (must fail validation)
    const badSetupRes = await fetch(`${BASE_URL}/api/auth/setup-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: loginData.setupToken, newPassword: "short" }),
    });
    assert.equal(badSetupRes.status, 400, "Short password should be rejected with 400");
    const badData = await badSetupRes.json();
    assert.match(badData.error, /at least 8 characters/i);

    // 5.4 Test valid password setup
    const testPassword = `TeacherPass2026_${t.section}!`;
    const goodSetupRes = await fetch(`${BASE_URL}/api/auth/setup-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: loginData.setupToken, newPassword: testPassword }),
    });
    assert.equal(goodSetupRes.status, 200);
    const goodData = await goodSetupRes.json();
    assert.ok(goodData.token, "Session token must be returned upon successful password setup");
    assert.equal(goodData.user.hasSetPassword, true);

    // 5.5 Test subsequent login with incorrect password (must fail with 401)
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: t.email, password: "wrongpassword" }),
    });
    assert.equal(wrongLoginRes.status, 401, "Wrong password must return 401");

    // 5.6 Test subsequent login with correct password (must succeed with 200)
    const goodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: t.email, password: testPassword }),
    });
    assert.equal(goodLoginRes.status, 200);
    const goodLoginData = await goodLoginRes.json();
    assert.ok(goodLoginData.token);
    assert.equal(goodLoginData.user.fullName, t.name);

    // 5.7 Test calling protected /api/auth/me using teacher token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${goodLoginData.token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.role, "teacher");
    assert.equal(meData.user.section, t.section);

    // 5.8 Reset password back to un-set state so teacher starts fresh for the user
    await databases.updateDocument(APPWRITE_DB, "users", doc.$id, {
      password: "",
      hasSetPassword: false,
    });
    console.log(`    [PASS] Teacher ${t.name} passed all 8 lifecycle checks and reset to clean state.`);
  }

  // -------------------------------------------------------------------------
  // SECTION 6: Student Full Password Creation and Login Flow
  // -------------------------------------------------------------------------
  console.log("\n[AUDIT-6] Testing complete Student Password Creation & Authentication cycle...");
  const sampleStudent = sourceStudents[0];
  const sampleDoc = studentMap.get(sampleStudent.lrn);

  const stuFirstLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentNumber: sampleStudent.lrn, password: "" }),
  });
  assert.equal(stuFirstLogin.status, 200);
  const stuFirstData = await stuFirstLogin.json();
  assert.equal(stuFirstData.needsPasswordSetup, true);

  const studentTestPass = "StudentPass2026!";
  const stuSetupRes = await fetch(`${BASE_URL}/api/auth/setup-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setupToken: stuFirstData.setupToken, newPassword: studentTestPass }),
  });
  assert.equal(stuSetupRes.status, 200);
  const stuSetupData = await stuSetupRes.json();
  assert.ok(stuSetupData.token);

  // Subsequent login
  const stuSecondLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentNumber: sampleStudent.lrn, password: studentTestPass }),
  });
  assert.equal(stuSecondLogin.status, 200);
  const stuSecondData = await stuSecondLogin.json();
  assert.ok(stuSecondData.token);

  // Call /api/auth/me
  const stuMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${stuSecondData.token}` },
  });
  assert.equal(stuMeRes.status, 200);
  const stuMe = await stuMeRes.json();
  assert.equal(stuMe.user.role, "student");
  assert.equal(stuMe.user.yearLevel, 7);
  assert.equal(stuMe.user.section, sampleStudent.section);

  // Access election list as student
  const electionsRes = await fetch(`${BASE_URL}/api/elections`, {
    headers: { Authorization: `Bearer ${stuSecondData.token}` },
  });
  assert.equal(electionsRes.status, 200);
  const elections = await electionsRes.json();
  console.log(`  Student successfully queried ${elections.length} active elections.`);

  // Reset student back to un-set state
  await databases.updateDocument(APPWRITE_DB, "users", sampleDoc.$id, {
    password: "",
    hasSetPassword: false,
  });
  console.log(`  [PASS] Student ${sampleStudent.fullName} passed all authentication and authorization tests.\n`);

  // -------------------------------------------------------------------------
  // SECTION 7: Administrator Login & Privileges Verification
  // -------------------------------------------------------------------------
  console.log("[AUDIT-7] Verifying Root Administrator privileges...");
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentNumber: "ADMIN", password: "password123" }),
  });
  assert.equal(adminLogin.status, 200);
  const adminData = await adminLogin.json();
  assert.ok(adminData.token);
  assert.equal(adminData.user.role, "admin");

  const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  assert.equal(adminUsersRes.status, 200);
  const allUsersList = await adminUsersRes.json();
  assert.equal(allUsersList.length, 104, `Admin should see all 104 users, got ${allUsersList.length}`);
  console.log(`  Admin verified: Able to view all ${allUsersList.length} users in the portal.`);

  const brandingRes = await fetch(`${BASE_URL}/api/branding`);
  assert.equal(brandingRes.status, 200);
  const branding = await brandingRes.json();
  console.log(`  School branding verified: '${branding.schoolName}'`);

  console.log("\n===============================================================================");
  console.log("            ALL AUDITS & TESTS COMPLETED WITH 100% SUCCESS!                    ");
  console.log("===============================================================================");
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT FAILURE:", err);
  process.exit(1);
});

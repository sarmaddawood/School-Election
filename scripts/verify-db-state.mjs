import { createRequire } from "module";
import assert from "node:assert/strict";
import path from "path";

const require = createRequire(process.cwd() + "/package.json");
const { Client, Databases, Query } = require("node-appwrite");
const XLSX = require("xlsx");
const {
  validateDatabaseSnapshot,
  studentDocumentId,
  verifyPassword,
} = await import("../server/domain.ts");

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

function cleanStudentName(raw) {
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "-");
  return parts.join(", ");
}

async function getAllDocuments(collection) {
  const docs = [];
  let cursor = null;
  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(APPWRITE_DB, collection, queries);
    docs.push(...res.documents);
    cursor = res.documents.length === 100 ? res.documents[res.documents.length - 1].$id : null;
  } while (cursor);
  return docs;
}

async function verify() {
  console.log("===============================================================");
  console.log("           NON-DESTRUCTIVE DATABASE INTEGRITY AUDIT            ");
  console.log("===============================================================\n");

  // 1. Check all users in DB
  const users = await getAllDocuments("users");
  console.log(`[1] Total Users in DB: ${users.length} (Expected: 104)`);
  assert.equal(users.length, 104, "Total users must be 104");

  const roles = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log("    Role counts:", roles);
  assert.equal(roles.admin, 1, "Expected 1 admin");
  assert.equal(roles.teacher, 4, "Expected 4 teachers");
  assert.equal(roles.student, 99, "Expected 99 students");

  // 2. Check Admin
  const admin = users.find((u) => u.role === "admin");
  assert.ok(admin, "Admin account must exist");
  assert.equal(admin.studentNumber, "ADMIN");
  assert.equal(admin.role, "admin");
  assert.equal(admin.hasSetPassword, true);
  const adminPassMatch = await verifyPassword("password123", admin.password);
  assert.ok(adminPassMatch, "Admin password verification failed");
  console.log(`[2] Admin verified: ${admin.fullName} (${admin.studentNumber}) - Password verified: OK`);

  // 3. Check 4 Teachers
  const expectedTeachers = [
    { email: "ronald.calima@deped.gov.ph", name: "Ronald Calima", section: "GLASSFISH" },
    { email: "judyann.carreon@deped.gov.ph", name: "Judy Ann Carreon", section: "GARFISH" },
    { email: "alaysamarie.calado@deped.gov.ph", name: "Alaysa Marie Calado", section: "MOONFIISH" },
    { email: "catherine.magrata@deped.gov.ph", name: "Catherine Magrata", section: "SAILFISH" },
  ];

  console.log("[3] Verifying 4 DepEd Teacher Accounts:");
  for (const exp of expectedTeachers) {
    const t = users.find((u) => u.studentNumber === exp.email);
    assert.ok(t, `Teacher ${exp.email} not found!`);
    assert.equal(t.fullName, exp.name, `Teacher name mismatch for ${exp.email}`);
    assert.equal(t.section, exp.section, `Teacher section mismatch for ${exp.email}`);
    assert.equal(t.role, "teacher", `Role mismatch for ${exp.email}`);
    assert.equal(t.hasSetPassword, false, `Teacher ${exp.email} should have hasSetPassword=false`);
    assert.equal(t.password, "", `Teacher ${exp.email} should have empty password`);
    assert.equal(t.$id, studentDocumentId(exp.email), `Teacher doc ID mismatch for ${exp.email}`);
    console.log(`    ✔ ${t.fullName} (${t.studentNumber}) - Section: ${t.section} - Ready for initial login`);
  }

  // 4. Check 99 Students 1-to-1 against the 4 Excel files
  console.log("\n[4] Verifying 99 Students against Source Excel Files:");
  const excelFiles = [
    { filename: "SF1_2026_Grade 7 (Year I) - GLASSFISH (1).xls", section: "GLASSFISH", expectedCount: 25 },
    { filename: "SF1_2026_Grade 7 (Year I) - SAILFISH (1).xls", section: "SAILFISH", expectedCount: 25 },
    { filename: "SF1_2026_Grade-7-Year-I-GARFISH.xls", section: "GARFISH", expectedCount: 25 },
    { filename: "SF1_2026_Grade-7-Year-I-MOONFIISH.xls", section: "MOONFIISH", expectedCount: 24 },
  ];

  const studentMap = new Map(
    users.filter((u) => u.role === "student").map((u) => [u.studentNumber, u])
  );

  let verifiedCount = 0;
  for (const cfg of excelFiles) {
    const filePath = path.resolve(process.cwd(), cfg.filename);
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let countInFile = 0;
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
        const cleaned = cleanStudentName(rawName);
        const doc = studentMap.get(lrn);

        assert.ok(doc, `Student LRN ${lrn} (${cleaned}) from ${cfg.filename} not found in DB!`);
        assert.equal(doc.fullName, cleaned, `Full name mismatch for LRN ${lrn}`);
        assert.equal(doc.section, cfg.section, `Section mismatch for LRN ${lrn}`);
        assert.equal(doc.yearLevel, 7, `Grade mismatch for LRN ${lrn}`);
        assert.equal(doc.hasSetPassword, false, `hasSetPassword should be false for LRN ${lrn}`);
        assert.equal(doc.password, "", `password should be empty for LRN ${lrn}`);
        assert.equal(doc.$id, studentDocumentId(lrn), `Doc ID mismatch for LRN ${lrn}`);

        countInFile++;
        verifiedCount++;
      }
    }
    assert.equal(countInFile, cfg.expectedCount, `Expected ${cfg.expectedCount} in ${cfg.filename}`);
    console.log(`    ✔ ${cfg.filename}: verified ${countInFile} / ${cfg.expectedCount} students in Section ${cfg.section}`);
  }
  assert.equal(verifiedCount, 99, "Expected exactly 99 verified students");
  console.log(`    Total Students Verified: ${verifiedCount} / 99 (100% match)`);

  // 5. Check Elections, Positions, Party-Lists
  console.log("\n[5] Verifying School Elections & Governance Structure:");
  const elections = await getAllDocuments("elections");
  const positions = await getAllDocuments("positions");
  const partyLists = await getAllDocuments("partyLists");

  console.log(`    Total Elections: ${elections.length}`);
  console.log(`    Total Positions: ${positions.length}`);
  console.log(`    Total Party-Lists: ${partyLists.length}`);

  assert.equal(elections.length, 5, "Expected 5 elections (1 SSLG + 4 Section Class Elections)");
  assert.equal(positions.length, 28, "Expected 28 positions (8 SSLG + 20 Class positions)");
  assert.equal(partyLists.length, 2, "Expected 2 party lists");

  const sslg = elections.find((e) => e.scope === "all");
  assert.ok(sslg, "School-wide SSLG election must exist");
  assert.equal(sslg.hasPartyList, true);
  console.log(`    ✔ School-wide Election: ${sslg.title}`);

  for (const sec of ["GLASSFISH", "SAILFISH", "GARFISH", "MOONFIISH"]) {
    const secElection = elections.find((e) => e.scope === "section" && e.scopeValue === sec);
    assert.ok(secElection, `Class election for ${sec} must exist`);
    const secPositions = positions.filter((p) => p.electionId === secElection.$id);
    assert.equal(secPositions.length, 5, `Expected 5 positions for ${sec}`);
    console.log(`    ✔ Scoped Class Election: ${secElection.title} (5 positions)`);
  }

  // 6. Snapshot Integrity Check
  console.log("\n[6] Running Domain Snapshot Validation Check:");
  const snapshot = {
    users: users.map((u) => ({ id: u.$id, ...u })),
    elections: elections.map((e) => ({ id: e.$id, ...e })),
    positions: positions.map((p) => ({ id: p.$id, ...p })),
    candidates: [],
    votes: [],
    partyLists: partyLists.map((pl) => ({ id: pl.$id, ...pl })),
  };
  const errors = validateDatabaseSnapshot(snapshot);
  assert.equal(errors.length, 0, `Database integrity errors: ${errors.join("; ")}`);
  console.log("    ✔ Database snapshot validation passed with 0 integrity errors!");

  console.log("\n===============================================================");
  console.log("        ALL AUDIT CHECKS PASSED FLAWLESSLY!                    ");
  console.log("===============================================================");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

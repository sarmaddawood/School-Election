import { createRequire } from "module";
import path from "path";
import crypto from "crypto";

const require = createRequire(process.cwd() + "/package.json");
const { Client, Databases, Query, ID } = require("node-appwrite");
const XLSX = require("xlsx");

const {
  normalizeStudentNumber,
  studentDocumentId,
  validateDatabaseSnapshot,
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

async function cleanCollection(collectionName) {
  console.log(`Cleaning collection '${collectionName}'...`);
  const docs = await getAllDocuments(collectionName);
  let count = 0;
  for (const doc of docs) {
    try {
      await databases.deleteDocument(APPWRITE_DB, collectionName, doc.$id);
      count++;
    } catch (err) {
      console.warn(`  Failed to delete ${collectionName}/${doc.$id}:`, err.message);
    }
  }
  console.log(`  Deleted ${count} documents from '${collectionName}'.`);
}

function cleanStudentName(raw) {
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "-");
  return parts.join(", ");
}

async function main() {
  console.log("===============================================================");
  console.log("   CLEANING ENTIRE DATABASE & SEEDING REAL DepEd SCHOOL DATA   ");
  console.log("===============================================================\n");

  // Step 1: Wipe all records across all collections
  const collectionsToClean = [
    "votes",
    "candidates",
    "positions",
    "partyLists",
    "elections",
    "offlineBallots",
    "users",
  ];

  for (const col of collectionsToClean) {
    await cleanCollection(col);
  }

  // Step 2: Set School Branding
  console.log("\nConfiguring School Branding for Bolinao School of Fisheries...");
  const brandingData = {
    schoolName: "Bolinao School of Fisheries",
    tagline: "Bolinao School of Fisheries Student E-Voting Portal",
    logoUrl: "/src/assets/images/bolinao_logo_1783614038890.png",
    primaryColor: "#0284c7",
    attributionText: "GWC Student-Built Election System™ • © 2026 Golden West Colleges, Inc. student developers.",
    contactEmail: "admin@bsf.edu.ph",
    address: "Bolinao, Pangasinan, Philippines",
  };

  try {
    await databases.createDocument(APPWRITE_DB, "branding", "school", brandingData);
    console.log("  Branding created successfully.");
  } catch (err) {
    if (err.code === 409) {
      await databases.updateDocument(APPWRITE_DB, "branding", "school", brandingData);
      console.log("  Branding updated successfully.");
    } else {
      console.error("  Error updating branding:", err.message);
    }
  }

  // Step 3: Insert 1 Administrator
  console.log("\nCreating Administrator Account...");
  const adminDoc = {
    studentNumber: "ADMIN",
    username: "admin@bsf.edu.ph",
    fullName: "System Administrator",
    role: "admin",
    yearLevel: null,
    section: null,
    room: null,
    password: "password123",
    hasSetPassword: true,
    photoUrl: null,
  };

  await databases.createDocument(APPWRITE_DB, "users", "admin-1", adminDoc);
  console.log(`  [CREATED] Admin: System Administrator (ADMIN / admin@bsf.edu.ph)`);

  // Step 4: Insert 4 Teacher Accounts
  console.log("\nCreating 4 Teacher Accounts...");
  const teachers = [
    {
      email: "ronald.calima@deped.gov.ph",
      fullName: "Ronald Calima",
      section: "GLASSFISH",
    },
    {
      email: "judyann.carreon@deped.gov.ph",
      fullName: "Judy Ann Carreon",
      section: "GARFISH",
    },
    {
      email: "alaysamarie.calado@deped.gov.ph",
      fullName: "Alaysa Marie Calado",
      section: "MOONFIISH",
    },
    {
      email: "catherine.magrata@deped.gov.ph",
      fullName: "Catherine Magrata",
      section: "SAILFISH",
    },
  ];

  for (const t of teachers) {
    const docId = studentDocumentId(t.email);
    const teacherDoc = {
      studentNumber: t.email.toLowerCase().trim(),
      username: t.email.toLowerCase().trim(),
      fullName: t.fullName,
      role: "teacher",
      yearLevel: null,
      section: t.section,
      room: t.section,
      password: "",
      hasSetPassword: false,
      photoUrl: null,
    };
    await databases.createDocument(APPWRITE_DB, "users", docId, teacherDoc);
    console.log(`  [CREATED] Teacher: ${t.fullName} (${t.email}) -> Section: ${t.section} [ID: ${docId}]`);
  }

  // Step 5: Read and Insert 99 Students from 4 Excel files
  console.log("\nExtracting and Inserting Students from 4 SF1 Excel Files...");
  const excelFiles = [
    { filename: "SF1_2026_Grade 7 (Year I) - GLASSFISH (1).xls", section: "GLASSFISH" },
    { filename: "SF1_2026_Grade 7 (Year I) - SAILFISH (1).xls", section: "SAILFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-GARFISH.xls", section: "GARFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-MOONFIISH.xls", section: "MOONFIISH" },
  ];

  let totalUploaded = 0;
  const allExtractedStudents = [];

  for (const fileConfig of excelFiles) {
    const filePath = path.resolve(process.cwd(), fileConfig.filename);
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const sectionStudents = [];
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
        sectionStudents.push({ lrn, fullName: cleanedName, section: fileConfig.section });
      }
    }

    console.log(`  Section ${fileConfig.section}: Parsed ${sectionStudents.length} students from ${fileConfig.filename}`);

    for (const student of sectionStudents) {
      const docId = studentDocumentId(student.lrn);
      const studentDoc = {
        studentNumber: student.lrn,
        username: student.lrn,
        fullName: student.fullName,
        role: "student",
        yearLevel: 7,
        section: fileConfig.section,
        room: fileConfig.section,
        password: "",
        hasSetPassword: false,
        photoUrl: null,
      };

      await databases.createDocument(APPWRITE_DB, "users", docId, studentDoc);
      totalUploaded++;
      allExtractedStudents.push(student);
    }
  }
  console.log(`\nSuccessfully stored ${totalUploaded} students in 'users' collection.`);

  // Step 6: Create Proper School Elections
  console.log("\nCreating Official School Elections & Positions...");

  // Start date: September 1, 2026. End date: October 31, 2026.
  const startsAt = new Date("2026-09-01T00:00:00.000Z").toISOString();
  const endsAt = new Date("2026-10-31T23:59:59.000Z").toISOString();

  // 6.1 School-wide SSLG Election
  const sslgElectionId = "e-sslg-2026";
  const sslgElection = {
    title: "Supreme Secondary Learner Government (SSLG) General Election 2026",
    description: "Annual Bolinao School of Fisheries Supreme Secondary Learner Government (SSLG) Election. All enrolled students are eligible to vote. Ballots are encrypted and verifiable.",
    startsAt,
    endsAt,
    scope: "all",
    scopeValue: "",
    hasPartyList: true,
    hasPartyListSupport: true,
    targetGradeLevel: null,
    targetSection: null,
    targetRoom: null,
  };
  await databases.createDocument(APPWRITE_DB, "elections", sslgElectionId, sslgElection);
  console.log(`  [CREATED] Election: ${sslgElection.title} [ID: ${sslgElectionId}]`);

  // SSLG Party Lists
  const partyLists = [
    {
      id: "pl-sulong",
      name: "Sulong BSF",
      acronym: "SULONG",
      advocacy: "Academic Excellence, Student Welfare, and Marine Resource Stewardship",
      logoUrl: "",
    },
    {
      id: "pl-tinig",
      name: "Tinig ng Kabataan",
      acronym: "TINIG",
      advocacy: "Transparent Leadership, Inclusive Governance, and Youth Development",
      logoUrl: "",
    },
  ];

  for (const pl of partyLists) {
    const plDoc = {
      electionId: sslgElectionId,
      name: pl.name,
      normalizedName: pl.name.trim().toLowerCase(),
      acronym: pl.acronym,
      logoUrl: pl.logoUrl,
      advocacy: pl.advocacy,
    };
    await databases.createDocument(APPWRITE_DB, "partyLists", pl.id, plDoc);
    console.log(`    [CREATED] Party-List: ${pl.name} (${pl.acronym})`);
  }

  // SSLG Positions
  const sslgPositions = [
    "President",
    "Vice President",
    "Secretary",
    "Treasurer",
    "Auditor",
    "Public Information Officer (PIO)",
    "Protocol Officer",
    "Grade 7 Level Representative",
  ];

  for (let i = 0; i < sslgPositions.length; i++) {
    const posName = sslgPositions[i];
    const posId = `pos-sslg-${i + 1}`;
    const posDoc = {
      electionId: sslgElectionId,
      name: posName,
      title: posName,
      normalizedName: posName.trim().toLowerCase(),
    };
    await databases.createDocument(APPWRITE_DB, "positions", posId, posDoc);
    console.log(`    [CREATED] Position: ${posName} [ID: ${posId}]`);
  }

  // 6.2 Class Officer Elections for each of the 4 Grade 7 sections
  const sections = ["GLASSFISH", "SAILFISH", "GARFISH", "MOONFIISH"];
  const classPositions = [
    "Class President",
    "Class Vice President",
    "Class Secretary",
    "Class Treasurer",
    "Class Peace Officer",
  ];

  for (const sec of sections) {
    const sectionElectionId = `e-class-g7-${sec.toLowerCase()}`;
    const sectionElection = {
      title: `Grade 7 - ${sec} Class Officers Election`,
      description: `Class Officer Election for Grade 7 Section ${sec}. Only students of section ${sec} are eligible to cast ballots.`,
      startsAt,
      endsAt,
      scope: "section",
      scopeValue: sec,
      hasPartyList: false,
      hasPartyListSupport: false,
      targetGradeLevel: 7,
      targetSection: sec,
      targetRoom: null,
    };
    await databases.createDocument(APPWRITE_DB, "elections", sectionElectionId, sectionElection);
    console.log(`  [CREATED] Section Election: ${sectionElection.title} [ID: ${sectionElectionId}]`);

    for (let p = 0; p < classPositions.length; p++) {
      const cPosName = classPositions[p];
      const cPosId = `pos-${sec.toLowerCase()}-${p + 1}`;
      const cPosDoc = {
        electionId: sectionElectionId,
        name: cPosName,
        title: cPosName,
        normalizedName: cPosName.trim().toLowerCase(),
      };
      await databases.createDocument(APPWRITE_DB, "positions", cPosId, cPosDoc);
    }
    console.log(`    [CREATED] 5 Class Officer Positions for ${sec}`);
  }

  // Step 7: Comprehensive Verification
  console.log("\n===============================================================");
  console.log("                    DATABASE VERIFICATION                      ");
  console.log("===============================================================");

  const allUsers = await getAllDocuments("users");
  const allElections = await getAllDocuments("elections");
  const allPositions = await getAllDocuments("positions");
  const allPartyLists = await getAllDocuments("partyLists");
  const allVotes = await getAllDocuments("votes");
  const allCandidates = await getAllDocuments("candidates");

  console.log(`Total Users in DB: ${allUsers.length}`);
  const userCountsByRole = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log("Users by Role:", userCountsByRole);

  const studentCountsBySection = allUsers
    .filter((u) => u.role === "student")
    .reduce((acc, u) => {
      acc[u.section] = (acc[u.section] || 0) + 1;
      return acc;
    }, {});
  console.log("Students by Section:", studentCountsBySection);

  console.log(`Total Elections: ${allElections.length}`);
  console.log(`Total Positions: ${allPositions.length}`);
  console.log(`Total Party-Lists: ${allPartyLists.length}`);
  console.log(`Total Candidates: ${allCandidates.length}`);
  console.log(`Total Votes: ${allVotes.length}`);

  // Run domain snapshot integrity check
  const snapshot = {
    users: allUsers.map((u) => ({ id: u.$id, ...u })),
    elections: allElections.map((e) => ({ id: e.$id, ...e })),
    positions: allPositions.map((p) => ({ id: p.$id, ...p })),
    candidates: allCandidates.map((c) => ({ id: c.$id, ...c })),
    votes: allVotes.map((v) => ({ id: v.$id, ...v })),
    partyLists: allPartyLists.map((pl) => ({ id: pl.$id, ...pl })),
  };

  const integrityErrors = validateDatabaseSnapshot(snapshot);
  if (integrityErrors.length > 0) {
    console.error("Snapshot integrity errors:", integrityErrors);
    throw new Error(`Database validation failed with ${integrityErrors.length} errors.`);
  }

  console.log("\n✔ DATABASE SNAPSHOT VALIDATION PASSED WITH 0 ERRORS!");
  console.log("===============================================================");
  console.log("   CLEANUP, STUDENT ONBOARDING, AND ELECTION SETUP COMPLETE!   ");
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

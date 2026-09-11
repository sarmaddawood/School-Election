import { createRequire } from "module";
import crypto from "crypto";
import path from "path";

const require = createRequire(process.cwd() + "/package.json");
const { Client, Databases, Query } = require("node-appwrite");
const XLSX = require("xlsx");

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

function studentDocumentId(studentNumber) {
  const normalized = String(studentNumber ?? "").trim().replace(/\s+/g, "");
  const idStr = normalized.includes("@") ? normalized.toLowerCase() : normalized.toUpperCase();
  const digest = crypto.createHash("sha256").update(idStr).digest("hex").slice(0, 32);
  return `u_${digest}`;
}

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

async function main() {
  console.log("=== Starting Database User Migration ===");

  // 1. Fetch current users
  const currentUsers = await getAllDocuments("users");
  console.log(`Found ${currentUsers.length} total users in Appwrite.`);

  // 2. Identify Admin and delete non-admin users
  let adminKept = 0;
  let usersDeleted = 0;

  for (const user of currentUsers) {
    const isRootAdmin =
      String(user.studentNumber || "").toUpperCase() === "ADMIN" ||
      user.role === "admin";

    if (isRootAdmin) {
      console.log(`[KEEP] Administrator: ${user.fullName} (${user.studentNumber}) [ID: ${user.$id}]`);
      adminKept++;
      continue;
    }

    try {
      await databases.deleteDocument(APPWRITE_DB, "users", user.$id);
      usersDeleted++;
      if (usersDeleted % 20 === 0) {
        console.log(`  Deleted ${usersDeleted} legacy users so far...`);
      }
    } catch (err) {
      console.error(`  Error deleting user ${user.$id}:`, err.message);
    }
  }
  console.log(`Finished user cleanup: ${adminKept} admin preserved, ${usersDeleted} users deleted.`);

  // 3. Clean up legacy demo votes and candidates tied to old dummy users
  const votes = await getAllDocuments("votes");
  console.log(`Cleaning up ${votes.length} legacy demo votes...`);
  for (const vote of votes) {
    try {
      await databases.deleteDocument(APPWRITE_DB, "votes", vote.$id);
    } catch (err) {
      console.error(`  Failed to delete vote ${vote.$id}:`, err.message);
    }
  }

  const candidates = await getAllDocuments("candidates");
  console.log(`Cleaning up ${candidates.length} legacy demo candidates...`);
  for (const cand of candidates) {
    try {
      await databases.deleteDocument(APPWRITE_DB, "candidates", cand.$id);
    } catch (err) {
      console.error(`  Failed to delete candidate ${cand.$id}:`, err.message);
    }
  }

  const ballots = await getAllDocuments("offlineBallots");
  console.log(`Cleaning up ${ballots.length} legacy offline ballots...`);
  for (const ballot of ballots) {
    try {
      await databases.deleteDocument(APPWRITE_DB, "offlineBallots", ballot.$id);
    } catch (err) {
      console.error(`  Failed to delete offline ballot ${ballot.$id}:`, err.message);
    }
  }

  // 4. Onboard 4 Teachers
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

  console.log("\n=== Onboarding 4 DepEd Teachers ===");
  for (const t of teachers) {
    const docId = studentDocumentId(t.email);
    const docData = {
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

    try {
      await databases.createDocument(APPWRITE_DB, "users", docId, docData);
      console.log(`[CREATED] Teacher: ${t.fullName} (${t.email}) -> Section: ${t.section} [ID: ${docId}]`);
    } catch (err) {
      if (err.code === 409) {
        await databases.updateDocument(APPWRITE_DB, "users", docId, docData);
        console.log(`[UPDATED] Teacher: ${t.fullName} (${t.email}) -> Section: ${t.section}`);
      } else {
        console.error(`[ERROR] Failed to create teacher ${t.email}:`, err.message);
      }
    }
  }

  // 5. Extract and Upload Students from 4 SF1 Excel Files
  const excelFiles = [
    { filename: "SF1_2026_Grade 7 (Year I) - GLASSFISH (1).xls", section: "GLASSFISH" },
    { filename: "SF1_2026_Grade 7 (Year I) - SAILFISH (1).xls", section: "SAILFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-GARFISH.xls", section: "GARFISH" },
    { filename: "SF1_2026_Grade-7-Year-I-MOONFIISH.xls", section: "MOONFIISH" },
  ];

  console.log("\n=== Extracting and Onboarding Grade 7 Students ===");
  let totalExtracted = 0;
  let totalUploaded = 0;

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
        sectionStudents.push({ lrn, fullName: cleanedName });
      }
    }

    console.log(`Section ${fileConfig.section}: Extracted ${sectionStudents.length} students from ${fileConfig.filename}`);
    totalExtracted += sectionStudents.length;

    for (const student of sectionStudents) {
      const docId = studentDocumentId(student.lrn);
      const studentData = {
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

      try {
        await databases.createDocument(APPWRITE_DB, "users", docId, studentData);
        totalUploaded++;
      } catch (err) {
        if (err.code === 409) {
          await databases.updateDocument(APPWRITE_DB, "users", docId, studentData);
          totalUploaded++;
        } else {
          console.error(`  [ERROR] Uploading ${student.lrn} (${student.fullName}):`, err.message);
        }
      }
    }
  }

  console.log(`\n=== Student Upload Complete: ${totalUploaded} / ${totalExtracted} students successfully stored. ===`);

  // 6. Verification
  const finalUsers = await getAllDocuments("users");
  console.log(`\n=== Final Verification ===`);
  console.log(`Total users in Appwrite: ${finalUsers.length}`);

  const countsByRole = finalUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log("Users by Role:", JSON.stringify(countsByRole, null, 2));

  const countsBySection = finalUsers.reduce((acc, u) => {
    if (u.role === "student") {
      acc[u.section] = (acc[u.section] || 0) + 1;
    }
    return acc;
  }, {});
  console.log("Grade 7 Students by Section:", JSON.stringify(countsBySection, null, 2));

  console.log("Migration complete!");
}

main().catch(console.error);

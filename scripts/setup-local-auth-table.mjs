import { Client, Users, Databases, Query } from "node-appwrite";

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const usersService = new Users(client);
const databases = new Databases(client);

async function main() {
  console.log("=== Setting up Local Auth on Database Table ===");

  // 1. Clean up Appwrite Auth service accounts (leave owner)
  console.log("Cleaning up external Appwrite Auth accounts...");
  let hasMore = true;
  let authDeleted = 0;
  while (hasMore) {
    const list = await usersService.list([Query.limit(100)]);
    const toDelete = list.users.filter((u) => u.email !== "saldivarcharme@gmail.com");
    if (toDelete.length === 0) {
      hasMore = false;
      break;
    }
    for (const u of toDelete) {
      try {
        await usersService.delete(u.$id);
        authDeleted++;
      } catch (err) {
        console.warn(`Failed to delete auth user ${u.email}:`, err.message);
      }
    }
  }
  console.log(`Cleaned up ${authDeleted} external Appwrite Auth accounts.`);

  // 2. Ensure admin account in table has plain text password123
  try {
    await databases.updateDocument(APPWRITE_DB, "users", "admin", {
      studentNumber: "ADMIN",
      username: "admin@bsf.edu.ph",
      fullName: "System Administrator",
      role: "admin",
      password: "password123",
      hasSetPassword: true,
    });
    console.log("Admin account in 'users' table updated with plain text 'password123'.");
  } catch (err) {
    console.error("Failed to update admin in table:", err.message);
  }

  // 3. Verify all accounts in database table
  const allDbUsers = [];
  let cursor = null;
  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const response = await databases.listDocuments(APPWRITE_DB, "users", queries);
    for (const doc of response.documents) {
      allDbUsers.push(doc);
    }
    cursor = response.documents.length === 100 ? response.documents[response.documents.length - 1].$id : null;
  } while (cursor);

  const breakdown = {
    total: allDbUsers.length,
    admin: allDbUsers.filter((u) => u.role === "admin").length,
    teachers: allDbUsers.filter((u) => u.role === "teacher").length,
    students: allDbUsers.filter((u) => u.role === "student").length,
  };

  console.log("\n=== DATABASE TABLE 'users' SUMMARY ===");
  console.log("Total Accounts on Database Table:", breakdown.total);
  console.log("Role Breakdown:", breakdown);

  const adminDoc = allDbUsers.find((u) => u.role === "admin");
  console.log("\nAdministrator on Table:", {
    id: adminDoc?.$id,
    studentNumber: adminDoc?.studentNumber,
    username: adminDoc?.username,
    role: adminDoc?.role,
    password: adminDoc?.password,
  });

  const teacherDocs = allDbUsers.filter((u) => u.role === "teacher");
  console.log("\nTeachers on Table:");
  for (const t of teacherDocs) {
    console.log(` - ${t.fullName} (${t.studentNumber}) | Section: ${t.section} | hasSetPassword: ${t.hasSetPassword}`);
  }

  console.log(`\nStudents on Table: ${breakdown.students} students ready.`);
  console.log("=== Setup Complete ===");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});

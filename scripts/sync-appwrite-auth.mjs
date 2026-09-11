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

export function getAuthUserId(user) {
  const role = user.role;
  const num = String(user.studentNumber || user.username || "").trim();
  if (role === "admin" || num.toUpperCase() === "ADMIN") {
    return "admin";
  }
  if (num.includes("@")) {
    const cleanEmail = num.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    return `teacher_${cleanEmail}`.slice(0, 36);
  }
  const cleanNum = num.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `student_${cleanNum}`.slice(0, 36);
}

export function getAuthUserEmail(user) {
  const role = user.role;
  const num = String(user.studentNumber || user.username || "").trim();
  if (role === "admin" || num.toUpperCase() === "ADMIN") {
    return "admin@bsf.edu.ph";
  }
  if (num.includes("@")) {
    return num.toLowerCase();
  }
  return `${num}@student.bsf.edu.ph`.toLowerCase();
}

async function fetchAllDatabaseUsers() {
  const list = [];
  let cursor = null;
  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const response = await databases.listDocuments(APPWRITE_DB, "users", queries);
    for (const doc of response.documents) {
      list.push(doc);
    }
    cursor = response.documents.length === 100 ? response.documents[response.documents.length - 1].$id : null;
  } while (cursor);
  return list;
}

async function syncUsersToAuth() {
  console.log("Fetching all users from Appwrite database...");
  const dbUsers = await fetchAllDatabaseUsers();
  console.log(`Found ${dbUsers.length} users in Appwrite database.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const user of dbUsers) {
    const authUserId = getAuthUserId(user);
    const email = getAuthUserEmail(user);
    const fullName = String(user.fullName || "User").trim();
    const role = user.role || "student";
    const labels = [role];
    const prefs = {
      role,
      studentNumber: user.studentNumber || "",
      section: user.section || "",
      yearLevel: user.yearLevel !== null && user.yearLevel !== undefined ? String(user.yearLevel) : "",
    };

    try {
      let existingAuthUser = null;
      try {
        existingAuthUser = await usersService.get(authUserId);
      } catch (err) {
        if (err?.code !== 404) {
          const search = await usersService.list([Query.equal("email", email), Query.limit(1)]);
          if (search.users.length > 0) {
            existingAuthUser = search.users[0];
          }
        }
      }

      if (existingAuthUser) {
        const targetId = existingAuthUser.$id;
        await usersService.updateName(targetId, fullName);
        await usersService.updateLabels(targetId, labels);
        await usersService.updatePrefs(targetId, prefs);
        if (role === "admin" && (!existingAuthUser.passwordUpdate || existingAuthUser.passwordUpdate === "")) {
          await usersService.updatePassword(targetId, "password123");
        }
        updatedCount++;
      } else {
        const createPayload = {
          userId: authUserId,
          email,
          name: fullName,
        };
        if (role === "admin") {
          createPayload.password = "password123";
        }
        await usersService.create(createPayload);
        await usersService.updateLabels(authUserId, labels);
        await usersService.updatePrefs(authUserId, prefs);
        createdCount++;
      }
    } catch (err) {
      console.error(`Failed to sync user ${email} (${authUserId}):`, err.message);
    }
  }

  console.log(`Synchronization Complete: ${createdCount} created, ${updatedCount} updated in Appwrite Auth.`);

  const authList = await usersService.list([Query.limit(100)]);
  console.log(`Total users in Appwrite Auth: ${authList.total}`);
  const rolesFound = { admin: 0, teacher: 0, student: 0, other: 0 };
  for (const u of authList.users) {
    const roleLabel = u.labels?.[0] || "other";
    rolesFound[roleLabel] = (rolesFound[roleLabel] || 0) + 1;
  }
  console.log("Appwrite Auth User Roles Breakdown:", rolesFound);
}

syncUsersToAuth().catch((err) => {
  console.error("Sync script fatal error:", err);
  process.exit(1);
});

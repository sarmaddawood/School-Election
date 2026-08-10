// @ts-nocheck

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Client, Databases, Query, ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const HMAC_OFFLINE_SECRET = "GWC_BOLINAO_ELECTION_HMAC_SECRET_2026";

function generateBallotSignature(payloadStr: string): string {
  return crypto.createHmac("sha256", HMAC_OFFLINE_SECRET).update(payloadStr).digest("hex");
}

function verifyBallotSignature(payloadStr: string, signature: string): boolean {
  try {
    const expected = generateBallotSignature(payloadStr);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

let inMemoryPartyLists: any[] = [];
let inMemoryAuditLogs: any[] = [
  {
    id: "log-1",
    action: "SYSTEM_INIT",
    performedBy: "System Administrator",
    performedByRole: "admin",
    timestamp: new Date().toISOString(),
    details: "Golden West Colleges E-Voting Security Kernel initialized."
  }
];

let inMemoryBranding: any = {
  schoolName: "Golden West Colleges, Inc.",
  tagline: "Golden West Colleges Student E-Voting Portal",
  logoUrl: "/src/assets/images/bolinao_logo_1783614038890.png",
  primaryColor: "#0284c7",
  attributionText: "Developed by students of Golden West Colleges, Inc.",
  contactEmail: "admin@goldenwest.edu.ph",
  address: "Golden West Colleges Campus, Philippines"
};

function logAuditEvent(action: string, performedBy: string, role: string, details: string) {
  const entry = {
    id: "log-" + Math.random().toString(36).substring(2, 9),
    action,
    performedBy,
    performedByRole: role,
    timestamp: new Date().toISOString(),
    details
  };
  inMemoryAuditLogs.unshift(entry);
  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs.pop();
  }
}


let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please check your settings.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}


const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = process.env.APPWRITE_DB || "voting_db";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const upload = multer({ storage: multer.memoryStorage() });

async function ensureCollectionsExist() {
  try {
    // 1. Ensure DB exists
    try {
      await databases.get(APPWRITE_DB);
      console.log(`Appwrite database '${APPWRITE_DB}' verified.`);
    } catch (e: any) {
      console.log(`Database '${APPWRITE_DB}' not found. Creating...`);
      await databases.create(APPWRITE_DB, "Voting DB");
    }

    // List of collections we need and their attributes
    const requiredCollections = [
      {
        id: "users",
        name: "Users",
        attributes: [
          { key: "username", type: "string", size: 255, required: false },
          { key: "password", type: "string", size: 255, required: false },
          { key: "fullName", type: "string", size: 255, required: false },
          { key: "role", type: "string", size: 50, required: false },
          { key: "studentNumber", type: "string", size: 255, required: false },
          { key: "yearLevel", type: "integer", required: false },
          { key: "section", type: "string", size: 255, required: false },
          { key: "room", type: "string", size: 255, required: false },
          { key: "hasSetPassword", type: "boolean", required: false },
          { key: "photoUrl", type: "string", size: 1000, required: false }
        ]
      },
      {
        id: "elections",
        name: "Elections",
        attributes: [
          { key: "title", type: "string", size: 255, required: false },
          { key: "description", type: "string", size: 5000, required: false },
          { key: "startsAt", type: "string", size: 255, required: false },
          { key: "endsAt", type: "string", size: 255, required: false },
          { key: "scope", type: "string", size: 50, required: false },
          { key: "scopeValue", type: "string", size: 255, required: false },
          { key: "hasPartyList", type: "boolean", required: false },
          { key: "targetGradeLevel", type: "integer", required: false },
          { key: "targetSection", type: "string", size: 255, required: false },
          { key: "targetRoom", type: "string", size: 255, required: false },
          { key: "hasPartyListSupport", type: "boolean", required: false }
        ]
      },
      {
        id: "positions",
        name: "Positions",
        attributes: [
          { key: "electionId", type: "string", size: 255, required: false },
          { key: "title", type: "string", size: 255, required: false },
          { key: "name", type: "string", size: 255, required: false }
        ]
      },
      {
        id: "candidates",
        name: "Candidates",
        attributes: [
          { key: "fullName", type: "string", size: 255, required: false },
          { key: "positionId", type: "string", size: 255, required: false },
          { key: "electionId", type: "string", size: 255, required: false },
          { key: "userId", type: "string", size: 255, required: false },
          { key: "party", type: "string", size: 255, required: false },
          { key: "partyListId", type: "string", size: 255, required: false },
          { key: "partyListName", type: "string", size: 255, required: false },
          { key: "manifesto", type: "string", size: 10000, required: false },
          { key: "photoUrl", type: "string", size: 1000, required: false },
          { key: "yearLevel", type: "integer", required: false },
          { key: "voteCount", type: "integer", required: false, defaultValue: 0 }
        ]
      },
      {
        id: "votes",
        name: "Votes",
        attributes: [
          { key: "userId", type: "string", size: 255, required: false },
          { key: "voterId", type: "string", size: 255, required: false },
          { key: "electionId", type: "string", size: 255, required: false },
          { key: "positionId", type: "string", size: 255, required: false },
          { key: "candidateId", type: "string", size: 255, required: false },
          { key: "timestamp", type: "string", size: 255, required: false },
          { key: "isOfflineImport", type: "boolean", required: false }
        ]
      }
    ];

    for (const col of requiredCollections) {
      let existingAttributes: string[] = [];
      try {
        await databases.getCollection(APPWRITE_DB, col.id);
        console.log(`Collection '${col.id}' verified.`);
        const attrRes = await databases.listAttributes(APPWRITE_DB, col.id);
        existingAttributes = (attrRes.attributes || []).map((a: any) => a.key);
      } catch (e: any) {
        console.log(`Collection '${col.id}' not found. Creating...`);
        await databases.createCollection(APPWRITE_DB, col.id, col.name);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check and create missing attributes
      for (const attr of col.attributes) {
        if (!existingAttributes.includes(attr.key)) {
          try {
            if (attr.type === "string") {
              await databases.createStringAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                attr.size || 255,
                attr.required || false,
                undefined,
                false
              );
            } else if (attr.type === "integer") {
              await databases.createIntegerAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                attr.required || false,
                undefined,
                undefined,
                attr.defaultValue !== undefined ? attr.defaultValue : undefined,
                false
              );
            } else if (attr.type === "boolean") {
              await databases.createBooleanAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                attr.required || false,
                undefined,
                false
              );
            }
            console.log(`Created attribute '${attr.key}' in collection '${col.id}'`);
          } catch (attrErr: any) {
            console.error(`Failed/skipped attribute '${attr.key}' in '${col.id}':`, attrErr.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("DB check failed", err.message);
  }
}
ensureCollectionsExist();

async function createMissingAttributeOnTheFly(col: string, key: string, val: any) {
  try {
    if (typeof val === "boolean") {
      await databases.createBooleanAttribute(APPWRITE_DB, col, key, false);
    } else if (typeof val === "number") {
      await databases.createIntegerAttribute(APPWRITE_DB, col, key, false);
    } else {
      await databases.createStringAttribute(APPWRITE_DB, col, key, 255, false);
    }
    console.log(`Triggered on-the-fly attribute creation for '${key}' in collection '${col}'`);
  } catch (e: any) {
    console.warn(`Could not create attribute '${key}' on the fly:`, e.message);
  }
}

async function saveAppwriteDoc(col: string, id: string, data: any, isUpdate = false): Promise<void> {
  const cleanData = { ...data };
  delete cleanData.id;
  for (let key in cleanData) {
    if (cleanData[key] === undefined) cleanData[key] = null;
  }

  try {
    if (isUpdate) {
      await databases.updateDocument(APPWRITE_DB, col, id, cleanData);
    } else {
      await databases.createDocument(APPWRITE_DB, col, id, cleanData);
    }
  } catch (e: any) {
    if (!isUpdate && e.code === 409) {
      return await saveAppwriteDoc(col, id, cleanData, true);
    }

    const errMsg = e.message || "";
    if (errMsg.includes("Unknown attribute:") || errMsg.includes("Invalid document structure")) {
      const match = errMsg.match(/Unknown attribute:\s*"([^"]+)"/i) || errMsg.match(/Unknown attribute:\s*([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const unknownKey = match[1];
        console.warn(`Appwrite collection '${col}' missing attribute '${unknownKey}'. Creating attribute & stripping key for current write...`);
        createMissingAttributeOnTheFly(col, unknownKey, data[unknownKey]);
        delete cleanData[unknownKey];
        return await saveAppwriteDoc(col, id, cleanData, isUpdate);
      }
    }

    throw e;
  }
}

// APPWRITE ADAPTER
class DocRef {
  constructor(col, id) { this.col = col; this.id = id; }
  async get() {
    try {
      const doc = await databases.getDocument(APPWRITE_DB, this.col, this.id);
      return { id: doc.$id, exists: true, data: () => {
        const d = { ...doc };
        delete d.$id;
        delete d.$createdAt;
        delete d.$updatedAt;
        delete d.$permissions;
        delete d.$databaseId;
        delete d.$collectionId;
        return d;
      }};
    } catch (e) {
      return { id: this.id, exists: false, data: () => null };
    }
  }
  async set(data) { 
    await saveAppwriteDoc(this.col, this.id, data, false);
  }
  async update(data) { 
    await saveAppwriteDoc(this.col, this.id, data, true);
  }
  async delete() { 
    try {
      await databases.deleteDocument(APPWRITE_DB, this.col, this.id); 
    } catch(e) {}
  }
}

class QueryAdapter {
  constructor(col, queries) { this.col = col; this.queries = queries || []; }
  where(f, op, v) { 
    let newQ = [];
    if (op === "==") newQ.push(Query.equal(f, v));
    else if (op === ">") newQ.push(Query.greaterThan(f, v));
    else if (op === "<") newQ.push(Query.lessThan(f, v));
    else if (op === ">=") newQ.push(Query.greaterThanEqual(f, v));
    else if (op === "<=") newQ.push(Query.lessThanEqual(f, v));
    return new QueryAdapter(this.col, [...this.queries, ...newQ]); 
  }
  limit(n) { return new QueryAdapter(this.col, [...this.queries, Query.limit(n)]); }
  async get() {
    try {
      const res = await databases.listDocuments(APPWRITE_DB, this.col, this.queries);
      const docs = res.documents.map(doc => ({ id: doc.$id, exists: true, data: () => {
        const d = { ...doc };
        delete d.$id;
        delete d.$createdAt;
        delete d.$updatedAt;
        delete d.$permissions;
        delete d.$databaseId;
        delete d.$collectionId;
        return d;
      }}));
      return { size: docs.length, empty: docs.length === 0, forEach: (cb) => docs.forEach(cb) };
    } catch (e) {
      console.error("List error:", e.message);
      return { size: 0, empty: true, forEach: (cb) => {} };
    }
  }
}

class ColRef extends QueryAdapter {
  constructor(col) { super(col); }
  doc(id) { return new DocRef(this.col, id); }
}

const db = {
  collection: (col) => new ColRef(col),
  batch: () => {
    // Appwrite doesn't have true batches, so we simulate it with promises
    const operations = [];
    const batchObj = {
      set: (docRef, data) => { operations.push(() => docRef.set(data)); return batchObj; },
      update: (docRef, data) => { operations.push(() => docRef.update(data)); return batchObj; },
      delete: (docRef) => { operations.push(() => docRef.delete()); return batchObj; },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      }
    };
    return batchObj;
  },
  runTransaction: async (cb) => {
    // Appwrite doesn't have true transactions, fallback to simple promises
    const transAdapter = {
      get: async (docRef) => {
        return await docRef.get();
      },
      set: async (docRef, data) => { await docRef.set(data); return transAdapter; },
      update: async (docRef, data) => { await docRef.update(data); return transAdapter; },
      delete: async (docRef) => { await docRef.delete(); return transAdapter; }
    };
    return await cb(transAdapter);
  }
};


// Helper database queries
async function getAll(collectionName: string): Promise<any[]> {
  const s = await db.collection(collectionName).limit(1000).get();
  const list: any[] = [];
  s.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function getOne(collectionName: string, id: string): Promise<any> {
  const docSnap = await db.collection(collectionName).doc(id).get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

async function queryPositions(electionId?: string): Promise<any[]> {
  let q = db.collection("positions");
  if (electionId) {
    q = q.where("electionId", "==", electionId);
  }
  const s = await q.get();
  const list: any[] = [];
  s.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function queryCandidates(electionId?: string, positionId?: string): Promise<any[]> {
  let q = db.collection("candidates");
  if (electionId) {
    q = q.where("electionId", "==", electionId);
  }
  if (positionId) {
    q = q.where("positionId", "==", positionId);
  }
  const s = await q.get();
  const list: any[] = [];
  s.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function queryMyVotes(electionId: string, voterId: string): Promise<any[]> {
  const s = await db.collection("votes")
    .where("electionId", "==", electionId)
    .where("voterId", "==", voterId)
    .get();
  const list: any[] = [];
  s.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable("x-powered-by");

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  app.use(express.json({ limit: "10mb" }));

  // Authentication validation middleware
  async function getAuthenticatedUser(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.substring(7);
    if (!token.startsWith("mock-token-")) {
      return null;
    }
    const userId = token.substring(11);
    const user = await getOne("users", userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      studentNumber: user.studentNumber || user.username,
      username: user.username || user.studentNumber,
      fullName: user.fullName,
      role: user.role,
      yearLevel: user.yearLevel,
      section: user.section || null,
      room: user.room || null,
      hasSetPassword: user.hasSetPassword !== false,
      photoUrl: user.photoUrl,
    };
  }

  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      (req as any).user = user;
      next();
    } catch (err: any) {
      console.error("Authentication check failed:", err);
      res.status(500).json({ error: "Authentication check failed: " + (err.message || "Unknown error") });
    }
  }

  async function requireAdminOrTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (user.role !== "admin" && user.role !== "teacher") {
        res.status(403).json({ error: "Forbidden: Admin or Teacher access required" });
        return;
      }
      (req as any).user = user;
      next();
    } catch (err: any) {
      console.error("Admin/Teacher check failed:", err);
      res.status(500).json({ error: "Admin/Teacher check failed: " + (err.message || "Unknown error") });
    }
  }

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (user.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }
      (req as any).user = user;
      next();
    } catch (err: any) {
      console.error("Admin check failed:", err);
      res.status(500).json({ error: "Admin check failed: " + (err.message || "Unknown error") });
    }
  }

  // --- Auth API ---
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    // Accepts studentNumber or username
    const identifier = (req.body.studentNumber || req.body.username || "").toString().trim();
    const password = (req.body.password || "").toString();

    if (!identifier) {
      res.status(400).json({ error: "Student Number or Username is required" });
      return;
    }

    try {
      const allUsers = await getAll("users");
      const user = allUsers.find((u) => {
        const uStudent = u.studentNumber ? u.studentNumber.toLowerCase() : "";
        const uUser = u.username ? u.username.toLowerCase() : "";
        const target = identifier.toLowerCase();
        return uStudent === target || uUser === target;
      });

      if (!user) {
        res.status(401).json({ error: "No account found matching this Student Number or Username" });
        return;
      }

      // Detect first-time login: if no password set yet or explicitly flagged hasSetPassword === false
      if (user.hasSetPassword === false || !user.password || user.password.trim() === "") {
        res.json({
          needsPasswordSetup: true,
          user: {
            id: user.id,
            studentNumber: user.studentNumber || user.username,
            username: user.username || user.studentNumber,
            fullName: user.fullName,
            role: user.role,
            yearLevel: user.yearLevel,
            section: user.section || null,
            room: user.room || null,
          }
        });
        return;
      }

      // Check password
      if (user.password !== password) {
        res.status(401).json({ error: "Invalid password for this account" });
        return;
      }

      logAuditEvent("LOGIN_SUCCESS", user.fullName, user.role, `Logged in via student number ${user.studentNumber || user.username}`);

      res.json({
        user: {
          id: user.id,
          studentNumber: user.studentNumber || user.username,
          username: user.username || user.studentNumber,
          fullName: user.fullName,
          role: user.role,
          yearLevel: user.yearLevel,
          section: user.section || null,
          room: user.room || null,
          hasSetPassword: true,
          photoUrl: user.photoUrl,
        },
        token: `mock-token-${user.id}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log in" });
    }
  });

  // First time login password creation endpoint
  app.post("/api/auth/setup-password", async (req: Request, res: Response) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 4) {
      res.status(400).json({ error: "Valid User ID and new password (min 4 characters) are required" });
      return;
    }

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: "User account not found" });
        return;
      }

      await userRef.update({
        password: newPassword,
        hasSetPassword: true
      });

      const updatedUser = {
        ...userDoc.data(),
        id: userId,
        hasSetPassword: true
      };

      logAuditEvent("FIRST_TIME_PASSWORD_SET", updatedUser.fullName, updatedUser.role, `Set account password for student ${updatedUser.studentNumber || updatedUser.username}`);

      res.json({
        message: "Password configured successfully! Account ready.",
        user: {
          id: updatedUser.id,
          studentNumber: updatedUser.studentNumber || updatedUser.username,
          username: updatedUser.username || updatedUser.studentNumber,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          yearLevel: updatedUser.yearLevel,
          section: updatedUser.section || null,
          room: updatedUser.room || null,
          hasSetPassword: true,
          photoUrl: updatedUser.photoUrl,
        },
        token: `mock-token-${updatedUser.id}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to set account password" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
    res.json({ user: (req as any).user });
  });

  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: "Old and new passwords are required" });
      return;
    }

    try {
      const user = (req as any).user;
      const userRef = db.collection("users").doc(user.id);
      const userDoc = await userRef.get();

      if (!userDoc.exists || userDoc.data()?.password !== oldPassword) {
        res.status(400).json({ error: "Incorrect current password" });
        return;
      }

      await userRef.update({ password: newPassword, hasSetPassword: true });
      logAuditEvent("CHANGE_PASSWORD", user.fullName, user.role, "Updated account password");
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update password" });
    }
  });

  // Helper to ensure photoUrl is hosted in Appwrite storage and stays < 2048 chars
  async function ensureHostedPhotoUrl(photoUrl: string | null | undefined): Promise<string | null> {
    if (!photoUrl || typeof photoUrl !== "string") return null;
    const trimmed = photoUrl.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;

    if (trimmed.startsWith("data:") || trimmed.length > 1500) {
      try {
        const bucketId = "6a4fc63b003db7179644";
        const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer: Buffer;
        let filename = "photo.jpg";

        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], "base64");
          const mime = matches[1];
          if (mime.includes("png")) filename = "photo.png";
          else if (mime.includes("webp")) filename = "photo.webp";
        } else {
          const cleanBase64 = trimmed.replace(/^data:image\/\w+;base64,/, "");
          buffer = Buffer.from(cleanBase64, "base64");
        }

        const fileId = "f-" + Math.random().toString(36).substring(2, 9);
        const appwriteFile = await storage.createFile(
          bucketId,
          fileId,
          InputFile.fromBuffer(buffer, filename)
        );

        const hostedUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${appwriteFile.$id}/view?project=${APPWRITE_PROJECT}`;
        return hostedUrl;
      } catch (err: any) {
        console.error("Failed to upload base64 image to Appwrite storage:", err);
        return null;
      }
    }

    return trimmed;
  }

  // --- Upload API ---
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const bucketId = "6a4fc63b003db7179644";
      const fileId = "f-" + Math.random().toString(36).substring(2, 9);
      
      const appwriteFile = await storage.createFile(
        bucketId,
        fileId,
        InputFile.fromBuffer(req.file.buffer, req.file.originalname)
      );

      const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${appwriteFile.$id}/view?project=${APPWRITE_PROJECT}`;

      res.json({ url: fileUrl, fileId: appwriteFile.$id });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message || "Failed to upload file to Appwrite storage" });
    }
  });

  // --- Users API ---
  app.get("/api/users", requireAdminOrTeacher, async (req: Request, res: Response) => {
    try {
      const users = await getAll("users");
      const list = users.map((u: any) => ({
        id: u.id,
        studentNumber: u.studentNumber || u.username,
        username: u.username || u.studentNumber,
        fullName: u.fullName,
        role: u.role,
        yearLevel: u.yearLevel !== undefined ? u.yearLevel : null,
        section: u.section || null,
        room: u.room || null,
        hasSetPassword: u.hasSetPassword !== false,
        photoUrl: u.photoUrl !== undefined ? u.photoUrl : null,
      }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch users" });
    }
  });

  // Fast Student Search for Candidate Nomination
  app.get("/api/students/search", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const query = (req.query.q || "").toString().toLowerCase().trim();
    try {
      const users = await getAll("users");
      const students = users
        .filter((u: any) => u.role === "student")
        .filter((u: any) => {
          if (!query) return true;
          const sNum = (u.studentNumber || u.username || "").toLowerCase();
          const name = (u.fullName || "").toLowerCase();
          const sec = (u.section || "").toLowerCase();
          const rm = (u.room || "").toLowerCase();
          return sNum.includes(query) || name.includes(query) || sec.includes(query) || rm.includes(query);
        })
        .map((u: any) => ({
          id: u.id,
          studentNumber: u.studentNumber || u.username,
          username: u.username || u.studentNumber,
          fullName: u.fullName,
          role: u.role,
          yearLevel: u.yearLevel || null,
          section: u.section || null,
          room: u.room || null,
          photoUrl: u.photoUrl || null,
        }));
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to search students" });
    }
  });

  app.post("/api/users", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { studentNumber, username, fullName, password, role, yearLevel, section, room } = req.body;
    const finalStudentNumber = (studentNumber || username || "").toString().trim();

    if (!finalStudentNumber || !fullName || !role) {
      res.status(400).json({ error: "Student Number/Username, Full Name, and Role are required" });
      return;
    }
    if (role !== "student" && role !== "teacher") {
      res.status(400).json({ error: "Invalid role assigned" });
      return;
    }

    try {
      const allUsers = await getAll("users");
      const duplicate = allUsers.find((u) => {
        const existingStudent = u.studentNumber ? u.studentNumber.toLowerCase() : "";
        const existingUser = u.username ? u.username.toLowerCase() : "";
        const target = finalStudentNumber.toLowerCase();
        return existingStudent === target || existingUser === target;
      });

      if (duplicate) {
        res.status(400).json({ error: `An account with Student Number / Username "${finalStudentNumber}" already exists!` });
        return;
      }

      const finalPhotoUrl = await ensureHostedPhotoUrl(req.body.photoUrl);
      const hasPassword = password && password.trim().length > 0;

      const newUser = {
        id: "u-" + Math.random().toString(36).substring(2, 9),
        studentNumber: finalStudentNumber,
        username: finalStudentNumber,
        fullName: fullName.trim(),
        password: hasPassword ? password.trim() : "",
        hasSetPassword: hasPassword,
        role,
        yearLevel: yearLevel ? parseInt(yearLevel) : null,
        section: section ? section.trim() : null,
        room: room ? room.trim() : null,
        photoUrl: finalPhotoUrl,
      };

      await db.collection("users").doc(newUser.id).set(newUser);
      logAuditEvent("CREATE_USER", (req as any).user?.fullName || "Admin", (req as any).user?.role || "admin", `Created ${role} account for ${fullName} (${finalStudentNumber})`);

      res.status(201).json({
        id: newUser.id,
        studentNumber: newUser.studentNumber,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        yearLevel: newUser.yearLevel,
        section: newUser.section,
        room: newUser.room,
        hasSetPassword: newUser.hasSetPassword,
        photoUrl: newUser.photoUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create user" });
    }
  });

  app.post("/api/users/bulk", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ error: "Invalid or empty users array provided" });
      return;
    }

    try {
      const existingUsers = await getAll("users");
      const existingStudentNumbers = new Set(
        existingUsers.map((u: any) => {
          if (u.studentNumber) return u.studentNumber.toLowerCase();
          if (u.username) return u.username.toLowerCase();
          return "";
        })
      );

      const created: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const rowNum = i + 1;
        const studentNum = (u.studentNumber || u.username || "").toString().trim();

        if (!studentNum || !u.fullName) {
          errors.push(`Row ${rowNum}: Missing Student Number/Username or Full Name.`);
          continue;
        }

        const role = (u.role || "student").toString().toLowerCase().trim();
        if (role !== "student" && role !== "teacher") {
          errors.push(`Row ${rowNum}: Invalid role "${u.role}". Must be "student" or "teacher".`);
          continue;
        }

        if (existingStudentNumbers.has(studentNum.toLowerCase())) {
          errors.push(`Row ${rowNum}: Student Number "${studentNum}" already exists. Duplicate skipped.`);
          continue;
        }

        const passStr = u.password ? u.password.toString().trim() : "";
        const hasSetPassword = passStr.length > 0;

        const newUser = {
          id: "u-" + Math.random().toString(36).substring(2, 9),
          studentNumber: studentNum,
          username: studentNum,
          fullName: u.fullName.toString().trim(),
          password: passStr,
          hasSetPassword: hasSetPassword,
          role,
          yearLevel: u.yearLevel ? parseInt(u.yearLevel) : (u.gradeLevel ? parseInt(u.gradeLevel) : null),
          section: u.section ? u.section.toString().trim() : null,
          room: u.room ? u.room.toString().trim() : null,
          photoUrl: u.photoUrl || null,
        };

        await db.collection("users").doc(newUser.id).set(newUser);
        existingStudentNumbers.add(studentNum.toLowerCase());
        created.push({
          id: newUser.id,
          studentNumber: newUser.studentNumber,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
          yearLevel: newUser.yearLevel,
          section: newUser.section,
          room: newUser.room,
          hasSetPassword: newUser.hasSetPassword,
          photoUrl: newUser.photoUrl,
        });
      }

      logAuditEvent("BULK_USER_IMPORT", (req as any).user?.fullName || "Admin", (req as any).user?.role || "admin", `Bulk imported ${created.length} student records (${errors.length} skipped/errors).`);

      res.status(201).json({
        success: true,
        createdCount: created.length,
        errors,
        users: created,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process bulk import" });
    }
  });

  app.delete("/api/users/:id", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id === "admin-1") {
      res.status(400).json({ error: "Cannot delete the system administrator" });
      return;
    }

    try {
      const userRef = db.collection("users").doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data()!;
      await userRef.delete();

      // Clean up cascading candidates associated with deleted user
      const candidatesSnapshot = await db.collection("candidates").where("userId", "==", id).get();
      const batch = db.batch();
      candidatesSnapshot.forEach((d) => { batch.delete(db.collection("candidates").doc(d.id)); });
      await batch.commit();

      logAuditEvent("DELETE_USER", (req as any).user?.fullName || "Admin", (req as any).user?.role || "admin", `Deleted user account ${userData.fullName} (${userData.studentNumber || userData.username})`);

      res.json({ message: "User deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  });

  app.put("/api/users/:id/photo", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { photoUrl } = req.body;
    const authUser = (req as any).user;

    if (authUser.id !== id && authUser.role !== "admin" && authUser.role !== "teacher") {
      res.status(403).json({ error: "Forbidden: You can only update your own profile photo" });
      return;
    }

    try {
      const userRef = db.collection("users").doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const finalPhotoUrl = await ensureHostedPhotoUrl(photoUrl);

      await userRef.update({ photoUrl: finalPhotoUrl });
      const userData = userDoc.data() || {};
      const updatedUser = { ...userData, id, photoUrl: finalPhotoUrl };
      delete updatedUser.password;

      res.json({ message: "Profile photo updated successfully", user: updatedUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update profile photo" });
    }
  });

  app.post("/api/users/seed", requireAdmin, async (req: Request, res: Response) => {
    res.json({
      message: "User seeding is disabled. Appwrite database is running in pure production mode.",
      seededCount: 0
    });
  });

  // --- Elections API ---
  app.get("/api/elections", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await getAll("elections");
      const mapped = list.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description || "",
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        scope: e.scope || "all",
        scopeValue: e.scopeValue || e.targetRoom || e.targetSection || (e.targetGradeLevel ? String(e.targetGradeLevel) : "") || "",
        hasPartyList: e.hasPartyList !== undefined ? e.hasPartyList : (e.hasPartyListSupport !== false),
        targetGradeLevel: e.targetGradeLevel !== undefined ? e.targetGradeLevel : null,
        targetSection: e.targetSection || null,
        targetRoom: e.targetRoom || e.scopeValue || null,
        hasPartyListSupport: e.hasPartyListSupport !== false,
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch elections" });
    }
  });

  app.post("/api/elections", requireAdmin, async (req: Request, res: Response) => {
    const { title, description, startsAt, endsAt, scope, scopeValue, hasPartyList, targetGradeLevel, targetSection, targetRoom, hasPartyListSupport } = req.body;
    if (!title || !startsAt || !endsAt) {
      res.status(400).json({ error: "Title, start date, and end date are required" });
      return;
    }

    try {
      const finalScopeValue = (scopeValue || targetRoom || targetSection || (targetGradeLevel ? String(targetGradeLevel) : "") || "").toString().trim();
      const newElection = {
        id: "e-" + Math.random().toString(36).substring(2, 9),
        title,
        description: description || "",
        startsAt,
        endsAt,
        scope: scope || "all",
        scopeValue: finalScopeValue,
        hasPartyList: hasPartyList !== undefined ? hasPartyList : (hasPartyListSupport !== false),
        targetGradeLevel: targetGradeLevel ? parseInt(targetGradeLevel) : null,
        targetSection: targetSection ? targetSection.trim() : null,
        targetRoom: targetRoom ? targetRoom.trim() : (scope === "room" ? finalScopeValue : null),
        hasPartyListSupport: hasPartyListSupport !== false,
      };

      await db.collection("elections").doc(newElection.id).set(newElection);
      logAuditEvent("CREATE_ELECTION", (req as any).user?.fullName || "Admin", "admin", `Created election: ${title} (Scope: ${newElection.scope}, Room/Value: ${finalScopeValue})`);

      res.status(201).json(newElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create election" });
    }
  });

  app.put("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, startsAt, endsAt, scope, scopeValue, hasPartyList, targetGradeLevel, targetSection, targetRoom, hasPartyListSupport } = req.body;
    if (!title || !startsAt || !endsAt) {
      res.status(400).json({ error: "Title, start date, and end date are required" });
      return;
    }

    try {
      const electionRef = db.collection("elections").doc(id);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Election not found" });
        return;
      }

      const finalScopeValue = (scopeValue || targetRoom || targetSection || (targetGradeLevel ? String(targetGradeLevel) : "") || "").toString().trim();
      const updatedElection = {
        id,
        title,
        description: description || "",
        startsAt,
        endsAt,
        scope: scope || "all",
        scopeValue: finalScopeValue,
        hasPartyList: hasPartyList !== undefined ? hasPartyList : (hasPartyListSupport !== false),
        targetGradeLevel: targetGradeLevel ? parseInt(targetGradeLevel) : null,
        targetSection: targetSection ? targetSection.trim() : null,
        targetRoom: targetRoom ? targetRoom.trim() : (scope === "room" ? finalScopeValue : null),
        hasPartyListSupport: hasPartyListSupport !== false,
      };

      await electionRef.set(updatedElection);
      logAuditEvent("UPDATE_ELECTION", (req as any).user?.fullName || "Admin", "admin", `Updated election: ${title} (Room/Value: ${finalScopeValue})`);

      res.json(updatedElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update election" });
    }
  });

  app.delete("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const electionRef = db.collection("elections").doc(id);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Election not found" });
        return;
      }

      const elTitle = electionDoc.data()?.title || id;
      await electionRef.delete();

      // Cascade delete positions, candidates, and votes inside a batch
      const batch = db.batch();
      
      const positions = await db.collection("positions").where("electionId", "==", id).get();
      positions.forEach((doc) => batch.delete(db.collection("positions").doc(doc.id)));

      const candidates = await db.collection("candidates").where("electionId", "==", id).get();
      candidates.forEach((doc) => batch.delete(db.collection("candidates").doc(doc.id)));

      const votes = await db.collection("votes").where("electionId", "==", id).get();
      votes.forEach((doc) => batch.delete(db.collection("votes").doc(doc.id)));

      await batch.commit();

      // Clean party-lists
      inMemoryPartyLists = inMemoryPartyLists.filter((pl) => pl.electionId !== id);

      logAuditEvent("DELETE_ELECTION", (req as any).user?.fullName || "Admin", "admin", `Deleted election: ${elTitle} and all associated records`);

      res.json({ message: "Election deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete election" });
    }
  });

  // --- Party Lists API ---
  app.get("/api/partylists", requireAuth, async (req: Request, res: Response) => {
    const { electionId } = req.query;
    try {
      let lists = inMemoryPartyLists;
      if (electionId) {
        lists = lists.filter((p) => p.electionId === electionId);
      }
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch party-lists" });
    }
  });

  app.post("/api/partylists", requireAdmin, async (req: Request, res: Response) => {
    const { electionId, name, acronym, logoUrl, advocacy } = req.body;
    if (!electionId || !name) {
      res.status(400).json({ error: "Election ID and Party-List name are required" });
      return;
    }

    try {
      const newParty = {
        id: "pl-" + Math.random().toString(36).substring(2, 9),
        electionId,
        name: name.trim(),
        acronym: acronym ? acronym.trim().toUpperCase() : "",
        logoUrl: logoUrl || "",
        advocacy: advocacy || "",
      };

      inMemoryPartyLists.push(newParty);
      logAuditEvent("CREATE_PARTY_LIST", (req as any).user?.fullName || "Admin", "admin", `Registered Party-List "${newParty.name}" (${newParty.acronym})`);

      res.status(201).json(newParty);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create party-list" });
    }
  });

  app.delete("/api/partylists/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      inMemoryPartyLists = inMemoryPartyLists.filter((pl) => pl.id !== id);
      res.json({ message: "Party-List removed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete party-list" });
    }
  });

  // --- Positions API ---
  app.get("/api/positions", requireAuth, async (req: Request, res: Response) => {
    const { electionId } = req.query;
    try {
      const list = await queryPositions(electionId as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch positions" });
    }
  });

  app.post("/api/positions", requireAdmin, async (req: Request, res: Response) => {
    const { electionId, name } = req.body;
    if (!electionId || !name) {
      res.status(400).json({ error: "Election ID and name are required" });
      return;
    }

    try {
      const electionDoc = await db.collection("elections").doc(electionId).get();
      if (!electionDoc.exists) {
        res.status(400).json({ error: "Invalid election" });
        return;
      }

      const newPosition = {
        id: "p-" + Math.random().toString(36).substring(2, 9),
        electionId,
        name,
      };

      await db.collection("positions").doc(newPosition.id).set(newPosition);
      res.status(201).json(newPosition);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create position" });
    }
  });

  app.delete("/api/positions/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const positionRef = db.collection("positions").doc(id);
      const positionDoc = await positionRef.get();
      if (!positionDoc.exists) {
        res.status(404).json({ error: "Position not found" });
        return;
      }

      await positionRef.delete();

      const batch = db.batch();
      const candidates = await db.collection("candidates").where("positionId", "==", id).get();
      candidates.forEach((doc) => batch.delete(db.collection("candidates").doc(doc.id)));

      const votes = await db.collection("votes").where("positionId", "==", id).get();
      votes.forEach((doc) => batch.delete(db.collection("votes").doc(doc.id)));

      await batch.commit();
      res.json({ message: "Position deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete position" });
    }
  });

  app.put("/api/positions/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    try {
      const positionRef = db.collection("positions").doc(id);
      const positionDoc = await positionRef.get();
      if (!positionDoc.exists) {
        res.status(404).json({ error: "Position not found" });
        return;
      }
      await positionRef.update({ name });
      res.json({ message: "Position updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update position" });
    }
  });

  // --- Candidates API ---
  app.get("/api/candidates", requireAuth, async (req: Request, res: Response) => {
    const { electionId, positionId } = req.query;

    try {
      let list = await queryCandidates(electionId as string, positionId as string);
      const user = (req as any).user;

      if (user.role !== "admin" && user.role !== "teacher") {
        const now = new Date();
        const elections = await getAll("elections");
        list = list.map((c: any) => {
          const election = elections.find((e: any) => e.id === c.electionId);
          if (election && new Date(election.endsAt) > now) {
            return { ...c, voteCount: 0 };
          }
          return c;
        });
      }

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch candidates" });
    }
  });

  app.post("/api/candidates", requireAdmin, async (req: Request, res: Response) => {
    const { electionId, positionId, userId, manifesto, party, partyListId, partyListName, photoUrl, targetYearLevel } = req.body;
    if (!electionId || !positionId || !userId) {
      res.status(400).json({ error: "Election, position, and user are required" });
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        res.status(400).json({ error: "Invalid student selected" });
        return;
      }
      const user = userDoc.data()!;

      if (user.role !== "student") {
        res.status(400).json({ error: "Only students can be nominated as candidates" });
        return;
      }

      const duplicateQuery = await db.collection("candidates")
        .where("positionId", "==", positionId)
        .where("userId", "==", userId)
        .get();

      if (!duplicateQuery.empty) {
        res.status(400).json({ error: "Candidate already nominated for this position" });
        return;
      }

      let pName = party || partyListName || "";
      if (partyListId && !pName) {
        const foundPl = inMemoryPartyLists.find((pl) => pl.id === partyListId);
        if (foundPl) pName = foundPl.name;
      }

      const newCandidate = {
        id: "c-" + Math.random().toString(36).substring(2, 9),
        electionId,
        positionId,
        userId,
        fullName: user.fullName,
        manifesto: manifesto || "",
        voteCount: 0,
        yearLevel: targetYearLevel !== undefined ? targetYearLevel : (user.yearLevel || null),
        party: pName || null,
        partyListId: partyListId || null,
        partyListName: pName || null,
        photoUrl: user.photoUrl || photoUrl || null,
      };

      await db.collection("candidates").doc(newCandidate.id).set(newCandidate);
      logAuditEvent("NOMINATE_CANDIDATE", (req as any).user?.fullName || "Admin", "admin", `Nominated ${user.fullName} for candidate ballot`);

      res.status(201).json(newCandidate);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to nominate candidate" });
    }
  });

  app.delete("/api/candidates/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const candidateRef = db.collection("candidates").doc(id);
      const candidateDoc = await candidateRef.get();
      if (!candidateDoc.exists) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }
      const candidate = candidateDoc.data()!;
      await candidateRef.delete();

      const votesSnapshot = await db.collection("votes").where("positionId", "==", candidate.positionId).where("candidateId", "==", id).get();
      const batch = db.batch();
      votesSnapshot.forEach((d) => { batch.delete(db.collection("votes").doc(d.id)); });
      await batch.commit();

      res.json({ message: "Candidate removed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete candidate" });
    }
  });

  // --- Votes API & Offline Import ---
  app.get("/api/votes", requireAdminOrTeacher, async (req: Request, res: Response) => {
    try {
      const list = await getAll("votes");
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch votes" });
    }
  });

  app.get("/api/votes/my", requireAuth, async (req: Request, res: Response) => {
    const { electionId } = req.query;
    if (!electionId) {
      res.status(400).json({ error: "Election ID is required" });
      return;
    }

    try {
      const user = (req as any).user;
      const myVotes = await queryMyVotes(electionId as string, user.id);
      res.json(myVotes);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch your votes" });
    }
  });

  // SINGLE EFFECTIVE VOTE REPLACEMENT & SCOPE ELIGIBILITY CHECK (ONLINE)
  app.post("/api/votes", requireAuth, async (req: Request, res: Response) => {
    const { electionId, positionId, candidateId } = req.body;
    if (!electionId || !positionId || !candidateId) {
      res.status(400).json({ error: "Election, position, and candidate are required" });
      return;
    }

    try {
      const user = (req as any).user;
      if (user.role !== "student") {
        res.status(403).json({ error: "Only students are authorized to vote" });
        return;
      }
      
      const electionDoc = await db.collection("elections").doc(electionId).get();
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Election not found" });
        return;
      }
      const election = electionDoc.data()!;
      const now = new Date();
      const start = new Date(election.startsAt);
      const end = new Date(election.endsAt);
      if (now < start || now > end) {
        res.status(400).json({ error: "Voting window is not active" });
        return;
      }

      // Enforce Election Scope Restrictions
      if (election.scope === "grade" && election.targetGradeLevel) {
        if (user.yearLevel !== election.targetGradeLevel) {
          res.status(403).json({ error: `Ineligible: This election is restricted to Grade ${election.targetGradeLevel} students only.` });
          return;
        }
      } else if (election.scope === "section" && election.targetSection) {
        if (!user.section || user.section.toLowerCase() !== election.targetSection.toLowerCase()) {
          res.status(403).json({ error: `Ineligible: This election is restricted to Section "${election.targetSection}" students.` });
          return;
        }
      } else if (election.scope === "room" && election.targetRoom) {
        if (!user.room || user.room.toLowerCase() !== election.targetRoom.toLowerCase()) {
          res.status(403).json({ error: `Ineligible: This election is restricted to Room "${election.targetRoom}" voters.` });
          return;
        }
      }

      const candidateRef = db.collection("candidates").doc(candidateId);
      const candidateDoc = await candidateRef.get();
      if (!candidateDoc.exists || candidateDoc.data()?.positionId !== positionId) {
        res.status(400).json({ error: "Invalid candidate selected" });
        return;
      }

      // Check existing vote for this election, position, and student
      const existingVotes = await db.collection("votes")
        .where("electionId", "==", electionId)
        .where("positionId", "==", positionId)
        .where("voterId", "==", user.id)
        .get();

      let resultVote: any = null;

      if (!existingVotes.empty) {
        // REPLACE existing vote (Single Effective Vote Rule)
        let oldVoteDoc: any = null;
        existingVotes.forEach((doc) => { oldVoteDoc = { id: doc.id, ...doc.data() }; });

        if (oldVoteDoc.candidateId !== candidateId) {
          // Decrement old candidate count
          const oldCandRef = db.collection("candidates").doc(oldVoteDoc.candidateId);
          const oldCandDoc = await oldCandRef.get();
          if (oldCandDoc.exists) {
            const currentOldCount = oldCandDoc.data()?.voteCount || 0;
            await oldCandRef.update({ voteCount: Math.max(0, currentOldCount - 1) });
          }

          // Increment new candidate count
          const newCandData = candidateDoc.data()!;
          await candidateRef.update({ voteCount: (newCandData.voteCount || 0) + 1 });

          // Update vote document
          await db.collection("votes").doc(oldVoteDoc.id).update({
            candidateId,
            timestamp: new Date().toISOString()
          });

          resultVote = { ...oldVoteDoc, candidateId, timestamp: new Date().toISOString() };
          logAuditEvent("VOTE_REVISED", user.fullName, user.role, `Revised ballot vote for position in election "${election.title}"`);
        } else {
          resultVote = oldVoteDoc;
        }
      } else {
        // Create new vote doc
        const newVote = {
          id: "v-" + Math.random().toString(36).substring(2, 9),
          electionId,
          positionId,
          voterId: user.id,
          candidateId,
          timestamp: new Date().toISOString()
        };

        const candData = candidateDoc.data()!;
        await candidateRef.update({ voteCount: (candData.voteCount || 0) + 1 });
        await db.collection("votes").doc(newVote.id).set(newVote);

        resultVote = newVote;
        logAuditEvent("VOTE_CAST", user.fullName, user.role, `Cast ballot vote for election "${election.title}"`);
      }

      res.status(201).json(resultVote);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit vote" });
    }
  });

  // TEACHER IMPORT OF ENCRYPTED/SIGNED OFFLINE BALLOT FILES
  app.post("/api/votes/import-offline", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { ballot } = req.body;
    if (!ballot || !ballot.voterId || !ballot.electionId || !Array.isArray(ballot.votes) || !ballot.signature) {
      res.status(400).json({ error: "Invalid offline ballot package format or missing signature." });
      return;
    }

    try {
      // 1. Reconstruct signature payload string
      const payloadObj = {
        voterId: ballot.voterId,
        studentNumber: ballot.studentNumber,
        electionId: ballot.electionId,
        votes: ballot.votes,
        timestamp: ballot.timestamp,
        nonce: ballot.nonce
      };
      const payloadStr = JSON.stringify(payloadObj);

      // 2. Verify signature
      const isValid = verifyBallotSignature(payloadStr, ballot.signature);
      if (!isValid) {
        res.status(400).json({ error: "TAMPER DETECTED: Offline vote file signature verification failed! File may have been altered." });
        return;
      }

      // 3. Verify student account
      const studentUser = await getOne("users", ballot.voterId);
      if (!studentUser) {
        res.status(400).json({ error: `Student account ID "${ballot.voterId}" not found in database.` });
        return;
      }

      // 4. Verify election
      const electionDoc = await db.collection("elections").doc(ballot.electionId).get();
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Target election for this offline ballot was not found." });
        return;
      }

      const teacherUser = (req as any).user;
      let importedCount = 0;
      let revisedCount = 0;

      // 5. Process each vote item cleanly applying Single Effective Vote Rule
      for (const item of ballot.votes) {
        const { positionId, candidateId } = item;
        if (!positionId || !candidateId) continue;

        const candidateRef = db.collection("candidates").doc(candidateId);
        const candidateDoc = await candidateRef.get();
        if (!candidateDoc.exists) continue;

        const existingVotes = await db.collection("votes")
          .where("electionId", "==", ballot.electionId)
          .where("positionId", "==", positionId)
          .where("voterId", "==", ballot.voterId)
          .get();

        if (!existingVotes.empty) {
          let oldVoteDoc: any = null;
          existingVotes.forEach((d) => { oldVoteDoc = { id: d.id, ...d.data() }; });

          if (oldVoteDoc.candidateId !== candidateId) {
            const oldCandRef = db.collection("candidates").doc(oldVoteDoc.candidateId);
            const oldCandDoc = await oldCandRef.get();
            if (oldCandDoc.exists) {
              const count = oldCandDoc.data()?.voteCount || 0;
              await oldCandRef.update({ voteCount: Math.max(0, count - 1) });
            }

            const newCandData = candidateDoc.data()!;
            await candidateRef.update({ voteCount: (newCandData.voteCount || 0) + 1 });
            await db.collection("votes").doc(oldVoteDoc.id).update({
              candidateId,
              timestamp: ballot.timestamp || new Date().toISOString(),
              isOfflineImport: true
            });
            revisedCount++;
          }
        } else {
          const newVote = {
            id: "v-" + Math.random().toString(36).substring(2, 9),
            electionId: ballot.electionId,
            positionId,
            voterId: ballot.voterId,
            candidateId,
            timestamp: ballot.timestamp || new Date().toISOString(),
            isOfflineImport: true
          };

          const candData = candidateDoc.data()!;
          await candidateRef.update({ voteCount: (candData.voteCount || 0) + 1 });
          await db.collection("votes").doc(newVote.id).set(newVote);
          importedCount++;
        }
      }

      logAuditEvent("OFFLINE_BALLOT_IMPORTED", teacherUser.fullName, teacherUser.role, `Imported verified offline vote file for student ${studentUser.fullName} (${studentUser.studentNumber || studentUser.username})`);

      res.json({
        success: true,
        message: `Offline ballot imported successfully! (${importedCount} new vote records, ${revisedCount} vote replacements executed).`,
        studentName: studentUser.fullName,
        importedCount,
        revisedCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process offline ballot import" });
    }
  });

  // --- School Branding Settings API ---
  app.get("/api/branding", async (req: Request, res: Response) => {
    res.json(inMemoryBranding);
  });

  app.put("/api/branding", requireAdmin, async (req: Request, res: Response) => {
    try {
      inMemoryBranding = {
        ...inMemoryBranding,
        ...req.body,
        attributionText: "Developed by students of Golden West Colleges, Inc." // Permanently enforced attribution
      };
      logAuditEvent("UPDATE_BRANDING", (req as any).user?.fullName || "Admin", "admin", "Updated school branding settings");
      res.json(inMemoryBranding);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update branding settings" });
    }
  });

  // --- Audit Logs API ---
  app.get("/api/audit-logs", requireAdminOrTeacher, async (req: Request, res: Response) => {
    res.json(inMemoryAuditLogs);
  });

  // --- Diagnostic & Automated Test Suite API ---
  app.get("/api/diagnostics/run-tests", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const results: any[] = [];

    // Test 1: HMAC Signature verification test
    try {
      const testObj = { test: "ballot", timestamp: Date.now() };
      const testStr = JSON.stringify(testObj);
      const sig = generateBallotSignature(testStr);
      const verified = verifyBallotSignature(testStr, sig);
      const tamperedVerified = verifyBallotSignature(testStr + "X", sig);

      results.push({
        test: "HMAC Cryptographic Tamper Shield",
        passed: verified === true && tamperedVerified === false,
        details: verified ? "Signature generated & verified correctly; tampering rejected." : "Signature verification failed."
      });
    } catch (e: any) {
      results.push({ test: "HMAC Cryptographic Tamper Shield", passed: false, details: e.message });
    }

    // Test 2: Student Number Uniqueness Logic
    try {
      const users = await getAll("users");
      const numMap = new Map();
      let duplicateFound = false;

      for (const u of users) {
        const num = (u.studentNumber || u.username || "").toLowerCase();
        if (numMap.has(num)) {
          duplicateFound = true;
          break;
        }
        numMap.set(num, u.id);
      }

      results.push({
        test: "Student Number Account Uniqueness",
        passed: !duplicateFound,
        details: !duplicateFound ? `All ${users.length} user records have unique student numbers.` : "Duplicate student numbers detected!"
      });
    } catch (e: any) {
      results.push({ test: "Student Number Account Uniqueness", passed: false, details: e.message });
    }

    // Test 3: System Attribution Check
    results.push({
      test: "Permanent Golden West Colleges Attribution",
      passed: inMemoryBranding.attributionText.includes("Golden West Colleges"),
      details: `Active attribution string: "${inMemoryBranding.attributionText}"`
    });

    res.json({
      timestamp: new Date().toISOString(),
      allPassed: results.every((r) => r.passed),
      results
    });
  });

  // --- AI Polish API ---
  app.post("/api/ai/suggest-manifesto", requireAuth, async (req: Request, res: Response) => {
    const { positionName, draft } = req.body;
    if (!positionName) {
      res.status(400).json({ error: "Position name is required" });
      return;
    }

    try {
      const ai = getGeminiClient();
      const prompt = `You are an expert student council campaign strategist.
Polishing task: Enhance the following high-school candidate's campaign manifesto for the position of "${positionName}".

Draft to polish: "${draft || ""}"

Requirements:
1. Make it highly engaging, visionary, yet realistic and natural for a school environment.
2. Keep it clean and concise (around 1 to 3 sentences, maximum 60 words).
3. Do NOT include any greetings, intros, outros, or surrounding quotation marks. Return ONLY the polished manifesto text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const polishedText = response.text ? response.text.trim() : draft;
      res.json({ manifesto: polishedText });
    } catch (err: any) {
      console.warn("Gemini manifesto polish failed, using elegant local optimizer fallback:", err.message);
      
      let polishedText = draft || "I promise to represent all students and organize great events!";
      const cleanDraft = draft ? draft.trim() : "";
      
      if (positionName.toLowerCase().includes("president")) {
        polishedText = cleanDraft 
          ? `As President, I am dedicated to making our vision a reality: ${cleanDraft.replace(/^i want to /i, "")} Let's build a more inclusive, connected campus together.`
          : "Dedicated to amplifying student voices, improving campus facilities, and creating a vibrant, inclusive student culture through collaborative action.";
      } else if (positionName.toLowerCase().includes("sport") || positionName.toLowerCase().includes("captain")) {
        polishedText = cleanDraft 
          ? `Empowering our athletes and boosting school spirit: ${cleanDraft.replace(/^i want to /i, "")} Let's win together!`
          : "Fostering school spirit and fitness by organizing inclusive intramural tournaments, upgrading sporting gear, and celebrating every student's athletic journey.";
      } else if (positionName.toLowerCase().includes("art") || positionName.toLowerCase().includes("creative")) {
        polishedText = cleanDraft 
          ? `Unleashing student creativity: ${cleanDraft.replace(/^i want to /i, "")} Let's paint a brighter future.`
          : "Unleashing our school's creative potential by showcasing student artwork, organizing talent showcases, and securing state-of-the-art creative supplies.";
      } else {
        polishedText = cleanDraft 
          ? `Vision for ${positionName}: ${cleanDraft.replace(/^i want to /i, "")} Let's work as one.`
          : `Committed to serving our community with integrity, open communication, and innovative projects to enhance the student experience.`;
      }

      res.json({ 
        manifesto: polishedText,
        warning: "Offline mode enabled. Suggested via heuristic campaign optimizer."
      });
    }
  });

  app.post("/api/seed", requireAdmin, async (req: Request, res: Response) => {
    res.json({
      message: "Professional database seeding is disabled. Appwrite database is running in pure production mode.",
      recordsCount: {
        users: 0,
        elections: 0,
        positions: 0,
        candidates: 0,
        votes: 0,
        total: 0
      }
    });
  });


  // Generic error handler to intercept unhandled errors and return JSON
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  // Serve static UI assets
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        maxAge: "1d",
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$/)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

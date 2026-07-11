// @ts-nocheck

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Client, Databases, Query, ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

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
          { key: "username", type: "string", size: 255, required: true },
          { key: "password", type: "string", size: 255, required: true },
          { key: "fullName", type: "string", size: 255, required: true },
          { key: "role", type: "string", size: 50, required: true },
          { key: "yearLevel", type: "integer", required: false },
          { key: "photoUrl", type: "string", size: 1000, required: false }
        ]
      },
      {
        id: "elections",
        name: "Elections",
        attributes: [
          { key: "title", type: "string", size: 255, required: true },
          { key: "description", type: "string", size: 5000, required: false },
          { key: "startsAt", type: "string", size: 255, required: true },
          { key: "endsAt", type: "string", size: 255, required: true }
        ]
      },
      {
        id: "positions",
        name: "Positions",
        attributes: [
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "title", type: "string", size: 255, required: true }
        ]
      },
      {
        id: "candidates",
        name: "Candidates",
        attributes: [
          { key: "fullName", type: "string", size: 255, required: true },
          { key: "positionId", type: "string", size: 255, required: true },
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "party", type: "string", size: 255, required: false },
          { key: "manifesto", type: "string", size: 10000, required: false },
          { key: "photoUrl", type: "string", size: 1000, required: false },
          { key: "voteCount", type: "integer", required: false, defaultValue: 0 }
        ]
      },
      {
        id: "votes",
        name: "Votes",
        attributes: [
          { key: "userId", type: "string", size: 255, required: true },
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "positionId", type: "string", size: 255, required: true },
          { key: "candidateId", type: "string", size: 255, required: true },
          { key: "timestamp", type: "string", size: 255, required: true }
        ]
      }
    ];

    for (const col of requiredCollections) {
      try {
        await databases.getCollection(APPWRITE_DB, col.id);
        console.log(`Collection '${col.id}' verified.`);
      } catch (e: any) {
        console.log(`Collection '${col.id}' not found. Creating...`);
        await databases.createCollection(APPWRITE_DB, col.id, col.name);
        
        // Wait a brief moment for collection creation to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create attributes
        for (const attr of col.attributes) {
          try {
            if (attr.type === "string") {
              await databases.createStringAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                attr.size || 255,
                attr.required,
                undefined,
                false
              );
            } else if (attr.type === "integer") {
              await databases.createIntegerAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                attr.required,
                undefined,
                undefined,
                attr.defaultValue !== undefined ? attr.defaultValue : undefined,
                false
              );
            }
            console.log(`Created attribute '${attr.key}' in collection '${col.id}'`);
          } catch (attrErr: any) {
            console.error(`Failed to create attribute '${attr.key}' in '${col.id}':`, attrErr.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("DB check failed", err.message);
  }
}
ensureCollectionsExist();

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
    const cleanData = { ...data };
    delete cleanData.id;
    for (let key in cleanData) {
      if (cleanData[key] === undefined) cleanData[key] = null;
    }
    try {
      await databases.createDocument(APPWRITE_DB, this.col, this.id, cleanData);
    } catch(e) {
      if (e.code === 409) {
        await databases.updateDocument(APPWRITE_DB, this.col, this.id, cleanData);
      } else {
        throw e;
      }
    }
  }
  async update(data) { 
    const cleanData = { ...data };
    delete cleanData.id;
    for (let key in cleanData) {
      if (cleanData[key] === undefined) cleanData[key] = null;
    }
    await databases.updateDocument(APPWRITE_DB, this.col, this.id, cleanData); 
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

  app.use(express.json());

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
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      yearLevel: user.yearLevel,
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
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      // Direct username query
      const snapshot = await db.collection("users")
        .where("username", "==", username)
        .get();
      
      let user: any = null;
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.password === password) {
          user = { id: doc.id, ...d };
        }
      });

      // Case-insensitive username fallback if direct exact query missed
      if (!user) {
        const allSnapshot = await db.collection("users").get();
        allSnapshot.forEach((doc) => {
          const d = doc.data();
          if (d.username.toLowerCase() === username.toLowerCase() && d.password === password) {
            user = { id: doc.id, ...d };
          }
        });
      }

      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          yearLevel: user.yearLevel,
          photoUrl: user.photoUrl,
        },
        token: `mock-token-${user.id}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log in" });
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

      await userRef.update({ password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update password" });
    }
  });

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
  app.get("/api/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await getAll("users");
      const list = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        yearLevel: u.yearLevel !== undefined ? u.yearLevel : null,
        photoUrl: u.photoUrl !== undefined ? u.photoUrl : null,
      }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req: Request, res: Response) => {
    const { username, fullName, password, role } = req.body;
    if (!username || !fullName || !password || !role) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    if (role !== "student" && role !== "teacher") {
      res.status(400).json({ error: "Invalid role assigned" });
      return;
    }

    try {
      const existingQuery = await db.collection("users")
        .where("username", "==", username)
        .get();

      if (!existingQuery.empty) {
        res.status(400).json({ error: "Username already exists" });
        return;
      }

      const newUser = {
        id: "u-" + Math.random().toString(36).substring(2, 9),
        username,
        fullName,
        password,
        role,
        yearLevel: req.body.yearLevel || null,
        photoUrl: req.body.photoUrl || null,
      };

      await db.collection("users").doc(newUser.id).set(newUser);
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        yearLevel: newUser.yearLevel,
        photoUrl: newUser.photoUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
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

      await userRef.delete();

      // Clean up cascading candidates associated with deleted user using standard getDocs
      const candidatesSnapshot = await db.collection("candidates").where("userId", "==", id).get();

      const batch = db.batch();
      candidatesSnapshot.forEach((d) => { batch.delete(db.collection("candidates").doc(d.id)); });
      await batch.commit();

      res.json({ message: "User deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete user" });
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
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch elections" });
    }
  });

  app.post("/api/elections", requireAdmin, async (req: Request, res: Response) => {
    const { title, description, startsAt, endsAt } = req.body;
    if (!title || !startsAt || !endsAt) {
      res.status(400).json({ error: "Title, start date, and end date are required" });
      return;
    }

    try {
      const newElection = {
        id: "e-" + Math.random().toString(36).substring(2, 9),
        title,
        description: description || "",
        startsAt,
        endsAt,
      };

      await db.collection("elections").doc(newElection.id).set(newElection);
      res.status(201).json(newElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create election" });
    }
  });

  app.put("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, startsAt, endsAt } = req.body;
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

      const updatedElection = {
        id,
        title,
        description: description || "",
        startsAt,
        endsAt,
      };

      await electionRef.set(updatedElection);
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
      res.json({ message: "Election deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete election" });
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

      // Cascade delete candidates and votes of this position
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

      // Sealed result rule: regular voters cannot see voteCounts until election completes
      if (user.role !== "admin") {
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
    const { electionId, positionId, userId, manifesto, party, photoUrl, targetYearLevel } = req.body;
    if (!electionId || !positionId || !userId) {
      res.status(400).json({ error: "Election, position, and user are required" });
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        res.status(400).json({ error: "Invalid student/teacher selected" });
        return;
      }
      const user = userDoc.data()!;

      if (user.role !== "student") {
        res.status(400).json({ error: "Only students can be nominated as candidates" });
        return;
      }

      // Check duplicate candidates
      const duplicateQuery = await db.collection("candidates")
        .where("positionId", "==", positionId)
        .where("userId", "==", userId)
        .get();

      if (!duplicateQuery.empty) {
        res.status(400).json({ error: "Candidate already nominated for this position" });
        return;
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
        party: party || null,
        photoUrl: user.photoUrl || photoUrl || null,
      };

      await db.collection("candidates").doc(newCandidate.id).set(newCandidate);
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

      // Cascade delete votes registered for this candidate using standard getDocs
      const votesSnapshot = await db.collection("votes").where("positionId", "==", candidate.positionId).where("candidateId", "==", id).get();

      const batch = db.batch();
      votesSnapshot.forEach((d) => { batch.delete(db.collection("votes").doc(d.id)); });
      await batch.commit();

      res.json({ message: "Candidate removed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete candidate" });
    }
  });

  // --- Votes API ---
  app.get("/api/votes", requireAdmin, async (req: Request, res: Response) => {
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

      const candidateRef = db.collection("candidates").doc(candidateId);
      const candidateDoc = await candidateRef.get();
      if (!candidateDoc.exists || candidateDoc.data()?.positionId !== positionId) {
        res.status(400).json({ error: "Invalid candidate selected" });
        return;
      }

      const candData = candidateDoc.data()!;
      // Enforce the constraint that the student's yearLevel must match candidate's target yearLevel if configured
      if (candData.yearLevel && candData.yearLevel !== user.yearLevel) {
        res.status(403).json({ error: `This candidate is only eligible for year level ${candData.yearLevel} voters.` });
        return;
      }

      // Check double voting
      const alreadyVotedQuery = await db.collection("votes")
        .where("electionId", "==", electionId)
        .where("positionId", "==", positionId)
        .where("voterId", "==", user.id)
        .get();

      if (!alreadyVotedQuery.empty) {
        res.status(409).json({ error: "You have already voted for this position" });
        return;
      }

      const newVote = {
        id: "v-" + Math.random().toString(36).substring(2, 9),
        electionId,
        positionId,
        voterId: user.id,
        candidateId,
      };

      // Perform transaction to securely update vote count and write ballot
      await db.runTransaction(async (transaction) => {
        const freshCandDoc = await transaction.get(db.collection("candidates").doc(candidateId));
        const currentCount = freshCandDoc.data()?.voteCount || 0;
        transaction.set(db.collection("votes").doc(newVote.id), newVote);
        transaction.update(db.collection("candidates").doc(candidateId), { voteCount: currentCount + 1 });
      });

      res.status(201).json(newVote);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit vote" });
    }
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
    app.use(express.static(distPath));
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

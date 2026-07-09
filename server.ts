// @ts-nocheck

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Client, Databases, Query, ID } from "node-appwrite";
import { GoogleGenAI } from "@google/genai";

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


const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function ensureCollectionsExist() {
  try {
    try {
      await databases.get(APPWRITE_DB);
    } catch (e) {
      console.log("Creating database...", e.message);
      await databases.create(APPWRITE_DB, "Voting DB");
    }
  } catch (err) {
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

const dbPath = path.join(process.cwd(), "db.json");

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

// Auto seeding from local db.json if database is unseeded
async function ensureDatabaseSeeded() {
  try {
    const usersCount = (await db.collection("users").limit(1).get()).size;
    if (usersCount === 0 && fs.existsSync(dbPath)) {
      console.log("Firestore is empty. Seeding initial data from db.json...");
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      
      const batch = db.batch();
      const now = new Date();
      
      if (Array.isArray(data.users)) {
        data.users.forEach((u: any) => {
          batch.set(db.collection("users").doc(u.id), u);
        });
      }
      
      if (Array.isArray(data.elections)) {
        data.elections.forEach((e: any) => {
          if (e.id === "e-demo") {
            // Guarantee e-demo is always actively live
            e.startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            e.endsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
          }
          batch.set(db.collection("elections").doc(e.id), e);
        });
      }
      
      if (Array.isArray(data.positions)) {
        data.positions.forEach((p: any) => {
          batch.set(db.collection("positions").doc(p.id), p);
        });
      }
      
      if (Array.isArray(data.candidates)) {
        data.candidates.forEach((c: any) => {
          batch.set(db.collection("candidates").doc(c.id), c);
        });
      }
      
      if (Array.isArray(data.votes)) {
        data.votes.forEach((v: any) => {
          batch.set(db.collection("votes").doc(v.id), v);
        });
      }
      
      await batch.commit();
      console.log("Firestore seeding completed successfully.");
    } else {
      console.log("Firestore holds existing users. Skipping auto-seed.");
    }
  } catch (err) {
    console.error("Auto seeding failed:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Run initial auto-seed validation
  await ensureDatabaseSeeded();

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
      if (!user || user.role !== "admin") {
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
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists() || userDoc.data()?.password !== oldPassword) {
        res.status(400).json({ error: "Incorrect current password" });
        return;
      }

      await updateDoc(userRef, { password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update password" });
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
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await deleteDoc(userRef);

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
    try {
      const dummyUsers = [
        // Teachers
        { username: "T-01", fullName: "Sarah Jenkins", role: "teacher", yearLevel: null, password: "password123", photoUrl: null },
        { username: "T-02", fullName: "Robert Martinez", role: "teacher", yearLevel: null, password: "password123", photoUrl: null },
        { username: "T-03", fullName: "Emily Watson", role: "teacher", yearLevel: null, password: "password123", photoUrl: null },
        
        // Year 7
        { username: "S-101", fullName: "Ethan Hunt", role: "student", yearLevel: 7, password: "password123", photoUrl: null },
        { username: "S-102", fullName: "Mia Thomsen", role: "student", yearLevel: 7, password: "password123", photoUrl: null },
        { username: "S-103", fullName: "Oliver Twist", role: "student", yearLevel: 7, password: "password123", photoUrl: null },
        
        // Year 8
        { username: "S-201", fullName: "Amelia Earhart", role: "student", yearLevel: 8, password: "password123", photoUrl: null },
        { username: "S-202", fullName: "Lucas Brown", role: "student", yearLevel: 8, password: "password123", photoUrl: null },
        { username: "S-203", fullName: "Sophia Loren", role: "student", yearLevel: 8, password: "password123", photoUrl: null },
        
        // Year 9
        { username: "S-301", fullName: "David Beckham", role: "student", yearLevel: 9, password: "password123", photoUrl: null },
        { username: "S-302", fullName: "Emma Watson", role: "student", yearLevel: 9, password: "password123", photoUrl: null },
        { username: "S-303", fullName: "James Bond", role: "student", yearLevel: 9, password: "password123", photoUrl: null },
        
        // Year 10
        { username: "S-401", fullName: "Liam Neeson", role: "student", yearLevel: 10, password: "password123", photoUrl: null },
        { username: "S-402", fullName: "Olivia Rodrigo", role: "student", yearLevel: 10, password: "password123", photoUrl: null },
        { username: "S-403", fullName: "Noah Centineo", role: "student", yearLevel: 10, password: "password123", photoUrl: null },
        
        // Year 11
        { username: "S-501", fullName: "Charlotte Bronte", role: "student", yearLevel: 11, password: "password123", photoUrl: null },
        { username: "S-502", fullName: "William Shakespeare", role: "student", yearLevel: 11, password: "password123", photoUrl: null },
        { username: "S-503", fullName: "Benjamin Franklin", role: "student", yearLevel: 11, password: "password123", photoUrl: null },
        
        // Year 12
        { username: "S-601", fullName: "Thomas Edison", role: "student", yearLevel: 12, password: "password123", photoUrl: null },
        { username: "S-602", fullName: "Albert Einstein", role: "student", yearLevel: 12, password: "password123", photoUrl: null },
        { username: "S-603", fullName: "Marie Curie", role: "student", yearLevel: 12, password: "password123", photoUrl: null },
        { username: "S-604", fullName: "Leonardo da Vinci", role: "student", yearLevel: 12, password: "password123", photoUrl: null },
        { username: "S-605", fullName: "Ada Lovelace", role: "student", yearLevel: 12, password: "password123", photoUrl: null },
      ];

      const batch = db.batch();
      const addedUsers = [];

      for (const u of dummyUsers) {
        const existingQuery = await db.collection("users")
          .where("username", "==", u.username)
          .get();

        if (existingQuery.empty) {
          const id = "u-" + Math.random().toString(36).substring(2, 9);
          const newUser = { id, ...u };
          batch.set(db.collection("users").doc, id, newUser);
          addedUsers.push(newUser);
        }
      }

      await batch.commit();
      res.json({ message: `Successfully seeded ${addedUsers.length} dummy users into the database`, seededCount: addedUsers.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to seed dummy users" });
    }
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
      const electionDoc = await getDoc(electionRef);
      if (!electionDoc.exists()) {
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

      await setDoc(electionRef, updatedElection);
      res.json(updatedElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update election" });
    }
  });

  app.delete("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const electionRef = db.collection("elections").doc(id);
      const electionDoc = await getDoc(electionRef);
      if (!electionDoc.exists()) {
        res.status(404).json({ error: "Election not found" });
        return;
      }

      await deleteDoc(electionRef);

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
      if (!electionDoc.exists()) {
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
      const positionDoc = await getDoc(positionRef);
      if (!positionDoc.exists()) {
        res.status(404).json({ error: "Position not found" });
        return;
      }

      await deleteDoc(positionRef);

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
      if (!userDoc.exists()) {
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
      const candidateDoc = await getDoc(candidateRef);
      if (!candidateDoc.exists()) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }
      const candidate = candidateDoc.data()!;
      await deleteDoc(candidateRef);

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
      if (!electionDoc.exists()) {
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
      const candidateDoc = await getDoc(candidateRef);
      if (!candidateDoc.exists() || candidateDoc.data()?.positionId !== positionId) {
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
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const polishedText = response.text ? response.text.trim() : draft;
      res.json({ manifesto: polishedText });
    } catch (err: any) {
      console.error("Gemini manifesto polish failed:", err);
      res.status(500).json({ error: err.message || "Manifesto polish failed" });
    }
  });

  app.post("/api/seed", requireAdmin, async (req: Request, res: Response) => {
    try {
      const now = new Date();

      // 1. Define high-fidelity mock users
      const mockUsers: any[] = [
        { id: "admin-1", username: "admin", password: "ChangeMe!2026Vote", fullName: "System Administrator", role: "admin" },
        
        // Teachers
        { id: "u-t1", username: "teacher1", password: "password123", fullName: "Prof. Sarah Jenkins", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t1" },
        { id: "u-t2", username: "teacher2", password: "password123", fullName: "Dr. David Miller", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t2" },
        { id: "u-t3", username: "teacher3", password: "password123", fullName: "Prof. Robert Chen", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t3" },
        { id: "u-t4", username: "teacher4", password: "password123", fullName: "Mrs. Maria Garcia", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t4" },
        { id: "u-t5", username: "teacher5", password: "password123", fullName: "Mr. James Wilson", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t5" },
        { id: "u-t6", username: "teacher6", password: "password123", fullName: "Dr. Helen Keller", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t6" },
        { id: "u-t7", username: "teacher7", password: "password123", fullName: "Prof. Emily Brown", role: "teacher", photoUrl: "https://i.pravatar.cc/150?u=u-t7" },
      ];

      // Generate 100 student records
      const firstNames = ["Alex", "Jordan", "Emma", "Liam", "Chloe", "Daniel", "Sophia", "Ryan", "Ava", "Noah", "Olivia", "Ethan", "Isabella", "Mason", "Lucas", "Charlotte", "Oliver", "Mia", "Henry", "Harper", "Sebastian", "Evelyn", "Jack", "Lily", "Grace", "Wyatt", "Zoe", "Carter", "Penelope", "Gabriel", "Madison", "Dylan", "Stella", "Leo", "Aria", "Julian", "Violet", "Mateo", "Hazel", "Elias"];
      const lastNames = ["Rivera", "Patel", "Watson", "Neeson", "Bennett", "Kim", "Martinez", "Gallagher", "Dubois", "Jenkins", "Wright", "Hunt", "Cruz", "Mount", "Loren", "Silva", "Horn", "Twist", "Wallace", "Ford", "Lee", "Bach", "Waugh", "Reacher", "Potter", "Cavill", "Kelly", "Earp", "Saldana", "Page", "Garcia", "Beer", "O'Brien", "McCartney", "Gomez", "Russo", "Chang", "Abbott", "Baker", "Clarke"];
      
      const studentNames = [];
      for(let i = 0; i < 100; i++) {
        studentNames.push(`${firstNames[i % firstNames.length]} ${lastNames[(i + 13) % lastNames.length]}`);
      }

      studentNames.forEach((name, i) => {
        const id = `u-s${i + 1}`;
        mockUsers.push({
          id,
          username: `student${i + 1}`,
          password: "password123",
          fullName: name,
          role: "student",
          yearLevel: (i % 6) + 7, // Year 7 to 12
          photoUrl: `https://i.pravatar.cc/150?u=${id}`
        });
      });

      // 2. Define high-fidelity elections
      const activeElection = {
        id: "e-demo",
        title: "School General Election 2026",
        description: "Annual school-wide elections for Student Council President, Sports Captain, and Creative Arts Prefect. All students and faculty are eligible to vote. Ballots are fully anonymous, encrypted, and audit-verifiable.",
        startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Live starting yesterday
        endsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Ending in 5 days
      };

      const endedElection = {
        id: "e-ended",
        title: "Student Council Autumn Elections",
        description: "Completed elections for the Valedictorian Representative position. Voting window is closed, and results are fully sealed and published.",
        startsAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        endsAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000).toISOString(), // 85 days ago
      };

      const mockElections = [activeElection, endedElection];

      // 3. Define positions
      const mockPositions = [
        { id: "p-demo-1", electionId: "e-demo", name: "Student Council President" },
        { id: "p-demo-2", electionId: "e-demo", name: "Sports Captain" },
        { id: "p-demo-3", electionId: "e-demo", name: "Creative Arts Prefect" },
        { id: "p-ended-1", electionId: "e-ended", name: "Valedictorian Representative" },
      ];

      // 4. Define candidates
      const mockCandidates = [
        {
          id: "c-demo-1",
          electionId: "e-demo",
          positionId: "p-demo-1",
          userId: "u-s1",
          fullName: "Alex Rivera",
          manifesto: "Empowering student voice through regular assemblies, expanding library study hours, and launching a student peer-to-peer tutoring network.",
          voteCount: 14,
          party: "Progressive Student Alliance",
          photoUrl: "https://i.pravatar.cc/150?u=u-s1",
          yearLevel: 9,
        },
        {
          id: "c-demo-2",
          electionId: "e-demo",
          positionId: "p-demo-1",
          userId: "u-s2",
          fullName: "Jordan Patel",
          manifesto: "Pioneering green energy projects on campus, enriching cafeteria food quality, and securing extra funding for independent student clubs.",
          voteCount: 11,
          party: "Green Campus Coalition",
          photoUrl: "https://i.pravatar.cc/150?u=u-s2",
          yearLevel: 10,
        },
        {
          id: "c-demo-3",
          electionId: "e-demo",
          positionId: "p-demo-1",
          userId: "u-s7",
          fullName: "Sophia Martinez",
          manifesto: "Implementing monthly student wellness breaks, introducing local community service drives, and launching a direct digital suggestion box.",
          voteCount: 8,
          party: "Wellness First",
          photoUrl: "https://i.pravatar.cc/150?u=u-s7",
          yearLevel: 11,
        },
        {
          id: "c-demo-4",
          electionId: "e-demo",
          positionId: "p-demo-2",
          userId: "u-s4",
          fullName: "Liam Neeson",
          manifesto: "Unlocking physical potential! Organizing competitive inter-house athletic cups, renewing gym equipment, and modernizing field training.",
          voteCount: 18,
          party: "Athletic Vanguard",
          photoUrl: "https://i.pravatar.cc/150?u=u-s4",
          yearLevel: 12,
        },
        {
          id: "c-demo-5",
          electionId: "e-demo",
          positionId: "p-demo-2",
          userId: "u-s5",
          fullName: "Chloe Bennett",
          manifesto: "Fostering athletic inclusion. Organizing non-competitive weekend fun-runs, updating recreational equipment, and celebrating our team spirit.",
          voteCount: 12,
          party: "Inclusive Sports",
          photoUrl: "https://i.pravatar.cc/150?u=u-s5",
          yearLevel: 9,
        },
        {
          id: "c-demo-6",
          electionId: "e-demo",
          positionId: "p-demo-3",
          userId: "u-s6",
          fullName: "Daniel Kim",
          manifesto: "Unleashing student creativity through school-wide murals, interactive darkroom workshops, and a permanent student art exhibition gallery.",
          voteCount: 13,
          party: "Creative Minds",
          photoUrl: "https://i.pravatar.cc/150?u=u-s6",
          yearLevel: 10,
        },
        {
          id: "c-demo-7",
          electionId: "e-demo",
          positionId: "p-demo-3",
          userId: "u-s9",
          fullName: "Ava Dubois",
          manifesto: "Championing student expressions! Supporting digital film festivals, audio synthesis labs, and funding classic drama plays.",
          voteCount: 17,
          party: "Arts Revival",
          photoUrl: "https://i.pravatar.cc/150?u=u-s9",
          yearLevel: 9,
        },
        {
          id: "c-ended-1",
          electionId: "e-ended",
          positionId: "p-ended-1",
          userId: "u-s8",
          fullName: "Ryan Gallagher",
          manifesto: "Academic resilience, shared excellence, and celebrating the unforgettable milestones of our graduating cohort.",
          voteCount: 22,
          party: "Senior Unity",
          photoUrl: "https://i.pravatar.cc/150?u=u-s8",
          yearLevel: 12,
        },
        {
          id: "c-ended-2",
          electionId: "e-ended",
          positionId: "p-ended-1",
          userId: "u-s3",
          fullName: "Emma Watson",
          manifesto: "Fostering analytical mindset, critical research opportunities, and empowering the next generation of scientific explorers.",
          voteCount: 18,
          party: "Future Scientists",
          photoUrl: "https://i.pravatar.cc/150?u=u-s3",
          yearLevel: 11,
        },
      ];

      // 5. Generate votes beautifully
      const mockVotes: any[] = [];
      let voteIndex = 1;

      // Helper to register votes
      const recordVotes = (candId: string, posId: string, electId: string, count: number, voterIds: string[]) => {
        for (let idx = 0; idx < count; idx++) {
          if (idx < voterIds.length) {
            mockVotes.push({
              id: `v-seed-${voteIndex++}`,
              electionId: electId,
              positionId: posId,
              voterId: voterIds[idx],
              candidateId: candId
            });
          }
        }
      };

      // Define lists of voter IDs to partition cleanly
      const studentsPool = mockUsers.filter(u => u.role === "student").map(u => u.id);
      const teachersPool = mockUsers.filter(u => u.role === "teacher").map(u => u.id);
      const allVoters = [...studentsPool, ...teachersPool];

      // President (p-demo-1): c-demo-1 (14), c-demo-2 (11), c-demo-3 (8). Total 33 votes.
      recordVotes("c-demo-1", "p-demo-1", "e-demo", 14, allVoters.slice(0, 14));
      recordVotes("c-demo-2", "p-demo-1", "e-demo", 11, allVoters.slice(14, 25));
      recordVotes("c-demo-3", "p-demo-1", "e-demo", 8, allVoters.slice(25, 33));

      // Sports Captain (p-demo-2): c-demo-4 (18), c-demo-5 (12). Total 30 votes.
      recordVotes("c-demo-4", "p-demo-2", "e-demo", 18, allVoters.slice(2, 20));
      recordVotes("c-demo-5", "p-demo-2", "e-demo", 12, allVoters.slice(20, 32));

      // Creative Arts Prefect (p-demo-3): c-demo-6 (13), c-demo-7 (17). Total 30 votes.
      recordVotes("c-demo-6", "p-demo-3", "e-demo", 13, allVoters.slice(5, 18));
      recordVotes("c-demo-7", "p-demo-3", "e-demo", 17, allVoters.slice(18, 35));

      // Ended Election Valedictorian (p-ended-1): c-ended-1 (22), c-ended-2 (18). Total 40 votes.
      recordVotes("c-ended-1", "p-ended-1", "e-ended", 22, allVoters.slice(0, 22));
      recordVotes("c-ended-2", "p-ended-1", "e-ended", 18, allVoters.slice(22, 40));

      // 6. Complete wipe of existing firestore collections
      const collectionsToWipe = ["users", "elections", "positions", "candidates", "votes"];
      for (const colName of collectionsToWipe) {
        const snap = await db.collection(colName).get();
        if (!snap.empty) {
          const deleteBatch = db.batch();
          snap.forEach((doc) => {
            deleteBatch.delete(doc.ref);
          });
          await deleteBatch.commit();
        }
      }

      // 7. Write new high-fidelity data in batches
      const batch = db.batch();
      
      mockUsers.forEach(u => batch.set(db.collection("users").doc(u.id), u));
      mockElections.forEach(e => batch.set(db.collection("elections").doc(e.id), e));
      mockPositions.forEach(p => batch.set(db.collection("positions").doc(p.id), p));
      mockCandidates.forEach(c => batch.set(db.collection("candidates").doc(c.id), c));
      mockVotes.forEach(v => batch.set(db.collection("votes").doc(v.id), v));

      await batch.commit();

      // 8. Also write back to db.json to persist as local source of truth
      const dataToSave = {
        users: mockUsers,
        elections: mockElections,
        positions: mockPositions,
        candidates: mockCandidates,
        votes: mockVotes
      };
      fs.writeFileSync(dbPath, JSON.stringify(dataToSave, null, 2), "utf8");

      res.json({
        message: "Professional, production-ready dataset successfully generated!",
        recordsCount: {
          users: mockUsers.length,
          elections: mockElections.length,
          positions: mockPositions.length,
          candidates: mockCandidates.length,
          votes: mockVotes.length,
          total: mockUsers.length + mockElections.length + mockPositions.length + mockCandidates.length + mockVotes.length
        }
      });
    } catch (err: any) {
      console.error("Critical seeding error:", err);
      res.status(500).json({ error: err.message || "Failed to seed professional database" });
    }
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

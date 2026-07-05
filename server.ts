// @ts-nocheck

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, limit, writeBatch, runTransaction } from "firebase/firestore";


// Load Firebase applet configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error("Failed to parse firebase-applet-config.json:", err);
  }
}

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const clientDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// ADAPTER to make client DB look like Admin DB
class DocRef {
  constructor(col, id) { this.col = col; this.id = id; }
  get ref() { return doc(clientDb, this.col, this.id); }
  async get() {
    const s = await getDoc(this.ref);
    return { id: s.id, exists: s.exists(), data: () => s.data() };
  }
  async set(data) { await setDoc(this.ref, data); }
  async update(data) { await updateDoc(this.ref, data); }
  async delete() { await deleteDoc(this.ref); }
}

class QueryAdapter {
  constructor(col, q) { this.col = col; this.q = q || collection(clientDb, col); }
  where(f, op, v) { return new QueryAdapter(this.col, query(this.q, where(f, op, v))); }
  limit(n) { return new QueryAdapter(this.col, query(this.q, limit(n))); }
  async get() {
    const s = await getDocs(this.q);
    const docs = [];
    s.forEach(d => docs.push({ id: d.id, exists: d.exists(), data: () => d.data() }));
    return { size: docs.length, empty: docs.length === 0, forEach: (cb) => docs.forEach(cb) };
  }
}

class ColRef extends QueryAdapter {
  constructor(col) { super(col); }
  doc(id) { return new DocRef(this.col, id); }
}

const db = {
  collection: (col) => new ColRef(col),
  batch: () => {
    const b = writeBatch(clientDb);
    return {
      set: (docRef, data) => { b.set(docRef.ref, data); return this; },
      update: (docRef, data) => { b.update(docRef.ref, data); return this; },
      delete: (docRef) => { b.delete(docRef.ref); return this; },
      commit: async () => await b.commit()
    };
  },
  runTransaction: async (cb) => {
    return await runTransaction(clientDb, async (t) => {
      const transAdapter = {
        get: async (docRef) => {
          const s = await t.get(docRef.ref);
          return { id: s.id, exists: s.exists(), data: () => s.data() };
        },
        set: (docRef, data) => { t.set(docRef.ref, data); return transAdapter; },
        update: (docRef, data) => { t.update(docRef.ref, data); return transAdapter; },
        delete: (docRef) => { t.delete(docRef.ref); return transAdapter; }
      };
      return await cb(transAdapter);
    });
  }
};

const dbPath = path.join(process.cwd(), "db.json");

// Helper database queries
async function getAll(collectionName: string): Promise<any[]> {
  const snapshot = await getDocs(collection(clientDb, collectionName));
  const list: any[] = [];
  snapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function getOne(collectionName: string, id: string): Promise<any> {
  const docSnap = await getDoc(doc(clientDb, collectionName, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

async function queryPositions(electionId?: string): Promise<any[]> {
  let q = collection(clientDb, "positions") as any;
  if (electionId) {
    q = query(q, where("electionId", "==", electionId));
  }
  const snapshot = await getDocs(q);
  const list: any[] = [];
  snapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function queryCandidates(electionId?: string, positionId?: string): Promise<any[]> {
  let q = collection(clientDb, "candidates") as any;
  if (electionId) {
    q = query(q, where("electionId", "==", electionId));
  }
  if (positionId) {
    q = query(q, where("positionId", "==", positionId));
  }
  const snapshot = await getDocs(q);
  const list: any[] = [];
  snapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

async function queryMyVotes(electionId: string, voterId: string): Promise<any[]> {
  const q = query(
    collection(clientDb, "votes"),
    where("electionId", "==", electionId),
    where("voterId", "==", voterId)
  );
  const snapshot = await getDocs(q);
  const list: any[] = [];
  snapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

// Auto seeding from local db.json if database is unseeded
async function ensureDatabaseSeeded() {
  try {
    const usersCount = (await getDocs(query(collection(clientDb, "users"), limit(1)))).size;
    if (usersCount === 0 && fs.existsSync(dbPath)) {
      console.log("Firestore is empty. Seeding initial data from db.json...");
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      
      const batch = writeBatch(clientDb);
      const now = new Date();
      
      if (Array.isArray(data.users)) {
        data.users.forEach((u: any) => {
          batch.set(doc(clientDb, "users", u.id), u);
        });
      }
      
      if (Array.isArray(data.elections)) {
        data.elections.forEach((e: any) => {
          if (e.id === "e-demo") {
            // Guarantee e-demo is always actively live
            e.startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            e.endsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
          }
          batch.set(doc(clientDb, "elections", e.id), e);
        });
      }
      
      if (Array.isArray(data.positions)) {
        data.positions.forEach((p: any) => {
          batch.set(doc(clientDb, "positions", p.id), p);
        });
      }
      
      if (Array.isArray(data.candidates)) {
        data.candidates.forEach((c: any) => {
          batch.set(doc(clientDb, "candidates", c.id), c);
        });
      }
      
      if (Array.isArray(data.votes)) {
        data.votes.forEach((v: any) => {
          batch.set(doc(clientDb, "votes", v.id), v);
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
        const allSnapshot = await getDocs(collection(clientDb, "users"));
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
      const userRef = doc(clientDb, "users", user.id);
      const userDoc = await getDoc(userRef);

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

  // --- Users API ---
  app.get("/api/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await getAll("users");
      const list = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
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
      };

      await setDoc(doc(clientDb, "users", newUser.id), newUser);
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
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
      const userRef = doc(clientDb, "users", id);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await userRef.delete();

      // Clean up cascading candidates associated with deleted user
      const candidatesSnapshot = await db.collection("candidates")
        .where("userId", "==", id)
        .get();

      const batch = writeBatch(clientDb);
      candidatesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      res.json({ message: "User deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete user" });
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

      await setDoc(doc(clientDb, "elections", newElection.id), newElection);
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
      const electionRef = doc(clientDb, "elections", id);
      const electionDoc = await getDoc(electionRef);
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

      await setDoc(electionRef, updatedElection);
      res.json(updatedElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update election" });
    }
  });

  app.delete("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const electionRef = doc(clientDb, "elections", id);
      const electionDoc = await getDoc(electionRef);
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Election not found" });
        return;
      }

      await electionRef.delete();

      // Cascade delete positions, candidates, and votes inside a batch
      const batch = writeBatch(clientDb);
      
      const positions = await getDocs(query(collection(clientDb, "positions"), where("electionId", "==", id)));
      positions.forEach((doc) => batch.delete(doc.ref));

      const candidates = await getDocs(query(collection(clientDb, "candidates"), where("electionId", "==", id)));
      candidates.forEach((doc) => batch.delete(doc.ref));

      const votes = await getDocs(query(collection(clientDb, "votes"), where("electionId", "==", id)));
      votes.forEach((doc) => batch.delete(doc.ref));

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
      const electionDoc = await doc(clientDb, "elections", electionId).get();
      if (!electionDoc.exists) {
        res.status(400).json({ error: "Invalid election" });
        return;
      }

      const newPosition = {
        id: "p-" + Math.random().toString(36).substring(2, 9),
        electionId,
        name,
      };

      await setDoc(doc(clientDb, "positions", newPosition.id), newPosition);
      res.status(201).json(newPosition);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create position" });
    }
  });

  app.delete("/api/positions/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const positionRef = doc(clientDb, "positions", id);
      const positionDoc = await getDoc(positionRef);
      if (!positionDoc.exists) {
        res.status(404).json({ error: "Position not found" });
        return;
      }

      await positionRef.delete();

      // Cascade delete candidates and votes of this position
      const batch = writeBatch(clientDb);
      
      const candidates = await getDocs(query(collection(clientDb, "candidates"), where("positionId", "==", id)));
      candidates.forEach((doc) => batch.delete(doc.ref));

      const votes = await getDocs(query(collection(clientDb, "votes"), where("positionId", "==", id)));
      votes.forEach((doc) => batch.delete(doc.ref));

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
    const { electionId, positionId, userId, manifesto } = req.body;
    if (!electionId || !positionId || !userId) {
      res.status(400).json({ error: "Election, position, and user are required" });
      return;
    }

    try {
      const userDoc = await doc(clientDb, "users", userId).get();
      if (!userDoc.exists) {
        res.status(400).json({ error: "Invalid student/teacher selected" });
        return;
      }
      const user = userDoc.data()!;

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
      };

      await setDoc(doc(clientDb, "candidates", newCandidate.id), newCandidate);
      res.status(201).json(newCandidate);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to nominate candidate" });
    }
  });

  app.delete("/api/candidates/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const candidateRef = doc(clientDb, "candidates", id);
      const candidateDoc = await getDoc(candidateRef);
      if (!candidateDoc.exists) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }
      const candidate = candidateDoc.data()!;
      await candidateRef.delete();

      // Cascade delete votes registered for this candidate
      const votes = await db.collection("votes")
        .where("positionId", "==", candidate.positionId)
        .where("candidateId", "==", id)
        .get();

      const batch = writeBatch(clientDb);
      votes.forEach((doc) => batch.delete(doc.ref));
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
      const electionDoc = await doc(clientDb, "elections", electionId).get();
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

      const candidateRef = doc(clientDb, "candidates", candidateId);
      const candidateDoc = await getDoc(candidateRef);
      if (!candidateDoc.exists || candidateDoc.data()?.positionId !== positionId) {
        res.status(400).json({ error: "Invalid candidate selected" });
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
      await runTransaction(clientDb, async (transaction) => {
        const freshCandDoc = await transaction.get(candidateRef);
        const currentCount = freshCandDoc.data()?.voteCount || 0;
        transaction.set(doc(clientDb, "votes", newVote.id), newVote);
        transaction.update(candidateRef, { voteCount: currentCount + 1 });
      });

      res.status(201).json(newVote);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit vote" });
    }
  });

  app.post("/api/seed", requireAdmin, async (req: Request, res: Response) => {
    try {
      const now = new Date();

      // 1. Define high-fidelity mock users
      const mockUsers: any[] = [
        { id: "admin-1", username: "admin", password: "ChangeMe!2026Vote", fullName: "System Administrator", role: "admin" },
        
        // Teachers
        { id: "u-t1", username: "teacher1", password: "password123", fullName: "Prof. Sarah Jenkins", role: "teacher" },
        { id: "u-t2", username: "teacher2", password: "password123", fullName: "Dr. David Miller", role: "teacher" },
        { id: "u-t3", username: "teacher3", password: "password123", fullName: "Prof. Robert Chen", role: "teacher" },
        { id: "u-t4", username: "teacher4", password: "password123", fullName: "Mrs. Maria Garcia", role: "teacher" },
        { id: "u-t5", username: "teacher5", password: "password123", fullName: "Mr. James Wilson", role: "teacher" },
        { id: "u-t6", username: "teacher6", password: "password123", fullName: "Dr. Helen Keller", role: "teacher" },
        { id: "u-t7", username: "teacher7", password: "password123", fullName: "Prof. Emily Brown", role: "teacher" },
      ];

      // Generate 35 student records
      const studentNames = [
        "Alex Rivera", "Jordan Patel", "Emma Watson", "Liam Neeson", "Chloe Bennett",
        "Daniel Kim", "Sophia Martinez", "Ryan Gallagher", "Ava Dubois", "Noah Jenkins",
        "Olivia Wright", "Ethan Hunt", "Isabella Cruz", "Mason Mount", "Sophia Loren",
        "Lucas Silva", "Charlotte Horn", "Oliver Twist", "Mia Wallace", "Henry Ford",
        "Harper Lee", "Sebastian Bach", "Evelyn Waugh", "Jack Reacher", "Lily Potter",
        "Henry Cavill", "Grace Kelly", "Wyatt Earp", "Zoe Saldana", "Carter Page",
        "Penelope Cruz", "Gabriel Garcia", "Madison Beer", "Dylan O'Brien", "Stella McCartney"
      ];

      studentNames.forEach((name, i) => {
        mockUsers.push({
          id: `u-s${i + 1}`,
          username: `student${i + 1}`,
          password: "password123",
          fullName: name,
          role: "student"
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
        },
        {
          id: "c-demo-2",
          electionId: "e-demo",
          positionId: "p-demo-1",
          userId: "u-s2",
          fullName: "Jordan Patel",
          manifesto: "Pioneering green energy projects on campus, enriching cafeteria food quality, and securing extra funding for independent student clubs.",
          voteCount: 11,
        },
        {
          id: "c-demo-3",
          electionId: "e-demo",
          positionId: "p-demo-1",
          userId: "u-s7",
          fullName: "Sophia Martinez",
          manifesto: "Implementing monthly student wellness breaks, introducing local community service drives, and launching a direct digital suggestion box.",
          voteCount: 8,
        },
        {
          id: "c-demo-4",
          electionId: "e-demo",
          positionId: "p-demo-2",
          userId: "u-s4",
          fullName: "Liam Neeson",
          manifesto: "Unlocking physical potential! Organizing competitive inter-house athletic cups, renewing gym equipment, and modernizing field training.",
          voteCount: 18,
        },
        {
          id: "c-demo-5",
          electionId: "e-demo",
          positionId: "p-demo-2",
          userId: "u-s5",
          fullName: "Chloe Bennett",
          manifesto: "Fostering athletic inclusion. Organizing non-competitive weekend fun-runs, updating recreational equipment, and celebrating our team spirit.",
          voteCount: 12,
        },
        {
          id: "c-demo-6",
          electionId: "e-demo",
          positionId: "p-demo-3",
          userId: "u-s6",
          fullName: "Daniel Kim",
          manifesto: "Unleashing student creativity through school-wide murals, interactive darkroom workshops, and a permanent student art exhibition gallery.",
          voteCount: 13,
        },
        {
          id: "c-demo-7",
          electionId: "e-demo",
          positionId: "p-demo-3",
          userId: "u-s9",
          fullName: "Ava Dubois",
          manifesto: "Championing student expressions! Supporting digital film festivals, audio synthesis labs, and funding classic drama plays.",
          voteCount: 17,
        },
        {
          id: "c-ended-1",
          electionId: "e-ended",
          positionId: "p-ended-1",
          userId: "u-s8",
          fullName: "Ryan Gallagher",
          manifesto: "Academic resilience, shared excellence, and celebrating the unforgettable milestones of our graduating cohort.",
          voteCount: 22,
        },
        {
          id: "c-ended-2",
          electionId: "e-ended",
          positionId: "p-ended-1",
          userId: "u-s3",
          fullName: "Emma Watson",
          manifesto: "Fostering analytical mindset, critical research opportunities, and empowering the next generation of scientific explorers.",
          voteCount: 18,
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
        const snap = await getDocs(collection(clientDb, colName));
        if (!snap.empty) {
          const deleteBatch = writeBatch(clientDb);
          snap.forEach((doc) => {
            deleteBatch.delete(doc.ref);
          });
          await deleteBatch.commit();
        }
      }

      // 7. Write new high-fidelity data in batches
      const batch = writeBatch(clientDb);
      
      mockUsers.forEach(u => batch.set(doc(clientDb, "users", u.id), u));
      mockElections.forEach(e => batch.set(doc(clientDb, "elections", e.id), e));
      mockPositions.forEach(p => batch.set(doc(clientDb, "positions", p.id), p));
      mockCandidates.forEach(c => batch.set(doc(clientDb, "candidates", c.id), c));
      mockVotes.forEach(v => batch.set(doc(clientDb, "votes", v.id), v));

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
  if (process.env.DISABLE_HMR === "true" || process.env.NODE_ENV === "production") {
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

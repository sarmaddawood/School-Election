// @ts-nocheck

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Client, Databases, Query, ID, Storage, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import {
  canViewElectionResults,
  createOfflinePermit,
  createSignedToken,
  decryptOfflineBallot,
  effectiveVoteDocumentId,
  getElectionPhase,
  getOfflineEncryptionPublicKey,
  hashPassword,
  isEligibleForElection,
  normalizeStudentNumber,
  studentDocumentId,
  validateElectionInput,
  validateDatabaseSnapshot,
  validatePassword,
  validateStudentNumber,
  verifyOfflinePermit,
  verifyPassword,
  verifySignedToken,
} from "./server/domain";

// Test-project configuration is intentionally embedded so the repository can
// run without a separate environment file.
const APP_SECURITY_SECRET = "GWC_BOLINAO_ELECTION_HMAC_SECRET_2026";
const BOOTSTRAP_ADMIN_STUDENT_NUMBER = "ADMIN";
const BOOTSTRAP_ADMIN_PASSWORD = "password123";
const BOOTSTRAP_ADMIN_NAME = "System Administrator";

const DEFAULT_BRANDING: any = {
  schoolName: "Golden West Colleges, Inc.",
  tagline: "Golden West Colleges Student E-Voting Portal",
  logoUrl: "/src/assets/images/bolinao_logo_1783614038890.png",
  primaryColor: "#0284c7",
  attributionText: "Developed by students of Golden West Colleges, Inc.",
  contactEmail: "admin@goldenwest.edu.ph",
  address: "Golden West Colleges Campus, Philippines"
};

async function logAuditEvent(action: string, performedBy: string, role: string, details: string) {
  const entry = {
    id: ID.unique(),
    action,
    performedBy,
    performedByRole: role,
    timestamp: new Date().toISOString(),
    details: String(details || "").slice(0, 5000),
  };
  try {
    await saveAppwriteDoc("auditLogs", entry.id, entry, false);
  } catch (error: any) {
    console.error("Failed to persist audit event:", error.message);
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


const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";
const APPWRITE_BUCKET_ID = "6a4fc63b003db7179644";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    callback(allowed.has(file.mimetype) ? null : new Error("Only JPEG, PNG, and WEBP images are allowed"), allowed.has(file.mimetype));
  },
});

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

    try {
      const bucket = await storage.getBucket(APPWRITE_BUCKET_ID);
      const publicRead = Permission.read(Role.any());
      if (!bucket.$permissions.includes(publicRead)) {
        await storage.updateBucket({
          bucketId: APPWRITE_BUCKET_ID,
          name: bucket.name,
          permissions: [...bucket.$permissions, publicRead],
        });
      }
      console.log(`Appwrite storage bucket '${APPWRITE_BUCKET_ID}' verified.`);
    } catch (error: any) {
      if (error?.code !== 404) throw error;
      await storage.createBucket({
        bucketId: APPWRITE_BUCKET_ID,
        name: "School Election Images",
        permissions: [Permission.read(Role.any())],
        fileSecurity: false,
        enabled: true,
        maximumFileSize: 5 * 1024 * 1024,
        allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
        encryption: true,
        antivirus: true,
        transformations: true,
      });
      console.log(`Created Appwrite storage bucket '${APPWRITE_BUCKET_ID}'.`);
    }

    // List of collections we need and their attributes
    const requiredCollections = [
      {
        id: "users",
        name: "Users",
        attributes: [
          { key: "username", type: "string", size: 255, required: false },
          { key: "password", type: "string", size: 255, required: true },
          { key: "fullName", type: "string", size: 255, required: true },
          { key: "role", type: "string", size: 50, required: true },
          { key: "studentNumber", type: "string", size: 255, required: true },
          { key: "yearLevel", type: "integer", required: false },
          { key: "section", type: "string", size: 255, required: false },
          { key: "room", type: "string", size: 255, required: false },
          { key: "hasSetPassword", type: "boolean", required: true },
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
          { key: "endsAt", type: "string", size: 255, required: true },
          { key: "scope", type: "string", size: 50, required: true },
          { key: "scopeValue", type: "string", size: 255, required: true },
          { key: "hasPartyList", type: "boolean", required: true },
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
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "title", type: "string", size: 255, required: false },
          { key: "name", type: "string", size: 255, required: true },
          { key: "normalizedName", type: "string", size: 255, required: true }
        ]
      },
      {
        id: "candidates",
        name: "Candidates",
        attributes: [
          { key: "fullName", type: "string", size: 255, required: true },
          { key: "positionId", type: "string", size: 255, required: true },
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "userId", type: "string", size: 255, required: true },
          { key: "party", type: "string", size: 255, required: false },
          { key: "partyListId", type: "string", size: 255, required: false },
          { key: "partyListName", type: "string", size: 255, required: false },
          { key: "manifesto", type: "string", size: 10000, required: true },
          { key: "photoUrl", type: "string", size: 1000, required: false },
          { key: "yearLevel", type: "integer", required: false },
          { key: "voteCount", type: "integer", required: false, defaultValue: 0 }
        ]
      },
      {
        id: "votes",
        name: "Votes",
        attributes: [
          { key: "userId", type: "string", size: 255, required: true },
          { key: "voterId", type: "string", size: 255, required: true },
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "positionId", type: "string", size: 255, required: true },
          { key: "candidateId", type: "string", size: 255, required: true },
          { key: "timestamp", type: "string", size: 255, required: true },
          { key: "isOfflineImport", type: "boolean", required: true }
        ]
      },
      {
        id: "partyLists",
        name: "Party Lists",
        attributes: [
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "name", type: "string", size: 255, required: true },
          { key: "normalizedName", type: "string", size: 255, required: true },
          { key: "acronym", type: "string", size: 50, required: false },
          { key: "logoUrl", type: "string", size: 1000, required: false },
          { key: "advocacy", type: "string", size: 5000, required: false }
        ]
      },
      {
        id: "branding",
        name: "School Branding",
        attributes: [
          { key: "schoolName", type: "string", size: 255, required: true },
          { key: "tagline", type: "string", size: 500, required: true },
          { key: "logoUrl", type: "string", size: 1000, required: true },
          { key: "primaryColor", type: "string", size: 50, required: true },
          { key: "attributionText", type: "string", size: 500, required: true },
          { key: "contactEmail", type: "string", size: 255, required: false },
          { key: "address", type: "string", size: 1000, required: false }
        ]
      },
      {
        id: "auditLogs",
        name: "Audit Logs",
        attributes: [
          { key: "action", type: "string", size: 255, required: true },
          { key: "performedBy", type: "string", size: 255, required: true },
          { key: "performedByRole", type: "string", size: 50, required: true },
          { key: "timestamp", type: "string", size: 255, required: true },
          { key: "details", type: "string", size: 5000, required: true }
        ]
      },
      {
        id: "offlineBallots",
        name: "Imported Offline Ballots",
        attributes: [
          { key: "nonce", type: "string", size: 255, required: true },
          { key: "voterId", type: "string", size: 255, required: true },
          { key: "electionId", type: "string", size: 255, required: true },
          { key: "importedAt", type: "string", size: 255, required: true },
          { key: "importedBy", type: "string", size: 255, required: true }
        ]
      }
    ];

    for (const col of requiredCollections) {
      let existingAttributes: string[] = [];
      let createdCollection = false;
      try {
        await databases.getCollection(APPWRITE_DB, col.id);
        console.log(`Collection '${col.id}' verified.`);
        const attrRes = await databases.listAttributes(APPWRITE_DB, col.id);
        existingAttributes = (attrRes.attributes || []).map((a: any) => a.key);
      } catch (e: any) {
        console.log(`Collection '${col.id}' not found. Creating...`);
        await databases.createCollection(APPWRITE_DB, col.id, col.name);
        createdCollection = true;
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
                createdCollection && attr.required === true,
                undefined,
                false
              );
            } else if (attr.type === "integer") {
              await databases.createIntegerAttribute(
                APPWRITE_DB,
                col.id,
                attr.key,
                createdCollection && attr.required === true,
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
                createdCollection && attr.required === true,
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

    const migrationAttributes = [
      { collection: "users", attributes: ["studentNumber", "password", "fullName", "role", "hasSetPassword"] },
      { collection: "positions", attributes: ["electionId", "name", "normalizedName"] },
      { collection: "partyLists", attributes: ["electionId", "name", "normalizedName"] },
    ];
    let migrationSchemaReady = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const readiness = await Promise.all(migrationAttributes.map(async ({ collection, attributes }) => {
        const response = await databases.listAttributes(APPWRITE_DB, collection);
        const available = new Set(response.attributes.filter((attribute: any) => attribute.status === "available").map((attribute: any) => attribute.key));
        return attributes.every((attribute) => available.has(attribute));
      }));
      migrationSchemaReady = readiness.every(Boolean);
      if (migrationSchemaReady) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!migrationSchemaReady) {
      throw new Error("Appwrite attributes did not become ready before the migration timeout");
    }

    // Normalize legacy identifiers before installing uniqueness constraints.
    const users = await getAll("users");
    const studentNumbers = new Map<string, string>();
    for (const user of users) {
      const normalized = normalizeStudentNumber(user.studentNumber || user.username);
      const validationError = validateStudentNumber(normalized);
      if (validationError) {
        throw new Error(`Cannot migrate user '${user.id}': ${validationError}`);
      }
      const duplicateId = studentNumbers.get(normalized);
      if (duplicateId && duplicateId !== user.id) {
        throw new Error(`Duplicate Student Number '${normalized}' exists on users '${duplicateId}' and '${user.id}'`);
      }
      studentNumbers.set(normalized, user.id);
      const userUpdate: Record<string, unknown> = {};
      if (user.studentNumber !== normalized) userUpdate.studentNumber = normalized;
      const expectedPasswordState = Boolean(String(user.password || "").trim());
      if (user.hasSetPassword !== expectedPasswordState) userUpdate.hasSetPassword = expectedPasswordState;
      if (Object.keys(userUpdate).length > 0) {
        await databases.updateDocument(APPWRITE_DB, "users", user.id, userUpdate);
        Object.assign(user, userUpdate);
      }
    }

    if (!users.some((user) => user.role === "admin")) {
      const bootstrapStudentNumber = normalizeStudentNumber(BOOTSTRAP_ADMIN_STUDENT_NUMBER);
      const bootstrapPassword = BOOTSTRAP_ADMIN_PASSWORD;
      const bootstrapName = BOOTSTRAP_ADMIN_NAME;
      const studentNumberError = validateStudentNumber(bootstrapStudentNumber);
      const passwordError = validatePassword(bootstrapPassword);
      if (studentNumberError || passwordError || !bootstrapName) {
        throw new Error("The embedded bootstrap administrator configuration is invalid.");
      }
      const bootstrapId = studentDocumentId(bootstrapStudentNumber);
      await databases.createDocument(APPWRITE_DB, "users", bootstrapId, {
        studentNumber: bootstrapStudentNumber,
        password: await hashPassword(bootstrapPassword),
        fullName: bootstrapName.slice(0, 255),
        role: "admin",
        yearLevel: null,
        section: null,
        room: null,
        hasSetPassword: true,
        photoUrl: null,
      });
      users.push({ id: bootstrapId, studentNumber: bootstrapStudentNumber, fullName: bootstrapName, role: "admin" });
      console.log(`Created embedded test administrator '${bootstrapStudentNumber}'.`);
    }

    const normalizeScopedNames = async (collection: "positions" | "partyLists") => {
      const records = await getAll(collection);
      const scopedNames = new Map<string, string>();
      for (const record of records) {
        const normalizedName = String(record.name || record.title || "").trim().toLocaleLowerCase();
        if (!record.electionId || !normalizedName) {
          throw new Error(`Cannot migrate ${collection} record '${record.id}': election and name are required`);
        }
        const key = `${record.electionId}\u0000${normalizedName}`;
        const duplicateId = scopedNames.get(key);
        if (duplicateId && duplicateId !== record.id) {
          throw new Error(`Duplicate ${collection} name '${record.name}' exists in election '${record.electionId}'`);
        }
        scopedNames.set(key, record.id);
        const update: Record<string, unknown> = {};
        if (record.normalizedName !== normalizedName) update.normalizedName = normalizedName;
        if (collection === "positions" && !record.name && record.title) update.name = String(record.title).trim();
        if (Object.keys(update).length > 0) {
          await databases.updateDocument(APPWRITE_DB, collection, record.id, update);
        }
      }
    };
    await normalizeScopedNames("positions");
    await normalizeScopedNames("partyLists");

    const legacyElections = await getAll("elections");
    for (const election of legacyElections) {
      const requestedScope = ["all", "grade", "section", "room"].includes(election.scope) ? election.scope : "all";
      const requestedScopeValue = requestedScope === "grade"
        ? String(election.scopeValue || election.targetGradeLevel || "")
        : requestedScope === "section"
          ? String(election.scopeValue || election.targetSection || "")
          : requestedScope === "room"
            ? String(election.scopeValue || election.targetRoom || "")
            : "";
      const trimmedScopeValue = requestedScopeValue.trim();
      const parsedRequestedGrade = Number.parseInt(trimmedScopeValue, 10);
      // Older demo elections could carry a scoped type without a target. Treat
      // those as school-wide so existing nominations and votes remain usable.
      const scope = requestedScope === "grade"
        ? (Number.isInteger(parsedRequestedGrade) && parsedRequestedGrade >= 1 && parsedRequestedGrade <= 12 ? "grade" : "all")
        : requestedScope !== "all" && !trimmedScopeValue
          ? "all"
          : requestedScope;
      const scopeValue = scope === "all" ? "" : trimmedScopeValue;
      const hasPartyList = scope === "all" && (election.hasPartyList === true || election.hasPartyListSupport === true);
      const parsedGrade = Number.parseInt(scopeValue, 10);
      const normalizedElection = {
        scope,
        scopeValue: scopeValue.trim(),
        hasPartyList,
        targetGradeLevel: scope === "grade" && Number.isInteger(parsedGrade) ? parsedGrade : null,
        targetSection: scope === "section" ? scopeValue.trim() : null,
        targetRoom: scope === "room" ? scopeValue.trim() : null,
        hasPartyListSupport: hasPartyList,
      };
      if (
        election.scope !== normalizedElection.scope ||
        String(election.scopeValue || "") !== normalizedElection.scopeValue ||
        election.hasPartyList !== normalizedElection.hasPartyList ||
        election.targetGradeLevel !== normalizedElection.targetGradeLevel ||
        (election.targetSection || null) !== normalizedElection.targetSection ||
        (election.targetRoom || null) !== normalizedElection.targetRoom ||
        election.hasPartyListSupport !== normalizedElection.hasPartyListSupport
      ) {
        await databases.updateDocument(APPWRITE_DB, "elections", election.id, normalizedElection);
      }
    }

    // Collapse legacy duplicate votes before creating the composite unique
    // index. The newest record remains effective, matching the replacement
    // semantics used by both online and imported offline ballots.
    const migratedElections = new Map((await getAll("elections")).map((record) => [record.id, record]));
    const migratedUsers = new Map((await getAll("users")).map((record) => [record.id, record]));
    const migratedPositions = new Map((await getAll("positions")).map((record) => [record.id, record]));
    const migratedCandidates = new Map((await getAll("candidates")).map((record) => [record.id, record]));
    const legacyVotes = await getAll("votes");
    const voteGroups = new Map<string, any[]>();
    for (const vote of legacyVotes) {
      const election = migratedElections.get(vote.electionId);
      const position = migratedPositions.get(vote.positionId);
      const candidate = migratedCandidates.get(vote.candidateId);
      const voter = migratedUsers.get(vote.voterId);
      const isValidLegacyVote = Boolean(
        election &&
        position?.electionId === vote.electionId &&
        candidate?.electionId === vote.electionId &&
        candidate?.positionId === vote.positionId &&
        voter?.role === "student" &&
        isEligibleForElection(voter, election),
      );
      if (!isValidLegacyVote) {
        await databases.deleteDocument(APPWRITE_DB, "votes", vote.id);
        continue;
      }
      const key = `${vote.electionId}\u0000${vote.positionId}\u0000${vote.voterId}`;
      const group = voteGroups.get(key) || [];
      group.push(vote);
      voteGroups.set(key, group);
    }
    for (const group of voteGroups.values()) {
      group.sort((left, right) => {
        const leftTime = new Date(left.timestamp || left.$updatedAt || left.$createdAt || 0).getTime();
        const rightTime = new Date(right.timestamp || right.$updatedAt || right.$createdAt || 0).getTime();
        return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      });
      const effective = group[0];
      const election = migratedElections.get(effective.electionId);
      const update: Record<string, unknown> = {};
      const recordedTime = new Date(effective.timestamp).getTime();
      if (election) {
        const startsAt = new Date(election.startsAt).getTime();
        const endsAt = new Date(election.endsAt).getTime();
        if (!Number.isFinite(recordedTime) || recordedTime < startsAt) update.timestamp = new Date(startsAt).toISOString();
        else if (recordedTime > endsAt) update.timestamp = new Date(endsAt).toISOString();
      }
      if (!effective.userId && effective.voterId) update.userId = effective.voterId;
      if (typeof effective.isOfflineImport !== "boolean") update.isOfflineImport = false;
      if (Object.keys(update).length > 0) {
        await databases.updateDocument(APPWRITE_DB, "votes", effective.id, update);
      }
      for (const duplicate of group.slice(1)) {
        await databases.deleteDocument(APPWRITE_DB, "votes", duplicate.id);
      }
    }

    const databaseSnapshot = {
      users: await getAll("users"),
      elections: await getAll("elections"),
      positions: await getAll("positions"),
      candidates: await getAll("candidates"),
      votes: await getAll("votes"),
      partyLists: await getAll("partyLists"),
    };
    const integrityErrors = validateDatabaseSnapshot(databaseSnapshot);
    if (integrityErrors.length > 0) {
      throw new Error(`Appwrite integrity check failed: ${integrityErrors.slice(0, 10).join("; ")}${integrityErrors.length > 10 ? `; and ${integrityErrors.length - 10} more` : ""}`);
    }

    const requiredIndexes = [
      { collection: "users", id: "student_number_unique", type: "unique", attributes: ["studentNumber"] },
      { collection: "users", id: "role_index", type: "key", attributes: ["role"] },
      { collection: "positions", id: "positions_election", type: "key", attributes: ["electionId"] },
      { collection: "positions", id: "positions_election_name", type: "unique", attributes: ["electionId", "normalizedName"] },
      { collection: "candidates", id: "candidates_election", type: "key", attributes: ["electionId"] },
      { collection: "candidates", id: "candidates_election_position", type: "key", attributes: ["electionId", "positionId"] },
      { collection: "candidates", id: "candidates_position_user", type: "unique", attributes: ["positionId", "userId"] },
      { collection: "candidates", id: "candidates_user", type: "key", attributes: ["userId"] },
      { collection: "candidates", id: "candidates_party_list", type: "key", attributes: ["partyListId"] },
      { collection: "votes", id: "votes_election_voter", type: "key", attributes: ["electionId", "voterId"] },
      { collection: "votes", id: "votes_election", type: "key", attributes: ["electionId"] },
      { collection: "votes", id: "votes_effective_unique", type: "unique", attributes: ["electionId", "positionId", "voterId"] },
      { collection: "votes", id: "votes_voter", type: "key", attributes: ["voterId"] },
      { collection: "votes", id: "votes_position", type: "key", attributes: ["positionId"] },
      { collection: "votes", id: "votes_candidate", type: "key", attributes: ["candidateId"] },
      { collection: "partyLists", id: "party_election_normalized_name", type: "unique", attributes: ["electionId", "normalizedName"] },
      { collection: "auditLogs", id: "audit_timestamp", type: "key", attributes: ["timestamp"], orders: ["desc"] },
      { collection: "offlineBallots", id: "offline_nonce_unique", type: "unique", attributes: ["nonce"] },
    ];

    const indexedCollections = Array.from(new Set(requiredIndexes.map((index) => index.collection)));
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const readiness = await Promise.all(indexedCollections.map(async (collectionId) => {
        const required = new Set(requiredIndexes.filter((index) => index.collection === collectionId).flatMap((index) => index.attributes));
        const response = await databases.listAttributes(APPWRITE_DB, collectionId);
        const available = new Set(response.attributes.filter((attribute: any) => attribute.status === "available").map((attribute: any) => attribute.key));
        return Array.from(required).every((attribute) => available.has(attribute));
      }));
      if (readiness.every(Boolean)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const index of requiredIndexes) {
      let shouldCreate = false;
      try {
        const existing = await databases.getIndex(APPWRITE_DB, index.collection, index.id);
        const sameType = existing.type === index.type;
        const sameAttributes = JSON.stringify(existing.attributes || []) === JSON.stringify(index.attributes);
        const sameOrders = JSON.stringify(existing.orders || []) === JSON.stringify(index.orders || []);
        if (!sameType || !sameAttributes || !sameOrders) {
          await databases.deleteIndex(APPWRITE_DB, index.collection, index.id);
          shouldCreate = true;
        }
      } catch {
        shouldCreate = true;
      }
      if (shouldCreate) {
        try {
          await databases.createIndex(
            APPWRITE_DB,
            index.collection,
            index.id,
            index.type,
            index.attributes,
            index.orders,
          );
          console.log(`Created index '${index.id}' in collection '${index.collection}'`);
        } catch (indexError: any) {
          throw new Error(`Index '${index.id}' could not be created: ${indexError.message}`);
        }
      }
    }

    let indexesReady = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const readiness = await Promise.all(requiredIndexes.map(async (index) => {
        try {
          const current = await databases.getIndex(APPWRITE_DB, index.collection, index.id);
          return current.status === "available";
        } catch {
          return false;
        }
      }));
      indexesReady = readiness.every(Boolean);
      if (indexesReady) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!indexesReady) throw new Error("Appwrite indexes did not become ready before the migration timeout");

    const branding = await getOne("branding", "school");
    if (!branding) {
      await saveAppwriteDoc("branding", "school", DEFAULT_BRANDING, false);
    }
  } catch (err: any) {
    console.error("DB check failed", err.message);
    throw err;
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
      try {
        await databases.getDocument(APPWRITE_DB, col, id);
        return await saveAppwriteDoc(col, id, cleanData, true);
      } catch (lookupError: any) {
        if (lookupError?.code === 404) throw e;
        throw lookupError;
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
    } catch (e: any) {
      if (e?.code === 404) return { id: this.id, exists: false, data: () => null };
      throw e;
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
    } catch(e: any) {
      if (e?.code !== 404) throw e;
    }
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
      const res = await databases.listDocuments(APPWRITE_DB, this.col, [...this.queries, Query.limit(5000)]);
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
    } catch (e: any) {
      console.error("List error:", e.message);
      throw e;
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
  const list: any[] = [];
  let cursor: string | null = null;
  do {
    const queries = [Query.limit(5000)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const response = await databases.listDocuments(APPWRITE_DB, collectionName, queries);
    for (const document of response.documents) {
      const data = { ...document } as any;
      const id = data.$id;
      delete data.$id;
      delete data.$createdAt;
      delete data.$updatedAt;
      delete data.$permissions;
      delete data.$databaseId;
      delete data.$collectionId;
      list.push({ id, ...data });
    }
    cursor = response.documents.length === 5000 ? response.documents[response.documents.length - 1].$id : null;
  } while (cursor);
  return list;
}

async function getOne(collectionName: string, id: string): Promise<any> {
  const docSnap = await db.collection(collectionName).doc(id).get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

let databaseInitializationError: Error | null = null;
const databaseReady = (async () => {
  await ensureCollectionsExist();
})().catch((error: any) => {
  databaseInitializationError = error instanceof Error ? error : new Error(String(error));
  console.error("Appwrite initialization failed:", databaseInitializationError.message);
});

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
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    }
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", async (_req: Request, res: Response) => {
    await databaseReady;
    if (databaseInitializationError) {
      res.status(503).json({ status: "unavailable", database: "appwrite", error: databaseInitializationError.message });
      return;
    }
    res.json({ status: "ok", database: "appwrite" });
  });

  app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
    await databaseReady;
    if (databaseInitializationError) {
      res.status(503).json({ error: "The Appwrite database is unavailable. Check the server configuration and schema initialization logs." });
      return;
    }
    next();
  });

  const toPublicUser = (user: any) => ({
    id: user.id,
    studentNumber: normalizeStudentNumber(user.studentNumber || user.username),
    fullName: user.fullName,
    role: user.role,
    yearLevel: user.yearLevel ?? null,
    section: user.section || null,
    room: user.room || null,
    hasSetPassword: user.hasSetPassword !== false && Boolean(user.password),
    photoUrl: user.photoUrl || null,
  });

  const createSessionToken = (userId: string) => createSignedToken(
    { purpose: "session", sub: userId },
    APP_SECURITY_SECRET,
    12 * 60 * 60,
  );
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const loginAttemptKey = (req: Request, studentNumber: string) => `${req.ip || req.socket.remoteAddress || "unknown"}:${studentNumber}`;
  const recordFailedLogin = (key: string) => {
    const now = Date.now();
    if (loginAttempts.size >= 10_000) {
      for (const [storedKey, value] of loginAttempts) {
        if (value.resetAt <= now) loginAttempts.delete(storedKey);
      }
      if (loginAttempts.size >= 10_000) loginAttempts.delete(loginAttempts.keys().next().value);
    }
    const current = loginAttempts.get(key);
    loginAttempts.set(key, !current || current.resetAt <= now
      ? { count: 1, resetAt: now + 10 * 60 * 1000 }
      : { ...current, count: current.count + 1 });
  };

  // Authentication validation middleware
  async function getAuthenticatedUser(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.substring(7);
    const claims = verifySignedToken<{ sub: string }>(token, APP_SECURITY_SECRET, "session");
    const userId = claims?.sub;
    if (!userId) return null;
    const user = await getOne("users", userId);
    if (!user) {
      return null;
    }
    return toPublicUser(user);
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
    const identifier = normalizeStudentNumber(req.body.studentNumber);
    const password = (req.body.password || "").toString();

    const studentNumberError = validateStudentNumber(identifier);
    if (studentNumberError) {
      res.status(400).json({ error: studentNumberError });
      return;
    }
    const attemptKey = loginAttemptKey(req, identifier);
    const attempt = loginAttempts.get(attemptKey);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
      res.setHeader("Retry-After", String(Math.ceil((attempt.resetAt - Date.now()) / 1000)));
      res.status(429).json({ error: "Too many failed sign-in attempts. Please try again later." });
      return;
    }

    try {
      const matchingUsers = await databases.listDocuments(APPWRITE_DB, "users", [
        Query.equal("studentNumber", identifier),
        Query.limit(1),
      ]);
      const userDocument = matchingUsers.documents[0];
      const user = userDocument ? { id: userDocument.$id, ...userDocument } as any : null;

      if (!user) {
        recordFailedLogin(attemptKey);
        void logAuditEvent("LOGIN_FAILED", identifier, "unknown", "Sign-in rejected: Student Number was not found");
        res.status(401).json({ error: "No account found matching this Student Number" });
        return;
      }

      // Detect first-time login: if no password set yet or explicitly flagged hasSetPassword === false
      if (user.hasSetPassword === false || !user.password || user.password.trim() === "") {
        res.json({
          needsPasswordSetup: true,
          user: toPublicUser(user),
          setupToken: createSignedToken(
            { purpose: "password-setup", sub: user.id, studentNumber: identifier },
            APP_SECURITY_SECRET,
            10 * 60,
          ),
        });
        return;
      }

      if (!(await verifyPassword(password, user.password))) {
        recordFailedLogin(attemptKey);
        void logAuditEvent("LOGIN_FAILED", user.fullName, user.role, `Sign-in rejected for Student Number ${identifier}: incorrect password`);
        res.status(401).json({ error: "Invalid password for this account" });
        return;
      }

      if (!String(user.password).startsWith("scrypt$")) {
        await db.collection("users").doc(user.id).update({ password: await hashPassword(password) });
      }
      loginAttempts.delete(attemptKey);

      void logAuditEvent("LOGIN_SUCCESS", user.fullName, user.role, `Logged in via Student Number ${identifier}`);

      res.json({
        user: { ...toPublicUser(user), hasSetPassword: true },
        token: createSessionToken(user.id),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log in" });
    }
  });

  // First time login password creation endpoint
  app.post("/api/auth/setup-password", async (req: Request, res: Response) => {
    const { setupToken, newPassword } = req.body;
    const passwordError = validatePassword(newPassword);
    const claims = verifySignedToken<{ sub: string; studentNumber: string }>(
      setupToken,
      APP_SECURITY_SECRET,
      "password-setup",
    );
    if (!claims?.sub || passwordError) {
      res.status(400).json({ error: passwordError || "The password setup request is invalid or has expired" });
      return;
    }

    try {
      const userId = claims.sub;
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: "User account not found" });
        return;
      }

      if (userDoc.data()?.hasSetPassword && userDoc.data()?.password) {
        res.status(409).json({ error: "This account already has a password. Please sign in normally." });
        return;
      }

      await userRef.update({
        password: await hashPassword(newPassword),
        hasSetPassword: true
      });

      const updatedUser = {
        ...userDoc.data(),
        id: userId,
        hasSetPassword: true
      };

      void logAuditEvent("FIRST_TIME_PASSWORD_SET", updatedUser.fullName, updatedUser.role, `Set account password for Student Number ${claims.studentNumber}`);

      res.json({
        message: "Password configured successfully! Account ready.",
        user: { ...toPublicUser(updatedUser), hasSetPassword: true },
        token: createSessionToken(updatedUser.id),
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

      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }

      if (!userDoc.exists || !(await verifyPassword(oldPassword, userDoc.data()?.password || ""))) {
        res.status(400).json({ error: "Incorrect current password" });
        return;
      }

      await userRef.update({ password: await hashPassword(newPassword), hasSetPassword: true });
      void logAuditEvent("CHANGE_PASSWORD", user.fullName, user.role, "Updated account password");
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
        const bucketId = APPWRITE_BUCKET_ID;
        const matches = trimmed.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
        let buffer: Buffer;
        let filename = "photo.jpg";

        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], "base64");
          const mime = matches[1].toLowerCase();
          if (mime.includes("png")) filename = "photo.png";
          else if (mime.includes("webp")) filename = "photo.webp";
        } else {
          throw Object.assign(new Error("Profile images must be JPEG, PNG, or WebP"), { status: 400 });
        }
        if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
          throw Object.assign(new Error("Profile images must be between 1 byte and 5 MB"), { status: 400 });
        }

        const fileId = ID.unique();
        const appwriteFile = await storage.createFile(
          bucketId,
          fileId,
          InputFile.fromBuffer(buffer, filename)
        );

        const hostedUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${appwriteFile.$id}/view?project=${APPWRITE_PROJECT}`;
        return hostedUrl;
      } catch (err: any) {
        console.error("Failed to upload base64 image to Appwrite storage:", err);
        throw err;
      }
    }

    if (trimmed.startsWith("/")) return trimmed.slice(0, 1000);
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") throw new Error("Only HTTPS image URLs are accepted");
      if (trimmed.length > 1000) throw new Error("Image URL is too long");
      return trimmed;
    } catch (error: any) {
      throw Object.assign(new Error(error.message || "Profile image URL is invalid"), { status: 400 });
    }
  }

  // --- Upload API ---
  app.post("/api/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const bucketId = APPWRITE_BUCKET_ID;
      const fileId = ID.unique();
      
      const appwriteFile = await storage.createFile(
        bucketId,
        fileId,
        InputFile.fromBuffer(req.file.buffer, req.file.originalname)
      );

      const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${appwriteFile.$id}/view?project=${APPWRITE_PROJECT}`;

      void logAuditEvent("UPLOAD_IMAGE", (req as any).user.fullName, (req as any).user.role, `Uploaded image file ${appwriteFile.$id}`);
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
      res.json(users.map(toPublicUser));
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
          const sNum = normalizeStudentNumber(u.studentNumber || u.username).toLowerCase();
          const name = (u.fullName || "").toLowerCase();
          const sec = (u.section || "").toLowerCase();
          const rm = (u.room || "").toLowerCase();
          return sNum.includes(query) || name.includes(query) || sec.includes(query) || rm.includes(query);
        })
        .map(toPublicUser);
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to search students" });
    }
  });

  app.post("/api/users", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { studentNumber, fullName, password, role, yearLevel, section, room } = req.body;
    const finalStudentNumber = normalizeStudentNumber(studentNumber);
    const requester = (req as any).user;

    const studentNumberError = validateStudentNumber(finalStudentNumber);
    if (studentNumberError || !String(fullName || "").trim() || !role) {
      res.status(400).json({ error: studentNumberError || "Full Name and Role are required" });
      return;
    }
    if (String(fullName).trim().length > 255 || String(section || "").trim().length > 255 || String(room || "").trim().length > 255) {
      res.status(400).json({ error: "Full Name, Section, and Room must each be 255 characters or fewer" });
      return;
    }
    if (role !== "student" && role !== "teacher") {
      res.status(400).json({ error: "Invalid role assigned" });
      return;
    }
    if (requester.role === "teacher" && role !== "student") {
      res.status(403).json({ error: "Teachers may create student accounts only" });
      return;
    }

    const parsedYear = yearLevel === null || yearLevel === undefined || yearLevel === "" ? null : Number.parseInt(yearLevel, 10);
    if (role === "student" && (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 12)) {
      res.status(400).json({ error: "A valid grade level from 1 to 12 is required for students" });
      return;
    }
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }
    }

    try {
      const duplicates = await databases.listDocuments(APPWRITE_DB, "users", [
        Query.equal("studentNumber", finalStudentNumber),
        Query.limit(1),
      ]);
      const duplicate = duplicates.documents[0];

      if (duplicate) {
        res.status(409).json({ error: `Student Number "${finalStudentNumber}" is already registered` });
        return;
      }

      const finalPhotoUrl = await ensureHostedPhotoUrl(req.body.photoUrl);
      const hasPassword = password && password.trim().length > 0;

      const newUser = {
        id: studentDocumentId(finalStudentNumber),
        studentNumber: finalStudentNumber,
        fullName: fullName.trim(),
        password: hasPassword ? await hashPassword(password.trim()) : "",
        hasSetPassword: hasPassword,
        role,
        yearLevel: parsedYear,
        section: section ? section.trim() : null,
        room: room ? room.trim() : null,
        photoUrl: finalPhotoUrl,
      };

      await db.collection("users").doc(newUser.id).set(newUser);
      void logAuditEvent("CREATE_USER", requester.fullName, requester.role, `Created ${role} account for ${fullName} (${finalStudentNumber})`);
      res.status(201).json(toPublicUser(newUser));
    } catch (err: any) {
      const duplicate = err?.code === 409 || String(err?.message || "").toLowerCase().includes("unique");
      res.status(duplicate ? 409 : (err.status || 500)).json({ error: duplicate ? `Student Number "${finalStudentNumber}" is already registered` : (err.message || "Failed to create user") });
    }
  });

  app.post("/api/users/bulk", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0 || users.length > 1000) {
      res.status(400).json({ error: "Invalid or empty users array provided" });
      return;
    }

    try {
      const existingUsers = await getAll("users");
      const existingStudentNumbers = new Set(
        existingUsers.map((u: any) => normalizeStudentNumber(u.studentNumber || u.username))
      );

      const created: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const rowNum = i + 1;
        const studentNum = normalizeStudentNumber(u.studentNumber);

        const studentNumberError = validateStudentNumber(studentNum);
        if (studentNumberError || !String(u.fullName || "").trim()) {
          errors.push(`Row ${rowNum}: ${studentNumberError || "Full Name is required"}.`);
          continue;
        }

        const fullName = String(u.fullName).trim();
        const section = String(u.section || "").trim();
        const room = String(u.room || "").trim();
        if (fullName.length > 255 || section.length > 255 || room.length > 255) {
          errors.push(`Row ${rowNum}: Full Name, Section, and Room must each be 255 characters or fewer.`);
          continue;
        }

        const role = "student";
        const parsedYear = Number.parseInt(u.yearLevel ?? u.gradeLevel, 10);
        if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 12) {
          errors.push(`Row ${rowNum}: Grade Level must be between 1 and 12.`);
          continue;
        }

        if (existingStudentNumbers.has(studentNum)) {
          errors.push(`Row ${rowNum}: Student Number "${studentNum}" already exists. Duplicate skipped.`);
          continue;
        }

        const newUser = {
          id: studentDocumentId(studentNum),
          studentNumber: studentNum,
          fullName,
          password: "",
          hasSetPassword: false,
          role,
          yearLevel: parsedYear,
          section: section || null,
          room: room || null,
          photoUrl: null,
        };

        try {
          await db.collection("users").doc(newUser.id).set(newUser);
          existingStudentNumbers.add(studentNum);
          created.push(toPublicUser(newUser));
        } catch (rowError: any) {
          errors.push(`Row ${rowNum}: ${rowError?.code === 409 ? "Student Number already exists" : (rowError.message || "Could not create student")}.`);
        }
      }

      void logAuditEvent("BULK_USER_IMPORT", (req as any).user.fullName, (req as any).user.role, `Bulk imported ${created.length} student records without passwords (${errors.length} skipped/errors).`);

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
    try {
      const userRef = db.collection("users").doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data()!;
      const requester = (req as any).user;
      if (requester.id === id || userData.role === "admin") {
        res.status(400).json({ error: "Administrator accounts cannot be deleted from the user registry" });
        return;
      }
      if (requester.role === "teacher" && userData.role !== "student") {
        res.status(403).json({ error: "Teachers may delete student accounts only" });
        return;
      }
      await userRef.delete();

      // Clean up cascading candidates associated with deleted user
      const candidatesSnapshot = await db.collection("candidates").where("userId", "==", id).get();
      const batch = db.batch();
      const removedCandidateIds: string[] = [];
      candidatesSnapshot.forEach((d) => {
        removedCandidateIds.push(d.id);
        batch.delete(db.collection("candidates").doc(d.id));
      });
      for (const candidateId of removedCandidateIds) {
        const candidateVotes = await db.collection("votes").where("candidateId", "==", candidateId).get();
        candidateVotes.forEach((d) => batch.delete(db.collection("votes").doc(d.id)));
      }
      const votesSnapshot = await db.collection("votes").where("voterId", "==", id).get();
      votesSnapshot.forEach((d) => { batch.delete(db.collection("votes").doc(d.id)); });
      await batch.commit();

      void logAuditEvent("DELETE_USER", requester.fullName, requester.role, `Deleted user account ${userData.fullName} (${normalizeStudentNumber(userData.studentNumber || userData.username)})`);

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

      const targetUser = userDoc.data()!;
      if (authUser.role === "teacher" && targetUser.role !== "student") {
        res.status(403).json({ error: "Teachers may update student profile photos only" });
        return;
      }

      const finalPhotoUrl = await ensureHostedPhotoUrl(photoUrl);

      await userRef.update({ photoUrl: finalPhotoUrl });
      const userData = targetUser || {};
      const updatedUser = { ...userData, id, photoUrl: finalPhotoUrl };
      void logAuditEvent("UPDATE_PROFILE_PHOTO", authUser.fullName, authUser.role, `Updated profile photo for ${targetUser.fullName || id}`);
      res.json({ message: "Profile photo updated successfully", user: toPublicUser(updatedUser) });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update profile photo" });
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
        hasPartyList: e.hasPartyList === true || e.hasPartyListSupport === true,
        targetGradeLevel: e.targetGradeLevel !== undefined ? e.targetGradeLevel : null,
        targetSection: e.targetSection || null,
        targetRoom: e.targetRoom || (e.scope === "room" ? e.scopeValue : null) || null,
        hasPartyListSupport: e.hasPartyList === true || e.hasPartyListSupport === true,
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch elections" });
    }
  });

  app.post("/api/elections", requireAdmin, async (req: Request, res: Response) => {
    const { title, description, startsAt, endsAt, scope = "all", scopeValue, hasPartyList } = req.body;
    const validationError = validateElectionInput({ title, startsAt, endsAt, scope, scopeValue, hasPartyList });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    try {
      const finalScopeValue = scope === "all" ? "" : String(scopeValue).trim();
      const newElection = {
        id: ID.unique(),
        title: String(title).trim(),
        description: String(description || "").trim().slice(0, 5000),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        scope,
        scopeValue: finalScopeValue,
        hasPartyList: scope === "all" && hasPartyList === true,
        targetGradeLevel: scope === "grade" ? Number.parseInt(finalScopeValue, 10) : null,
        targetSection: scope === "section" ? finalScopeValue : null,
        targetRoom: scope === "room" ? finalScopeValue : null,
        hasPartyListSupport: scope === "all" && hasPartyList === true,
      };

      await db.collection("elections").doc(newElection.id).set(newElection);
      void logAuditEvent("CREATE_ELECTION", (req as any).user.fullName, "admin", `Created election: ${title} (Scope: ${newElection.scope}${finalScopeValue ? `, target: ${finalScopeValue}` : ""})`);

      res.status(201).json(newElection);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create election" });
    }
  });

  app.put("/api/elections/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, startsAt, endsAt, scope = "all", scopeValue, hasPartyList } = req.body;
    const validationError = validateElectionInput({ title, startsAt, endsAt, scope, scopeValue, hasPartyList });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    try {
      const electionRef = db.collection("elections").doc(id);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) {
        res.status(404).json({ error: "Election not found" });
        return;
      }

      if (getElectionPhase({ id, ...electionDoc.data() }) !== "upcoming") {
        res.status(409).json({ error: "An election cannot be edited after voting has started" });
        return;
      }

      const finalScopeValue = scope === "all" ? "" : String(scopeValue).trim();
      const updatedElection = {
        id,
        title: String(title).trim(),
        description: String(description || "").trim().slice(0, 5000),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        scope,
        scopeValue: finalScopeValue,
        hasPartyList: scope === "all" && hasPartyList === true,
        targetGradeLevel: scope === "grade" ? Number.parseInt(finalScopeValue, 10) : null,
        targetSection: scope === "section" ? finalScopeValue : null,
        targetRoom: scope === "room" ? finalScopeValue : null,
        hasPartyListSupport: scope === "all" && hasPartyList === true,
      };

      await electionRef.set(updatedElection);
      void logAuditEvent("UPDATE_ELECTION", (req as any).user.fullName, "admin", `Updated election: ${title} (Scope: ${scope}${finalScopeValue ? `, target: ${finalScopeValue}` : ""})`);

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
      if (getElectionPhase({ id, ...electionDoc.data() }) === "live") {
        res.status(409).json({ error: "A live election cannot be deleted" });
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

      const partyLists = await db.collection("partyLists").where("electionId", "==", id).get();
      partyLists.forEach((doc) => batch.delete(db.collection("partyLists").doc(doc.id)));

      await batch.commit();

      void logAuditEvent("DELETE_ELECTION", (req as any).user.fullName, "admin", `Deleted election: ${elTitle} and all associated records`);

      res.json({ message: "Election deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete election" });
    }
  });

  // --- Party Lists API ---
  app.get("/api/partylists", requireAuth, async (req: Request, res: Response) => {
    const { electionId } = req.query;
    try {
      let lists = await getAll("partyLists");
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
      const election = await getOne("elections", electionId);
      if (!election) {
        res.status(404).json({ error: "Election not found" });
        return;
      }
      if (election.scope !== "all" || election.hasPartyList !== true) {
        res.status(400).json({ error: "Party-Lists are enabled only for school-wide elections with Party-List support" });
        return;
      }
      if (getElectionPhase(election) !== "upcoming") {
        res.status(409).json({ error: "Party-Lists cannot be changed after voting has started" });
        return;
      }
      const cleanName = String(name).trim();
      if (!cleanName || cleanName.length > 255) {
        res.status(400).json({ error: "Party-List name must contain between 1 and 255 characters" });
        return;
      }
      const newParty = {
        id: ID.unique(),
        electionId,
        name: cleanName,
        normalizedName: cleanName.toLocaleLowerCase(),
        acronym: acronym ? String(acronym).trim().toUpperCase().slice(0, 50) : "",
        logoUrl: String(logoUrl || "").trim().slice(0, 1000),
        advocacy: String(advocacy || "").trim().slice(0, 5000),
      };

      await db.collection("partyLists").doc(newParty.id).set(newParty);
      void logAuditEvent("CREATE_PARTY_LIST", (req as any).user.fullName, "admin", `Registered Party-List "${newParty.name}" (${newParty.acronym})`);

      res.status(201).json(newParty);
    } catch (err: any) {
      const duplicate = err?.code === 409 || String(err?.message || "").toLowerCase().includes("unique");
      res.status(duplicate ? 409 : 500).json({ error: duplicate ? "A Party-List with this name already exists in the election" : (err.message || "Failed to create party-list") });
    }
  });

  app.delete("/api/partylists/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const partyList = await getOne("partyLists", id);
      if (!partyList) {
        res.status(404).json({ error: "Party-List not found" });
        return;
      }
      const partyElection = await getOne("elections", partyList.electionId);
      if (!partyElection || getElectionPhase(partyElection) !== "upcoming") {
        res.status(409).json({ error: "Party-Lists cannot be changed after voting has started" });
        return;
      }
      await db.collection("partyLists").doc(id).delete();
      const affiliatedCandidates = await db.collection("candidates").where("partyListId", "==", id).get();
      const batch = db.batch();
      affiliatedCandidates.forEach((candidate) => batch.update(db.collection("candidates").doc(candidate.id), {
        party: null,
        partyListId: null,
        partyListName: null,
      }));
      await batch.commit();
      void logAuditEvent("DELETE_PARTY_LIST", (req as any).user.fullName, "admin", `Removed Party-List "${partyList.name}"`);
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
    const cleanName = String(name || "").trim();
    if (!electionId || !cleanName) {
      res.status(400).json({ error: "Election ID and name are required" });
      return;
    }
    if (cleanName.length > 255) {
      res.status(400).json({ error: "Position name must not exceed 255 characters" });
      return;
    }

    try {
      const electionDoc = await db.collection("elections").doc(electionId).get();
      if (!electionDoc.exists) {
        res.status(400).json({ error: "Invalid election" });
        return;
      }
      if (getElectionPhase({ id: electionId, ...electionDoc.data() }) !== "upcoming") {
        res.status(409).json({ error: "Positions cannot be changed after voting has started" });
        return;
      }

      const newPosition = {
        id: ID.unique(),
        electionId,
        name: cleanName,
        normalizedName: cleanName.toLocaleLowerCase(),
      };

      await db.collection("positions").doc(newPosition.id).set(newPosition);
      void logAuditEvent("CREATE_POSITION", (req as any).user.fullName, "admin", `Created position "${cleanName}" for election ${electionId}`);
      res.status(201).json(newPosition);
    } catch (err: any) {
      const duplicate = err?.code === 409 || String(err?.message || "").toLowerCase().includes("unique");
      res.status(duplicate ? 409 : 500).json({ error: duplicate ? "A position with this name already exists in the election" : (err.message || "Failed to create position") });
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
      const positionElection = await getOne("elections", positionDoc.data()?.electionId);
      if (!positionElection || getElectionPhase(positionElection) !== "upcoming") {
        res.status(409).json({ error: "Positions cannot be changed after voting has started" });
        return;
      }

      await positionRef.delete();

      const batch = db.batch();
      const candidates = await db.collection("candidates").where("positionId", "==", id).get();
      candidates.forEach((doc) => batch.delete(db.collection("candidates").doc(doc.id)));

      const votes = await db.collection("votes").where("positionId", "==", id).get();
      votes.forEach((doc) => batch.delete(db.collection("votes").doc(doc.id)));

      await batch.commit();
      void logAuditEvent("DELETE_POSITION", (req as any).user.fullName, "admin", `Deleted position "${positionDoc.data()?.name || id}" and associated nominations and votes`);
      res.json({ message: "Position deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete position" });
    }
  });

  app.put("/api/positions/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (cleanName.length > 255) {
      res.status(400).json({ error: "Position name must not exceed 255 characters" });
      return;
    }
    try {
      const positionRef = db.collection("positions").doc(id);
      const positionDoc = await positionRef.get();
      if (!positionDoc.exists) {
        res.status(404).json({ error: "Position not found" });
        return;
      }
      const positionElection = await getOne("elections", positionDoc.data()?.electionId);
      if (!positionElection || getElectionPhase(positionElection) !== "upcoming") {
        res.status(409).json({ error: "Positions cannot be changed after voting has started" });
        return;
      }
      await positionRef.update({ name: cleanName, normalizedName: cleanName.toLocaleLowerCase() });
      void logAuditEvent("UPDATE_POSITION", (req as any).user.fullName, "admin", `Renamed position to "${cleanName}"`);
      res.json({ message: "Position updated successfully" });
    } catch (err: any) {
      const duplicate = err?.code === 409 || String(err?.message || "").toLowerCase().includes("unique");
      res.status(duplicate ? 409 : 500).json({ error: duplicate ? "A position with this name already exists in the election" : (err.message || "Failed to update position") });
    }
  });

  // --- Candidates API ---
  app.get("/api/candidates", requireAuth, async (req: Request, res: Response) => {
    const { electionId, positionId } = req.query;

    try {
      let list = await queryCandidates(electionId as string, positionId as string);
      const user = (req as any).user;
      const allVotes = await getAll("votes");
      const voteCounts = new Map<string, number>();
      for (const vote of allVotes) {
        voteCounts.set(vote.candidateId, (voteCounts.get(vote.candidateId) || 0) + 1);
      }
      list = list.map((candidate: any) => ({
        ...candidate,
        voteCount: voteCounts.get(candidate.id) || 0,
      }));

      if (user.role !== "admin" && user.role !== "teacher") {
        const elections = await getAll("elections");
        list = list.map((c: any) => {
          const election = elections.find((e: any) => e.id === c.electionId);
          if (election && !canViewElectionResults(user.role, election)) {
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
    const { electionId, positionId, userId, manifesto, partyListId, photoUrl } = req.body;
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

      const election = await getOne("elections", electionId);
      const position = await getOne("positions", positionId);
      if (!election || !position || position.electionId !== electionId) {
        res.status(400).json({ error: "The selected position does not belong to this election" });
        return;
      }
      if (getElectionPhase(election) !== "upcoming") {
        res.status(409).json({ error: "Candidates cannot be changed after voting has started" });
        return;
      }
      if (!isEligibleForElection({ id: userId, ...user }, election)) {
        res.status(400).json({ error: "The selected student is not eligible for this election's scope" });
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

      let partyList: any = null;
      if (partyListId) {
        partyList = await getOne("partyLists", partyListId);
        if (!partyList || partyList.electionId !== electionId || election.hasPartyList !== true) {
          res.status(400).json({ error: "Invalid Party-List selection for this election" });
          return;
        }
      }

      const hostedCandidatePhoto = user.photoUrl || await ensureHostedPhotoUrl(photoUrl);
      const newCandidate = {
        id: ID.unique(),
        electionId,
        positionId,
        userId,
        fullName: user.fullName,
        manifesto: String(manifesto || "").trim().slice(0, 10000),
        voteCount: 0,
        yearLevel: user.yearLevel || null,
        party: partyList?.name || null,
        partyListId: partyListId || null,
        partyListName: partyList?.name || null,
        photoUrl: hostedCandidatePhoto,
      };

      await db.collection("candidates").doc(newCandidate.id).set(newCandidate);
      void logAuditEvent("NOMINATE_CANDIDATE", (req as any).user.fullName, "admin", `Nominated ${user.fullName} for ${position.name} in ${election.title}`);

      res.status(201).json(newCandidate);
    } catch (err: any) {
      const duplicate = err?.code === 409 || String(err?.message || "").toLowerCase().includes("unique");
      res.status(duplicate ? 409 : (err.status || 500)).json({ error: duplicate ? "Candidate already nominated for this position" : (err.message || "Failed to nominate candidate") });
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
      const candidateElection = await getOne("elections", candidate.electionId);
      if (!candidateElection || getElectionPhase(candidateElection) !== "upcoming") {
        res.status(409).json({ error: "Candidates cannot be changed after voting has started" });
        return;
      }
      await candidateRef.delete();

      const votesSnapshot = await db.collection("votes").where("candidateId", "==", id).get();
      const batch = db.batch();
      votesSnapshot.forEach((d) => { batch.delete(db.collection("votes").doc(d.id)); });
      await batch.commit();

      void logAuditEvent("DELETE_CANDIDATE", (req as any).user.fullName, "admin", `Removed candidate ${candidate.fullName || id}`);

      res.json({ message: "Candidate removed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete candidate" });
    }
  });

  // --- Votes API & Offline Import ---
  async function saveEffectiveVote({
    student,
    electionId,
    positionId,
    candidateId,
    timestamp = new Date().toISOString(),
    isOfflineImport = false,
  }: any) {
    if (student.role !== "student") throw Object.assign(new Error("Only students are authorized to vote"), { status: 403 });
    const [election, position, candidate] = await Promise.all([
      getOne("elections", electionId),
      getOne("positions", positionId),
      getOne("candidates", candidateId),
    ]);
    if (!election) throw Object.assign(new Error("Election not found"), { status: 404 });
    if (!isEligibleForElection(student, election)) throw Object.assign(new Error("This student is not eligible for the selected election"), { status: 403 });
    if (!position || position.electionId !== electionId) throw Object.assign(new Error("Invalid position for this election"), { status: 400 });
    if (!candidate || candidate.positionId !== positionId || candidate.electionId !== electionId) {
      throw Object.assign(new Error("Invalid candidate for this election position"), { status: 400 });
    }

    const ballotTime = new Date(timestamp);
    if (!Number.isFinite(ballotTime.getTime())) throw Object.assign(new Error("Invalid ballot timestamp"), { status: 400 });
    if (isOfflineImport) {
      if (ballotTime < new Date(election.startsAt) || ballotTime > new Date(election.endsAt)) {
        throw Object.assign(new Error("Offline ballot was not created during the election window"), { status: 400 });
      }
    } else if (getElectionPhase(election) !== "live") {
      throw Object.assign(new Error("Voting window is not active"), { status: 400 });
    }

    const existingVotes = await db.collection("votes")
      .where("electionId", "==", electionId)
      .where("positionId", "==", positionId)
      .where("voterId", "==", student.id)
      .get();
    const previous: any[] = [];
    existingVotes.forEach((doc: any) => previous.push({ id: doc.id, ...doc.data() }));
    const voteId = effectiveVoteDocumentId(electionId, positionId, student.id);
    const newVote = {
      id: voteId,
      electionId,
      positionId,
      voterId: student.id,
      userId: student.id,
      candidateId,
      timestamp: ballotTime.toISOString(),
      isOfflineImport,
    };

    // A deterministic document ID and unique composite index are the final
    // concurrency guards. Legacy random-ID records are migrated atomically.
    const legacyIds = previous.filter((vote) => vote.id !== voteId).map((vote) => vote.id);
    if (legacyIds.length > 0) {
      const transaction = await databases.createTransaction({ ttl: 30 });
      try {
        for (const legacyId of legacyIds) {
          await databases.deleteDocument({
            databaseId: APPWRITE_DB,
            collectionId: "votes",
            documentId: legacyId,
            transactionId: transaction.$id,
          });
        }
        const { id, ...voteData } = newVote;
        await databases.upsertDocument({
          databaseId: APPWRITE_DB,
          collectionId: "votes",
          documentId: id,
          data: voteData,
          transactionId: transaction.$id,
        });
        await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
      } catch (error) {
        try {
          await databases.updateTransaction({ transactionId: transaction.$id, rollback: true });
        } catch {
          // The failed transaction may already be rolled back.
        }
        throw error;
      }
    } else {
      await db.collection("votes").doc(voteId).set(newVote);
    }
    return {
      vote: newVote,
      replaced: previous.some((vote) => vote.candidateId !== candidateId),
      existed: previous.length > 0,
      election,
    };
  }

  app.get("/api/votes", requireAdminOrTeacher, async (req: Request, res: Response) => {
    try {
      const electionId = String(req.query.electionId || "");
      const list = await getAll("votes");
      res.json(electionId ? list.filter((vote) => vote.electionId === electionId) : list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch votes" });
    }
  });

  app.get("/api/votes/my", requireAuth, async (req: Request, res: Response) => {
    const electionId = String(req.query.electionId || "");
    if (!electionId) {
      res.status(400).json({ error: "Election ID is required" });
      return;
    }
    try {
      const user = (req as any).user;
      res.json(await queryMyVotes(electionId, user.id));
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
      const result = await saveEffectiveVote({ student: user, electionId, positionId, candidateId });
      void logAuditEvent(
        result.replaced ? "VOTE_REVISED" : "VOTE_CAST",
        user.fullName,
        user.role,
        `${result.replaced ? "Revised" : "Cast"} ballot selection in election "${result.election.title}"`,
      );
      res.status(201).json(result.vote);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to submit vote" });
    }
  });

  app.get("/api/offline/credentials", requireAuth, async (req: Request, res: Response) => {
    const electionId = String(req.query.electionId || "");
    const user = (req as any).user;
    try {
      const election = await getOne("elections", electionId);
      if (!election) {
        res.status(404).json({ error: "Election not found" });
        return;
      }
      if (user.role !== "student" || !isEligibleForElection(user, election)) {
        res.status(403).json({ error: "You are not eligible for this election" });
        return;
      }
      if (getElectionPhase(election) !== "live") {
        res.status(400).json({ error: "Offline ballot credentials are issued only while an election is live" });
        return;
      }
      const now = new Date();
      const nonce = crypto.randomBytes(24).toString("base64url");
      const permit = {
        voterId: user.id,
        studentNumber: user.studentNumber,
        electionId,
        issuedAt: now.toISOString(),
        expiresAt: new Date(new Date(election.endsAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        nonce,
      };
      res.json({
        permit: createOfflinePermit(permit, APP_SECURITY_SECRET),
        publicKey: getOfflineEncryptionPublicKey(APP_SECURITY_SECRET),
        nonce,
        issuedAt: permit.issuedAt,
        electionEndsAt: election.endsAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Could not prepare offline voting" });
    }
  });

  app.post("/api/votes/import-offline", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const envelope = req.body?.ballot || req.body;
    let offlineTransactionId = "";
    let transactionCommitted = false;
    try {
      const ballot = decryptOfflineBallot(envelope, APP_SECURITY_SECRET);
      const permit = verifyOfflinePermit(ballot.permit, APP_SECURITY_SECRET);
      if (!permit) throw Object.assign(new Error("TAMPER DETECTED: the offline ballot permit is invalid or expired"), { status: 400 });
      if (
        permit.voterId !== ballot.voterId ||
        permit.electionId !== ballot.electionId ||
        permit.nonce !== ballot.nonce ||
        normalizeStudentNumber(permit.studentNumber) !== normalizeStudentNumber(ballot.studentNumber)
      ) throw Object.assign(new Error("TAMPER DETECTED: ballot identity does not match its signed permit"), { status: 400 });
      if (!Array.isArray(ballot.votes) || ballot.votes.length === 0 || ballot.votes.length > 50) {
        throw Object.assign(new Error("Offline ballot must contain between 1 and 50 selections"), { status: 400 });
      }
      const positionIds = ballot.votes.map((vote) => String(vote.positionId || ""));
      if (positionIds.some((id) => !id) || new Set(positionIds).size !== positionIds.length) {
        throw Object.assign(new Error("Offline ballot contains invalid or duplicate positions"), { status: 400 });
      }
      const ballotTime = new Date(ballot.timestamp);
      const issuedAt = new Date(permit.issuedAt);
      const allowedClockSkewMs = 5 * 60 * 1000;
      if (
        !Number.isFinite(ballotTime.getTime()) ||
        !Number.isFinite(issuedAt.getTime()) ||
        ballotTime.getTime() < issuedAt.getTime() - allowedClockSkewMs
      ) {
        throw Object.assign(new Error("Offline ballot timestamp is invalid"), { status: 400 });
      }

      const student = await getOne("users", ballot.voterId);
      if (!student || student.role !== "student" || normalizeStudentNumber(student.studentNumber || student.username) !== normalizeStudentNumber(ballot.studentNumber)) {
        throw Object.assign(new Error("Student account in the offline ballot was not found"), { status: 400 });
      }

      // Validate every selection before reserving the nonce and writing any vote.
      const election = await getOne("elections", ballot.electionId);
      if (!election || !isEligibleForElection({ id: student.id, ...student }, election)) {
        throw Object.assign(new Error("Student is not eligible for the offline ballot election"), { status: 403 });
      }
      if (ballotTime < new Date(election.startsAt) || ballotTime > new Date(election.endsAt)) {
        throw Object.assign(new Error("Offline ballot was not created during the election window"), { status: 400 });
      }
      for (const selection of ballot.votes) {
        const [position, candidate] = await Promise.all([
          getOne("positions", selection.positionId),
          getOne("candidates", selection.candidateId),
        ]);
        if (!position || position.electionId !== ballot.electionId || !candidate || candidate.positionId !== selection.positionId || candidate.electionId !== ballot.electionId) {
          throw Object.assign(new Error("Offline ballot contains a candidate or position that is not valid for the election"), { status: 400 });
        }
      }

      const replayMarkerId = `ob_${crypto.createHash("sha256").update(ballot.nonce).digest("hex").slice(0, 30)}`;
      let importedCount = 0;
      let revisedCount = 0;
      const stagedVotes: Array<{ vote: any; legacyIds: string[] }> = [];
      for (const selection of ballot.votes) {
        const existing = await db.collection("votes")
          .where("electionId", "==", ballot.electionId)
          .where("positionId", "==", selection.positionId)
          .where("voterId", "==", student.id)
          .get();
        const previous: any[] = [];
        existing.forEach((document: any) => previous.push({ id: document.id, ...document.data() }));
        if (previous.length === 0) importedCount += 1;
        else if (previous.some((vote) => vote.candidateId !== selection.candidateId)) revisedCount += 1;
        const voteId = effectiveVoteDocumentId(ballot.electionId, selection.positionId, student.id);
        stagedVotes.push({
          vote: {
            id: voteId,
            electionId: ballot.electionId,
            positionId: selection.positionId,
            voterId: student.id,
            userId: student.id,
            candidateId: selection.candidateId,
            timestamp: ballotTime.toISOString(),
            isOfflineImport: true,
          },
          legacyIds: previous.filter((vote) => vote.id !== voteId).map((vote) => vote.id),
        });
      }

      const transaction = await databases.createTransaction({ ttl: 60 });
      offlineTransactionId = transaction.$id;
      try {
        await databases.createDocument({
          databaseId: APPWRITE_DB,
          collectionId: "offlineBallots",
          documentId: replayMarkerId,
          data: {
          nonce: ballot.nonce,
          voterId: ballot.voterId,
          electionId: ballot.electionId,
          importedAt: new Date().toISOString(),
          importedBy: (req as any).user.id,
          },
          transactionId: offlineTransactionId,
        });
        for (const staged of stagedVotes) {
          for (const legacyId of staged.legacyIds) {
            await databases.deleteDocument({
              databaseId: APPWRITE_DB,
              collectionId: "votes",
              documentId: legacyId,
              transactionId: offlineTransactionId,
            });
          }
          const { id: voteId, ...voteData } = staged.vote;
          await databases.upsertDocument({
            databaseId: APPWRITE_DB,
            collectionId: "votes",
            documentId: voteId,
            data: voteData,
            transactionId: offlineTransactionId,
          });
        }
        await databases.updateTransaction({ transactionId: offlineTransactionId, commit: true });
        transactionCommitted = true;
      } catch (transactionError: any) {
        try {
          await databases.updateTransaction({ transactionId: offlineTransactionId, rollback: true });
        } catch {
          // The server may have already rolled back the failed transaction.
        }
        if (transactionError?.code === 409) {
          throw Object.assign(new Error("This offline ballot has already been imported"), { status: 409 });
        }
        throw transactionError;
      }

      const importer = (req as any).user;
      void logAuditEvent("OFFLINE_BALLOT_IMPORTED", importer.fullName, importer.role, `Imported encrypted offline ballot for ${student.fullName} (${normalizeStudentNumber(student.studentNumber || student.username)})`);
      res.json({
        success: true,
        message: `Offline ballot imported: ${importedCount} new selection(s), ${revisedCount} replacement(s).`,
        studentName: student.fullName,
        importedCount,
        revisedCount,
      });
    } catch (err: any) {
      if (offlineTransactionId && !transactionCommitted) {
        try {
          await databases.updateTransaction({ transactionId: offlineTransactionId, rollback: true });
        } catch {
          // The transaction is already rolled back or expired.
        }
      }
      const tamper = /tamper|decrypt|authenticate|cipher|permit/i.test(String(err.message || ""));
      const importer = (req as any).user;
      void logAuditEvent("OFFLINE_BALLOT_REJECTED", importer.fullName, importer.role, `Rejected offline ballot import: ${tamper ? "cryptographic verification failed" : String(err.message || "validation failed").slice(0, 300)}`);
      res.status(err.status || (tamper ? 400 : 500)).json({ error: tamper ? "TAMPER DETECTED: encrypted offline ballot verification failed" : (err.message || "Failed to process offline ballot import") });
    }
  });

  app.get("/api/elections/:id/turnout", requireAdminOrTeacher, async (req: Request, res: Response) => {
    try {
      const election = await getOne("elections", req.params.id);
      if (!election) {
        res.status(404).json({ error: "Election not found" });
        return;
      }
      const [users, votes, positions] = await Promise.all([
        getAll("users"),
        getAll("votes"),
        queryPositions(req.params.id),
      ]);
      const eligible = users.filter((user) => isEligibleForElection({ id: user.id, ...user }, election));
      const electionVotes = votes.filter((vote) => vote.electionId === req.params.id);
      const votesByVoter = new Map<string, Set<string>>();
      for (const vote of electionVotes) {
        if (!votesByVoter.has(vote.voterId)) votesByVoter.set(vote.voterId, new Set());
        votesByVoter.get(vote.voterId)!.add(vote.positionId);
      }
      const roster = eligible.map((student) => {
        const votedPositions = votesByVoter.get(student.id) || new Set<string>();
        return {
          ...toPublicUser(student),
          hasVoted: votedPositions.size > 0,
          completedBallot: positions.length > 0 && positions.every((position) => votedPositions.has(position.id)),
          votedPositionCount: votedPositions.size,
          totalPositionCount: positions.length,
        };
      });
      const votedCount = roster.filter((student) => student.hasVoted).length;
      res.json({
        electionId: req.params.id,
        eligibleCount: roster.length,
        votedCount,
        turnoutPercentage: roster.length ? Math.round((votedCount / roster.length) * 100) : 0,
        students: roster,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate election turnout" });
    }
  });

  // --- School Branding Settings API ---
  app.get("/api/branding", async (req: Request, res: Response) => {
    try {
      res.json((await getOne("branding", "school")) || DEFAULT_BRANDING);
    } catch {
      res.json(DEFAULT_BRANDING);
    }
  });

  app.put("/api/branding", requireAdmin, async (req: Request, res: Response) => {
    try {
      const existing = (await getOne("branding", "school")) || DEFAULT_BRANDING;
      const primaryColor = String(req.body.primaryColor || existing.primaryColor);
      if (!/^#[0-9a-f]{6}$/i.test(primaryColor)) {
        res.status(400).json({ error: "Primary color must be a six-digit hexadecimal color" });
        return;
      }
      const contactEmail = String(req.body.contactEmail ?? existing.contactEmail ?? "").trim().slice(0, 255);
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        res.status(400).json({ error: "Contact email is invalid" });
        return;
      }
      const requestedLogo = String(req.body.logoUrl ?? existing.logoUrl).trim();
      const logoUrl = requestedLogo ? await ensureHostedPhotoUrl(requestedLogo) : "";
      const branding = {
        schoolName: String(req.body.schoolName || existing.schoolName).trim().slice(0, 255),
        tagline: String(req.body.tagline ?? existing.tagline).trim().slice(0, 500),
        logoUrl,
        primaryColor,
        attributionText: "Developed by students of Golden West Colleges, Inc.",
        contactEmail,
        address: String(req.body.address ?? existing.address ?? "").trim().slice(0, 1000),
      };
      if (!branding.schoolName) {
        res.status(400).json({ error: "School name is required" });
        return;
      }
      await db.collection("branding").doc("school").set(branding);
      void logAuditEvent("UPDATE_BRANDING", (req as any).user.fullName, "admin", "Updated reusable school branding settings");
      res.json(branding);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update branding settings" });
    }
  });

  // --- Audit Logs API ---
  app.get("/api/audit-logs", requireAdminOrTeacher, async (req: Request, res: Response) => {
    try {
      const response = await databases.listDocuments(APPWRITE_DB, "auditLogs", [
        Query.orderDesc("timestamp"),
        Query.limit(500),
      ]);
      res.json(response.documents.map((document: any) => ({
        id: document.$id,
        action: document.action,
        performedBy: document.performedBy,
        performedByRole: document.performedByRole,
        timestamp: document.timestamp,
        details: document.details,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch audit logs" });
    }
  });

  // --- Diagnostic & Automated Test Suite API ---
  app.get("/api/diagnostics/run-tests", requireAdminOrTeacher, async (req: Request, res: Response) => {
    const results: any[] = [];

    // Test 1: signed session token tamper protection
    try {
      const token = createSignedToken({ purpose: "diagnostic", value: "ballot" }, APP_SECURITY_SECRET, 60);
      const verified = verifySignedToken(token, APP_SECURITY_SECRET, "diagnostic");
      const tamperedVerified = verifySignedToken(`${token}x`, APP_SECURITY_SECRET, "diagnostic");

      results.push({
        test: "Signed Session Tamper Shield",
        passed: Boolean(verified) && tamperedVerified === null,
        details: verified ? "Signed tokens verify correctly and modified tokens are rejected." : "Token verification failed."
      });
    } catch (e: any) {
      results.push({ test: "Signed Session Tamper Shield", passed: false, details: e.message });
    }

    // Test 2: Student Number Uniqueness Logic
    try {
      const users = await getAll("users");
      const numMap = new Map();
      let duplicateFound = false;

      for (const u of users) {
        const num = normalizeStudentNumber(u.studentNumber || u.username);
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
    const activeBranding = (await getOne("branding", "school")) || DEFAULT_BRANDING;
    results.push({
      test: "Permanent Golden West Colleges Attribution",
      passed: activeBranding.attributionText === "Developed by students of Golden West Colleges, Inc.",
      details: `Active attribution string: "${activeBranding.attributionText}"`
    });

    // Test 4: no duplicate effective votes
    const allVotes = await getAll("votes");
    const effectiveKeys = new Set<string>();
    const duplicateVote = allVotes.some((vote) => {
      const key = `${vote.electionId}:${vote.positionId}:${vote.voterId}`;
      if (effectiveKeys.has(key)) return true;
      effectiveKeys.add(key);
      return false;
    });
    results.push({
      test: "Single Effective Vote Constraint",
      passed: !duplicateVote,
      details: duplicateVote ? "Duplicate election/position/voter records were detected." : `All ${allVotes.length} vote records are unique per election position and voter.`,
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

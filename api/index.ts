import { createElectionApp } from "../server.ts";
import type { Request, Response } from "express";

// One Express instance is reused by warm Vercel Function invocations. Appwrite
// is the persistent system of record, so the function itself stays stateless.
// Keep an explicit request handler at the serverless boundary instead of
// relying on framework detection for the Express application object. The
// explicit .ts extension is also important because this project has a server/
// directory; an extensionless ../server import can resolve to that directory.
const app = createElectionApp();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}

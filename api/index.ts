import type { Request, Response } from "express";
import { createElectionApp } from "../server";

// One Express instance is reused by warm Vercel Function invocations. Appwrite
// is the persistent system of record, so the function itself stays stateless.
const appPromise = createElectionApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}

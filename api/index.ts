import { createElectionApp } from "../server.ts";

// One Express instance is reused by warm Vercel Function invocations. Appwrite
// is the persistent system of record, so the function itself stays stateless.
// Exporting the Express application directly is Vercel's native Express
// integration. The explicit .ts extension is important because this project
// also has a server/ directory; an extensionless ../server import can resolve
// to that directory and crash the Node ESM function during startup.
const app = createElectionApp();

export default app;

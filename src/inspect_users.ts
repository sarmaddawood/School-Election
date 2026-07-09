import { Client, Databases } from "node-appwrite";

const APPWRITE_PROJECT = "6a49127700029d3bc9bf";
const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_API_KEY = "standard_824ce6b89704a6332dcc5c3ebb38cddb156181a1e077562c2e1513f9debadc83ee1889ba5e50464bc571ae1f3d11f0e89fa5004f765f7006753b6a6adf71a9e66d3c6b878c9a32e80bcc906b865bfb49324204e3ea04a39d6c44d9ff4c022eafaf2218bc82b62cf905d47a3b0c54d76fb62c018d26dccd329c4d4d4e2d583472";
const APPWRITE_DB = "voting_db";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function inspect() {
  try {
    const res = await databases.listDocuments(APPWRITE_DB, "users");
    console.log("Total users:", res.total);
    console.log("Users:", res.documents.map(d => ({ id: d.$id, username: d.username, password: d.password, role: d.role })));
  } catch (err: any) {
    console.error("Failed to list users:", err.message);
  }
}

inspect();

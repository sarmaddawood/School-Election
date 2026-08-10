import { OfflineBallot, OfflineBallotCredential } from "../types";

function bytesToBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function encryptOfflineBallot(
  credential: OfflineBallotCredential,
  payload: {
    voterId: string;
    studentNumber: string;
    electionId: string;
    votes: Array<{ positionId: string; candidateId: string }>;
    timestamp: string;
  },
): Promise<OfflineBallot> {
  if (!window.crypto?.subtle) {
    throw new Error("This browser does not support secure offline ballot encryption");
  }

  const serverPublicKey = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(credential.publicKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ephemeralKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverPublicKey },
    ephemeralKeys.privateKey,
    256,
  );
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: new TextEncoder().encode("school-election-offline-ballot-v1"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const plaintext = new TextEncoder().encode(JSON.stringify({
    ...payload,
    nonce: credential.nonce,
    permit: credential.permit,
  }));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, plaintext);
  const ephemeralPublicKey = await crypto.subtle.exportKey("raw", ephemeralKeys.publicKey);

  return {
    version: 1,
    algorithm: "ECDH-P256/HKDF-SHA256/AES-256-GCM",
    ephemeralPublicKey: bytesToBase64(ephemeralPublicKey),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export function downloadOfflineBallot(ballot: OfflineBallot, filename: string): void {
  const blob = new Blob([JSON.stringify(ballot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

import { chacha20poly1305 } from "@noble/ciphers/chacha";
import { x25519 } from "@noble/curves/ed25519";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToUtf8, concatBytes, utf8ToBytes } from "@noble/hashes/utils";
import * as Crypto from "expo-crypto";
import { fromByteArray, toByteArray } from "base64-js";

export const randomBytes = (length) => Crypto.getRandomBytes(length);
export const toBase64 = (value) => fromByteArray(Uint8Array.from(value));
export const fromBase64 = (value) => Uint8Array.from(toByteArray(value));
export const createPrivateKey = () => randomBytes(32);
export const publicKeyFor = (privateKey) => x25519.getPublicKey(privateKey);
export const sharedKeyFor = (privateKey, publicKey) => x25519.getSharedSecret(privateKey, publicKey);
export const authProof = (sharedKey, challenge) => toBase64(hmac(sha256, sharedKey, challenge));
export function confirmationCode(sharedKey, token) {
  const digest = sha256(concatBytes(sharedKey, utf8ToBytes(token)));
  const value = (((digest[0] << 24) >>> 0) + (digest[1] << 16) + (digest[2] << 8) + digest[3]) >>> 0;
  return String(value % 1_000_000).padStart(6, "0");
}

export function encryptClipboard(sharedKey, item) {
  const nonce = randomBytes(12);
  const plain = utf8ToBytes(JSON.stringify(item));
  const ciphertext = chacha20poly1305(sharedKey, nonce).encrypt(plain);
  return JSON.stringify({ type: "encrypted", nonce: toBase64(nonce), ciphertext: toBase64(ciphertext) });
}

export function decryptClipboard(sharedKey, raw) {
  const envelope = JSON.parse(raw);
  if (envelope?.type !== "encrypted") throw new Error("The bridge sent an unsupported message.");
  const nonce = fromBase64(envelope.nonce);
  if (nonce.length !== 12) throw new Error("The encrypted message has an invalid nonce.");
  const plain = chacha20poly1305(sharedKey, nonce).decrypt(fromBase64(envelope.ciphertext));
  const item = JSON.parse(bytesToUtf8(plain));
  if (item?.type !== "clipboard" || typeof item.content !== "string") throw new Error("The clipboard message is invalid.");
  if (utf8ToBytes(item.content).length > 100 * 1024) throw new Error("The clipboard item is larger than 100 KB.");
  return item;
}

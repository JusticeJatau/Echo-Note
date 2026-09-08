import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { getDatabase, getPreference, setPreference } from "../db/database";
import { createPrivateKey, publicKeyFor, toBase64 } from "./crypto";

const IDENTITY_KEY = "nearby-clipboard-identity-v1";
const PEERS_KEY = "nearby-clipboard-peers-v1";
const SETTINGS_KEY = "nearby-clipboard-settings-v1";
export const clipboardDefaults = { enabled: true, autoSend: true, autoCopy: false, historyLimit: 20 };

export async function loadIdentity() {
  const saved = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (saved) return JSON.parse(saved);
  const privateKey = createPrivateKey();
  const identity = {
    id: Crypto.randomUUID(),
    name: Device.deviceName || Device.modelName || "EchoNotes Android",
    privateKey: toBase64(privateKey),
    publicKey: toBase64(publicKeyFor(privateKey)),
  };
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export async function loadPeers() {
  const saved = await SecureStore.getItemAsync(PEERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function savePeers(peers) {
  await SecureStore.setItemAsync(PEERS_KEY, JSON.stringify(peers));
}

export async function loadClipboardSettings() {
  return { ...clipboardDefaults, ...(await getPreference(SETTINGS_KEY, clipboardDefaults)) };
}

export async function saveClipboardSettings(settings) {
  await setPreference(SETTINGS_KEY, settings);
}

export async function listClipboardHistory() {
  return (await (await getDatabase()).getAllAsync("SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT 100")).map((row) => ({
    id: row.id, content: row.content, sourceId: row.source_id, sourceName: row.source_name,
    direction: row.direction, createdAt: row.created_at,
  }));
}

export async function saveClipboardHistory(item, limit) {
  const db = await getDatabase();
  const safeItem = {
    id: String(item.id || Crypto.randomUUID()),
    content: String(item.content ?? ""),
    sourceId: String(item.sourceId || "unknown-device"),
    sourceName: String(item.sourceName || "Unknown device"),
    direction: item.direction === "received" ? "received" : "sent",
    createdAt: String(item.createdAt || new Date().toISOString()),
  };
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.trunc(Number(limit))) : clipboardDefaults.historyLimit;
  await db.runAsync(
    "INSERT OR REPLACE INTO clipboard_history (id,content,source_id,source_name,direction,created_at) VALUES (?,?,?,?,?,?)",
    safeItem.id, safeItem.content, safeItem.sourceId, safeItem.sourceName, safeItem.direction, safeItem.createdAt,
  );
  await db.runAsync("DELETE FROM clipboard_history WHERE id NOT IN (SELECT id FROM clipboard_history ORDER BY created_at DESC LIMIT ?)", safeLimit);
}

export async function deleteClipboardHistory(id) {
  await (await getDatabase()).runAsync("DELETE FROM clipboard_history WHERE id=?", id);
}

export async function clearClipboardHistory() {
  await (await getDatabase()).runAsync("DELETE FROM clipboard_history");
}

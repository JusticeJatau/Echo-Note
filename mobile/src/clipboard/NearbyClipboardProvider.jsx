import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { utf8ToBytes } from "@noble/hashes/utils";
import { useAlerts } from "../store/alerts";
import {
  authProof, confirmationCode, decryptClipboard, encryptClipboard, fromBase64, sharedKeyFor, toBase64,
} from "./crypto";
import {
  clearClipboardHistory, clipboardDefaults, deleteClipboardHistory, listClipboardHistory,
  loadClipboardSettings, loadIdentity, loadPeers, saveClipboardHistory,
  saveClipboardSettings, savePeers,
} from "./storage";

const NearbyClipboardContext = createContext(null);
const PROTOCOL = "echonotes-nearby-v1";
const MAX_BYTES = 100 * 1024;
const utf8Length = (value) => utf8ToBytes(value).length;
const readableError = (error) => error instanceof Error ? error.message : String(error);

function parsePairingPayload(raw) {
  const payload = JSON.parse(raw);
  if (payload?.protocol !== PROTOCOL) throw new Error("This QR code is not from EchoNotes Desktop Bridge.");
  if (!payload.endpoint || !payload.token || !payload.publicKey || !payload.deviceId) throw new Error("This pairing QR code is incomplete.");
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() <= Date.now()) throw new Error("This pairing QR code has expired. Generate a new one on the PC.");
  return payload;
}

export function NearbyClipboardProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [peers, setPeers] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(clipboardDefaults);
  const [status, setStatus] = useState({ state: "offline", message: "No trusted PC connected" });
  const [pairing, setPairing] = useState(null);
  const socketRef = useRef(null);
  const activePeerRef = useRef(null);
  const reconnectRef = useRef(null);
  const manualCloseRef = useRef(false);
  const settingsRef = useRef(settings);
  const peersRef = useRef(peers);
  const identityRef = useRef(identity);
  const lastClipboardRef = useRef("");

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { peersRef.current = peers; }, [peers]);
  useEffect(() => { identityRef.current = identity; }, [identity]);

  const refreshHistory = useCallback(async () => setHistory(await listClipboardHistory()), []);

  const rememberItem = useCallback(async (item) => {
    await saveClipboardHistory(item, settingsRef.current.historyLimit);
    await refreshHistory();
  }, [refreshHistory]);

  const closeSocket = useCallback((manual = true) => {
    manualCloseRef.current = manual;
    clearTimeout(reconnectRef.current);
    reconnectRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < 2) socket.close();
    activePeerRef.current = null;
  }, []);

  const receiveEncrypted = useCallback(async (raw, key) => {
    const wire = decryptClipboard(key, raw);
    const item = { ...wire, direction: "received" };
    await rememberItem(item);
    await useAlerts.getState().add("clipboard", "Clipboard received", `New text received from ${item.sourceName}.`);
    if (settingsRef.current.autoCopy) {
      lastClipboardRef.current = item.content;
      await Clipboard.setStringAsync(item.content);
    }
  }, [rememberItem]);

  const scheduleReconnect = useCallback((peerId) => {
    clearTimeout(reconnectRef.current);
    if (manualCloseRef.current || !settingsRef.current.enabled || AppState.currentState !== "active") return;
    reconnectRef.current = setTimeout(() => {
      const peer = peersRef.current.find((item) => item.id === peerId);
      if (peer) connectTrustedRef.current(peer);
    }, 3000);
  }, []);

  const attachConnectedSocket = useCallback((socket, peer, key) => {
    manualCloseRef.current = false;
    socketRef.current = socket;
    activePeerRef.current = peer;
    setStatus({ state: "connected", message: `Connected to ${peer.name}` });
    socket.onmessage = (event) => {
      void receiveEncrypted(String(event.data), key).catch((error) => {
        setStatus({ state: "error", message: readableError(error) });
      });
    };
    socket.onerror = () => setStatus({ state: "error", message: `Could not reach ${peer.name}` });
    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
      setStatus({ state: "offline", message: `${peer.name} disconnected` });
      scheduleReconnect(peer.id);
    };
  }, [receiveEncrypted, scheduleReconnect]);

  const connectTrusted = useCallback((peer) => {
    const currentIdentity = identityRef.current;
    if (!currentIdentity || !settingsRef.current.enabled) return;
    closeSocket(false);
    manualCloseRef.current = false;
    setStatus({ state: "connecting", message: `Connecting to ${peer.name}…` });
    const key = fromBase64(peer.sharedKey);
    const socket = new WebSocket(`ws://${peer.endpoint}/sync?device_id=${encodeURIComponent(currentIdentity.id)}`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.type === "challenge") {
          socket.send(JSON.stringify({ type: "auth", proof: authProof(key, fromBase64(message.nonce)) }));
        } else if (message.type === "authenticated") {
          attachConnectedSocket(socket, peer, key);
        } else if (message.type === "error") {
          throw new Error(message.message || "The PC rejected this device.");
        }
      } catch (error) {
        setStatus({ state: "error", message: readableError(error) });
        socket.close();
      }
    };
    socket.onerror = () => setStatus({ state: "error", message: `Could not reach ${peer.name}. Check the Wi-Fi or hotspot.` });
    socket.onclose = () => scheduleReconnect(peer.id);
  }, [attachConnectedSocket, closeSocket, scheduleReconnect]);
  const connectTrustedRef = useRef(connectTrusted);
  useEffect(() => { connectTrustedRef.current = connectTrusted; }, [connectTrusted]);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadIdentity(), loadPeers(), listClipboardHistory(), loadClipboardSettings()]).then(([nextIdentity, nextPeers, nextHistory, nextSettings]) => {
      if (!alive) return;
      setIdentity(nextIdentity); identityRef.current = nextIdentity;
      setPeers(nextPeers); peersRef.current = nextPeers;
      setHistory(nextHistory);
      setSettings(nextSettings); settingsRef.current = nextSettings;
      setReady(true);
      if (nextSettings.enabled && nextPeers[0]) setTimeout(() => connectTrustedRef.current(nextPeers[0]), 150);
    }).catch((error) => {
      setStatus({ state: "error", message: readableError(error) });
      setReady(true);
    });
    return () => { alive = false; closeSocket(true); };
  }, [closeSocket]);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const subscription = Clipboard.addClipboardListener(({ contentTypes }) => {
      if (!contentTypes.includes(Clipboard.ContentType.PLAIN_TEXT)) return;
      void Clipboard.getStringAsync().then((content) => {
        if (!settingsRef.current.enabled || !settingsRef.current.autoSend || !content || content === lastClipboardRef.current) return;
        lastClipboardRef.current = content;
        void sendTextRef.current(content, true);
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && settingsRef.current.enabled && !socketRef.current) {
        const peer = activePeerRef.current || peersRef.current[0];
        if (peer) connectTrustedRef.current(peer);
      }
    });
    return () => subscription.remove();
  }, []);

  const pairFromQr = useCallback(async (raw) => {
    if (!identityRef.current) throw new Error("The mobile identity is still loading.");
    const payload = parsePairingPayload(raw);
    closeSocket(false);
    const key = sharedKeyFor(fromBase64(identityRef.current.privateKey), fromBase64(payload.publicKey));
    const expectedCode = confirmationCode(key, payload.token);
    const peer = { id: payload.deviceId, name: payload.deviceName || "Windows PC", kind: "windows", endpoint: payload.endpoint, publicKey: payload.publicKey, sharedKey: null, lastSeen: null };
    setPairing({ state: "connecting", peer, code: null });
    setStatus({ state: "connecting", message: `Pairing with ${peer.name}…` });
    const socket = new WebSocket(`ws://${payload.endpoint}/pair?token=${encodeURIComponent(payload.token)}`);
    socketRef.current = socket;
    socket.onopen = () => socket.send(JSON.stringify({ type: "pair_request", deviceId: identityRef.current.id, deviceName: identityRef.current.name, deviceKind: "android", publicKey: identityRef.current.publicKey }));
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.type === "pair_pending") {
          if (message.confirmationCode !== expectedCode) throw new Error("The PC pairing code did not match. Cancel pairing and try again.");
          setPairing({ state: "confirm", peer, code: message.confirmationCode });
        } else if (message.type === "pair_approved") {
          const trusted = { ...peer, sharedKey: toBase64(key), lastSeen: new Date().toISOString() };
          const nextPeers = [trusted, ...peersRef.current.filter((item) => item.id !== trusted.id)];
          peersRef.current = nextPeers; setPeers(nextPeers); await savePeers(nextPeers);
          setPairing({ state: "approved", peer: trusted, code: null });
          attachConnectedSocket(socket, trusted, key);
        } else if (message.type === "pair_rejected" || message.type === "error") {
          throw new Error(message.message || "Pairing was rejected on the PC.");
        }
      } catch (error) {
        setPairing({ state: "error", peer, error: readableError(error) });
        setStatus({ state: "error", message: readableError(error) });
        socket.close();
      }
    };
    socket.onerror = () => {
      const message = "Could not reach the PC. Keep both devices on the same Wi-Fi or hotspot and allow the bridge through Windows Firewall.";
      setPairing({ state: "error", peer, error: message }); setStatus({ state: "error", message });
    };
  }, [attachConnectedSocket, closeSocket]);

  const sendText = useCallback(async (content, automatic = false) => {
    const socket = socketRef.current;
    const peer = activePeerRef.current;
    const currentIdentity = identityRef.current;
    if (!content?.trim()) throw new Error("Copy or enter some text first.");
    if (utf8Length(content) > MAX_BYTES) throw new Error("Clipboard text must be smaller than 100 KB.");
    if (!socket || socket.readyState !== 1 || !peer) {
      if (automatic) return false;
      throw new Error("Connect a trusted PC before sending clipboard text.");
    }
    const wire = { type: "clipboard", id: Crypto.randomUUID(), content, sourceId: currentIdentity.id, sourceName: currentIdentity.name, createdAt: new Date().toISOString() };
    socket.send(encryptClipboard(fromBase64(peer.sharedKey), wire));
    await rememberItem({ ...wire, direction: "sent" });
    return true;
  }, [rememberItem]);
  const sendTextRef = useRef(sendText);
  useEffect(() => { sendTextRef.current = sendText; }, [sendText]);

  const sendCurrentClipboard = useCallback(async () => sendText(await Clipboard.getStringAsync()), [sendText]);
  const copyItem = useCallback(async (item) => { lastClipboardRef.current = item.content; await Clipboard.setStringAsync(item.content); }, []);
  const removeHistory = useCallback(async (id) => { await deleteClipboardHistory(id); await refreshHistory(); }, [refreshHistory]);
  const clearHistory = useCallback(async () => { await clearClipboardHistory(); setHistory([]); }, []);
  const removePeer = useCallback(async (id) => {
    if (activePeerRef.current?.id === id) closeSocket(true);
    const next = peersRef.current.filter((peer) => peer.id !== id);
    peersRef.current = next; setPeers(next); await savePeers(next);
    setStatus({ state: "offline", message: next.length ? "Choose a trusted PC to reconnect" : "No trusted PC connected" });
  }, [closeSocket]);
  const updateSettings = useCallback(async (patch) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next; setSettings(next); await saveClipboardSettings(next);
    if (!next.enabled) { closeSocket(true); setStatus({ state: "paused", message: "Nearby clipboard is paused" }); }
    else if (!socketRef.current && peersRef.current[0]) connectTrustedRef.current(peersRef.current[0]);
  }, [closeSocket]);

  const value = {
    ready, identity, peers, history, settings, status, pairing, setPairing,
    pairFromQr, connectPeer: connectTrusted, disconnect: () => { closeSocket(true); setStatus({ state: "offline", message: "Disconnected" }); },
    sendCurrentClipboard, copyItem, removeHistory, clearHistory, removePeer, updateSettings,
  };
  return <NearbyClipboardContext.Provider value={value}>{children}</NearbyClipboardContext.Provider>;
}

export function useNearbyClipboard() {
  const value = useContext(NearbyClipboardContext);
  if (!value) throw new Error("useNearbyClipboard must be used inside NearbyClipboardProvider");
  return value;
}

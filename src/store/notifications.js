import { create } from "zustand";

const STORAGE_KEY = "echonotes-alerts-v1";

function loadAlerts() {
  if (typeof localStorage === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function save(alerts) {
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 50)));
}

export const useNotifications = create((set) => ({
  alerts: loadAlerts(),
  addAlert: ({ title, message, type = "info" }) => set((state) => {
    const alert = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const alerts = [alert, ...state.alerts].slice(0, 50);
    save(alerts);
    return { alerts };
  }),
  markAllRead: () => set((state) => {
    const alerts = state.alerts.map((alert) => ({ ...alert, read: true }));
    save(alerts);
    return { alerts };
  }),
  markRead: (id) => set((state) => {
    const alerts = state.alerts.map((alert) => alert.id === id ? { ...alert, read: true } : alert);
    save(alerts);
    return { alerts };
  }),
  removeAlert: (id) => set((state) => {
    const alerts = state.alerts.filter((alert) => alert.id !== id);
    save(alerts);
    return { alerts };
  }),
  clearAlerts: () => set(() => {
    save([]);
    return { alerts: [] };
  }),
}));

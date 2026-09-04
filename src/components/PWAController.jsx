import { Download, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PWAController() {
  const [online, setOnline] = useState(true);
  const [restored, setRestored] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    setOnline(navigator.onLine);

    const cacheLoadedApp = (worker) => {
      if (!worker) return;
      const urls = [window.location.href, `${window.location.origin}/app`, ...performance.getEntriesByType("resource").map((entry) => entry.name)];
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (!event.data?.ready) return;
        localStorage.setItem("echonotes-offline-ready", "true");
        setOfflineReady(true);
        window.setTimeout(() => setOfflineReady(false), 4000);
      };
      worker.postMessage({ type: "CACHE_LOADED_APP", urls }, [channel.port2]);
    };
    const handleControllerChange = () => cacheLoadedApp(navigator.serviceWorker.controller);

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (registration) => {
        await registration.update();
        const readyRegistration = await navigator.serviceWorker.ready;
        cacheLoadedApp(readyRegistration.active);
      }).catch((error) => console.error("Service worker registration failed", error));
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      if (navigator.storage?.persist) void navigator.storage.persist();
    }

    const handleOffline = () => { setOnline(false); setRestored(false); };
    const handleOnline = () => {
      setOnline(true);
      setRestored(true);
      window.setTimeout(() => setRestored(false), 3000);
    };
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      if (sessionStorage.getItem("echonotes-install-dismissed") !== "true") setInstallPrompt(event);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function dismissInstall() {
    sessionStorage.setItem("echonotes-install-dismissed", "true");
    setInstallPrompt(null);
  }

  return <>
    {offlineReady ? <div role="status" className="fixed right-4 top-4 z-[121] flex items-center gap-2 rounded-full border border-success/30 bg-card/95 px-3 py-2 text-xs font-medium text-success shadow-xl backdrop-blur"><Wifi className="size-4"/>Ready for offline use</div> : null}
    {!online || restored ? <div role="status" className={`fixed right-4 top-4 z-[120] flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-xl backdrop-blur ${online ? "border-success/30 bg-card/95 text-success" : "border-warning/30 bg-card/95 text-warning"}`}>{online ? <Wifi className="size-4"/> : <WifiOff className="size-4"/>}{online ? "Back online" : "Offline — changes stay on this device"}</div> : null}
    {installPrompt ? <div className="fixed bottom-20 right-4 z-[110] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl lg:bottom-5"><button onClick={dismissInstall} aria-label="Dismiss install prompt" className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-surface"><X className="size-4"/></button><div className="flex gap-3"><img src="/echo8v-logo.png" alt="" className="size-11 object-contain"/><div className="pr-6"><p className="text-sm font-semibold">Install EchoNotes</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Open your notes faster and launch the app when you're offline.</p></div></div><button onClick={() => void installApp()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"><Download className="size-4"/>Install app</button></div> : null}
  </>;
}

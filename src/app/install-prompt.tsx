"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeToInstalled(callback: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);

  return () => {
    displayMode.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function getInstalledSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const isInstalled = useSyncExternalStore(
    subscribeToInstalled,
    getInstalledSnapshot,
    () => false,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error: unknown) =>
          console.error("Gagal mendaftarkan service worker:", error),
        );
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  if (isInstalled || !visible) {
    return null;
  }

  const handleInstall = async () => {
    if (showInstructions) {
      setVisible(false);
      return;
    }

    if (!installEvent) {
      setShowInstructions(true);
      return;
    }

    setIsPrompting(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        setShowInstructions(true);
      }
    } catch (error) {
      console.error("Gagal membuka prompt instalasi:", error);
      setShowInstructions(true);
    } finally {
      setInstallEvent(null);
      setIsPrompting(false);
    }
  };

  return (
    <aside className="pwa-install-notice" aria-label="Instal aplikasi">
      <div className="pwa-install-icon" aria-hidden="true">
        <Download size={18} />
      </div>
      <div className="pwa-install-copy">
        <strong>Instal Donghua ID</strong>
        <span>
          {showInstructions
            ? "Pilih Bagikan atau menu browser, lalu Tambahkan ke Layar Utama."
            : "Akses donghua favoritmu langsung dari layar utama."}
        </span>
      </div>
      <button
        className="pwa-install-action"
        type="button"
        onClick={handleInstall}
        disabled={isPrompting}
      >
        {installEvent ? "Instal" : showInstructions ? "Mengerti" : "Cara instal"}
      </button>
      <button
        className="pwa-install-close"
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Tutup notifikasi instalasi"
      >
        <X size={17} />
      </button>
    </aside>
  );
}

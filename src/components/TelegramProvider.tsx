"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TelegramUser = {
  id: number;
  first_name: string;
  username: string | null;
};

type WatchProgress = {
  id: string;
  title: string;
  episode: number;
  updatedAt: number;
};

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe?: { start_param?: string };
  colorScheme: "light" | "dark";
  themeParams?: { bg_color?: string };
  CloudStorage?: {
    getItem?: (key: string, callback: (error: unknown, value?: string) => void) => void;
    setItem?: (key: string, value: string, callback: (error: unknown, success?: boolean) => void) => void;
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback?: { impactOccurred: (style: string) => void };
  addToHomeScreen?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  openTelegramLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type TelegramContextValue = {
  user: TelegramUser | null;
  authError: string;
  isTelegram: boolean;
  isReady: boolean;
  startParam: string;
  favorites: string[];
  history: WatchProgress[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  saveProgress: (progress: Omit<WatchProgress, "updatedAt">) => Promise<void>;
  getProgress: (id: string) => WatchProgress | undefined;
  clearHistory: () => Promise<void>;
  share: (path: string, text?: string) => Promise<boolean>;
  haptic: (style?: string) => boolean;
  addToHome: () => boolean;
  fullscreen: (on: boolean) => boolean;
};

const TelegramContext = createContext<TelegramContextValue | null>(null);

function getTelegramSnapshot() {
  if (typeof window === "undefined") return null;
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData ? webApp : null;
}

function subscribeToTelegram(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("telegram-web-app-ready", callback);
  return () => window.removeEventListener("telegram-web-app-ready", callback);
}

function getLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Penyimpanan lokal tidak tersedia.", error);
    return null;
  }
}

function setLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error("Data tidak dapat disimpan di penyimpanan lokal.", error);
  }
}

function readCloudValue(
  telegram: TelegramWebApp,
  key: string,
): Promise<string | null> {
  const getItem = telegram.CloudStorage?.getItem;
  if (!getItem) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    getItem.call(telegram.CloudStorage, key, (error, value) => {
      if (error) reject(new Error(String(error)));
      else resolve(value ?? null);
    });
  });
}

function writeCloudValue(telegram: TelegramWebApp, key: string, value: string) {
  const setItem = telegram.CloudStorage?.setItem;
  if (!setItem) return Promise.reject(new Error("Telegram CloudStorage tidak tersedia."));
  return new Promise<void>((resolve, reject) => {
    setItem.call(telegram.CloudStorage, key, value, (error) => {
      if (error) reject(new Error(String(error)));
      else resolve();
    });
  });
}

async function readValue(telegram: TelegramWebApp | null, key: string) {
  if (telegram) {
    try {
      const value = await readCloudValue(telegram, key);
      if (value) return value;
      const localValue = getLocalValue(key);
      if (localValue) {
        await writeCloudValue(telegram, key, localValue);
        return localValue;
      }
      return value;
    } catch (error) {
      console.warn("Telegram CloudStorage gagal dibaca; memakai localStorage.", error);
    }
  }
  return getLocalValue(key);
}

async function writeValue(telegram: TelegramWebApp | null, key: string, value: string) {
  if (telegram) {
    try {
      await writeCloudValue(telegram, key, value);
      setLocalValue(key, value);
      return;
    } catch (error) {
      console.warn("Telegram CloudStorage gagal menyimpan; memakai localStorage.", error);
    }
  }
  setLocalValue(key, value);
}

function parseList<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error) {
    console.warn("Data Telegram tersimpan tidak dapat dibaca.", error);
    return [];
  }
}

export function TelegramProvider({ children }: Readonly<{ children: ReactNode }>) {
  const telegram = useSyncExternalStore(
    subscribeToTelegram,
    getTelegramSnapshot,
    () => null,
  );
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<WatchProgress[]>([]);
  const [isReady, setIsReady] = useState(false);
  const favoritesRef = useRef(favorites);
  const historyRef = useRef(history);
  const startParam = telegram?.initDataUnsafe?.start_param ?? "";

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const activeTelegram = telegram;
    if (activeTelegram) {
      activeTelegram.ready();
      activeTelegram.expand();
      document.documentElement.dataset.telegramMiniApp = "true";
      document.documentElement.dataset.telegramTheme = activeTelegram.colorScheme;

      const backgroundColor = activeTelegram.themeParams?.bg_color;
      if (backgroundColor && /^#[\da-f]{6}$/i.test(backgroundColor)) {
        document.documentElement.style.setProperty("--telegram-bg-color", backgroundColor);
      }
    }

    let active = true;
    async function initialize() {
      try {
        const [savedFavorites, savedHistory] = await Promise.all([
          readValue(activeTelegram, "donghua-saved"),
          readValue(activeTelegram, "donghua-history"),
        ]);
        if (!active) return;
        const parsedFavorites = parseList<string>(savedFavorites);
        const parsedHistory = parseList<WatchProgress>(savedHistory);
        favoritesRef.current = parsedFavorites;
        historyRef.current = parsedHistory;
        setFavorites(parsedFavorites);
        setHistory(parsedHistory);
      } catch (error) {
        console.error("Favorit dan riwayat tonton gagal dimuat.", error);
        if (active) setAuthError("Favorit atau riwayat tontonan gagal dimuat.");
      } finally {
        if (active) setIsReady(true);
      }

      if (!activeTelegram?.initData) return;
      try {
        const response = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: activeTelegram.initData }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `Login Telegram gagal (${response.status}).`;
          throw new Error(message);
        }
        if (
          payload &&
          typeof payload === "object" &&
          "user" in payload &&
          payload.user &&
          typeof payload.user === "object" &&
          "id" in payload.user &&
          typeof payload.user.id === "number" &&
          "first_name" in payload.user &&
          typeof payload.user.first_name === "string"
        ) {
          setUser({
            id: payload.user.id,
            first_name: payload.user.first_name,
            username:
              "username" in payload.user && typeof payload.user.username === "string"
                ? payload.user.username
                : null,
          });
        } else {
          throw new Error("Respons login Telegram tidak valid.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login Telegram gagal.";
        console.error(message);
        if (active) setAuthError(message);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [telegram]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(async (id: string) => {
    const current = favoritesRef.current;
    const next = current.includes(id)
      ? current.filter((favorite) => favorite !== id)
      : [...current, id];
    favoritesRef.current = next;
    setFavorites(next);
    await writeValue(telegram, "donghua-saved", JSON.stringify(next));
  }, [telegram]);

  const saveProgress = useCallback(async (progress: Omit<WatchProgress, "updatedAt">) => {
    const next = [
      { ...progress, updatedAt: Date.now() },
      ...historyRef.current.filter((entry) => entry.id !== progress.id),
    ].slice(0, 10);
    historyRef.current = next;
    setHistory(next);
    await writeValue(telegram, "donghua-history", JSON.stringify(next));
  }, [telegram]);

  const getProgress = useCallback(
    (id: string) => history.find((entry) => entry.id === id),
    [history],
  );

  const clearHistory = useCallback(async () => {
    historyRef.current = [];
    setHistory([]);
    await writeValue(telegram, "donghua-history", JSON.stringify([]));
  }, [telegram]);

  const share = useCallback(async (path: string, text = "") => {
    const normalizedPath = path.startsWith("/") ? path : `/watch/${encodeURIComponent(path)}`;
    const url = new URL(normalizedPath, window.location.origin).toString();
    if (telegram?.openTelegramLink) {
      const botUsername = (
        process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "anime_ID_bot"
      ).replace(/^@/, "");
      let miniAppUrl = url;
      if (botUsername) {
        const watchMatch = new URL(url).pathname.match(/^\/watch\/([^/]+)$/);
        const articleMatch = new URL(url).pathname.match(/^\/artikel\/([^/]+)$/);
        const episode = new URL(url).searchParams.get("episode");
        const startParam = watchMatch
          ? `watch_${decodeURIComponent(watchMatch[1])}${episode ? `_ep_${episode}` : ""}`
          : articleMatch
            ? `artikel_${decodeURIComponent(articleMatch[1])}`
            : "";
        if (startParam) {
          miniAppUrl = `https://t.me/${botUsername}?startapp=${encodeURIComponent(startParam)}`;
        }
      }
      const shareUrl = new URL("https://t.me/share/url");
      shareUrl.searchParams.set("url", miniAppUrl);
      if (text) shareUrl.searchParams.set("text", text);
      telegram.openTelegramLink(shareUrl.toString());
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title: text || document.title, url });
      return true;
    }
    await navigator.clipboard.writeText(url);
    return true;
  }, [telegram]);

  const haptic = useCallback((style = "light") => {
    if (!telegram?.HapticFeedback?.impactOccurred) return false;
    try {
      telegram.HapticFeedback.impactOccurred(style);
      return true;
    } catch (error) {
      console.warn("Haptic feedback Telegram tidak tersedia.", error);
      return false;
    }
  }, [telegram]);

  const addToHome = useCallback(() => {
    if (!telegram?.addToHomeScreen) return false;
    try {
      telegram.addToHomeScreen();
      return true;
    } catch (error) {
      console.warn("Mini App tidak dapat ditambahkan ke layar utama.", error);
      return false;
    }
  }, [telegram]);

  const fullscreen = useCallback((on: boolean) => {
    const method = on ? telegram?.requestFullscreen : telegram?.exitFullscreen;
    if (!method || !telegram) return false;
    try {
      method.call(telegram);
      return true;
    } catch (error) {
      console.warn("Mode layar penuh Telegram tidak tersedia.", error);
      return false;
    }
  }, [telegram]);

  const value = useMemo<TelegramContextValue>(() => ({
    user,
    authError,
    isTelegram: Boolean(telegram),
    isReady,
    startParam,
    favorites,
    history,
    isFavorite,
    toggleFavorite,
    saveProgress,
    getProgress,
    clearHistory,
    share,
    haptic,
    addToHome,
    fullscreen,
  }), [
    user, authError, telegram, isReady, startParam, favorites, history, isFavorite,
    toggleFavorite, saveProgress, getProgress, clearHistory, share, haptic, addToHome, fullscreen,
  ]);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) throw new Error("useTelegram harus digunakan di dalam TelegramProvider.");
  return context;
}

export function useBackButton(onBack: () => void, enabled = true) {
  const { isTelegram } = useTelegram();

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!enabled || !isTelegram || !backButton) return;
    backButton.onClick(onBack);
    backButton.show();
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [enabled, isTelegram, onBack]);
}

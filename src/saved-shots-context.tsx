import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { SEED_POST_BY_ID } from './data/seed-posts';

const STORAGE_KEY = '@pds/want-to-shoot/v1/demo-device';

export type SavedShotEntry = {
  postId: string;
  savedAt: string;
};

type SavedShotStore = {
  version: 1;
  entries: SavedShotEntry[];
};

type SavedShotsContextValue = {
  hydrated: boolean;
  entries: SavedShotEntry[];
  isSaved: (postId: string) => boolean;
  toggle: (postId: string) => Promise<boolean>;
  remove: (postId: string) => Promise<void>;
};

const SavedShotsContext = createContext<SavedShotsContextValue | null>(null);

const parseEntries = (raw: string | null): SavedShotEntry[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<SavedShotStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return [];

    const seen = new Set<string>();
    return parsed.entries.filter((entry): entry is SavedShotEntry => {
      if (
        !entry ||
        typeof entry.postId !== 'string' ||
        typeof entry.savedAt !== 'string' ||
        !SEED_POST_BY_ID[entry.postId] ||
        seen.has(entry.postId)
      ) {
        return false;
      }

      seen.add(entry.postId);
      return true;
    });
  } catch {
    return [];
  }
};

export function SavedShotsProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<SavedShotEntry[]>([]);
  const entriesRef = useRef<SavedShotEntry[]>([]);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const savedEntries = parseEntries(raw);
        entriesRef.current = savedEntries;
        setEntries(savedEntries);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((nextEntries: SavedShotEntry[]) => {
    const payload: SavedShotStore = { version: 1, entries: nextEntries };
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)));
    return writeQueue.current;
  }, []);

  const toggle = useCallback(
    async (postId: string) => {
      if (!hydrated || !SEED_POST_BY_ID[postId]) return false;

      const currentlySaved = entriesRef.current.some((entry) => entry.postId === postId);
      const nextEntries = currentlySaved
        ? entriesRef.current.filter((entry) => entry.postId !== postId)
        : [{ postId, savedAt: new Date().toISOString() }, ...entriesRef.current];

      entriesRef.current = nextEntries;
      setEntries(nextEntries);
      await persist(nextEntries);
      return !currentlySaved;
    },
    [hydrated, persist],
  );

  const remove = useCallback(
    async (postId: string) => {
      if (!hydrated) return;
      const nextEntries = entriesRef.current.filter((entry) => entry.postId !== postId);
      if (nextEntries.length === entriesRef.current.length) return;

      entriesRef.current = nextEntries;
      setEntries(nextEntries);
      await persist(nextEntries);
    },
    [hydrated, persist],
  );

  const value = useMemo<SavedShotsContextValue>(
    () => ({
      hydrated,
      entries,
      isSaved: (postId) => entries.some((entry) => entry.postId === postId),
      toggle,
      remove,
    }),
    [entries, hydrated, remove, toggle],
  );

  return <SavedShotsContext.Provider value={value}>{children}</SavedShotsContext.Provider>;
}

export function useSavedShots() {
  const context = useContext(SavedShotsContext);
  if (!context) {
    throw new Error('useSavedShots must be used within SavedShotsProvider');
  }
  return context;
}

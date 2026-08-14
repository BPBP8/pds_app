import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
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

import { useAuth } from './auth-context';
import { db } from './config/firebase';
import { SEED_POST_BY_ID } from './data/seed-posts';

export type SavedShotEntry = {
  postId: string;
  kind: SavedShotKind;
  savedAt: string;
};

export type SavedShotKind = 'seed' | 'remote';

type SavedShotsContextValue = {
  hydrated: boolean;
  entries: SavedShotEntry[];
  syncError: string | null;
  isSaved: (postId: string, kind?: SavedShotKind) => boolean;
  toggle: (postId: string, kind?: SavedShotKind) => Promise<boolean>;
  remove: (postId: string, kind?: SavedShotKind) => Promise<void>;
};

const SavedShotsContext = createContext<SavedShotsContextValue | null>(null);

const savedShotKey = (postId: string, kind: SavedShotKind) => `${kind}:${postId}`;

const sameSavedShot = (entry: SavedShotEntry, postId: string, kind: SavedShotKind) =>
  entry.postId === postId && entry.kind === kind;

const sortSavedShots = (items: SavedShotEntry[]) =>
  [...items].sort((left, right) => right.savedAt.localeCompare(left.savedAt));

const isValidPostId = (postId: string) =>
  postId.length > 0 && postId.length <= 128 && !postId.includes('/');

export function SavedShotsProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<SavedShotEntry[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const entriesRef = useRef<SavedShotEntry[]>([]);
  const pendingRef = useRef(new Set<string>());
  const hasSnapshotRef = useRef(false);

  const replaceEntries = useCallback((nextEntries: SavedShotEntry[]) => {
    entriesRef.current = nextEntries;
    setEntries(nextEntries);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      replaceEntries([]);
      pendingRef.current.clear();
      hasSnapshotRef.current = false;
      setSyncError(null);
      setHydrated(true);
      return;
    }

    replaceEntries([]);
    pendingRef.current.clear();
    hasSnapshotRef.current = false;
    setSyncError(null);
    setHydrated(false);
    const savedCollection = collection(db, 'users', user.uid, 'savedShots');
    return onSnapshot(
      savedCollection,
      (snapshot) => {
        const nextEntries = snapshot.docs
          .flatMap((savedDoc): SavedShotEntry[] => {
            const data = savedDoc.data() as Record<string, unknown>;
            const postId = typeof data.postId === 'string' ? data.postId : '';
            const kind = data.kind === 'seed' || data.kind === 'remote' ? data.kind : null;
            if (
              !kind
              || !isValidPostId(postId)
              || savedDoc.id !== savedShotKey(postId, kind)
              || (kind === 'seed' && !SEED_POST_BY_ID[postId])
            ) {
              return [];
            }

            const rawSavedAt = data.savedAt;
            let savedAt = new Date().toISOString();
            if (
              typeof rawSavedAt === 'object'
              && rawSavedAt !== null
              && 'toDate' in rawSavedAt
              && typeof rawSavedAt.toDate === 'function'
            ) {
              const date = rawSavedAt.toDate();
              if (date instanceof Date && !Number.isNaN(date.getTime())) {
                savedAt = date.toISOString();
              }
            }
            return [{ postId, kind, savedAt }];
          });
        replaceEntries(sortSavedShots(nextEntries));
        hasSnapshotRef.current = true;
        setSyncError(null);
        setHydrated(true);
      },
      () => {
        setSyncError('想拍清单暂时无法同步，已保留上次读取的内容。');
        setHydrated(hasSnapshotRef.current);
      },
    );
  }, [authLoading, replaceEntries, user]);

  const toggle = useCallback(
    async (postId: string, kind: SavedShotKind = 'seed') => {
      if (
        !user
        || !hydrated
        || !isValidPostId(postId)
        || (kind === 'seed' && !SEED_POST_BY_ID[postId])
      ) {
        return false;
      }

      const operationKey = savedShotKey(postId, kind);
      if (pendingRef.current.has(operationKey)) {
        return entriesRef.current.some((entry) => sameSavedShot(entry, postId, kind));
      }

      const previousEntry = entriesRef.current.find((entry) => sameSavedShot(entry, postId, kind));
      const currentlySaved = Boolean(previousEntry);
      const nextEntries = currentlySaved
        ? entriesRef.current.filter((entry) => !sameSavedShot(entry, postId, kind))
        : [{ postId, kind, savedAt: new Date().toISOString() }, ...entriesRef.current];

      pendingRef.current.add(operationKey);
      replaceEntries(nextEntries);
      const savedRef = doc(db, 'users', user.uid, 'savedShots', operationKey);
      try {
        if (currentlySaved) {
          await deleteDoc(savedRef);
        } else {
          await setDoc(savedRef, { postId, kind, savedAt: serverTimestamp() });
        }
        setSyncError(null);
        return !currentlySaved;
      } catch (error) {
        const rollbackEntries = currentlySaved && previousEntry
          ? sortSavedShots([
              previousEntry,
              ...entriesRef.current.filter((entry) => !sameSavedShot(entry, postId, kind)),
            ])
          : entriesRef.current.filter((entry) => !sameSavedShot(entry, postId, kind));
        replaceEntries(rollbackEntries);
        setSyncError('同步失败，想拍清单没有改变，请检查网络后重试。');
        throw error;
      } finally {
        pendingRef.current.delete(operationKey);
      }
    },
    [hydrated, replaceEntries, user],
  );

  const remove = useCallback(
    async (postId: string, kind: SavedShotKind = 'seed') => {
      if (!user || !hydrated || !isValidPostId(postId)) return;
      const operationKey = savedShotKey(postId, kind);
      if (pendingRef.current.has(operationKey)) return;

      const previousEntry = entriesRef.current.find((entry) => sameSavedShot(entry, postId, kind));
      const nextEntries = entriesRef.current.filter((entry) => !sameSavedShot(entry, postId, kind));
      if (nextEntries.length === entriesRef.current.length) return;

      pendingRef.current.add(operationKey);
      replaceEntries(nextEntries);
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'savedShots', operationKey));
        setSyncError(null);
      } catch (error) {
        if (previousEntry) {
          replaceEntries(sortSavedShots([
            previousEntry,
            ...entriesRef.current.filter((entry) => !sameSavedShot(entry, postId, kind)),
          ]));
        }
        setSyncError('同步失败，作品仍保留在想拍清单中。');
        throw error;
      } finally {
        pendingRef.current.delete(operationKey);
      }
    },
    [hydrated, replaceEntries, user],
  );

  const value = useMemo<SavedShotsContextValue>(
    () => ({
      hydrated,
      entries,
      syncError,
      isSaved: (postId, kind = 'seed') =>
        entries.some((entry) => sameSavedShot(entry, postId, kind)),
      toggle,
      remove,
    }),
    [entries, hydrated, remove, syncError, toggle],
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

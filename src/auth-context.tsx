import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { auth, db } from '@/src/config/firebase';

export const MAX_DISPLAY_NAME_LENGTH = 40;

export function normalizeDisplayName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function getSafeAuthorName(value: unknown) {
  return normalizeDisplayName(value) || '拍点啥用户';
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () => onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    }, () => { setUser(null); setLoading(false); }),
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }, []);

  const register = useCallback(async (
    displayName: string,
    email: string,
    password: string,
  ) => {
    const rawName = displayName.trim();
    if (!rawName || rawName.length > MAX_DISPLAY_NAME_LENGTH) {
      const error = new Error('display-name-too-long') as Error & { code: string };
      error.code = 'auth/display-name-too-long';
      throw error;
    }
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    const name = normalizeDisplayName(rawName);
    if (name) await updateProfile(credential.user, { displayName: name });

    // The account is valid even if the optional profile document is delayed.
    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName: name || null,
        email: credential.user.email,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch {
      // Firestore profile data will be completed by the next signed-in write.
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }, []);

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn,
    register,
    resetPassword,
    signOut,
  }), [loading, register, resetPassword, signIn, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

  const messages: Record<string, string> = {
    'auth/configuration-not-found': '登录服务暂时不可用，请稍后重试。',
    'auth/display-name-too-long': `昵称不能超过 ${MAX_DISPLAY_NAME_LENGTH} 个字符。`,
    'auth/email-already-in-use': '这个邮箱已经注册，可以直接登录。',
    'auth/invalid-credential': '邮箱或密码不正确。',
    'auth/invalid-email': '请输入有效的邮箱地址。',
    'auth/network-request-failed': '网络连接失败，请检查网络后重试。',
    'auth/operation-not-allowed': '暂时无法使用邮箱注册或登录，请稍后重试。',
    'auth/too-many-requests': '尝试次数过多，请稍后再试。',
    'auth/user-disabled': '这个账号已被停用。',
    'auth/weak-password': '密码强度不足，请至少输入 6 位。',
  };

  return messages[code] ?? '操作失败，请稍后重试。';
}

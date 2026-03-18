import {
  useContext,
  createContext,
  useEffect,
  useCallback,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { login as apiLogin, setOnTokenRefreshCallback, registerDeviceToken, unregisterDeviceToken } from './api/client';
import { registerForPushNotificationsAsync } from './notifications';
import type { TokenResponse } from './api/types';

// ── Types ────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

interface SessionContextType {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  session: string | null;
  user: UserInfo | null;
  isLoading: boolean;
}

// ── JWT claim keys (ASP.NET Core uses full XML namespace URIs — K010) ──

const CLAIM_NAME_ID =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const CLAIM_EMAIL =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const CLAIM_ROLE =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

// ── JWT helpers ──────────────────────────────────────

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Handle base64url → base64 conversion
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function extractUserFromToken(token: string): UserInfo | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = (payload[CLAIM_NAME_ID] ?? payload['sub'] ?? '') as string;
  const email = (payload[CLAIM_EMAIL] ?? payload['email'] ?? '') as string;
  const role = (payload[CLAIM_ROLE] ?? payload['role'] ?? '') as string;

  if (!id || !email) return null;

  return { id, email, fullName: null, role };
}

// ── Storage helpers (SecureStore on native, localStorage on web) ──

export async function setStorageItemAsync(
  key: string,
  value: string | null,
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } else {
      if (value === null) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    }
  } catch (e) {
    console.error('[auth] SecureStore error', e);
  }
}

async function getStorageItemAsync(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('[auth] SecureStore read error', e);
    return null;
  }
}

// ── useStorageState hook ─────────────────────────────

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (
      _state: [boolean, T | null],
      action: T | null = null,
    ): [boolean, T | null] => [false, action],
    initialValue,
  ) as UseStateHook<T>;
}

export function useStorageState(key: string): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          setState(localStorage.getItem(key));
        }
      } catch (e) {
        console.error('[auth] localStorage read error:', e);
      }
    } else {
      SecureStore.getItemAsync(key).then((value) => {
        setState(value);
      });
    }
  }, [key]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key],
  );

  return [state, setValue];
}

// ── Session Context ──────────────────────────────────

const SessionContext = createContext<SessionContextType>({
  signIn: async () => {},
  signOut: async () => {},
  session: null,
  user: null,
  isLoading: false,
});

export function useSession(): SessionContextType {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

// ── Session Provider ─────────────────────────────────

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('accessToken');
  const [user, setUser] = useState<UserInfo | null>(null);
  const pushTokenRef = useRef<string | null>(null);

  // Restore user info from stored token
  useEffect(() => {
    if (session) {
      const userInfo = extractUserFromToken(session);
      if (userInfo) {
        setUser(userInfo);
        console.debug('[auth] session restored from SecureStore');
      } else {
        console.warn('[auth] invalid token on restore — clearing session');
        setSession(null);
        setUser(null);
      }
    } else if (!isLoading) {
      setUser(null);
    }
  }, [session, isLoading]);

  // Register token refresh callback so the interceptor can sync React state
  useEffect(() => {
    setOnTokenRefreshCallback((tokens: TokenResponse | null) => {
      if (tokens) {
        // Silent refresh succeeded — update session + user in React state
        setSession(tokens.accessToken);
        const userInfo = extractUserFromToken(tokens.accessToken);
        setUser(userInfo);
        console.debug('[auth] session synced after silent token refresh');
      } else {
        // Refresh failed — clear session (Stack.Protected guard redirects to sign-in)
        setSession(null);
        setUser(null);
        console.debug('[auth] session cleared by refresh failure');
      }
    });

    return () => {
      setOnTokenRefreshCallback(null);
    };
  }, [setSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      console.debug('[auth] signIn attempt', { email });

      const { accessToken, refreshToken, expiresAt } = await apiLogin(email, password);

      // Store all tokens
      setSession(accessToken);
      await setStorageItemAsync('refreshToken', refreshToken);
      await setStorageItemAsync('expiresAt', expiresAt);

      // Extract user from token
      const userInfo = extractUserFromToken(accessToken);
      setUser(userInfo);

      console.debug('[auth] signIn success, expiresAt:', expiresAt);

      // Register for push notifications (best-effort — never blocks sign-in)
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await registerDeviceToken({ expoPushToken: pushToken, platform: Platform.OS });
          pushTokenRef.current = pushToken;
          console.debug('[push] token registered:', pushToken.substring(0, 25) + '...]');
        }
      } catch (pushError) {
        console.warn('[push] registration failed (non-blocking):', pushError);
      }
    },
    [setSession],
  );

  const signOut = useCallback(async () => {
    console.debug('[auth] signOut');

    // Unregister push token (best-effort — never blocks sign-out)
    if (pushTokenRef.current) {
      try {
        await unregisterDeviceToken(pushTokenRef.current);
        console.debug('[push] token unregistered');
      } catch (pushError) {
        console.warn('[push] unregistration failed (non-blocking):', pushError);
      }
      pushTokenRef.current = null;
    }

    setSession(null);
    setStorageItemAsync('refreshToken', null);
    setStorageItemAsync('expiresAt', null);
    setUser(null);
    setOnTokenRefreshCallback(null);
  }, [setSession]);

  return (
    <SessionContext.Provider
      value={{
        signIn,
        signOut,
        session,
        user,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

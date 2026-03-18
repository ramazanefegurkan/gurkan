import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, setOnTokenRefreshCallback } from '../api/client';
import type { UserInfo, TokenResponse } from '../types';

// ── JWT claim keys (ASP.NET Core uses full XML namespace URIs) ──

const CLAIM_NAME_ID =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const CLAIM_EMAIL =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const CLAIM_ROLE =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

// ── Helpers ──────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractUserFromToken(token: string): UserInfo | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = (payload[CLAIM_NAME_ID] ?? payload['sub'] ?? '') as string;
  const email = (payload[CLAIM_EMAIL] ?? payload['email'] ?? '') as string;
  const role = (payload[CLAIM_ROLE] ?? payload['role'] ?? '') as string;

  if (!id || !email) return null;

  return { id, email, fullName: null, role };
}

function isTokenExpired(expiresAt: string): boolean {
  try {
    return new Date(expiresAt) <= new Date();
  } catch {
    return true;
  }
}

// ── Context type ─────────────────────────────────────

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('expiresAt');

    if (token && expiresAt && !isTokenExpired(expiresAt)) {
      const userInfo = extractUserFromToken(token);
      if (userInfo) {
        setUser(userInfo);
      } else {
        // Invalid token — clear storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
      }
    }
    setIsLoading(false);

    // Register callback so the 401 interceptor can notify us after token refresh
    setOnTokenRefreshCallback((tokens: TokenResponse) => {
      const userInfo = extractUserFromToken(tokens.accessToken);
      if (userInfo) {
        setUser(userInfo);
      }
    });

    return () => {
      setOnTokenRefreshCallback(null);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiLogin(email, password);

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('expiresAt', response.expiresAt);

      const userInfo = extractUserFromToken(response.accessToken);
      setUser(userInfo);
      navigate('/properties');
    },
    [navigate],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { type Page, type APIRequestContext } from '@playwright/test';
import { API_URL } from './constants';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<TokenResponse> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()}`);
  }
  return response.json();
}

export async function injectTokens(page: Page, tokens: TokenResponse): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('accessToken', t.accessToken);
    localStorage.setItem('refreshToken', t.refreshToken);
    localStorage.setItem('expiresAt', t.expiresAt);
  }, tokens);
}

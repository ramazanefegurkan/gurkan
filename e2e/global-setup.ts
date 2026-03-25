import { request } from '@playwright/test';
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, USER_FULLNAME } from './helpers/constants';
import { loginViaApi } from './helpers/auth';
import { registerUser, createGroup, addGroupMember } from './helpers/api-setup';

async function waitForApi(maxRetries = 30, intervalMs = 2000): Promise<void> {
  const ctx = await request.newContext();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await ctx.get(API_URL);
      if (res.status() < 500) {
        await ctx.dispose();
        return;
      }
    } catch {
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  await ctx.dispose();
  throw new Error(`API not reachable at ${API_URL} after ${maxRetries} retries`);
}

async function ensureTestUser(): Promise<void> {
  const ctx = await request.newContext();
  try {
    const adminTokens = await loginViaApi(ctx, ADMIN_EMAIL, ADMIN_PASSWORD);
    const authedCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminTokens.accessToken}` },
    });

    try {
      await loginViaApi(ctx, USER_EMAIL, USER_PASSWORD);
    } catch {
      const { userId } = await registerUser(authedCtx, USER_EMAIL, USER_PASSWORD, USER_FULLNAME);
      const group = await createGroup(authedCtx, 'E2E User Group');
      await addGroupMember(authedCtx, group.id, userId);
    }

    await authedCtx.dispose();
  } finally {
    await ctx.dispose();
  }
}

export default async function globalSetup(): Promise<void> {
  await waitForApi();
  await ensureTestUser();
}

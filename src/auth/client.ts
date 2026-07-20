import * as SecureStore from 'expo-secure-store';
import { fetch } from 'expo/fetch';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';

const SESSION_KEY = 'emotionary.auth.session.v1';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email: string;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function requestAuth(path: string, email: string, password: string) {
  if (!syncEnabled) {
    throw new AuthError('Account access is temporarily unavailable. You can continue without one.');
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  } catch {
    throw new AuthError('Could not connect. Check your internet connection and try again.');
  }

  const payload = (await response.json().catch(() => ({}))) as SupabaseAuthResponse;
  if (!response.ok) {
    throw new AuthError(
      payload.error_description ?? payload.msg ?? payload.error ?? 'Account request failed. Try again.',
    );
  }

  return payload;
}

async function saveSession(payload: SupabaseAuthResponse, fallbackEmail: string) {
  if (!payload.access_token || !payload.refresh_token || process.env.EXPO_OS === 'web') return false;

  const session: AuthSession = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    email: payload.user?.email ?? fallbackEmail.trim().toLowerCase(),
  };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return true;
}

export async function createAccount(email: string, password: string) {
  const payload = await requestAuth('signup', email, password);
  const signedIn = await saveSession(payload, email);
  return { requiresEmailConfirmation: !signedIn };
}

export async function signIn(email: string, password: string) {
  const payload = await requestAuth('token?grant_type=password', email, password);
  const signedIn = await saveSession(payload, email);
  if (!signedIn) throw new AuthError('Your session could not be saved securely. Please try again.');
}

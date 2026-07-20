import * as SecureStore from 'expo-secure-store';
import { fetch } from 'expo/fetch';

import { createAccount, signIn } from '@/auth/client';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn() }));
jest.mock('@/config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  syncEnabled: true,
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;

function response(body: object, ok = true): Awaited<ReturnType<typeof fetch>> {
  return { ok, json: async () => body } as unknown as Awaited<ReturnType<typeof fetch>>;
}

describe('auth client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates an account and securely saves an immediate session', async () => {
    mockFetch.mockResolvedValue(
      response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'me@example.com' } }),
    );

    await expect(createAccount('ME@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: false,
    });
    expect(mockSetItem).toHaveBeenCalledWith(
      'emotionary.auth.session.v1',
      JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', email: 'me@example.com' }),
    );
  });

  test('allows account creation to continue when email confirmation is required', async () => {
    mockFetch.mockResolvedValue(response({ user: { email: 'me@example.com' } }));

    await expect(createAccount('me@example.com', 'password123')).resolves.toEqual({
      requiresEmailConfirmation: true,
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('signs in through the password endpoint and reports API errors', async () => {
    mockFetch.mockResolvedValueOnce(
      response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'me@example.com' } }),
    );
    await expect(signIn('me@example.com', 'password123')).resolves.toBeUndefined();
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      'https://example.supabase.co/auth/v1/token?grant_type=password',
    );

    mockFetch.mockResolvedValueOnce(response({ msg: 'Invalid login credentials' }, false));
    await expect(signIn('me@example.com', 'wrong-password')).rejects.toThrow(
      'Invalid login credentials',
    );
  });
});

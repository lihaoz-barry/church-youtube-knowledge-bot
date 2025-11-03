/**
 * YouTube OAuth Helper Functions
 *
 * Handles OAuth 2.0 flow for YouTube API access:
 * - Generate authorization URL
 * - Exchange authorization code for tokens
 * - Refresh expired access tokens
 *
 * Constitutional Principle: Serverless-First Architecture
 * - Stateless functions, no session storage
 * - Tokens stored in Supabase, not memory
 */

import { google } from 'googleapis';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Generate OAuth 2.0 authorization URL
 *
 * @param redirectUri - Callback URL after OAuth consent (e.g., https://app.com/api/youtube/callback)
 * @param state - CSRF protection token (should be random, verified on callback)
 * @returns Authorization URL to redirect user to Google OAuth consent screen
 *
 * @example
 * const authUrl = generateAuthUrl(
 *   'https://myapp.com/api/youtube/callback',
 *   crypto.randomUUID()
 * );
 * // Redirect user to authUrl
 */
export function generateAuthUrl(redirectUri: string, state: string): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: YOUTUBE_SCOPES,
    state: state, // CSRF protection
    prompt: 'consent', // Force consent to get refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param redirectUri - Same redirect URI used in generateAuthUrl
 * @returns OAuth tokens (access_token, refresh_token, expiry_date)
 * @throws Error if token exchange fails
 *
 * @example
 * const tokens = await exchangeCodeForTokens(code, redirectUri);
 * // Store tokens.access_token and tokens.refresh_token in database (encrypted)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google OAuth');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || YOUTUBE_SCOPES.join(' '),
    };
  } catch (error) {
    console.error('OAuth token exchange failed:', error);
    throw new Error(
      `Failed to exchange authorization code for tokens: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Refresh an expired access token using refresh token
 *
 * @param refreshToken - Refresh token from initial OAuth flow
 * @returns New access token and updated expiry date
 * @throws Error if refresh fails (e.g., refresh token revoked)
 *
 * @example
 * try {
 *   const newTokens = await refreshAccessToken(storedRefreshToken);
 *   // Update access_token in database
 * } catch (error) {
 *   // Refresh token invalid - require user to reconnect
 *   console.error('Token refresh failed, user must reconnect');
 * }
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<Pick<OAuthTokens, 'access_token' | 'expiry_date'>> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('No access token received after refresh');
    }

    return {
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date || undefined,
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error(
      `Failed to refresh access token: ${
        error instanceof Error ? error.message : 'Unknown error'
      }. User must reconnect their YouTube account.`
    );
  }
}

/**
 * Check if an access token is expired or will expire soon
 *
 * @param expiryDate - Token expiry timestamp (milliseconds since epoch)
 * @param bufferMinutes - Refresh if expiring within this many minutes (default: 5)
 * @returns true if token is expired or expiring soon
 */
export function isTokenExpired(
  expiryDate: number | undefined,
  bufferMinutes: number = 5
): boolean {
  if (!expiryDate) {
    return true; // No expiry date means token is invalid
  }

  const now = Date.now();
  const buffer = bufferMinutes * 60 * 1000; // Convert to milliseconds

  return expiryDate - buffer < now;
}

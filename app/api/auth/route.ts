import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REDIRECT_URI || '';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'login') {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({
        requiresSetup: true,
        message: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to env vars.',
        setupUrl: 'https://console.cloud.google.com/apis/credentials'
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI || 'http://localhost:3000/api/auth/callback');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(authUrl.toString());
  }

  if (action === 'callback') {
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI || 'http://localhost:3000/api/auth?action=callback'
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        return NextResponse.json({ error: tokens.error }, { status: 400 });
      }

      const userResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      const userInfo = await userResponse.json();

      return NextResponse.json({
        success: true,
        user: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        },
        accessToken: tokens.access_token
      });
    } catch (error) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: 'Auth endpoint',
    actions: {
      login: '/api/auth?action=login',
      callback: '/api/auth?action=callback'
    },
    setupRequired: !GOOGLE_CLIENT_ID
  });
}

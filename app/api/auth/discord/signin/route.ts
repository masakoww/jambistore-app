import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Discord OAuth Sign-In Flow
 * This endpoint initiates Discord OAuth for authentication (not just connection)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const REDIRECT_URI = process.env.DISCORD_SIGNIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/signin-callback`;

    if (!DISCORD_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Discord OAuth is not configured' },
        { status: 500 }
      );
    }

    // Build Discord OAuth URL with returnTo in state
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
      state: returnTo, // Store return URL in state
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    return NextResponse.redirect(discordAuthUrl);
  } catch (error) {
    console.error('Discord sign-in initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Discord sign-in' },
      { status: 500 }
    );
  }
}

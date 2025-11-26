import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // We'll use state to pass Firebase UID


    if (error) {
      logger.error('Discord OAuth error', { error });
      return NextResponse.redirect(
        new URL(`/profile?error=discord_auth_failed`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/profile?error=no_code', request.url)
      );
    }

    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`;

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      logger.error('Discord OAuth not configured');
      return NextResponse.redirect(
        new URL('/profile?error=oauth_not_configured', request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Discord token exchange failed', { error: errorText });
      return NextResponse.redirect(
        new URL('/profile?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logger.error('Discord user fetch failed', { error: errorText });
      return NextResponse.redirect(
        new URL('/profile?error=user_fetch_failed', request.url)
      );
    }

    const discordUser = await userResponse.json();

    // Check if we have a Firebase UID from state parameter
    if (!state) {
      return NextResponse.redirect(
        new URL('/login?error=not_logged_in&message=Please log in first to connect Discord', request.url)
      );
    }

    const uid = state;

    // Update user document with Discord info
    await adminDb.collection('users').doc(uid).set(
      {
        discordUserId: discordUser.id,
        discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
        discordEmail: discordUser.email,
        discordAvatar: discordUser.avatar,
        discordConnectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info('✅ Discord connected for user', { uid, discordId: discordUser.id });

    // Redirect to profile with success message
    return NextResponse.redirect(
      new URL('/profile?success=discord_connected', request.url)
    );
  } catch (error) {
    logger.error('Discord OAuth callback error', { error });
    return NextResponse.redirect(
      new URL('/profile?error=connection_failed', request.url)
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Discord OAuth Sign-In Callback
 * Exchanges Discord code for user info, creates/finds Firebase user, and returns custom token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // returnTo URL

    if (error) {
      console.error('Discord OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=discord_auth_failed`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=no_code', request.url)
      );
    }

    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = process.env.DISCORD_SIGNIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/signin-callback`;

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL('/login?error=oauth_not_configured', request.url)
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
      console.error('Discord token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/login?error=token_exchange_failed', request.url)
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
      console.error('Discord user fetch failed:', await userResponse.text());
      return NextResponse.redirect(
        new URL('/login?error=user_fetch_failed', request.url)
      );
    }

    const discordUser = await userResponse.json();
    console.log('✅ Discord user fetched:', discordUser.id, discordUser.username);

    // Check if user exists by Discord ID
    const usersSnapshot = await adminDb
      .collection('users')
      .where('discordUserId', '==', discordUser.id)
      .limit(1)
      .get();

    let firebaseUid: string;

    if (!usersSnapshot.empty) {
      // User exists - sign them in
      const existingUserDoc = usersSnapshot.docs[0];
      firebaseUid = existingUserDoc.id;
      console.log('✅ Existing user found:', firebaseUid);

      // Update last login and Discord info
      await adminDb.collection('users').doc(firebaseUid).update({
        discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
        discordEmail: discordUser.email,
        discordAvatar: discordUser.avatar,
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // New user - create Firebase account
      console.log('🆕 Creating new user for Discord:', discordUser.id);

      try {
        // Create Firebase user
        const userRecord = await adminAuth.createUser({
          email: discordUser.email || `${discordUser.id}@discord.user`,
          emailVerified: !!discordUser.email,
          displayName: discordUser.username,
          photoURL: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
        });

        firebaseUid = userRecord.uid;
        console.log('✅ Firebase user created:', firebaseUid);

        // Create user document
        await adminDb.collection('users').doc(firebaseUid).set({
          email: discordUser.email || `${discordUser.id}@discord.user`,
          displayName: discordUser.username,
          discordUserId: discordUser.id,
          discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
          discordEmail: discordUser.email,
          discordAvatar: discordUser.avatar,
          discordConnectedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          authProvider: 'discord',
        });

        console.log('✅ User document created');
      } catch (createError: any) {
        // Check if user already exists with this email
        if (createError.code === 'auth/email-already-exists') {
          console.log('📧 User exists with email, linking Discord...');
          const existingUser = await adminAuth.getUserByEmail(discordUser.email);
          firebaseUid = existingUser.uid;

          // Link Discord to existing account
          await adminDb.collection('users').doc(firebaseUid).update({
            discordUserId: discordUser.id,
            discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
            discordEmail: discordUser.email,
            discordAvatar: discordUser.avatar,
            discordConnectedAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          throw createError;
        }
      }
    }

    // Create custom token for Firebase Auth
    const customToken = await adminAuth.createCustomToken(firebaseUid);

    // Redirect to login page with token
    const returnUrl = state || '/';
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('token', customToken);
    redirectUrl.searchParams.set('returnTo', returnUrl);
    redirectUrl.searchParams.set('discord', 'success');

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Discord sign-in callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=signin_failed', request.url)
    );
  }
}

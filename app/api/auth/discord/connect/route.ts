import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`;

    if (!DISCORD_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Discord OAuth is not configured' },
        { status: 500 }
      );
    }

    // Build Discord OAuth URL with UID in state parameter
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
      state: uid, // Pass Firebase UID to callback
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    // Redirect to Discord OAuth
    return NextResponse.redirect(discordAuthUrl);
  } catch (error) {
    console.error('Discord OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Discord OAuth' },
      { status: 500 }
    );
  }
}

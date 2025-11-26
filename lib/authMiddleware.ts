/**
 * Authentication Middleware for API Routes
 * Validates Firebase Auth tokens from request headers
 */

import { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Verify Firebase Auth token from Authorization header with session cookie fallback
 * @param request NextRequest object
 * @returns Authenticated user object or null
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 1. Try Authorization Bearer token first
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      
      if (token) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          console.log('✅ [Auth] Token verified for user:', decodedToken.uid);
          return {
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            emailVerified: decodedToken.email_verified || false,
          };
        } catch (tokenError: any) {
          console.error('❌ [Auth] Bearer token verification failed:', tokenError.message);
          // Continue to session cookie fallback
        }
      }
    }

    // 2. Fallback to session cookie for Discord-linked or persistent sessions
    const cookies = request.cookies;
    const sessionCookie = cookies.get('__session')?.value;
    
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        console.log('✅ [Auth] Session cookie verified for user:', decodedClaims.uid);
        return {
          uid: decodedClaims.uid,
          email: decodedClaims.email || null,
          emailVerified: decodedClaims.email_verified || false,
        };
      } catch (sessionError: any) {
        console.error('❌ [Auth] Session cookie verification failed:', sessionError.message);
      }
    }

    console.log('ℹ️ [Auth] No valid authentication found (checked Bearer token and session cookie)');
    return null;
  } catch (error: any) {
    console.error('❌ [Auth] Unexpected authentication error:', error.message);
    return null;
  }
}

/**
 * Check if user is admin
 * @param email User email
 * @returns True if user is admin
 */
export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  
  const ADMIN_EMAILS = [
    'krmendusa@gmail.com',
    'nadaffasakho@gmail.com'
  ];
  
  return ADMIN_EMAILS.includes(email);
}

/**
 * Verify session with cookie-based authentication (fallback)
 * @param request NextRequest object
 * @returns User email or null
 */
export async function verifySession(request: NextRequest): Promise<string | null> {
  try {
    const cookies = request.cookies;
    const sessionCookie = cookies.get('__session')?.value;
    
    if (!sessionCookie) {
      return null;
    }

    // Verify session cookie with Firebase Admin
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    return decodedClaims.email || null;
  } catch (error) {
    console.error('❌ [Auth] Session verification failed:', error);
    return null;
  }
}

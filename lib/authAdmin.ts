/**
 * Simple admin authentication helper for API routes.
 * 
 * This is a temporary solution using a simple API key.
 * 
 * TODO: Replace with Firebase Admin Auth token verification for production:
 * ```typescript
 * const token = req.headers.get('authorization')?.split('Bearer ')[1];
 * const decodedToken = await adminAuth.verifyIdToken(token);
 * const isAdmin = decodedToken.email === process.env.ADMIN_EMAIL;
 * ```
 * 
 * @example
 * // In your API route:
 * import { requireAdmin } from '@/lib/authAdmin';
 * 
 * export async function POST(req: Request) {
 *   const authCheck = requireAdmin(req);
 *   if (!authCheck.ok) {
 *     return Response.json(authCheck.error, { status: authCheck.status });
 *   }
 *   // ... your admin logic
 * }
 */

/**
 * Verify if the request has valid admin credentials.
 * 
 * Checks the `x-admin-key` header against the ADMIN_API_KEY environment variable.
 * 
 * @param req - The incoming Request object
 * @returns true if admin key is valid, false otherwise
 * 
 * @example
 * const isAdmin = verifyAdmin(request);
 * if (!isAdmin) {
 *   return Response.json({ error: 'Unauthorized' }, { status: 403 });
 * }
 */
export function verifyAdmin(req: Request): boolean {
  const adminKey = req.headers.get('x-admin-key');
  const envKey = process.env.ADMIN_API_KEY;

  if (!envKey) {
    console.warn('ADMIN_API_KEY not set in environment variables');
    return false;
  }

  return adminKey === envKey;
}

/**
 * Guard function that checks admin authentication and returns a standardized response.
 * 
 * Use this at the start of admin-only API routes to enforce authentication.
 * 
 * @param req - The incoming Request object
 * @returns Object with ok: true if authenticated, or ok: false with error details
 * 
 * @example
 * export async function DELETE(req: Request) {
 *   const auth = requireAdmin(req);
 *   if (!auth.ok) {
 *     return Response.json(auth.error, { status: auth.status });
 *   }
 *   // ... proceed with admin logic
 * }
 */
export function requireAdmin(req: Request): 
  | { ok: true }
  | { ok: false; status: 403; error: { error: string; message: string } } 
{
  const isAdmin = verifyAdmin(req);

  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      error: {
        error: 'Forbidden',
        message: 'Admin authentication required. Provide valid x-admin-key header.'
      }
    };
  }

  return { ok: true };
}

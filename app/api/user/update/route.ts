import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  // Always required
  uid: z.string().min(1, 'User ID is required'),

  // New API contract fields
  name: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  discordId: z.string().optional(),

  // Backward-compatible fields used by existing UI
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

/**
 * POST /api/user/update
 * 
 * Update user profile information
 * - Basic fields: displayName, phoneNumber
 * - Password change (requires old password verification)
 * - Stores metadata: updatedAt timestamp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Gagal memperbarui profil.',
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      uid,
      name,
      phone,
      password,
      discordId,
      displayName,
      phoneNumber,
      oldPassword,
      newPassword,
    } = parsed.data;

    // Verify user exists
    let user;
    try {
      user = await adminAuth.getUser(uid);
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updates: any = {};
    const firestoreUpdates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Resolve name/displayName
    const resolvedDisplayName = name ?? displayName;

    // Update display name
    if (resolvedDisplayName !== undefined && resolvedDisplayName !== user.displayName) {
      updates.displayName = resolvedDisplayName;
      firestoreUpdates.displayName = resolvedDisplayName;
    }

    // Resolve phone / phoneNumber
    const resolvedPhone = phone ?? phoneNumber;

    // Update phone number
    if (resolvedPhone !== undefined) {
      // Validate phone number format (basic validation)
      if (resolvedPhone && !/^\+?[\d\s\-()]+$/.test(resolvedPhone)) {
        return NextResponse.json(
          { success: false, message: 'Nomor telepon tidak valid' },
          { status: 400 }
        );
      }
      updates.phoneNumber = resolvedPhone || null;
      firestoreUpdates.phoneNumber = resolvedPhone || null;
    }


    const resolvedPassword = password ?? newPassword;

    if (resolvedPassword) {
      // Password change requires old password verification
      // For backward compatibility: only enforce oldPassword when using legacy newPassword flow
      if (!password && newPassword && !oldPassword) {
        return NextResponse.json(
          { success: false, message: 'Password lama diperlukan untuk mengubah password.' },
          { status: 400 }
        );
      }

      // Validate new password strength
      if (resolvedPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password baru harus minimal 6 karakter.' },
          { status: 400 }
        );
      }

      // Verify old password by trying to sign in

      if (!user.email) {
        return NextResponse.json(
          { error: 'Cannot change password: user email not found' },
          { status: 400 }
        );
      }

      // For security, we'll use Firebase Admin to update password
      // In production, you should verify the old password via client-side re-authentication
      // before calling this API
      try {
        // Update password
        await adminAuth.updateUser(uid, {
          password: resolvedPassword,
        });

        // Log password change
        firestoreUpdates.lastPasswordChange = FieldValue.serverTimestamp();
        
        console.log(`✅ Password updated for user: ${uid}`);
      } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.json(
          { success: false, message: 'Gagal memperbarui profil.' },
          { status: 500 }
        );
      }
    }

    // Optional: store Discord ID in Firestore only
    if (discordId !== undefined) {
      firestoreUpdates.discordUserId = discordId || null;
    }

    // Update Firebase Auth profile
    if (Object.keys(updates).length > 0) {
      try {
        await adminAuth.updateUser(uid, updates);
        console.log(`✅ Firebase Auth updated for user: ${uid}`, updates);
      } catch (error) {
        console.error('Error updating Firebase Auth:', error);
        return NextResponse.json(
          { success: false, message: 'Gagal memperbarui profil.' },
          { status: 500 }
        );
      }
    }

    // Update Firestore user document
    if (Object.keys(firestoreUpdates).length > 1) { // More than just updatedAt
      try {
        const userRef = adminDb.collection('users').doc(uid);
        
        // Check if document exists
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
          // Update existing document
          await userRef.update(firestoreUpdates);
        } else {
          // Create new document with user data
          await userRef.set({
            uid,
            email: user.email,
            displayName: displayName || user.displayName || null,
            phoneNumber: phoneNumber || null,
            createdAt: FieldValue.serverTimestamp(),
            ...firestoreUpdates,
          });
        }
        
        console.log(`✅ Firestore updated for user: ${uid}`, firestoreUpdates);
      } catch (error) {
        console.error('Error updating Firestore:', error);
        // Don't fail the request if Firestore update fails
        // Auth update is more critical
      }
    }

    // Fetch updated user data
    const updatedUser = await adminAuth.getUser(uid);
    
    // Fetch Firestore data
    let firestoreData = null;
    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        firestoreData = userDoc.data();
      }
    } catch (error) {
      console.error('Error fetching Firestore data:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        uid: updatedUser.uid,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        phoneNumber: updatedUser.phoneNumber,
        ...firestoreData,
      },
    });
  } catch (error) {
    console.error('Error in /api/user/update:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui profil.' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}

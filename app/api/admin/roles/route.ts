import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/roles - Get user role and permissions
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get user document
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    return NextResponse.json({
      ok: true,
      role: userData?.role || 'user',
      permissions: userData?.permissions || {},
      uid: decodedToken.uid,
      email: decodedToken.email
    });
  } catch (error: any) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Initialize owner or update user role (Owner only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const body = await request.json();

    // Check if this is owner initialization
    if (body.action === 'initialize_owner') {
      // Check if owner already exists
      const systemDoc = await db.collection('settings').doc('system').get();
      
      if (systemDoc.exists && systemDoc.data()?.ownerId) {
        return NextResponse.json({
          ok: false,
          error: 'Owner already initialized'
        }, { status: 400 });
      }

      // Set this user as owner
      await db.collection('users').doc(decodedToken.uid).set({
        role: 'owner',
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email,
        permissions: {
          viewOrders: true,
          deliverProducts: true,
          deleteOrders: true,
          accessSettings: true,
          viewCustomers: true,
          manageAdmins: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Store owner ID in system settings
      await db.collection('settings').doc('system').set({
        ownerId: decodedToken.uid,
        ownerEmail: decodedToken.email,
        initializedAt: new Date().toISOString(),
      }, { merge: true });

      console.log('✅ Owner initialized:', decodedToken.email);

      return NextResponse.json({
        ok: true,
        message: 'Owner initialized successfully',
        role: 'owner'
      });
    }

    // For other role updates, verify requester is owner
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Only owner can manage roles' },
        { status: 403 }
      );
    }

    // Update target user's role and permissions
    const { targetUid, role, permissions } = body;

    if (!targetUid || !role) {
      return NextResponse.json(
        { ok: false, error: 'targetUid and role are required' },
        { status: 400 }
      );
    }

    // Prevent changing owner role
    if (targetUid === decodedToken.uid && role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Cannot change your own owner role' },
        { status: 400 }
      );
    }

    await db.collection('users').doc(targetUid).set({
      role,
      permissions: permissions || {},
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.email,
    }, { merge: true });

    console.log(`✅ Role updated for ${targetUid} to ${role} by ${decodedToken.email}`);

    return NextResponse.json({
      ok: true,
      message: 'Role updated successfully'
    });
  } catch (error: any) {
    console.error('Error managing roles:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/roles/list - Get all admins (Owner only)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Verify requester is owner
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Only owner can list admins' },
        { status: 403 }
      );
    }

    // Get all admins
    const adminsSnapshot = await db.collection('users')
      .where('role', 'in', ['owner', 'admin'])
      .get();

    const admins = adminsSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      ok: true,
      admins
    });
  } catch (error: any) {
    console.error('Error listing admins:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

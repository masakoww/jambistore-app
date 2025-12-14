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

// POST /api/admin/roles - Initialize owner or update user role (Owner/Developer only)
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
          viewOverview: true,
          viewOrders: true,
          deliverProducts: true,
          deleteOrders: true,
          accessSettings: true,
          viewCustomers: true,
          manageAdmins: true,
          manageProducts: true,
          manageCategories: true,
          viewReviews: true,
          viewRevenue: true,
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

    // For other role updates, verify requester is owner or developer
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const requesterRole = userDoc.data()?.role;
    
    if (!userDoc.exists || (requesterRole !== 'owner' && requesterRole !== 'developer')) {
      return NextResponse.json(
        { ok: false, error: 'Only owner or developer can manage roles' },
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

    // Validate role
    if (!['owner', 'developer', 'admin'].includes(role)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid role. Must be owner, developer, or admin' },
        { status: 400 }
      );
    }

    // Get target user's current role
    const targetUserDoc = await db.collection('users').doc(targetUid).get();
    const targetCurrentRole = targetUserDoc.data()?.role;

    // Developer cannot modify owner's role
    if (requesterRole === 'developer' && targetCurrentRole === 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Developers cannot modify owner roles' },
        { status: 403 }
      );
    }

    // Developer cannot set someone as owner
    if (requesterRole === 'developer' && role === 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Only owner can transfer ownership' },
        { status: 403 }
      );
    }

    // Prevent changing own owner role
    if (targetUid === decodedToken.uid && requesterRole === 'owner' && role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Cannot change your own owner role' },
        { status: 400 }
      );
    }

    // Set full permissions for owner and developer roles
    let finalPermissions = permissions || {};
    if (role === 'owner' || role === 'developer') {
      finalPermissions = {
        viewOverview: true,
        viewOrders: true,
        deliverProducts: true,
        deleteOrders: true,
        accessSettings: true,
        viewCustomers: true,
        manageAdmins: true,
        manageProducts: true,
        manageCategories: true,
        viewReviews: true,
        viewRevenue: true,
      };
    }

    await db.collection('users').doc(targetUid).set({
      role,
      permissions: finalPermissions,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.email,
    }, { merge: true });

    // Also update the admins collection for display
    await db.collection('admins').doc(targetUid).set({
      role,
      permissions: finalPermissions,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.email,
    }, { merge: true });

    // If setting someone as owner, add them to the system owners list
    if (role === 'owner') {
      try {
        const systemRef = db.collection('settings').doc('system')
        const systemDoc = await systemRef.get()
        const currentOwners: string[] = (systemDoc.exists && systemDoc.data()?.ownerIds) || []
        const nextOwners = Array.from(new Set([...(currentOwners || []), targetUid]))
        await systemRef.set({ ownerIds: nextOwners, updatedAt: new Date().toISOString() }, { merge: true })
      } catch (err) {
        console.error('Failed to update system owners list:', err)
      }
    }

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

// GET /api/admin/roles/list - Get all admins (Owner/Developer only)
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

    // Verify requester is owner or developer
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const requesterRole = userDoc.data()?.role;
    
    if (!userDoc.exists || (requesterRole !== 'owner' && requesterRole !== 'developer')) {
      return NextResponse.json(
        { ok: false, error: 'Only owner or developer can list admins' },
        { status: 403 }
      );
    }

    // Get all admins (owner, developer, admin)
    const adminsSnapshot = await db.collection('users')
      .where('role', 'in', ['owner', 'developer', 'admin'])
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

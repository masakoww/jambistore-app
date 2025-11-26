import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Check if Firebase Admin has already been initialized
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }

  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set');
  }

  try {

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Export admin instance for Auth and other services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

// Export the admin instance itself for additional services
export { admin };

// Export db as an alias for consistency with the requirements
export const db = adminDb;

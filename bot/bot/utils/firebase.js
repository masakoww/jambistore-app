const admin = require('firebase-admin');
require('dotenv').config();


// Check if already initialized to prevent errors during hot reloads or multiple requires
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../../firebase-service-account-dev.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'jambirmts'
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

module.exports = { admin, db };

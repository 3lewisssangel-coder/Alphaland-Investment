import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app requires firebaseConfig.firestoreDatabaseId as specified in skill guidelines
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// Ensure storageBucket is explicitly defined to prevent storage references from hanging
const rawBucket = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`;
export const storageBucketUrl = rawBucket.startsWith('gs://') ? rawBucket : `gs://${rawBucket}`;

export const auth = getAuth(app);
export const storage = getStorage(app, storageBucketUrl);

// Connection test as required by skill guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check your network/configuration.');
      return false;
    }
    // Any other error (like not found) still proves connectivity to the server
    return true;
  }
}

// Auto-run connection check quietly
testConnection().catch(() => {});

export default app;

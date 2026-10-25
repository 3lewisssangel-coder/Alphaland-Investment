import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { UserAccount } from '../types';

const USERS_COLLECTION = 'users';

// Helper to generate a unique 6-character referral code
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ALP-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Find user by mobile number
 */
export async function getUserByMobile(mobileNumber: string): Promise<UserAccount | null> {
  const cleanMobile = mobileNumber.trim();
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('mobileNumber', '==', cleanMobile)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return {
      id: docData.id,
      ...(docData.data() as Omit<UserAccount, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
  }
}

/**
 * Register a new user in Firestore
 */
export async function registerUser(
  mobileNumber: string,
  password: string,
  referralCodeFromUrl?: string | null
): Promise<UserAccount> {
  const cleanMobile = mobileNumber.trim();

  // Check if user already exists
  const existing = await getUserByMobile(cleanMobile);
  if (existing) {
    throw new Error('A user with this mobile number already exists. Please log in.');
  }

  // Verify referral code if provided
  let validReferrerCode: string | null = null;
  if (referralCodeFromUrl && referralCodeFromUrl.trim()) {
    const cleanRef = referralCodeFromUrl.trim().toUpperCase();
    try {
      const refQuery = query(
        collection(db, USERS_COLLECTION),
        where('referralCode', '==', cleanRef)
      );
      const refSnap = await getDocs(refQuery);
      if (!refSnap.empty) {
        validReferrerCode = cleanRef;
      }
    } catch (err) {
      console.warn('Error checking referral code:', err);
    }
  }

  const newReferralCode = generateReferralCode();
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const userDocRef = doc(db, USERS_COLLECTION, newUserId);

  const newUserPayload = {
    mobileNumber: cleanMobile,
    password: password.trim(),
    balance: 0,
    referralCode: newReferralCode,
    referredBy: validReferrerCode,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, newUserPayload);
    return {
      id: newUserId,
      ...newUserPayload,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${newUserId}`);
  }
}

/**
 * Login user by mobile number and password
 */
export async function loginUser(mobileNumber: string, password: string): Promise<UserAccount> {
  const user = await getUserByMobile(mobileNumber);
  if (!user) {
    throw new Error('No account found with this mobile number. Please sign up first.');
  }
  if (user.password !== password.trim()) {
    throw new Error('Incorrect password. Please verify and try again.');
  }
  return user;
}

/**
 * Real-time listener for current user data
 */
export function listenToUser(userId: string, callback: (user: UserAccount | null) => void): () => void {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...(snapshot.data() as Omit<UserAccount, 'id'>),
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    }
  );
}

/**
 * Fetch 3-level MLM referral team
 */
export async function fetchUserTeamHierarchy(userReferralCode: string): Promise<{
  level1: UserAccount[];
  level2: UserAccount[];
  level3: UserAccount[];
}> {
  try {
    // Level 1: Users referred directly by this user's code
    const l1Query = query(
      collection(db, USERS_COLLECTION),
      where('referredBy', '==', userReferralCode)
    );
    const l1Snap = await getDocs(l1Query);
    const level1: UserAccount[] = l1Snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserAccount, 'id'>),
    }));

    const level2: UserAccount[] = [];
    const level3: UserAccount[] = [];

    // Level 2: Users referred by Level 1 members
    if (level1.length > 0) {
      for (const l1User of level1) {
        if (!l1User.referralCode) continue;
        const l2Query = query(
          collection(db, USERS_COLLECTION),
          where('referredBy', '==', l1User.referralCode)
        );
        const l2Snap = await getDocs(l2Query);
        l2Snap.forEach((d) => {
          level2.push({
            id: d.id,
            ...(d.data() as Omit<UserAccount, 'id'>),
          });
        });
      }
    }

    // Level 3: Users referred by Level 2 members
    if (level2.length > 0) {
      for (const l2User of level2) {
        if (!l2User.referralCode) continue;
        const l3Query = query(
          collection(db, USERS_COLLECTION),
          where('referredBy', '==', l2User.referralCode)
        );
        const l3Snap = await getDocs(l3Query);
        l3Snap.forEach((d) => {
          level3.push({
            id: d.id,
            ...(d.data() as Omit<UserAccount, 'id'>),
          });
        });
      }
    }

    return { level1, level2, level3 };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
  }
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  increment,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { CouponDoc, UserAccount } from '../types';

const COUPONS_COLLECTION = 'coupons';
const USERS_COLLECTION = 'users';

/**
 * Generates a clean, unique coupon code
 */
export function generateRandomCouponCode(prefix = 'ALPHA'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = `${prefix}-`;
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new one-time coupon in Firestore (Admin)
 */
export async function createCoupon(code: string, amount: number): Promise<CouponDoc> {
  const cleanCode = code.trim().toUpperCase();
  const numAmount = Number(amount);

  if (!cleanCode || cleanCode.length < 3) {
    throw new Error('Coupon code must be at least 3 characters long.');
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Coupon amount must be greater than 0.');
  }

  // Ensure unique code in Firestore
  const q = query(
    collection(db, COUPONS_COLLECTION),
    where('code', '==', cleanCode)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`A coupon with code "${cleanCode}" already exists.`);
  }

  const couponId = `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const couponRef = doc(db, COUPONS_COLLECTION, couponId);

  const couponPayload = {
    code: cleanCode,
    amount: numAmount,
    isUsed: false,
    usedBy: null,
    userMobile: null,
    usedAt: null,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(couponRef, couponPayload);
    return {
      id: couponId,
      ...couponPayload,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COUPONS_COLLECTION}/${couponId}`);
  }
}

/**
 * Atomically redeems a coupon for an authenticated user
 */
export async function redeemCoupon(
  code: string,
  userId: string,
  userMobile?: string
): Promise<{ amount: number; code: string }> {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error('Please enter a coupon code.');
  }

  // Find the coupon document by code
  const q = query(
    collection(db, COUPONS_COLLECTION),
    where('code', '==', cleanCode)
  );
  const querySnap = await getDocs(q);

  if (querySnap.empty) {
    throw new Error('Invalid or non-existent coupon code.');
  }

  const couponDocSnap = querySnap.docs[0];
  const couponId = couponDocSnap.id;
  const couponRef = doc(db, COUPONS_COLLECTION, couponId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  // Execute atomic redemption transaction
  return await runTransaction(db, async (transaction) => {
    const cSnap = await transaction.get(couponRef);
    if (!cSnap.exists()) {
      throw new Error('Coupon record could not be found.');
    }

    const cData = cSnap.data() as CouponDoc;

    if (cData.isUsed) {
      throw new Error('This coupon has already been redeemed.');
    }

    const uSnap = await transaction.get(userRef);
    if (!uSnap.exists()) {
      throw new Error('User profile could not be found.');
    }

    const rewardAmount = cData.amount;

    // 1. Mark coupon as used with user info and server timestamp
    transaction.update(couponRef, {
      isUsed: true,
      usedBy: userId,
      userMobile: userMobile || (uSnap.data() as UserAccount).mobileNumber || 'Member',
      usedAt: serverTimestamp(),
    });

    // 2. Atomically increment user's balance and total earnings
    transaction.update(userRef, {
      balance: increment(rewardAmount),
      totalEarnings: increment(rewardAmount),
    });

    return {
      amount: rewardAmount,
      code: cData.code,
    };
  });
}

/**
 * Real-time listener for all coupons in the system (Admin)
 */
export function listenToAllCoupons(callback: (coupons: CouponDoc[]) => void): () => void {
  const colRef = collection(db, COUPONS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CouponDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CouponDoc, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COUPONS_COLLECTION);
    }
  );
}

/**
 * Deletes an unused coupon (Admin)
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const couponRef = doc(db, COUPONS_COLLECTION, couponId);
  try {
    await deleteDoc(couponRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COUPONS_COLLECTION}/${couponId}`);
  }
}

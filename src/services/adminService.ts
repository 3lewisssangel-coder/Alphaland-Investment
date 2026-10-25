import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { uploadImageToStorage } from '../firebase/storageService';
import { AppConfigDoc, DepositDoc, UserAccount, WithdrawalDoc } from '../types';

const SETTINGS_COLLECTION = 'settings';
const APP_CONFIG_DOC_ID = 'appConfig';
const DEPOSITS_COLLECTION = 'deposits';
const WITHDRAWALS_COLLECTION = 'withdrawals';
const USERS_COLLECTION = 'users';

// Admin authentication credentials as specified in prompt
export const ADMIN_USERNAME = 'Admin123';
export const ADMIN_PASSWORD = 'Admin123';

export function verifyAdminCredentials(user: string, pass: string): boolean {
  return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
}

/**
 * Updates the active deposit QR code in settings/appConfig
 */
export async function updateAdminDepositQr(file: File): Promise<string> {
  const downloadUrl = await uploadImageToStorage('admin-qr', file, `qr_${Date.now()}`);
  const configDocRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);

  await setDoc(
    configDocRef,
    {
      activeDepositQrUrl: downloadUrl,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return downloadUrl;
}

/**
 * Real-time listener for all pending deposits
 */
export function listenToPendingDeposits(callback: (deposits: DepositDoc[]) => void): () => void {
  const q = query(
    collection(db, DEPOSITS_COLLECTION),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DepositDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DepositDoc, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, DEPOSITS_COLLECTION);
    }
  );
}

/**
 * Real-time listener for all deposits (any status)
 */
export function listenToAllDeposits(callback: (deposits: DepositDoc[]) => void): () => void {
  const colRef = collection(db, DEPOSITS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DepositDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DepositDoc, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, DEPOSITS_COLLECTION);
    }
  );
}

/**
 * One-Click Approval:
 * Updates deposit status to 'approved' and atomically increments user's balance in Firestore
 */
export async function approveDeposit(depositId: string): Promise<void> {
  const depositRef = doc(db, DEPOSITS_COLLECTION, depositId);

  await runTransaction(db, async (transaction) => {
    const depositSnap = await transaction.get(depositRef);
    if (!depositSnap.exists()) {
      throw new Error('Deposit record not found');
    }

    const depositData = depositSnap.data() as DepositDoc;
    if (depositData.status !== 'pending') {
      throw new Error(`Deposit has already been ${depositData.status}`);
    }

    const userRef = doc(db, USERS_COLLECTION, depositData.userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('Associated user document does not exist');
    }

    // 1. Mark deposit as approved
    transaction.update(depositRef, {
      status: 'approved',
      processedAt: serverTimestamp(),
    });

    // 2. Atomically increment user's balance
    const currentBalance = (userSnap.data().balance as number) || 0;
    const currentTotalDeposits = (userSnap.data().totalDeposits as number) || 0;
    transaction.update(userRef, {
      balance: currentBalance + depositData.amount,
      totalDeposits: currentTotalDeposits + depositData.amount,
    });
  });
}

/**
 * Rejects a deposit
 */
export async function rejectDeposit(depositId: string, reason = 'Invalid payment proof'): Promise<void> {
  const depositRef = doc(db, DEPOSITS_COLLECTION, depositId);
  await updateDoc(depositRef, {
    status: 'rejected',
    rejectionReason: reason,
    processedAt: serverTimestamp(),
  });
}

/**
 * Real-time listener for pending withdrawals
 */
export function listenToPendingWithdrawals(callback: (withdrawals: WithdrawalDoc[]) => void): () => void {
  const q = query(
    collection(db, WITHDRAWALS_COLLECTION),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WithdrawalDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WithdrawalDoc, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, WITHDRAWALS_COLLECTION);
    }
  );
}

/**
 * Real-time listener for all withdrawals
 */
export function listenToAllWithdrawals(callback: (withdrawals: WithdrawalDoc[]) => void): () => void {
  const colRef = collection(db, WITHDRAWALS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WithdrawalDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WithdrawalDoc, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, WITHDRAWALS_COLLECTION);
    }
  );
}

/**
 * Approve and mark withdrawal as paid
 */
export async function markWithdrawalPaid(withdrawalId: string): Promise<void> {
  const wdrRef = doc(db, WITHDRAWALS_COLLECTION, withdrawalId);
  await updateDoc(wdrRef, {
    status: 'paid',
    processedAt: serverTimestamp(),
  });
}

/**
 * Reject withdrawal and refund amount back to user's balance
 */
export async function rejectWithdrawal(withdrawalId: string, reason = 'Payout rejected'): Promise<void> {
  const wdrRef = doc(db, WITHDRAWALS_COLLECTION, withdrawalId);

  await runTransaction(db, async (transaction) => {
    const wdrSnap = await transaction.get(wdrRef);
    if (!wdrSnap.exists()) {
      throw new Error('Withdrawal not found');
    }

    const wdrData = wdrSnap.data() as WithdrawalDoc;
    if (wdrData.status !== 'pending') {
      throw new Error(`Withdrawal already ${wdrData.status}`);
    }

    const userRef = doc(db, USERS_COLLECTION, wdrData.userId);

    // Update status to rejected
    transaction.update(wdrRef, {
      status: 'rejected',
      rejectionReason: reason,
      processedAt: serverTimestamp(),
    });

    // Refund balance
    transaction.update(userRef, {
      balance: increment(wdrData.amount),
    });
  });
}

/**
 * Real-time listener for all users (for admin analytics and monitoring)
 */
export function listenToAllUsers(callback: (users: UserAccount[]) => void): () => void {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: UserAccount[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserAccount, 'id'>),
      }));
      list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    }
  );
}

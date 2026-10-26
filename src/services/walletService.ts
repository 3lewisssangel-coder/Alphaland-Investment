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
import { AppConfigDoc, DepositDoc, UserAccount, WithdrawalDoc } from '../types';

const SETTINGS_COLLECTION = 'settings';
const APP_CONFIG_DOC_ID = 'appConfig';
const DEPOSITS_COLLECTION = 'deposits';
const WITHDRAWALS_COLLECTION = 'withdrawals';
const INVESTMENTS_COLLECTION = 'investments';
const USERS_COLLECTION = 'users';

// High-quality default QR code for GCash/Maya/Bank micro-investment deposits
export const DEFAULT_DEPOSIT_QR =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

// Fallback high-contrast QR code vector SVG
export const SAMPLE_QR_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%23ffffff"/><rect x="20" y="20" width="50" height="50" fill="%230b132b"/><rect x="30" y="30" width="30" height="30" fill="%23ffffff"/><rect x="37" y="37" width="16" height="16" fill="%2310b981"/><rect x="130" y="20" width="50" height="50" fill="%230b132b"/><rect x="140" y="30" width="30" height="30" fill="%23ffffff"/><rect x="147" y="37" width="16" height="16" fill="%2310b981"/><rect x="20" y="130" width="50" height="50" fill="%230b132b"/><rect x="30" y="140" width="30" height="30" fill="%23ffffff"/><rect x="37" y="147" width="16" height="16" fill="%2310b981"/><rect x="80" y="20" width="15" height="15" fill="%230b132b"/><rect x="105" y="20" width="15" height="15" fill="%230b132b"/><rect x="80" y="45" width="25" height="15" fill="%2310b981"/><rect x="90" y="70" width="20" height="20" fill="%230b132b"/><rect x="20" y="80" width="20" height="15" fill="%230b132b"/><rect x="50" y="80" width="15" height="35" fill="%230b132b"/><rect x="130" y="80" width="25" height="15" fill="%230b132b"/><rect x="165" y="80" width="15" height="30" fill="%2310b981"/><rect x="80" y="100" width="40" height="20" fill="%230b132b"/><rect x="130" y="105" width="20" height="35" fill="%230b132b"/><rect x="80" y="130" width="20" height="50" fill="%2310b981"/><rect x="110" y="150" width="40" height="30" fill="%230b132b"/><rect x="160" y="140" width="20" height="40" fill="%230b132b"/></svg>';

/**
 * Fetch or initialize global application config
 */
export async function getAppConfig(): Promise<AppConfigDoc> {
  const configDocRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  try {
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      return snap.data() as AppConfigDoc;
    }
    // Initialize default if not set
    const initialConfig: AppConfigDoc = {
      activeDepositQrUrl: SAMPLE_QR_SVG,
      gcashNumber: '0917-888-ALPH (Official)',
      gcashName: 'ALPHALAND FINANCE CORP',
      bankName: 'BDO / UnionBank Merchant Direct',
      minDeposit: 50,
      minWithdrawal: 100,
      communityChatLink: 'https://t.me/alphaland_official_group',
      communityQrUrl: SAMPLE_QR_SVG,
      updatedAt: serverTimestamp(),
    };
    await setDoc(configDocRef, initialConfig);
    return initialConfig;
  } catch (error) {
    console.warn('App config lookup fallback:', error);
    return {
      activeDepositQrUrl: SAMPLE_QR_SVG,
      gcashNumber: '0917-888-ALPH (Official)',
      gcashName: 'ALPHALAND FINANCE CORP',
      minDeposit: 50,
      minWithdrawal: 100,
      communityChatLink: 'https://t.me/alphaland_official_group',
      communityQrUrl: SAMPLE_QR_SVG,
    };
  }
}

/**
 * Real-time listener for app settings (e.g. dynamic deposit QR updates)
 */
export function listenToAppConfig(callback: (config: AppConfigDoc) => void): () => void {
  const configDocRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  return onSnapshot(
    configDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as AppConfigDoc);
      } else {
        // Create default config if missing
        getAppConfig().then(callback);
      }
    },
    (err) => {
      console.warn('Config snapshot error:', err);
    }
  );
}

/**
 * Submit deposit proof for admin verification
 */
export async function submitDepositProof(
  userId: string,
  amount: number,
  proofImageUrl: string,
  userMobile?: string
): Promise<DepositDoc> {
  if (amount <= 0) {
    throw new Error('Please enter a valid deposit amount greater than 0.');
  }
  if (!proofImageUrl) {
    throw new Error('Please upload your payment screenshot/receipt.');
  }

  const newDepositId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const depositRef = doc(db, DEPOSITS_COLLECTION, newDepositId);

  const depositData = {
    userId,
    userMobile: userMobile || '',
    amount: Number(amount),
    proofImageUrl,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(depositRef, depositData);
    return {
      id: newDepositId,
      ...depositData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DEPOSITS_COLLECTION}/${newDepositId}`);
  }
}

/**
 * Real-time listener for user deposits
 */
export function listenToUserDeposits(
  userId: string,
  callback: (deposits: DepositDoc[]) => void
): () => void {
  const q = query(
    collection(db, DEPOSITS_COLLECTION),
    where('userId', '==', userId)
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
 * Submit a withdrawal request
 * Enforces conditions:
 * 1. Must have at least 1 active investment
 * 2. Minimum withdrawal is 100
 * 3. User must have sufficient balance
 */
export async function submitWithdrawalRequest(
  userId: string,
  amount: number,
  userMobile: string,
  paymentDetails: {
    paymentMethod: string;
    accountNumber: string;
    accountName: string;
  }
): Promise<WithdrawalDoc> {
  if (amount < 100) {
    throw new Error('Minimum withdrawal amount is 100 credits.');
  }

  // Check 1: User must have at least 1 active investment in `investments` collection
  const investmentsQuery = query(
    collection(db, INVESTMENTS_COLLECTION),
    where('userId', '==', userId)
  );
  const invSnap = await getDocs(investmentsQuery);

  if (invSnap.empty) {
    throw new Error(
      'Withdrawal policy requires at least 1 active investment plan. Please invest in any property package before initiating a withdrawal.'
    );
  }

  // Deduct balance and create pending withdrawal in transaction
  const userRef = doc(db, USERS_COLLECTION, userId);
  const newWithdrawalId = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const withdrawalRef = doc(db, WITHDRAWALS_COLLECTION, newWithdrawalId);

  return await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data() as UserAccount;
    const currentBalance = userData.balance || 0;

    if (currentBalance < amount) {
      throw new Error(
        `Insufficient balance. Available balance is ${currentBalance.toFixed(2)}, but you requested ${amount.toFixed(2)}.`
      );
    }

    // Deduct requested amount from balance (locked pending payout)
    transaction.update(userRef, {
      balance: currentBalance - amount,
    });

    const withdrawalData = {
      userId,
      userMobile,
      amount: Number(amount),
      paymentMethod: paymentDetails.paymentMethod,
      accountNumber: paymentDetails.accountNumber,
      accountName: paymentDetails.accountName,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
    };

    transaction.set(withdrawalRef, withdrawalData);

    return {
      id: newWithdrawalId,
      ...withdrawalData,
    };
  });
}

/**
 * Real-time listener for user's withdrawals
 */
export function listenToUserWithdrawals(
  userId: string,
  callback: (withdrawals: WithdrawalDoc[]) => void
): () => void {
  const q = query(
    collection(db, WITHDRAWALS_COLLECTION),
    where('userId', '==', userId)
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

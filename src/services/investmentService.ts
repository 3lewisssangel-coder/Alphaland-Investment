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
import { CommissionRecord, InvestmentDoc, InvestmentPlan, UserAccount } from '../types';

const INVESTMENTS_COLLECTION = 'investments';
const USERS_COLLECTION = 'users';
const COMMISSIONS_COLLECTION = 'commissions';

/**
 * Purchases an investment plan, deducts cost from user's balance,
 * writes the investment document to Firestore, and distributes 3-tier MLM commissions.
 */
export async function purchaseInvestmentPlan(
  userId: string,
  plan: InvestmentPlan
): Promise<InvestmentDoc> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  // Execute in transaction to verify balance and deduct cost atomically
  const result = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('User account not found');
    }

    const userData = userSnap.data() as UserAccount;
    const currentBalance = userData.balance || 0;

    if (currentBalance < plan.cost) {
      throw new Error(
        `Insufficient balance. You need ${plan.cost.toFixed(2)} credits to buy ${plan.name}, but only have ${currentBalance.toFixed(2)} credits. Please make a deposit first.`
      );
    }

    // Deduct cost from balance
    const newBalance = currentBalance - plan.cost;
    transaction.update(userRef, {
      balance: newBalance,
      totalInvested: (userData.totalInvested || 0) + plan.cost,
    });

    const newInvestmentId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const investmentRef = doc(db, INVESTMENTS_COLLECTION, newInvestmentId);

    const investmentData = {
      userId,
      planName: plan.name,
      cost: plan.cost,
      dailyReturn: plan.dailyReturn,
      daysRemaining: plan.durationDays,
      createdAt: serverTimestamp(),
      lastClaimedAt: serverTimestamp(),
      totalClaimed: 0,
    };

    transaction.set(investmentRef, investmentData);

    return {
      investmentId: newInvestmentId,
      investmentData,
      userData,
    };
  });

  // Distribute multi-level commissions to uplines:
  // Level 1: 30%, Level 2: 3%, Level 3: 2%
  distributeUplineCommissions(
    userId,
    result.userData.mobileNumber,
    result.userData.referredBy,
    plan.name,
    plan.cost
  ).catch((err) => {
    console.error('Error distributing MLM commissions:', err);
  });

  return {
    id: result.investmentId,
    ...result.investmentData,
  };
}

/**
 * Distributes multi-level commissions up to 3 tiers:
 * Level 1: 30%
 * Level 2: 3%
 * Level 3: 2%
 */
export async function distributeUplineCommissions(
  purchaserUserId: string,
  purchaserMobile: string,
  directReferrerCode: string | null,
  planName: string,
  cost: number
): Promise<void> {
  if (!directReferrerCode) return;

  const TIERS: { level: 1 | 2 | 3; percent: number }[] = [
    { level: 1, percent: 0.30 }, // 30%
    { level: 2, percent: 0.03 }, // 3%
    { level: 3, percent: 0.02 }, // 2%
  ];

  let currentReferrerCode: string | null = directReferrerCode;

  for (const tier of TIERS) {
    if (!currentReferrerCode) break;

    try {
      // Find the upline user with referralCode == currentReferrerCode
      const q = query(
        collection(db, USERS_COLLECTION),
        where('referralCode', '==', currentReferrerCode)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        break; // No upline found with this code
      }

      const uplineDoc = snap.docs[0];
      const uplineId = uplineDoc.id;
      const uplineData = uplineDoc.data() as UserAccount;

      const commissionAmount = Math.round(cost * tier.percent * 100) / 100;

      // Credit commission to upline user balance
      const uplineRef = doc(db, USERS_COLLECTION, uplineId);
      await updateDoc(uplineRef, {
        balance: increment(commissionAmount),
        totalEarnings: increment(commissionAmount),
      });

      // Record commission record
      const commId = `comm_${Date.now()}_L${tier.level}_${uplineId.substring(0, 6)}`;
      await setDoc(doc(db, COMMISSIONS_COLLECTION, commId), {
        recipientUserId: uplineId,
        purchaserUserId,
        purchaserMobile: purchaserMobile ? `${purchaserMobile.slice(0, 4)}***${purchaserMobile.slice(-3)}` : 'Confidential',
        level: tier.level,
        percentage: tier.percent * 100,
        amount: commissionAmount,
        planName,
        createdAt: serverTimestamp(),
      });

      // Advance to next tier upline
      currentReferrerCode = uplineData.referredBy || null;
    } catch (err) {
      console.error(`Failed to credit Level ${tier.level} commission:`, err);
      break;
    }
  }
}

/**
 * Real-time listener for user's investments
 */
export function listenToUserInvestments(
  userId: string,
  callback: (investments: InvestmentDoc[]) => void
): () => void {
  const q = query(
    collection(db, INVESTMENTS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: InvestmentDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<InvestmentDoc, 'id'>),
      }));
      // Sort in memory by createdAt descending
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, INVESTMENTS_COLLECTION);
    }
  );
}

/**
 * Claim daily return for an active investment
 */
export async function claimDailyPayout(
  investmentId: string,
  userId: string
): Promise<{ amountCredited: number; daysRemaining: number }> {
  const invRef = doc(db, INVESTMENTS_COLLECTION, investmentId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  return await runTransaction(db, async (transaction) => {
    const invSnap = await transaction.get(invRef);
    if (!invSnap.exists()) {
      throw new Error('Investment not found');
    }

    const invData = invSnap.data() as InvestmentDoc;
    if (invData.userId !== userId) {
      throw new Error('Unauthorized investment claim');
    }

    if (invData.daysRemaining <= 0) {
      throw new Error('This investment contract has completed its 14-day duration.');
    }

    const dailyReturn = invData.dailyReturn;
    const newDaysRemaining = invData.daysRemaining - 1;

    // Credit balance
    transaction.update(userRef, {
      balance: increment(dailyReturn),
      totalEarnings: increment(dailyReturn),
    });

    // Update investment doc
    transaction.update(invRef, {
      daysRemaining: newDaysRemaining,
      totalClaimed: (invData.totalClaimed || 0) + dailyReturn,
      lastClaimedAt: serverTimestamp(),
    });

    return {
      amountCredited: dailyReturn,
      daysRemaining: newDaysRemaining,
    };
  });
}

/**
 * Real-time listener for commissions received by a user
 */
export function listenToUserCommissions(
  userId: string,
  callback: (commissions: CommissionRecord[]) => void
): () => void {
  const q = query(
    collection(db, COMMISSIONS_COLLECTION),
    where('recipientUserId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CommissionRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommissionRecord, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      console.warn('Commissions listener warning:', error);
      callback([]);
    }
  );
}

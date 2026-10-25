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
      daysCollectedCount: 0,
      lastCollectedAt: serverTimestamp(),
      status: 'active' as const,
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

export const COOLDOWN_MS = 24 * 60 * 60 * 1000; // Strict 24-hour cooldown (86,400,000 ms)

/**
 * Extracts milliseconds from Firestore Timestamp, Date, or string
 */
export function getTimestampMs(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts.seconds !== undefined) {
    return ts.seconds * 1000 + (ts.nanoseconds ? Math.floor(ts.nanoseconds / 1000000) : 0);
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string' || typeof ts === 'number') {
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Calculates current cooldown status and formatted remaining time
 */
export function getInvestmentCooldownStatus(inv: InvestmentDoc): {
  isCompleted: boolean;
  canCollect: boolean;
  remainingMs: number;
  formattedRemaining: string;
} {
  const currentDays = inv.daysCollectedCount ?? (14 - (inv.daysRemaining ?? 14));
  if (
    currentDays >= 14 ||
    inv.status === 'completed' ||
    (inv.daysRemaining !== undefined && inv.daysRemaining <= 0)
  ) {
    return {
      isCompleted: true,
      canCollect: false,
      remainingMs: 0,
      formattedRemaining: 'Contract Completed (14/14 Days Claimed)',
    };
  }

  // If no last collection or creation time is recorded, allow first claim
  const lastMs = getTimestampMs(inv.lastCollectedAt || inv.lastClaimedAt);
  if (!lastMs) {
    return {
      isCompleted: false,
      canCollect: true,
      remainingMs: 0,
      formattedRemaining: 'Ready to Collect',
    };
  }

  const elapsed = Date.now() - lastMs;
  if (elapsed >= COOLDOWN_MS) {
    return {
      isCompleted: false,
      canCollect: true,
      remainingMs: 0,
      formattedRemaining: 'Ready to Collect',
    };
  }

  const remainingMs = COOLDOWN_MS - elapsed;
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return {
    isCompleted: false,
    canCollect: false,
    remainingMs,
    formattedRemaining: `Next in ${hours}h ${minutes}m ${seconds}s`,
  };
}

/**
 * Claim daily return for an active investment with strict 24-hour server-side cooldown check.
 * Atomically updates user balance and contract metadata via Firestore transaction.
 */
export async function claimDailyPayout(
  investmentId: string,
  userId: string
): Promise<{ amountCredited: number; daysRemaining: number; daysCollectedCount: number }> {
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

    const currentDaysCollected = invData.daysCollectedCount ?? (14 - (invData.daysRemaining ?? 14));
    if (
      currentDaysCollected >= 14 ||
      invData.status === 'completed' ||
      (invData.daysRemaining !== undefined && invData.daysRemaining <= 0)
    ) {
      throw new Error('This investment contract has completed its full 14-day duration.');
    }

    // Server-Side Timestamp Validation: Compare current time against lastCollectedAt
    const lastClaimMs = getTimestampMs(invData.lastCollectedAt || invData.lastClaimedAt);
    const nowMs = Date.now();

    if (lastClaimMs) {
      const elapsed = nowMs - lastClaimMs;
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        throw new Error(
          `Collection on 24-hour cooldown. Next collection available in ${remainingHours}h ${remainingMinutes}m.`
        );
      }
    }

    const dailyReturn = invData.dailyReturn;
    const nextDaysCollected = currentDaysCollected + 1;
    const nextDaysRemaining = Math.max(0, 14 - nextDaysCollected);
    const isCompleted = nextDaysCollected >= 14;

    // 1. Atomically increment user's balance and total earnings
    transaction.update(userRef, {
      balance: increment(dailyReturn),
      totalEarnings: increment(dailyReturn),
    });

    // 2. Atomically update investment document with lastCollectedAt server timestamp, incremented daysCollectedCount, and status
    transaction.update(invRef, {
      lastCollectedAt: serverTimestamp(),
      lastClaimedAt: serverTimestamp(),
      daysCollectedCount: nextDaysCollected,
      daysRemaining: nextDaysRemaining,
      status: isCompleted ? 'completed' : 'active',
      totalClaimed: (invData.totalClaimed || 0) + dailyReturn,
    });

    return {
      amountCredited: dailyReturn,
      daysRemaining: nextDaysRemaining,
      daysCollectedCount: nextDaysCollected,
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

/**
 * Automatically checks and credits mature 24-hour return cycles for all active investments.
 * Executed whenever a user opens their dashboard or portfolio.
 * 100% database-backed calculation and atomic transaction updates in Firestore.
 */
export async function autoCreditDueInvestments(userId: string): Promise<{
  totalCredited: number;
  creditedPlans: { planName: string; cycles: number; amount: number }[];
}> {
  if (!userId) return { totalCredited: 0, creditedPlans: [] };

  try {
    const q = query(
      collection(db, INVESTMENTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return { totalCredited: 0, creditedPlans: [] };
    }

    let totalCredited = 0;
    const creditedPlans: { planName: string; cycles: number; amount: number }[] = [];

    for (const docSnap of snap.docs) {
      const invData = docSnap.data() as InvestmentDoc;
      const invId = docSnap.id;

      const currentDaysCollected = invData.daysCollectedCount ?? (14 - (invData.daysRemaining ?? 14));
      if (
        currentDaysCollected >= 14 ||
        invData.status === 'completed' ||
        (invData.daysRemaining !== undefined && invData.daysRemaining <= 0)
      ) {
        continue;
      }

      const baseMs = getTimestampMs(invData.lastCollectedAt || invData.lastClaimedAt || invData.createdAt);
      if (!baseMs) continue;

      const elapsedMs = Date.now() - baseMs;
      const maxRemainingCycles = Math.max(0, 14 - currentDaysCollected);
      const rawCycles = Math.floor(elapsedMs / COOLDOWN_MS);
      const claimableCycles = Math.min(rawCycles, maxRemainingCycles);

      if (claimableCycles >= 1) {
        try {
          const invRef = doc(db, INVESTMENTS_COLLECTION, invId);
          const userRef = doc(db, USERS_COLLECTION, userId);

          await runTransaction(db, async (transaction) => {
            const freshInvSnap = await transaction.get(invRef);
            if (!freshInvSnap.exists()) return;

            const freshInv = freshInvSnap.data() as InvestmentDoc;
            const freshDays = freshInv.daysCollectedCount ?? (14 - (freshInv.daysRemaining ?? 14));
            if (freshDays >= 14 || freshInv.status === 'completed') return;

            const freshBaseMs = getTimestampMs(freshInv.lastCollectedAt || freshInv.lastClaimedAt || freshInv.createdAt);
            if (!freshBaseMs) return;

            const freshElapsed = Date.now() - freshBaseMs;
            const freshMaxRemaining = Math.max(0, 14 - freshDays);
            const freshCycles = Math.min(Math.floor(freshElapsed / COOLDOWN_MS), freshMaxRemaining);

            if (freshCycles < 1) return;

            const payoutAmount = freshCycles * freshInv.dailyReturn;
            const nextDaysCollected = freshDays + freshCycles;
            const nextDaysRemaining = Math.max(0, 14 - nextDaysCollected);
            const isCompleted = nextDaysCollected >= 14;

            // 1. Atomically add that total amount to the user's balance in Firestore
            transaction.update(userRef, {
              balance: increment(payoutAmount),
              totalEarnings: increment(payoutAmount),
            });

            // 2. Update investment's lastCollectedAt timestamp and increment daysCollectedCount
            transaction.update(invRef, {
              lastCollectedAt: serverTimestamp(),
              lastClaimedAt: serverTimestamp(),
              daysCollectedCount: nextDaysCollected,
              daysRemaining: nextDaysRemaining,
              status: isCompleted ? 'completed' : 'active',
              totalClaimed: (freshInv.totalClaimed || 0) + payoutAmount,
            });

            totalCredited += payoutAmount;
            creditedPlans.push({
              planName: freshInv.planName,
              cycles: freshCycles,
              amount: payoutAmount,
            });
          });
        } catch (txError) {
          console.error(`Auto-credit failed for contract ${invId}:`, txError);
        }
      }
    }

    return { totalCredited, creditedPlans };
  } catch (err) {
    console.error('Error during auto-credit check:', err);
    return { totalCredited: 0, creditedPlans: [] };
  }
}

import { Timestamp } from 'firebase/firestore';

export interface UserAccount {
  id: string; // User UID
  mobileNumber: string;
  password?: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: Timestamp | string | any;
  totalEarnings?: number;
  totalDeposits?: number;
  totalInvested?: number;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  cost: number;
  dailyReturn: number;
  durationDays: number;
  imageUrl: string;
  tagline: string;
  badge?: string;
  features: string[];
}

export interface InvestmentDoc {
  id: string;
  userId: string;
  planName: string;
  cost: number;
  dailyReturn: number;
  daysRemaining: number;
  daysCollectedCount?: number;
  lastCollectedAt?: Timestamp | string | any;
  status?: 'active' | 'completed';
  createdAt: Timestamp | string | any;
  lastClaimedAt?: Timestamp | string | any;
  totalClaimed?: number;
}

export interface DepositDoc {
  id: string;
  userId: string;
  userMobile?: string;
  amount: number;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp | string | any;
  processedAt?: Timestamp | string | any;
}

export interface WithdrawalDoc {
  id: string;
  userId: string;
  userMobile?: string;
  amount: number;
  paymentMethod?: string;
  accountNumber?: string;
  accountName?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp | string | any;
  processedAt?: Timestamp | string | any;
}

export interface AppConfigDoc {
  activeDepositQrUrl: string;
  gcashNumber?: string;
  gcashName?: string;
  bankName?: string;
  usdtAddress?: string;
  minDeposit?: number;
  minWithdrawal?: number;
  communityChatLink?: string;
  communityQrUrl?: string;
  updatedAt?: Timestamp | string | any;
}

export interface CommissionRecord {
  id: string;
  recipientUserId: string;
  purchaserUserId: string;
  purchaserMobile?: string;
  level: 1 | 2 | 3;
  percentage: number;
  amount: number;
  planName: string;
  createdAt: Timestamp | string | any;
}

export interface CouponDoc {
  id: string;
  code: string;
  amount: number;
  isUsed: boolean;
  usedBy?: string | null;
  userMobile?: string | null;
  usedAt?: Timestamp | string | any;
  createdAt: Timestamp | string | any;
}

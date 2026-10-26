import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  TrendingUp,
  Receipt,
  Building,
  Sparkles,
} from 'lucide-react';
import { DepositDoc, InvestmentDoc, UserAccount, WithdrawalDoc } from '../types';
import { RedeemCouponCard } from './RedeemCouponCard';

interface WalletPanelProps {
  user: UserAccount;
  deposits: DepositDoc[];
  withdrawals: WithdrawalDoc[];
  investments: InvestmentDoc[];
  onOpenDeposit: () => void;
  onOpenWithdrawal: () => void;
  onOpenInvest: () => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  user,
  deposits,
  withdrawals,
  investments,
  onOpenDeposit,
  onOpenWithdrawal,
  onOpenInvest,
}) => {
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const userBalance = user.balance || 0;
  const totalApprovedDeposits = deposits
    .filter((d) => d.status === 'approved')
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  const totalPaidWithdrawals = withdrawals
    .filter((w) => w.status === 'paid' || w.status === 'approved')
    .reduce((acc, w) => acc + (w.amount || 0), 0);
  const totalActiveInvestmentsCost = investments.reduce((acc, i) => acc + (i.cost || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Balance & Quick Action Card */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Wallet className="w-4 h-4" />
                <span>Primary Account Balance</span>
              </span>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                ₱{userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400">
                Available for real estate investment purchases and 2-hour manual withdrawals.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={onOpenDeposit}
                className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
              >
                <ArrowUpRight className="w-4 h-4 text-slate-950" />
                <span>Deposit Funds</span>
              </button>
              <button
                onClick={onOpenWithdrawal}
                className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition"
              >
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Total Deposited</span>
              <span className="text-base font-bold text-slate-100">₱{totalApprovedDeposits.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Total Withdrawn</span>
              <span className="text-base font-bold text-slate-100">₱{totalPaidWithdrawals.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Active Portfolio</span>
              <span className="text-base font-bold text-amber-400">₱{totalActiveInvestmentsCost.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Active Contracts</span>
              <span className="text-base font-bold text-emerald-400">{investments.length} Plans</span>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem Promotional Coupon Card */}
      <RedeemCouponCard user={user} />

      {/* Transactions History Header & Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'deposits'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Deposit History ({deposits.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'withdrawals'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Withdrawal History ({withdrawals.length})</span>
          </button>
        </div>

        {/* Tab 1: Deposits */}
        {activeTab === 'deposits' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
            {deposits.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Receipt className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm text-slate-400">No deposit records found in your account.</p>
                <button
                  onClick={onOpenDeposit}
                  className="text-xs px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition inline-block"
                >
                  Make Your First Deposit
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="pb-3 pl-2">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Proof</th>
                      <th className="pb-3 text-right pr-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 pl-2 font-bold text-white text-sm">
                          ₱{dep.amount.toLocaleString()}
                        </td>
                        <td className="py-3">
                          {dep.status === 'pending' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 font-semibold">
                              <Clock className="w-3 h-3" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                          {dep.status === 'approved' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved & Credited</span>
                            </span>
                          )}
                          {dep.status === 'rejected' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-rose-400 bg-rose-500/10 border border-rose-500/20 font-semibold">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {dep.proofImageUrl ? (
                            <button
                              onClick={() => setSelectedProofUrl(dep.proofImageUrl)}
                              className="inline-flex items-center space-x-1 text-amber-400 hover:text-amber-300 font-medium underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <span className="text-slate-500">No Image</span>
                          )}
                        </td>
                        <td className="py-3 text-right pr-2 text-slate-400 font-mono">
                          {dep.createdAt?.seconds
                            ? new Date(dep.createdAt.seconds * 1000).toLocaleDateString()
                            : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
            {withdrawals.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Receipt className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm text-slate-400">No withdrawal requests yet.</p>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 max-w-sm mx-auto">
                  Notice: Withdrawals are processed manually and take approximately 2 hours to receive.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="pb-3 pl-2">Amount</th>
                      <th className="pb-3">Channel / Account</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {withdrawals.map((wdr) => (
                      <tr key={wdr.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 pl-2 font-bold text-white text-sm">
                          ₱{wdr.amount.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-200">
                            {wdr.paymentMethod || 'GCash'}
                          </span>
                          <span className="block text-slate-400 font-mono">
                            {wdr.accountNumber || 'Default'} ({wdr.accountName || 'User'})
                          </span>
                        </td>
                        <td className="py-3">
                          {wdr.status === 'pending' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 font-semibold">
                              <Clock className="w-3 h-3" />
                              <span>Processing (~2 hrs)</span>
                            </span>
                          )}
                          {(wdr.status === 'paid' || wdr.status === 'approved') && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed / Paid</span>
                            </span>
                          )}
                          {wdr.status === 'rejected' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-rose-400 bg-rose-500/10 border border-rose-500/20 font-semibold">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected & Refunded</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right pr-2 text-slate-400 font-mono">
                          {wdr.createdAt?.seconds
                            ? new Date(wdr.createdAt.seconds * 1000).toLocaleDateString()
                            : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Proof Modal Viewer */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-bold">Transaction Receipt Proof</span>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={selectedProofUrl}
                alt="Proof"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

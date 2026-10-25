import React, { useState } from 'react';
import { X, ArrowDownRight, AlertCircle, CheckCircle2, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { UserAccount, InvestmentDoc } from '../types';
import { submitWithdrawalRequest } from '../services/walletService';

interface WithdrawalModalProps {
  user: UserAccount;
  activeInvestments: InvestmentDoc[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onGoToInvest?: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  user,
  activeInvestments,
  isOpen,
  onClose,
  onSuccess,
  onGoToInvest,
}) => {
  const [amount, setAmount] = useState<string>('100');
  const [paymentMethod, setPaymentMethod] = useState<string>('GCash');
  const [accountNumber, setAccountNumber] = useState<string>(user.mobileNumber || '');
  const [accountName, setAccountName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const hasActiveInvestment = activeInvestments && activeInvestments.length > 0;
  const userBalance = user.balance || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!hasActiveInvestment) {
      setError('You need at least 1 active investment plan to withdraw funds.');
      return;
    }

    if (isNaN(numAmount) || numAmount < 100) {
      setError('Minimum withdrawal amount is 100 credits.');
      return;
    }

    if (numAmount > userBalance) {
      setError(`Insufficient balance. Your current balance is ${userBalance.toFixed(2)} credits.`);
      return;
    }

    if (!accountNumber.trim() || !accountName.trim()) {
      setError('Please provide your complete payout account number and account name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await submitWithdrawalRequest(user.id, numAmount, user.mobileNumber, {
        paymentMethod,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2800);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Withdraw Funds</h2>
              <p className="text-xs text-amber-400/80">Secure payout to your personal account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Withdrawal Request Queued!</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Your request for <span className="text-amber-400 font-semibold">{amount} credits</span> has been registered.
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium">
              Withdrawals are processed manually and take approximately 2 hours to receive.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Condition Guard: Must have at least 1 active investment */}
            {!hasActiveInvestment && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm space-y-2">
                <div className="flex items-center space-x-2 font-bold text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
                  <span>Active Investment Plan Required</span>
                </div>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  Alphaland security policy requires at least 1 active real estate investment contract to unlock withdrawal privileges.
                </p>
                {onGoToInvest && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToInvest();
                    }}
                    className="mt-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition inline-block"
                  >
                    Explore Investment Plans →
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Balance Display */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Available Balance</span>
                <span className="text-2xl font-black text-amber-400">₱{userBalance.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Active Contracts</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {activeInvestments.length} Active Plan{activeInvestments.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300 uppercase tracking-wider">
                  Withdrawal Amount (Min. 100)
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(Math.max(100, Math.floor(userBalance)).toString())}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Withdraw Max
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₱</span>
                <input
                  type="number"
                  min="100"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimum 100"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-9 pr-4 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Payout Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['GCash', 'Maya', 'Bank Transfer'].map((method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 text-xs rounded-xl font-medium border transition ${
                      paymentMethod === method
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Account / Mobile Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Full name on account"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>

            {/* Mandatory Payout Notice as specified in prompt */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-amber-300 text-xs">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p className="font-medium italic leading-relaxed">
                "Withdrawals are processed manually and take approximately 2 hours to receive."
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !hasActiveInvestment || userBalance < 100}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <span>Request Withdrawal</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

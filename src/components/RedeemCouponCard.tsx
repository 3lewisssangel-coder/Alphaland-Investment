import React, { useState, useEffect } from 'react';
import { Ticket, CheckCircle2, AlertCircle, Clock, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount } from '../types';
import { redeemCoupon } from '../services/couponService';

interface RedeemCouponCardProps {
  user: UserAccount;
  onSuccess?: () => void;
}

export const RedeemCouponCard: React.FC<RedeemCouponCardProps> = ({ user, onSuccess }) => {
  const [couponCode, setCouponCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Anti-spam 5-second lockout timer
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || submitting) return;

    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a coupon code.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const result = await redeemCoupon(cleanCode, user.id, user.mobileNumber);

      // Trigger celebratory confetti
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSuccessMessage(`Successfully redeemed ${result.code}! +₱${result.amount.toFixed(2)} has been credited to your balance.`);
      setCouponCode('');

      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      const msg = err?.message || 'Invalid or already used coupon';
      setErrorMessage(msg);
      // Trigger strict 5-second lockout timer on failure
      setLockoutSeconds(5);
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                <span>Redeem Credit Coupon</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Enter an official promotional voucher code to claim instant credits.
              </p>
            </div>
          </div>
          {isLocked && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>Cooldown: {lockoutSeconds}s</span>
            </span>
          )}
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={couponCode}
              disabled={isLocked || submitting}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={isLocked ? `Anti-spam lock active (${lockoutSeconds}s)...` : 'e.g. VIP-BONUS-100'}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-amber-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLocked || submitting || !couponCode.trim()}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Validating...</span>
              </>
            ) : isLocked ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Please wait {lockoutSeconds}s...</span>
              </>
            ) : (
              <>
                <span>Redeem Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500">
          • Each coupon can only be used once. Credits are added directly to your Firestore wallet upon redemption.
        </p>
      </div>
    </div>
  );
};

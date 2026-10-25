import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Flame,
  Award,
  DollarSign,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { INVESTMENT_PLANS } from '../data/plans';
import { InvestmentDoc, InvestmentPlan, UserAccount } from '../types';
import {
  purchaseInvestmentPlan,
  claimDailyPayout,
  getInvestmentCooldownStatus,
  autoCreditDueInvestments,
} from '../services/investmentService';

interface InvestmentsPanelProps {
  user: UserAccount;
  activeInvestments: InvestmentDoc[];
  onOpenDeposit: () => void;
  onRefresh?: () => void;
}

export const InvestmentsPanel: React.FC<InvestmentsPanelProps> = ({
  user,
  activeInvestments,
  onOpenDeposit,
  onRefresh,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [claimErrorMsg, setClaimErrorMsg] = useState<string | null>(null);
  const [autoCreditBanner, setAutoCreditBanner] = useState<string | null>(null);
  // Live ticker that triggers re-render every second to update 24h countdown clocks
  const [, setCurrentTime] = useState<number>(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic crediting check whenever user opens dashboard / loads active plans
  React.useEffect(() => {
    if (!user?.id) return;
    autoCreditDueInvestments(user.id)
      .then((res) => {
        if (res.totalCredited > 0) {
          const count = res.creditedPlans.length;
          const plansList = res.creditedPlans
            .map((p) => `${p.planName} (+₱${p.amount} for ${p.cycles}d)`)
            .join(', ');
          setAutoCreditBanner(
            `✨ Auto-credited +₱${res.totalCredited.toFixed(2)} to your balance from ${count} property contract${count > 1 ? 's' : ''}: ${plansList}`
          );
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
          if (onRefresh) onRefresh();
        }
      })
      .catch((err) => {
        console.error('Auto-credit error:', err);
      });
  }, [user?.id]);

  const userBalance = user.balance || 0;

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return;
    if (userBalance < selectedPlan.cost) {
      setPurchaseError(
        `Insufficient balance. You have ₱${userBalance.toFixed(2)}, but ${selectedPlan.name} requires ₱${selectedPlan.cost}. Please deposit funds.`
      );
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseError(null);

      await purchaseInvestmentPlan(user.id, selectedPlan);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSelectedPlan(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPurchaseError(err?.message || 'Failed to complete investment.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleClaim = async (inv: InvestmentDoc) => {
    // Prevent duplicate client spam requests: reject immediately if already claiming
    if (claimingId === inv.id) return;

    const status = getInvestmentCooldownStatus(inv);
    if (!status.canCollect) {
      setClaimErrorMsg(
        status.isCompleted
          ? 'This investment contract has completed its 14-day duration.'
          : `Collection is on a 24-hour cooldown. ${status.formattedRemaining}.`
      );
      setTimeout(() => setClaimErrorMsg(null), 4000);
      return;
    }

    try {
      setClaimingId(inv.id);
      setClaimSuccessMsg(null);
      setClaimErrorMsg(null);

      const res = await claimDailyPayout(inv.id, user.id);
      setClaimSuccessMsg(
        `Successfully collected Day ${res.daysCollectedCount} of 14 (+₱${res.amountCredited.toFixed(2)})! 24-hour cooldown activated.`
      );
      setTimeout(() => setClaimSuccessMsg(null), 4500);

      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.7 },
      });

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Claim error:', err);
      setClaimErrorMsg(err?.message || 'Failed to claim daily payout. Please try again.');
      setTimeout(() => setClaimErrorMsg(null), 5000);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Yield Real Estate Portfolio</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Micro-Invest in Prime Properties, Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">Daily Payouts</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Every plan guarantees daily returns credited directly into your wallet for 14 continuous days. Backed by real estate micro-shares and verified in Firestore.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Contract Backed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>24h Daily Claim Engine</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Up to 513% Total Return</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Credit Notification Banner */}
      {autoCreditBanner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-amber-500/10 border border-amber-500/40 text-amber-200 text-sm flex items-center justify-between animate-fade-in shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block">Automatic Daily Return Credited!</span>
              <span className="text-xs text-amber-300/90">{autoCreditBanner}</span>
            </div>
          </div>
          <button
            onClick={() => setAutoCreditBanner(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition ml-2 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Claim Notification Banners */}
      {claimSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{claimSuccessMsg}</span>
          </div>
        </div>
      )}

      {claimErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-semibold">{claimErrorMsg}</span>
          </div>
        </div>
      )}

      {/* Active Investments / My Portfolio Section */}
      {activeInvestments && activeInvestments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">My Active Contracts ({activeInvestments.length})</h2>
            </div>
            <span className="text-xs text-slate-400">Strict 24-hour collection cooldown enforced</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInvestments.map((inv) => {
              const cooldown = getInvestmentCooldownStatus(inv);
              const daysCollected = inv.daysCollectedCount ?? Math.max(0, 14 - (inv.daysRemaining ?? 14));
              const daysLeft = Math.max(0, 14 - daysCollected);
              const totalReturn = inv.dailyReturn * 14;
              const progressPercent = Math.min(100, Math.round((daysCollected / 14) * 100));

              return (
                <div
                  key={inv.id}
                  className="bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 space-y-4 shadow-xl transition relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                        {cooldown.isCompleted ? (
                          <span className="text-emerald-400">Contract Completed</span>
                        ) : (
                          `Day ${daysCollected} of 14 Active`
                        )}
                      </span>
                      <h3 className="text-lg font-black text-white">{inv.planName}</h3>
                      <p className="text-xs text-slate-400">Original Cost: ₱{inv.cost.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Daily Payout</span>
                      <span className="text-base font-black text-emerald-400">+₱{inv.dailyReturn}/day</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{daysCollected} of 14 Days Claimed</span>
                      <span className="text-amber-400 font-semibold">{daysLeft} days remaining</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Earnings stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Contract Total</span>
                      <span className="font-bold text-slate-200">₱{totalReturn.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Claimed</span>
                      <span className="font-bold text-amber-300">₱{(inv.totalClaimed || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Anti-spam & 24h Cooldown Claim Button */}
                  <div>
                    {claimingId === inv.id ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 cursor-wait"
                      >
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Verifying Server Cooldown...</span>
                      </button>
                    ) : cooldown.isCompleted ? (
                      <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 text-slate-400 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Contract Completed (14/14 Days)</span>
                      </div>
                    ) : !cooldown.canCollect ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-medium text-xs flex items-center justify-center space-x-2 cursor-not-allowed opacity-90"
                      >
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Next collection in {cooldown.formattedRemaining.replace('Next in ', '')}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClaim(inv)}
                        disabled={claimingId !== null}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Collect Today's Return (+₱{inv.dailyReturn})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment Plans Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Real Estate Packages</h2>
          </div>
          <span className="text-xs text-slate-400">Select any plan to purchase with wallet balance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INVESTMENT_PLANS.map((plan) => {
            const totalReturn = plan.dailyReturn * plan.durationDays;
            const netProfit = totalReturn - plan.cost;
            const roiPercent = Math.round((netProfit / plan.cost) * 100);
            const canAfford = userBalance >= plan.cost;

            return (
              <div
                key={plan.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image & Badges */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  <img
                    src={plan.imageUrl}
                    alt={plan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-md">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                      +{roiPercent}% ROI
                    </span>
                  </div>

                  {/* Plan Price tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-300 line-clamp-1">{plan.tagline}</p>
                    </div>
                  </div>
                </div>

                {/* Plan Content */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Yield Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 block">Investment Cost</span>
                      <span className="text-base font-black text-white">₱{plan.cost.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Daily Payout</span>
                      <span className="text-base font-black text-emerald-400">₱{plan.dailyReturn}/day</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800">
                      <span className="text-slate-400 block">Term Duration</span>
                      <span className="font-semibold text-slate-200">{plan.durationDays} Days</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800">
                      <span className="text-slate-400 block">Total Payout</span>
                      <span className="font-black text-amber-300">₱{totalReturn.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Feature bullet list */}
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <div className="pt-2">
                    {canAfford ? (
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setPurchaseError(null);
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
                      >
                        <span>Invest ₱{plan.cost.toLocaleString()}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={onOpenDeposit}
                        className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition"
                      >
                        <span>Deposit to Invest (Need ₱{(plan.cost - userBalance).toFixed(2)})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Confirm Investment</span>
              <h3 className="text-2xl font-black text-white">{selectedPlan.name}</h3>
              <p className="text-xs text-slate-400">{selectedPlan.tagline}</p>
            </div>

            {purchaseError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{purchaseError}</span>
              </div>
            )}

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Current Balance:</span>
                <span className="font-bold text-slate-200">₱{userBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Plan Cost:</span>
                <span className="font-bold text-rose-400">-₱{selectedPlan.cost.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Balance After Purchase:</span>
                <span className="font-bold text-amber-300">
                  ₱{(userBalance - selectedPlan.cost).toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Daily Payout for 14 Days:</span>
                <span className="font-black">+₱{selectedPlan.dailyReturn}/day</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Total Expected Return:</span>
                <span className="font-black">+₱{(selectedPlan.dailyReturn * 14).toLocaleString()}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center leading-relaxed">
              By confirming, ₱{selectedPlan.cost} will be immediately deducted from your Firestore balance and your daily contract will activate.
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                disabled={purchasing}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchasing}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Activate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

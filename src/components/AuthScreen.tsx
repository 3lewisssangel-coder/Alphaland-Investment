import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Phone,
  Sparkles,
  UserPlus,
  LogIn,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Award,
  Loader2,
} from 'lucide-react';
import { loginUser, registerUser } from '../services/userService';
import { UserAccount } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically capture query parameter ?ref=CODE during signup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || params.get('r');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      setMode('signup'); // Switch to signup automatically when visiting via referral link
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobileNumber.trim();
    if (cleanMobile.length < 8) {
      setError('Please provide a valid mobile number (e.g., 09171234567).');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify and try again.');
          return;
        }

        const newUser = await registerUser(cleanMobile, password, referralCode || null);
        onSuccess(newUser);
      } else {
        const loggedInUser = await loginUser(cleanMobile, password);
        onSuccess(loggedInUser);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background aesthetic glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 space-y-6">
        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div
            onClick={() => {
              const now = Date.now();
              const lastClick = (window as any)._logoLastClick || 0;
              const count = (now - lastClick < 1500) ? ((window as any)._logoClickCount || 0) + 1 : 1;
              (window as any)._logoLastClick = now;
              (window as any)._logoClickCount = count;
              if (count >= 5) {
                (window as any)._logoClickCount = 0;
                window.location.hash = 'admin';
              }
            }}
            className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 text-amber-400 shadow-xl cursor-pointer select-none active:scale-95 transition-transform"
            title="Alphaland Investment"
          >
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Alphaland <span className="text-amber-400">Investment</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            High-yield real estate micro-shares with 14-day guaranteed daily payouts
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Tab buttons */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Investor Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>

            {/* Signup specific fields */}
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                    />
                  </div>
                </div>

                {/* Referral Code input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 uppercase tracking-wider">
                      Referral Sponsor Code (Optional)
                    </label>
                    {referralCode && (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Sponsor Captured</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ALP-W49K"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                  />
                  <p className="text-[11px] text-slate-500">
                    If invited by a friend, keep their code to link to their team.
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Connecting to Firestore...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Portfolio</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Investor Account</span>
                </>
              )}
            </button>
          </form>

          {/* Value props */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Firestore Secured</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>3-Tier MLM Rewards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

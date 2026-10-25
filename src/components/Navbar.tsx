import React, { useState } from 'react';
import {
  Building2,
  Wallet,
  TrendingUp,
  Users,
  LogOut,
  PlusCircle,
  Copy,
  Check,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  user: UserAccount;
  activeTab: 'investments' | 'wallet' | 'team';
  onSelectTab: (tab: 'investments' | 'wallet' | 'team') => void;
  onOpenDeposit: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenDeposit,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const copyRefCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userBalance = user.balance || 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('investments')}>
            <div
              onClick={(e) => {
                const now = Date.now();
                const lastClick = (window as any)._navLogoLastClick || 0;
                const count = (now - lastClick < 1500) ? ((window as any)._navLogoClickCount || 0) + 1 : 1;
                (window as any)._navLogoLastClick = now;
                (window as any)._navLogoClickCount = count;
                if (count >= 5) {
                  e.stopPropagation();
                  (window as any)._navLogoClickCount = 0;
                  window.location.hash = 'admin';
                }
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
            >
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                Alphaland <span className="text-amber-400">Investment</span>
              </span>
              <span className="hidden sm:block text-[10px] text-amber-500/80 uppercase tracking-widest font-bold">
                Real Estate Micro-Assets
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => onSelectTab('investments')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'investments'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Investment Plans</span>
            </button>

            <button
              onClick={() => onSelectTab('wallet')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'wallet'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>My Wallet</span>
            </button>

            <button
              onClick={() => onSelectTab('team')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'team'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Affiliate & Team</span>
            </button>
          </nav>

          {/* Right Action: Balance & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Balance Pill with Deposit Trigger */}
            <div className="flex items-center bg-slate-950 border border-amber-500/30 rounded-2xl p-1 sm:p-1.5 shadow-md">
              <div className="px-2.5 py-1 text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Balance</span>
                <span className="text-xs sm:text-sm font-black text-amber-400">
                  ₱{userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={onOpenDeposit}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center space-x-1 shadow-sm"
                title="Deposit credits"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deposit</span>
              </button>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-1.5 p-1.5 sm:p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {user.mobileNumber.slice(-2)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-50 space-y-3 animate-fade-in">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] text-slate-400 block font-medium">Investor Account</span>
                    <span className="text-xs font-bold text-white font-mono">{user.mobileNumber}</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Referral Code</span>
                      <span className="font-mono font-bold text-amber-400">{user.referralCode}</span>
                    </div>
                    <button
                      onClick={copyRefCode}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile bottom navigation bar */}
        <div className="flex md:hidden border-t border-slate-800/80 py-2 justify-around">
          <button
            onClick={() => onSelectTab('investments')}
            className={`flex flex-col items-center space-y-0.5 text-[11px] font-bold ${
              activeTab === 'investments' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Invest</span>
          </button>
          <button
            onClick={() => onSelectTab('wallet')}
            className={`flex flex-col items-center space-y-0.5 text-[11px] font-bold ${
              activeTab === 'wallet' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet</span>
          </button>
          <button
            onClick={() => onSelectTab('team')}
            className={`flex flex-col items-center space-y-0.5 text-[11px] font-bold ${
              activeTab === 'team' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team & MLM</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { UserAccount, InvestmentDoc, DepositDoc, WithdrawalDoc } from './types';
import { listenToUser, getUserByMobile } from './services/userService';
import { listenToUserInvestments } from './services/investmentService';
import { listenToUserDeposits, listenToUserWithdrawals, getAppConfig } from './services/walletService';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { InvestmentsPanel } from './components/InvestmentsPanel';
import { WalletPanel } from './components/WalletPanel';
import { TeamPanel } from './components/TeamPanel';
import { DepositModal } from './components/DepositModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  // Navigation & Routing state
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'investments' | 'wallet' | 'team'>('investments');

  // User & Real-time Firestore state
  const [user, setUser] = useState<UserAccount | null>(null);
  const [investments, setInvestments] = useState<InvestmentDoc[]>([]);
  const [deposits, setDeposits] = useState<DepositDoc[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalDoc[]>([]);

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  // Initialize app configuration if not present
  useEffect(() => {
    getAppConfig().catch(console.error);
  }, []);

  // Detect secret /admin route via pathname or hash
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin') {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  // Restore existing session from sessionStorage if present
  useEffect(() => {
    const savedUserId = sessionStorage.getItem('alphaland_uid');
    if (savedUserId && !user) {
      // Setup listener directly with saved user ID
      const unsub = listenToUser(savedUserId, (updatedUser) => {
        if (updatedUser) {
          setUser(updatedUser);
        } else {
          sessionStorage.removeItem('alphaland_uid');
        }
      });
      return () => unsub();
    }
  }, []);

  // Attach Firestore real-time listeners when user is authenticated
  useEffect(() => {
    if (!user?.id) return;

    // Save session ID
    sessionStorage.setItem('alphaland_uid', user.id);

    // 1. Real-time User Document Listener (balance, referrals)
    const unsubUser = listenToUser(user.id, (freshUser) => {
      if (freshUser) setUser(freshUser);
    });

    // 2. Real-time Investments Listener
    const unsubInvestments = listenToUserInvestments(user.id, setInvestments);

    // 3. Real-time Deposits Listener
    const unsubDeposits = listenToUserDeposits(user.id, setDeposits);

    // 4. Real-time Withdrawals Listener
    const unsubWithdrawals = listenToUserWithdrawals(user.id, setWithdrawals);

    return () => {
      unsubUser();
      unsubInvestments();
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [user?.id]);

  const handleLogout = () => {
    sessionStorage.removeItem('alphaland_uid');
    setUser(null);
  };

  const handleExitAdmin = () => {
    setIsAdminRoute(false);
    if (window.location.hash === '#admin') {
      window.location.hash = '';
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // 1. Route: Secret Admin Portal (/admin)
  if (isAdminRoute) {
    return <AdminPortal onExit={handleExitAdmin} />;
  }

  // 2. Route: Unauthenticated Investor
  if (!user) {
    return <AuthScreen onSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // 3. Route: Authenticated Investor Main Application
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {activeTab === 'investments' && (
          <InvestmentsPanel
            user={user}
            activeInvestments={investments}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletPanel
            user={user}
            deposits={deposits}
            withdrawals={withdrawals}
            investments={investments}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenWithdrawal={() => setIsWithdrawalOpen(true)}
            onOpenInvest={() => setActiveTab('investments')}
          />
        )}

        {activeTab === 'team' && <TeamPanel user={user} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 sm:py-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Alphaland Investment Corporation. All rights reserved.</p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Guaranteed Daily Micro-Yields</span>
            <span>•</span>
            <span>Automated MLM Commissions</span>
            <span>•</span>
            <span>Firestore Powered</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DepositModal
        user={user}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />

      <WithdrawalModal
        user={user}
        activeInvestments={investments}
        isOpen={isWithdrawalOpen}
        onClose={() => setIsWithdrawalOpen(false)}
        onGoToInvest={() => setActiveTab('investments')}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  CheckCircle,
  XCircle,
  Upload,
  AlertCircle,
  Clock,
  Eye,
  Lock,
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AppConfigDoc, DepositDoc, UserAccount, WithdrawalDoc } from '../types';
import {
  verifyAdminCredentials,
  updateAdminDepositQr,
  listenToPendingDeposits,
  listenToAllDeposits,
  approveDeposit,
  rejectDeposit,
  listenToPendingWithdrawals,
  listenToAllWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
  listenToAllUsers,
} from '../services/adminService';
import { listenToAppConfig } from '../services/walletService';

interface AdminPortalProps {
  onExit: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'qr' | 'users'>('deposits');

  // Real-time data
  const [pendingDeposits, setPendingDeposits] = useState<DepositDoc[]>([]);
  const [allDeposits, setAllDeposits] = useState<DepositDoc[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalDoc[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalDoc[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfigDoc | null>(null);

  // Actions state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [newQrFile, setNewQrFile] = useState<File | null>(null);
  const [qrUploadSuccess, setQrUploadSuccess] = useState<boolean>(false);
  const [qrUploading, setQrUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminCredentials(adminUsername.trim(), adminPassword.trim())) {
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid Administrator credentials. Access denied.');
    }
  };

  // Setup real-time listeners upon authentication
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubConfig = listenToAppConfig(setAppConfig);
    const unsubPendingDep = listenToPendingDeposits(setPendingDeposits);
    const unsubAllDep = listenToAllDeposits(setAllDeposits);
    const unsubPendingWdr = listenToPendingWithdrawals(setPendingWithdrawals);
    const unsubAllWdr = listenToAllWithdrawals(setAllWithdrawals);
    const unsubUsers = listenToAllUsers(setUsers);

    return () => {
      unsubConfig();
      unsubPendingDep();
      unsubAllDep();
      unsubPendingWdr();
      unsubAllWdr();
      unsubUsers();
    };
  }, [isAuthenticated]);

  const handleApproveDeposit = async (deposit: DepositDoc) => {
    try {
      setProcessingId(deposit.id);
      await approveDeposit(deposit.id);
      setStatusMessage(`Approved deposit of ₱${deposit.amount}. User balance credited atomically.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Error approving deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeposit = async (deposit: DepositDoc) => {
    const reason = prompt('Enter rejection reason (e.g. Unverified Reference, Blurred Receipt):', 'Invalid transaction receipt');
    if (reason === null) return;
    try {
      setProcessingId(deposit.id);
      await rejectDeposit(deposit.id, reason);
      setStatusMessage(`Deposit of ₱${deposit.amount} rejected.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Error rejecting deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaidWithdrawal = async (wdr: WithdrawalDoc) => {
    try {
      setProcessingId(wdr.id);
      await markWithdrawalPaid(wdr.id);
      setStatusMessage(`Withdrawal of ₱${wdr.amount} marked as Paid/Disbursed.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Error marking withdrawal as paid');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (wdr: WithdrawalDoc) => {
    const reason = prompt('Enter rejection reason (funds will be refunded to user):', 'Incorrect account details');
    if (reason === null) return;
    try {
      setProcessingId(wdr.id);
      await rejectWithdrawal(wdr.id, reason);
      setStatusMessage(`Withdrawal rejected. ₱${wdr.amount} refunded to user.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Error rejecting withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleQrUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrFile) return;
    try {
      setQrUploading(true);
      await updateAdminDepositQr(newQrFile);
      setQrUploadSuccess(true);
      setNewQrFile(null);
      setTimeout(() => setQrUploadSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update QR code.');
    } finally {
      setQrUploading(false);
    }
  };

  // If not authenticated, render the secret Admin Login portal
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white">Alphaland Authority</h1>
            <p className="text-xs text-slate-400">Secret Administrative Console</p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Admin123"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Security Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition"
            >
              Authorize & Access Console
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onExit}
              className="text-xs text-slate-500 hover:text-slate-300 transition flex items-center justify-center space-x-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Application</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  const totalUsersBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalApprovedAmount = allDeposits
    .filter((d) => d.status === 'approved')
    .reduce((acc, d) => acc + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6">
      {/* Top Bar */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white">Alphaland Executive Control</h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                Live Admin Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">Direct Firestore Operations & Storage Buckets</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExit}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400">Pending Deposits</span>
          <div className="text-2xl font-black text-amber-400">{pendingDeposits.length}</div>
          <span className="text-[11px] text-slate-500">Requires verification</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400">Pending Withdrawals</span>
          <div className="text-2xl font-black text-amber-400">{pendingWithdrawals.length}</div>
          <span className="text-[11px] text-slate-500">Manual 2-hour queue</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400">Total Registered Users</span>
          <div className="text-2xl font-black text-white">{users.length}</div>
          <span className="text-[11px] text-slate-500">In users collection</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400">Total Circulating Balances</span>
          <div className="text-2xl font-black text-emerald-400">₱{totalUsersBalance.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Approved deposits: ₱{totalApprovedAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'deposits'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Deposit Verification</span>
          {pendingDeposits.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {pendingDeposits.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'withdrawals'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Withdrawals Queue</span>
          {pendingWithdrawals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {pendingWithdrawals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'qr'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Official QR Management</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory</span>
        </button>
      </div>

      {/* Tab 1: Deposit Verification */}
      {activeTab === 'deposits' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Pending Deposits Verification</h2>
              <p className="text-xs text-slate-400">
                Inspect payment screenshots. One-Click Approval atomically adds funds to user's balance.
              </p>
            </div>
            <span className="text-xs text-amber-400 font-semibold">{pendingDeposits.length} Pending</span>
          </div>

          {pendingDeposits.length === 0 ? (
            <div className="p-8 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">All deposit queues are cleared!</p>
              <p className="text-xs text-slate-500">New submissions from users will appear in real time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block font-mono">User ID: {dep.userId.slice(0, 14)}...</span>
                        <div className="text-xl font-black text-amber-400">₱{dep.amount.toLocaleString()}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    </div>

                    {/* Screenshot thumbnail */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center group cursor-pointer"
                      onClick={() => setPreviewProofUrl(dep.proofImageUrl)}
                    >
                      {dep.proofImageUrl ? (
                        <>
                          <img
                            src={dep.proofImageUrl}
                            alt="Receipt proof"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-xs text-white font-medium">
                            <Eye className="w-4 h-4 text-amber-400" />
                            <span>Click to Zoom</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">No screenshot</span>
                      )}
                    </div>
                  </div>

                  {/* One-click Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleRejectDeposit(dep)}
                      disabled={processingId === dep.id}
                      className="w-1/3 py-2 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveDeposit(dep)}
                      disabled={processingId === dep.id}
                      className="w-2/3 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                    >
                      {processingId === dep.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Approve & Credit Balance</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Withdrawal Queue */}
      {activeTab === 'withdrawals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Manual Withdrawal Requests</h2>
              <p className="text-xs text-slate-400">
                Process payouts within 2 hours as promised to users.
              </p>
            </div>
            <span className="text-xs text-amber-400 font-semibold">{pendingWithdrawals.length} Pending</span>
          </div>

          {pendingWithdrawals.length === 0 ? (
            <div className="p-8 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No pending withdrawal requests!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="pb-3 pl-2">Amount</th>
                    <th className="pb-3">User Contact</th>
                    <th className="pb-3">Payout Account</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pendingWithdrawals.map((wdr) => (
                    <tr key={wdr.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2 font-black text-amber-400 text-sm">
                        ₱{wdr.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="text-slate-200 font-medium">{wdr.userMobile || 'N/A'}</span>
                        <span className="block text-[11px] text-slate-500 font-mono">{wdr.userId.slice(0, 12)}...</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-white">{wdr.paymentMethod || 'GCash'}</span>
                        <span className="block text-slate-300 font-mono">
                          {wdr.accountNumber} ({wdr.accountName})
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">
                        {wdr.createdAt?.seconds
                          ? new Date(wdr.createdAt.seconds * 1000).toLocaleTimeString()
                          : 'Recent'}
                      </td>
                      <td className="py-3 text-right pr-2 space-x-2">
                        <button
                          onClick={() => handleRejectWithdrawal(wdr)}
                          disabled={processingId === wdr.id}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold transition"
                        >
                          Reject & Refund
                        </button>
                        <button
                          onClick={() => handleMarkPaidWithdrawal(wdr)}
                          disabled={processingId === wdr.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 transition"
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: QR Code Management */}
      {activeTab === 'qr' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Deposit QR Code Management</h2>
            <p className="text-xs text-slate-400">
              Upload a new official QR code image to Firebase Storage (`admin-qr/`). It instantly updates the user deposit page in real time via `settings/appConfig`.
            </p>
          </div>

          {qrUploadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Active QR Code updated in Firebase Firestore! Live users will see the new QR immediately.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Current Active QR Display */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Current Active QR
              </span>
              <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl shadow-lg border border-amber-500/20 flex items-center justify-center overflow-hidden">
                {appConfig?.activeDepositQrUrl ? (
                  <img
                    src={appConfig.activeDepositQrUrl}
                    alt="Active Deposit QR"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No active QR found</span>
                )}
              </div>
            </div>

            {/* Upload New QR Form */}
            <form onSubmit={handleQrUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select New QR Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewQrFile(e.target.files[0]);
                    }
                  }}
                  required
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={qrUploading || !newQrFile}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {qrUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Uploading to admin-qr/...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Deploy New QR Code</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Users Directory</h2>
              <p className="text-xs text-slate-400">Real-time user balances and referral relationships</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mobile or referral code..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="pb-3 pl-2">Mobile Number</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Referral Code</th>
                  <th className="pb-3">Upline Sponsor</th>
                  <th className="pb-3 text-right pr-2">User UID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users
                  .filter((u) =>
                    searchQuery
                      ? u.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2 font-bold text-white">{u.mobileNumber}</td>
                      <td className="py-3 font-black text-amber-400 text-sm">
                        ₱{(u.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-semibold">
                          {u.referralCode}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">
                        {u.referredBy ? (
                          <span className="text-amber-400">{u.referredBy}</span>
                        ) : (
                          <span className="text-slate-600">None (Direct)</span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2 font-mono text-slate-500">{u.id}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Modal Viewer */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden p-5 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-bold">Inspection: Transaction Proof Screenshot</span>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                Close ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-slate-950 rounded-2xl p-2 border border-slate-800">
              <img
                src={previewProofUrl}
                alt="Proof Full Resolution"
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

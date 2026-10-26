import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Clock,
  Sparkles,
  QrCode,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { CommissionRecord, UserAccount, AppConfigDoc } from '../types';
import { fetchUserTeamHierarchy } from '../services/userService';
import { listenToUserCommissions } from '../services/investmentService';
import { listenToAppConfig, SAMPLE_QR_SVG } from '../services/walletService';

interface TeamPanelProps {
  user: UserAccount;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({ user }) => {
  const [copied, setCopied] = useState(false);
  const [copiedCommunity, setCopiedCommunity] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfigDoc | null>(null);
  const [teamData, setTeamData] = useState<{
    level1: UserAccount[];
    level2: UserAccount[];
    level3: UserAccount[];
  }>({ level1: [], level2: [], level3: [] });
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'history'>('tiers');

  const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;

  useEffect(() => {
    let isMounted = true;
    setLoadingTeam(true);

    fetchUserTeamHierarchy(user.referralCode)
      .then((res) => {
        if (isMounted && res) {
          setTeamData(res);
        }
      })
      .catch((err) => console.error('Error fetching team hierarchy:', err))
      .finally(() => {
        if (isMounted) setLoadingTeam(false);
      });

    const unsubCommissions = listenToUserCommissions(user.id, (records) => {
      if (isMounted) {
        setCommissions(records);
      }
    });

    const unsubConfig = listenToAppConfig((cfg) => {
      if (isMounted) {
        setAppConfig(cfg);
      }
    });

    return () => {
      isMounted = false;
      unsubCommissions();
      unsubConfig();
    };
  }, [user.id, user.referralCode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const totalCommissionsEarned = commissions.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalTeamSize = teamData.level1.length + teamData.level2.length + teamData.level3.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Referral Card */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Tier Affiliate Program</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Affiliate Network & Rewards
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                Share your unique link. When your referrals purchase real estate micro-investments, Firestore automatically distributes 3 levels of instant commissions!
              </p>
            </div>

            {/* Quick stats badge */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 text-right">
              <span className="text-xs text-slate-400 block">Total MLM Earnings</span>
              <span className="text-2xl font-black text-amber-400">₱{totalCommissionsEarned.toFixed(2)}</span>
              <span className="text-[11px] text-emerald-400 block font-semibold">{totalTeamSize} Total Partners</span>
            </div>
          </div>

          {/* Referral link box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">
                Your Exclusive Referral Link
              </span>
              <span className="text-amber-400 font-bold">
                Code: <span className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">{user.referralCode}</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono truncate select-all">
                {referralLink}
              </div>
              <button
                onClick={copyToClipboard}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Referral Link</span>
                  </>
                )}
              </button>
            </div>

            {user.referredBy && (
              <div className="text-xs text-slate-400 pt-1">
                Your Upline Sponsor: <span className="text-amber-300 font-medium">{user.referredBy}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-Level Commission Rules Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level 1 */}
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Tier 1
            </span>
            <span className="text-3xl font-black text-amber-400">30%</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Direct Referrals</h3>
            <p className="text-xs text-slate-400">Users who register directly using your referral link</p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Network Count:</span>
            <span className="font-bold text-white">{teamData.level1.length} Members</span>
          </div>
        </div>

        {/* Level 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              Tier 2
            </span>
            <span className="text-3xl font-black text-slate-300">3%</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Secondary Upline</h3>
            <p className="text-xs text-slate-400">Users referred by your Level 1 members</p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Network Count:</span>
            <span className="font-bold text-white">{teamData.level2.length} Members</span>
          </div>
        </div>

        {/* Level 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              Tier 3
            </span>
            <span className="text-3xl font-black text-slate-400">2%</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tertiary Upline</h3>
            <p className="text-xs text-slate-400">Users referred by your Level 2 members</p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Network Count:</span>
            <span className="font-bold text-white">{teamData.level3.length} Members</span>
          </div>
        </div>
      </div>

      {/* Permanent Community Chat & QR Section */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Official Investor Community</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Connect with the Alphaland Team
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-lg leading-relaxed">
                Join our official community channel to receive direct admin announcements, daily payout proofs, leadership guidance, and recruitment strategies for your 3-level affiliate network.
              </p>
            </div>

            {/* Direct Link & Copy */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2 max-w-lg">
              <span className="text-xs text-slate-300 font-mono truncate px-1 select-all">
                {appConfig?.communityChatLink || 'https://t.me/alphaland_official_group'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    appConfig?.communityChatLink || 'https://t.me/alphaland_official_group'
                  );
                  setCopiedCommunity(true);
                  setTimeout(() => setCopiedCommunity(false), 2500);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1 shrink-0"
              >
                {copiedCommunity ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Clickable Join Community Button */}
            <div className="pt-1">
              <a
                href={appConfig?.communityChatLink || 'https://t.me/alphaland_official_group'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Join Official Community Chat</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Scan with Phone
            </span>
            <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-lg border border-emerald-500/20 flex items-center justify-center overflow-hidden">
              <img
                src={appConfig?.communityQrUrl || appConfig?.activeDepositQrUrl || SAMPLE_QR_SVG}
                alt="Community Group QR"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              Direct Group Invite QR
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Team Members vs Commission Logs */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'tiers'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Team Members ({totalTeamSize})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Commission History ({commissions.length})
          </button>
        </div>

        {activeTab === 'tiers' ? (
          <div className="space-y-6">
            {/* Level 1 List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h3 className="font-bold text-white text-sm">Level 1 Direct Referrals (30% Commission)</h3>
                </div>
                <span className="text-xs font-semibold text-amber-400">{teamData.level1.length} users</span>
              </div>

              {teamData.level1.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No direct referrals yet. Share your referral link above to start earning 30% commissions!
                </p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {teamData.level1.map((member) => (
                    <div key={member.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">
                          {member.mobileNumber.slice(0, 4)}***{member.mobileNumber.slice(-3)}
                        </span>
                        <span className="text-slate-500 block">Code: {member.referralCode}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-semibold">Active Member</span>
                        <span className="text-slate-500 block">30% on purchases</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Level 2 & Level 3 Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <h3 className="font-bold text-white text-sm">Level 2 (3% Commission)</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{teamData.level2.length} users</span>
                </div>
                {teamData.level2.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No Level 2 members yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {teamData.level2.map((member) => (
                      <div key={member.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          {member.mobileNumber.slice(0, 4)}***{member.mobileNumber.slice(-3)}
                        </span>
                        <span className="text-slate-400">Code: {member.referralCode}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <h3 className="font-bold text-white text-sm">Level 3 (2% Commission)</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{teamData.level3.length} users</span>
                </div>
                {teamData.level3.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No Level 3 members yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {teamData.level3.map((member) => (
                      <div key={member.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          {member.mobileNumber.slice(0, 4)}***{member.mobileNumber.slice(-3)}
                        </span>
                        <span className="text-slate-400">Code: {member.referralCode}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Commission History */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            {commissions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No commission transactions recorded yet. When team members purchase plans, commissions appear here instantly!
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {commissions.map((comm) => (
                  <div key={comm.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Level {comm.level} ({comm.percentage}%)
                        </span>
                        <span className="font-bold text-white">{comm.planName}</span>
                      </div>
                      <p className="text-slate-500">From referral: {comm.purchaserMobile || 'Downline Member'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-400">+₱{comm.amount.toFixed(2)}</span>
                      <span className="text-slate-500 block">Credited to balance</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

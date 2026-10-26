import React, { useState } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  X,
  Users,
  ShieldCheck,
  Sparkles,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { AppConfigDoc } from '../types';
import { SAMPLE_QR_SVG } from '../services/walletService';

interface CommunityLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  appConfig: AppConfigDoc | null;
}

export const CommunityLoginModal: React.FC<CommunityLoginModalProps> = ({
  isOpen,
  onClose,
  appConfig,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const chatLink = appConfig?.communityChatLink || 'https://t.me/alphaland_official_group';
  const qrImage = appConfig?.communityQrUrl || appConfig?.activeDepositQrUrl || SAMPLE_QR_SVG;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(chatLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Close Button at top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition z-20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="relative z-10 text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Official Investor Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Join the Official Community
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Stay updated with daily payout distributions, official investment announcements, and 24/7 upline leader support.
          </p>
        </div>

        {/* Community QR Code Box */}
        <div className="relative z-10 bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Scan QR Code to Join Group
          </span>
          <div className="w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl shadow-xl border border-amber-500/30 flex items-center justify-center overflow-hidden">
            <img
              src={qrImage}
              alt="Community Chat QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Open your camera or Telegram/WhatsApp to scan directly
          </p>
        </div>

        {/* Direct Link Box with Copy Button */}
        <div className="relative z-10 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
            <span className="text-xs text-slate-300 font-mono truncate select-all">
              {chatLink}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1 shrink-0"
          >
            {copied ? (
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

        {/* Actions: Join Community & Close */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-2.5 pt-1">
          <a
            href={chatLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Join Community Now</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700"
          >
            Proceed to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

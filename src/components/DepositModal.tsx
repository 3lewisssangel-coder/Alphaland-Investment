import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, QrCode, ShieldCheck, Loader2 } from 'lucide-react';
import { UserAccount, AppConfigDoc } from '../types';
import { listenToAppConfig, submitDepositProof } from '../services/walletService';
import { uploadImageToStorage } from '../firebase/storageService';

interface DepositModalProps {
  user: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [config, setConfig] = useState<AppConfigDoc | null>(null);
  const [amount, setAmount] = useState<string>('150');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time listener for activeDepositQrUrl in settings/appConfig
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = listenToAppConfig((newConfig) => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please specify a valid deposit amount.');
      return;
    }
    if (!selectedFile && !previewUrl) {
      setError('Please upload your payment screenshot/receipt as proof.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Upload proof screenshot to Firebase Storage bucket deposit-proofs/
      let proofUrl = '';
      if (selectedFile) {
        proofUrl = await uploadImageToStorage('deposit-proofs', selectedFile);
      } else if (previewUrl) {
        proofUrl = previewUrl;
      }

      // 2. Write document to deposits collection with status 'pending'
      await submitDepositProof(user.id, numAmount, proofUrl, user.mobileNumber);

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const presetAmounts = [150, 300, 600, 1200, 2400];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Deposit Funds</h2>
              <p className="text-xs text-amber-400/80">Manual verification via official QR code</p>
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
            <h3 className="text-xl font-bold text-white">Deposit Proof Submitted!</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Your deposit of <span className="text-amber-400 font-semibold">{amount} credits</span> has been logged to the verification queue. The admin will inspect your screenshot and credit your balance shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Official Deposit QR Section */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Official Alphaland Deposit QR</span>
              </div>

              <div className="w-48 h-48 mx-auto bg-white p-2.5 rounded-xl shadow-lg border border-amber-500/20 flex items-center justify-center overflow-hidden">
                {config?.activeDepositQrUrl ? (
                  <img
                    src={config.activeDepositQrUrl}
                    alt="Deposit QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1" />
                    <span>Loading QR...</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p className="text-slate-200 font-medium">Scan with GCash / Maya / Banking App</p>
                <p className="text-slate-400">Merchant: <span className="text-amber-300">{config?.gcashName || 'ALPHALAND FINANCE CORP'}</span></p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Deposit Amount (Credits)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₱</span>
                <input
                  type="number"
                  min="50"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-9 pr-4 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetAmounts.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                      amount === preset.toString()
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    ₱{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Payment Proof Screenshot
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required={!previewUrl}
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Proof preview"
                      className="max-h-36 mx-auto rounded-lg object-contain border border-slate-700"
                    />
                    <p className="text-xs text-emerald-400 font-medium">
                      ✓ Screenshot selected. Click to replace.
                    </p>
                  </div>
                ) : (
                  <div className="py-2 space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Upload className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Upload receipt screenshot
                      </p>
                      <p className="text-xs text-slate-500">PNG, JPG, or JPEG up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notice */}
            <div className="text-xs text-slate-400 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex items-start space-x-2">
              <span className="text-amber-400 font-bold">Note:</span>
              <span>
                Deposits are manually verified by our team. Balance is updated upon administrator confirmation.
              </span>
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
                disabled={submitting}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading Proof...</span>
                  </>
                ) : (
                  <span>Submit Deposit Proof</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

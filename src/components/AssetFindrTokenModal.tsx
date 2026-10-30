"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  HelpCircle,
  Trash2,
  Save,
  Radio,
} from "lucide-react";
import { assetfindrService } from "../services/assetfindrService";
import { useNotification } from "../context/NotificationContext";

interface AssetFindrTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdated?: () => void;
}

export const AssetFindrTokenModal: React.FC<AssetFindrTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenUpdated,
}) => {
  const { showSuccess, showError } = useNotification();
  const [tokenInput, setTokenInput] = useState<string>("");
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    totalRecords?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = assetfindrService.getStoredToken();
      setTokenInput(stored);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!tokenInput.trim()) {
      showError("Harap masukkan token terlebih dahulu sebelum menguji koneksi.");
      return;
    }

    try {
      setIsTesting(true);
      const res = await assetfindrService.testConnection(tokenInput.trim());
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        totalRecords: res.total_records,
      });

      if (res.success) {
        showSuccess(res.message);
      } else {
        showError(res.message);
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || "Gagal menguji koneksi",
      });
      showError(err.message || "Gagal menguji koneksi");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      assetfindrService.removeStoredToken();
      showSuccess("Token dihapus. Aplikasi beralih ke Mode Simulasi.");
    } else {
      assetfindrService.setStoredToken(tokenInput.trim());
      showSuccess("Token AssetFindr berhasil disimpan!");
    }
    if (onTokenUpdated) onTokenUpdated();
    onClose();
  };

  const handleClearToken = () => {
    assetfindrService.removeStoredToken();
    setTokenInput("");
    setTestResult(null);
    showSuccess("Token AssetFindr telah dibersihkan.");
    if (onTokenUpdated) onTokenUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-[#e95623]">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                Konfigurasi Token AssetFindr
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500 text-white font-bold uppercase tracking-wider">
                  WeighBridge API
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Hubungkan API Weighbridge Tickets langsung ke platform AssetFindr
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Sign-In Link Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Radio size={14} className="text-[#e95623] animate-pulse" />
                Portal AssetFindr Batara
              </span>
              <p className="text-[11px] text-slate-600">
                Masuk ke portal AssetFindr untuk mendapatkan token autentikasi <code>authSession</code>.
              </p>
            </div>
            <a
              href="https://batara.assetfindr.com/#/signin?redirect=/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#e95623] hover:bg-[#d0491d] text-white text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 cursor-pointer"
            >
              <span>Buka Sign In</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Guide Steps */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <HelpCircle size={14} className="text-slate-500" />
              Cara Mendapatkan Token (authSession):
            </h4>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Buka link login di{" "}
                <span className="font-mono text-[11px] text-[#e95623] font-semibold">
                  https://batara.assetfindr.com
                </span>{" "}
                lalu login dengan akun Anda.
              </li>
              <li>
                Tekan tombol <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-mono shadow-2xs">F12</kbd>{" "}
                atau klik kanan lalu pilih <strong>Inspect</strong> untuk membuka Developer Tools.
              </li>
              <li>
                Pilih tab <strong>Application</strong> (Chrome/Edge) atau <strong>Storage</strong> (Firefox).
              </li>
              <li>
                Klik <strong>Local Storage</strong> &rarr; pilih domain <code>batara.assetfindr.com</code>.
              </li>
              <li>
                Cari item bernama <strong>authSession</strong>, lalu salin (*copy*) nilai tokennya.
              </li>
              <li>
                Tempel (*paste*) token tersebut pada kolom di bawah ini dan klik{" "}
                <strong>Uji Koneksi & Simpan</strong>.
              </li>
            </ol>
          </div>

          {/* Input Token Form */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Bearer Token / authSession Key
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="Contoh: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... atau live_xxx"
                className="w-full pl-3.5 pr-20 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title={showToken ? "Sembunyikan Token" : "Tampilkan Token"}
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Token ini disimpan secara aman di browser lokal Anda (LocalStorage) dan dikirim ke server via header terenkripsi.
            </p>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <p className="font-extrabold">{testResult.message}</p>
                {testResult.totalRecords !== undefined && (
                  <p className="text-[11px] font-medium opacity-80">
                    Total tiket terdeteksi di server:{" "}
                    <strong>{testResult.totalRecords.toLocaleString("id-ID")} tiket</strong>.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClearToken}
            disabled={!tokenInput}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Hapus Token</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !tokenInput.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {isTesting ? (
                <RefreshCw size={14} className="animate-spin text-[#e95623]" />
              ) : (
                <ShieldCheck size={14} className="text-emerald-600" />
              )}
              <span>{isTesting ? "Menguji..." : "Uji Koneksi"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToken}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d0491d] text-white transition-all shadow-xs hover:shadow cursor-pointer"
            >
              <Save size={14} />
              <span>Simpan Token</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

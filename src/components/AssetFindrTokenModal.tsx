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
  Lock,
  Mail,
  LogIn,
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
  const [activeTab, setActiveTab] = useState<"login" | "manual">("login");
  
  // Login credentials
  const [email, setEmail] = useState<string>("dzaky.athariqf@bataramining.com");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Manual Token
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

  const handleAutoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showError("Harap masukkan email dan kata sandi.");
      return;
    }

    try {
      setIsLoggingIn(true);
      setTestResult(null);
      const res = await assetfindrService.login(email.trim(), password, "batara");
      if (res.success && res.token) {
        setTokenInput(res.token);
        // Test connection immediately with newly acquired token
        const conn = await assetfindrService.testConnection(res.token);
        setTestResult({
          tested: true,
          success: conn.success,
          message: `Login berhasil! ${conn.message}`,
          totalRecords: conn.total_records,
        });
        showSuccess("Berhasil terhubung ke AssetFindr Batara!");
        if (onTokenUpdated) onTokenUpdated();
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: res.error || res.message || "Gagal masuk ke AssetFindr",
        });
        showError(res.error || res.message || "Gagal masuk ke AssetFindr");
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || "Kesalahan jaringan saat login",
      });
      showError(err.message || "Kesalahan jaringan saat login");
    } finally {
      setIsLoggingIn(false);
    }
  };

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
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-[#e95623]">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                Otentikasi AssetFindr
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500 text-white font-bold uppercase tracking-wider">
                  WeighBridge API
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Hubungkan API Weighbridge Tickets langsung ke platform AssetFindr Batara
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "login"
                ? "border-[#e95623] text-[#e95623]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn size={14} />
            <span>Login Akun Batara (Rekomendasi)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "manual"
                ? "border-[#e95623] text-[#e95623]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Key size={14} />
            <span>Input Token Manual</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === "login" ? (
            /* Auto Login Tab */
            <form onSubmit={handleAutoLogin} className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Radio size={14} className="text-[#e95623] animate-pulse" />
                    Otentikasi Akun Resmi AssetFindr
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Sistem akan melakukan login via Firebase + AssetFindr API dan memperbarui token secara otomatis.
                  </p>
                </div>
                <a
                  href="https://batara.assetfindr.com/#/signin?redirect=/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-orange-200 hover:bg-orange-100 text-[#e95623] text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer"
                >
                  <span>Portal Web</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email Akun AssetFindr</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dzaky.athariqf@bataramining.com"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Kata Sandi (Password)</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d0491d] text-white transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <LogIn size={14} />
                  )}
                  <span>{isLoggingIn ? "Sedang Mengautentikasi..." : "Masuk & Hubungkan Data Langsung"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Manual Token Tab */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <HelpCircle size={14} className="text-slate-500" />
                  Cara Salin Token Manual:
                </h4>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>
                    Buka dan login di <code>batara.assetfindr.com</code>.
                  </li>
                  <li>Buka DevTools (<kbd className="px-1 border rounded text-[10px]">F12</kbd>) &rarr; Application &rarr; Local Storage.</li>
                  <li>Salin nilai token JWT atau authSession, lalu tempel di bawah ini.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Bearer Token / JWT Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="Contoh: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-3.5 pr-20 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
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
              </div>
            </div>
          )}

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
              <span>Simpan & Tutup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

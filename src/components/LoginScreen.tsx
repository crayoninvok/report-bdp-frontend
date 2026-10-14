"use client";

import React, { useState } from "react";
import { User } from "../types/auth";
import { authService } from "../services/authService";
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  MapPin,
} from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Silakan masukkan email dan password");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || "Login gagal. Periksa kembali email dan password Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-linear-to-br from-slate-50 via-batara-orange-50/60 to-slate-100">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-8 backdrop-blur-xs">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="h-20 w-20 rounded-2xl bg-white p-2 border border-slate-200/90 shadow-md shadow-slate-200/50">
                <img
                  src="/coa-logo-bdp.png"
                  alt="Cost Analytics PT Batara Dharma Persada"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              COST ANALYTICS
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#e95623] mt-0.5">
              PT BATARA DHARMA PERSADA
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Sistem Pelaporan & Manajemen Biaya Operasional Tambang
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={17} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@bataramining.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#e95623] transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#e95623] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-[#e95623] focus:ring-[#e95623]"
                />
                <span className="text-xs text-slate-600">Ingat perangkat ini</span>
              </label>
              <span className="text-xs text-[#e95623] hover:text-[#d44415] font-medium cursor-pointer">
                Lupa sandi?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44415] hover:from-[#d44415] hover:to-[#b3340d] text-white font-bold py-3 text-sm shadow-md shadow-[#e95623]/25 focus:outline-none focus:ring-3 focus:ring-[#e95623]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Pilih Cepat Akun Demo (1-Klik)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("priyanto@bataramining.com", "mp@batara2026")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200/90 hover:border-emerald-300 bg-slate-50/70 hover:bg-emerald-50/40 text-left transition-all group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800 truncate">
                    PM Muara Pahu 01
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">priyanto@bataramining.com</div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-700 border border-emerald-200/60">
                  Site Muara Pahu
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("a.oktayudhaperkasa@bataramining.com", "sny@batara2026")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200/90 hover:border-amber-300 bg-slate-50/70 hover:bg-amber-50/40 text-left transition-all group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-800 truncate">
                    PM Senyiur 01
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">a.oktayudhaperkasa@bataramining.com</div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-700 border border-amber-200/60">
                  Site Senyiur
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("dzaky.athariqf@bataramining.com", "@Rosdian12")}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200/90 hover:border-orange-300 bg-slate-50/70 hover:bg-batara-orange-50 text-left transition-all group cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-[#e95623] truncate">
                    HO Admin 01 (Super Admin)
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">dzaky.athariqf@bataramining.com</div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-batara-orange-50 text-[#e95623] border border-batara-orange-200">
                  Super Admin (HO)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-xs text-slate-400">
          © 2026 PT Batara Dharma Persada. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  );
};

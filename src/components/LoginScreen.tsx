"use client";

import React, { useState } from "react";
import { User } from "../types/auth";
import { authService } from "../services/authService";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeHero, setActiveHero] = useState<"pit" | "boardroom">("pit");
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      const msg = "Silakan masukkan email dan password";
      setErrorMessage(msg);
      showError(msg, "Login Diperlukan");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await authService.login(email, password);
      showSuccess(`Selamat datang, ${user.name}! Berhasil masuk ke sistem.`, "Login Berhasil");
      onLoginSuccess(user);
    } catch (err: any) {
      const msg = err.message || "Login gagal. Periksa kembali email dan password Anda.";
      setErrorMessage(msg);
      showError(msg, "Login Gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-800 antialiased selection:bg-[#e95623]/20 selection:text-[#e95623]">
      {/* ========================================================
          LEFT / HERO SECTION (Cinematic Mining Imagery)
          ======================================================== */}
      <div className="relative w-full lg:w-[58%] xl:w-[62%] h-72 sm:h-96 lg:h-auto min-h-75 overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Background Image with Smooth Crossfade */}
        <div className="absolute inset-0">
          <img
            src={activeHero === "pit" ? "/mining-hero.jpg" : "/mining-presentation.jpg"}
            alt="PT Batara Dharma Persada Mining Operations"
            className="w-full h-full object-cover object-center transition-all duration-700 ease-out transform scale-100 hover:scale-105"
          />
          {/* Cinematic Vignette & Ambient Gradient Overlays */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-slate-950/20 lg:bg-linear-to-r lg:from-slate-950/30 lg:via-transparent lg:to-slate-950" />
          <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-slate-950/80 pointer-events-none" />
        </div>

        {/* Top Badges / Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Operational Cost System
            </span>
          </div>

          {/* Quick Perspective Switcher */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setActiveHero("pit")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                activeHero === "pit"
                  ? "bg-[#e95623] text-white shadow-sm"
                  : "hover:text-white text-slate-400"
              }`}
            >
              Site Mine
            </button>
            <button
              type="button"
              onClick={() => setActiveHero("boardroom")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                activeHero === "boardroom"
                  ? "bg-[#e95623] text-white shadow-sm"
                  : "hover:text-white text-slate-400"
              }`}
            >
              Operations Review
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT / FORM SECTION (Clean, Premium, High-Focus Login)
          ======================================================== */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-white lg:min-h-screen">
        <div className="w-full max-w-md">
          {/* Company Branding & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-20 w-20 rounded-2xl bg-white p-2.5 border border-slate-200/90 shadow-lg shadow-slate-200/50">
                <img
                  src="/coa-logo-bdp.png"
                  alt="Cost Analytics PT Batara Dharma Persada"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              COST ANALYTICS
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#e95623] mt-1 tracking-wide">
              PT BATARA DHARMA PERSADA
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Sistem Pelaporan & Manajemen Biaya Operasional Tambang
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Clean Login Form (No Demo Clutter) */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@bataramining.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-[#e95623] focus:ring-[#e95623] cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">Ingat perangkat ini</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setErrorMessage(
                    "Silakan hubungi Super Admin Head Office untuk pengaturan ulang kata sandi."
                  )
                }
                className="text-xs text-[#e95623] hover:text-[#d44415] font-semibold cursor-pointer transition-colors"
              >
                Lupa sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44415] hover:from-[#d44415] hover:to-[#b3340d] text-white font-bold py-3.5 text-sm shadow-lg shadow-[#e95623]/25 hover:shadow-[#e95623]/40 focus:outline-none focus:ring-3 focus:ring-[#e95623]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi akun...</span>
                </div>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note & Copyright */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © 2026 PT Batara Dharma Persada. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

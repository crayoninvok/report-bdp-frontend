"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
  LogOut,
  Loader2,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  icon?: "logout" | "alert" | "question";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
  confirm: (options: ConfirmDialogOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, title: string = "Berhasil", duration?: number) => {
      showToast(message, "success", title, duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title: string = "Perhatian", duration?: number) => {
      showToast(message, "error", title, duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title: string = "Peringatan", duration?: number) => {
      showToast(message, "warning", title, duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title: string = "Informasi", duration?: number) => {
      showToast(message, "info", title, duration);
    },
    [showToast]
  );

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    try {
      setIsConfirmLoading(true);
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (error) {
      console.error("Confirmation action error:", error);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleCancelAction = () => {
    if (confirmDialog?.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        confirm,
      }}
    >
      {children}

      {/* ========================================================
          TOAST NOTIFICATIONS STACK (Fixed Top Right)
          ======================================================== */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                isSuccess
                  ? "bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10"
                  : isError
                  ? "bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10"
                  : isWarning
                  ? "bg-white/95 border-amber-200 text-slate-800 shadow-amber-500/10"
                  : "bg-white/95 border-blue-200 text-slate-800 shadow-blue-500/10"
              }`}
              role="alert"
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                )}
                {isError && (
                  <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle size={18} />
                  </div>
                )}
                {isWarning && (
                  <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle size={18} />
                  </div>
                )}
                {!isSuccess && !isError && !isWarning && (
                  <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Info size={18} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
                      isSuccess
                        ? "text-emerald-700"
                        : isError
                        ? "text-rose-700"
                        : isWarning
                        ? "text-amber-700"
                        : "text-blue-700"
                    }`}
                  >
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          GLOBAL CONFIRMATION DIALOG MODAL
          ======================================================== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Top Decorative accent */}
            <div
              className={`absolute top-0 inset-x-0 h-1.5 ${
                confirmDialog.type === "danger"
                  ? "bg-rose-500"
                  : confirmDialog.type === "warning"
                  ? "bg-amber-500"
                  : "bg-[#e95623]"
              }`}
            />

            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.type === "danger"
                    ? "bg-rose-100 text-rose-600"
                    : confirmDialog.type === "warning"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-orange-100 text-[#e95623]"
                }`}
              >
                {confirmDialog.icon === "logout" ? (
                  <LogOut size={22} />
                ) : confirmDialog.type === "danger" ? (
                  <AlertTriangle size={22} />
                ) : confirmDialog.type === "warning" ? (
                  <AlertTriangle size={22} />
                ) : (
                  <HelpCircle size={22} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={handleCancelAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {confirmDialog.cancelText || "Batal"}
              </button>

              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={handleConfirmAction}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                  confirmDialog.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                    : confirmDialog.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/25"
                    : "bg-linear-to-r from-[#e95623] to-[#d44415] hover:from-[#d44415] hover:to-[#b3340d] shadow-[#e95623]/25"
                }`}
              >
                {isConfirmLoading && <Loader2 size={14} className="animate-spin" />}
                <span>{confirmDialog.confirmText || "Konfirmasi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

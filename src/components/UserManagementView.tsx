"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, JobSite, UserRole } from "../types/auth";
import { userService } from "../services/userService";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  User as UserIcon,
} from "lucide-react";

interface UserManagementViewProps {
  user: User;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ user: currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    jobSite: "MuaraPahu" as JobSite,
    role: "User" as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat daftar pengguna");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = filterSite === "ALL" || u.jobSite === filterSite;
      return matchesSearch && matchesSite;
    });
  }, [users, searchQuery, filterSite]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      ho: users.filter((u) => u.jobSite === "HeadOffice").length,
      mp: users.filter((u) => u.jobSite === "MuaraPahu").length,
      sny: users.filter((u) => u.jobSite === "Senyiur").length,
    };
  }, [users]);

  // Open Form Modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      jobSite: "MuaraPahu",
      role: "User",
    });
    setFormError(null);
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setFormData({
      name: targetUser.name,
      email: targetUser.email,
      password: "", // Leave blank if not changing
      jobSite: targetUser.jobSite,
      role: targetUser.role,
    });
    setFormError(null);
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Nama dan email wajib diisi");
      return;
    }

    if (!editingUser && !formData.password) {
      setFormError("Password wajib diisi untuk pengguna baru");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          jobSite: formData.jobSite,
          role: formData.jobSite === "HeadOffice" ? "SuperAdmin" : formData.role,
        });
        setSuccessMsg(`Data pengguna ${formData.name} berhasil diperbarui.`);
      } else {
        await userService.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          jobSite: formData.jobSite,
          role: formData.jobSite === "HeadOffice" ? "SuperAdmin" : formData.role,
        });
        setSuccessMsg(`Pengguna baru ${formData.name} berhasil ditambahkan.`);
      }

      setIsFormModalOpen(false);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data pengguna");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (targetUser: User) => {
    setUserToDelete(targetUser);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDelete.id);
      setSuccessMsg(`Pengguna ${userToDelete.name} berhasil dihapus.`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus pengguna");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold mb-3">
            <ShieldCheck size={14} className="text-purple-600" />
            <span>Super Admin Security Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Daftarkan akun pengguna baru, atur lokasi jobsite kerja, serta kelola hak akses operasional.
            Akun yang didaftarkan ke <span className="font-bold text-blue-700">Head Office</span> secara otomatis memperoleh otoritas <span className="font-bold text-purple-700">Super Admin</span>.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d44415] text-white font-bold text-xs shadow-md shadow-[#e95623]/25 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-semibold animate-in fade-in">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Users size={16} className="text-blue-600" />
            <span>Total Pengguna</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Akun terdaftar di sistem</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Building2 size={16} className="text-blue-600" />
            <span>Head Office (Super Admin)</span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">{stats.ho}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Akses penuh kedua site</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Building2 size={16} className="text-emerald-600" />
            <span>PIC Site Muara Pahu</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.mp}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Isolasi khusus Muara Pahu</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Building2 size={16} className="text-amber-600" />
            <span>PIC Site Senyiur</span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.sny}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">Isolasi khusus Senyiur</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] w-48 sm:w-64"
              />
            </div>

            {/* Site Filter Pills */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setFilterSite("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterSite === "ALL"
                    ? "bg-batara-orange-50 text-[#e95623] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Site
              </button>
              <button
                onClick={() => setFilterSite("HeadOffice")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterSite === "HeadOffice"
                    ? "bg-batara-orange-50 text-[#e95623] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Head Office
              </button>
              <button
                onClick={() => setFilterSite("MuaraPahu")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterSite === "MuaraPahu"
                    ? "bg-emerald-50 text-emerald-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Muara Pahu
              </button>
              <button
                onClick={() => setFilterSite("Senyiur")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterSite === "Senyiur"
                    ? "bg-amber-50 text-amber-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Senyiur
              </button>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors self-end sm:self-auto cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Lokasi Job Site</th>
                <th className="py-3.5 px-4">Role Sistem</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Wewenang Operasional</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAuthUser = currentUser.id === u.id;
                  const isHo = u.jobSite === "HeadOffice";
                  const isMp = u.jobSite === "MuaraPahu";
                  const isSny = u.jobSite === "Senyiur";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <span>{u.name}</span>
                              {isCurrentAuthUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-700 font-semibold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isHo
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : isMp
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <Building2 size={13} />
                          <span>
                            {isHo
                              ? "Head Office"
                              : isMp
                              ? "Site Muara Pahu"
                              : "Site Senyiur"}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            u.role === "SuperAdmin"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <ShieldCheck size={13} className={u.role === "SuperAdmin" ? "text-purple-600" : "text-slate-400"} />
                          <span>{u.role === "SuperAdmin" ? "Super Admin" : "User Standard"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="text-[11px] text-slate-600">
                          {isHo
                            ? "Akses Penuh (Kedua Site, Input Budget & Realisasi, Hapus Laporan, Kelola User)"
                            : isMp
                            ? "Input Budget & Realisasi Khusus Site Muara Pahu"
                            : "Input Budget & Realisasi Khusus Site Senyiur"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(u)}
                            disabled={isCurrentAuthUser}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrentAuthUser
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            }`}
                            title={isCurrentAuthUser ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus Pengguna"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit User */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                  {editingUser ? <Edit2 size={16} className="text-blue-400" /> : <UserPlus size={16} className="text-blue-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingUser ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {editingUser ? editingUser.email : "Pendaftaran akun portal Batara"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Error Alert */}
            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email (Login)
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama@bataramining.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? "Password Baru (Opsional)" : "Password Akun"}
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={editingUser ? "Kosongkan jika tidak ingin ganti password" : "Minimal 6 karakter"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi Penugasan (Job Site)
                </label>
                <select
                  value={formData.jobSite}
                  onChange={(e) => {
                    const nextSite = e.target.value as JobSite;
                    setFormData({
                      ...formData,
                      jobSite: nextSite,
                      role: nextSite === "HeadOffice" ? "SuperAdmin" : formData.role,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="HeadOffice">Head Office (Super Admin)</option>
                  <option value="MuaraPahu">Site Muara Pahu (Site User)</option>
                  <option value="Senyiur">Site Senyiur (Site User)</option>
                </select>
              </div>

              {/* Dynamic Notification on Head Office */}
              {formData.jobSite === "HeadOffice" ? (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] flex items-start gap-2">
                  <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Otoritas Head Office:</strong> Pengguna ini secara otomatis memiliki peran <strong>Super Admin</strong> dengan hak akses penuh ke seluruh site, mengelola data budget & realisasi, menghapus laporan, dan mengelola user.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Akun Site
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="User">User Standard (PIC Site)</option>
                    <option value="SuperAdmin">Super Admin Site (Otoritas Khusus)</option>
                  </select>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#e95623] hover:bg-[#d44415] text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Hapus Pengguna
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pengguna{" "}
              <strong className="text-slate-800">{userToDelete.name}</strong> ({userToDelete.email})?
              Pengguna ini tidak akan bisa login lagi ke sistem.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Pengguna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

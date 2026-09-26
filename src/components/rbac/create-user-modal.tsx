'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createUserAction, updateUserAction } from '@/app/actions/rbac-actions';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { UserPlus, Upload, ShieldCheck, Edit2 } from 'lucide-react';

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolesList: Array<{ id: string; name: string }>;
  userToEdit?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    role: { id: string; name: string };
    avatarUrl?: string | null;
  } | null;
}

export function CreateUserModal({ open, onOpenChange, rolesList, userToEdit }: UserModalProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [roleId, setRoleId] = React.useState(rolesList[0]?.id || 'role-sales');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPassword(''); // keep blank unless resetting
      setPhone(userToEdit.phone || '');
      setAddress(userToEdit.address || '');
      setRoleId(userToEdit.role.id);
      setAvatarUrl(userToEdit.avatarUrl || '');
      setErrorMessage(null);
    } else if (open) {
      setName('');
      setEmail('');
      setPassword('password123');
      setPhone('+62');
      setAddress('');
      setRoleId(rolesList.find(r => r.name.toLowerCase().includes('sales'))?.id || rolesList[0]?.id || '');
      setAvatarUrl('');
      setErrorMessage(null);
    }
  }, [open, userToEdit, rolesList]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'users');
      setAvatarUrl(res.url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !roleId) {
      setErrorMessage('Harap lengkapi semua kolom wajib.');
      return;
    }

    if (!userToEdit && !password) {
      setErrorMessage('Password wajib diisi untuk user baru.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (userToEdit) {
        const res = await updateUserAction(userToEdit.id, {
          name,
          email,
          password: password.trim() !== '' ? password : undefined,
          phone,
          address,
          roleId,
          avatarUrl,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else {
          onOpenChange(false);
        }
      } else {
        const res = await createUserAction({
          name,
          email,
          password,
          phone,
          address,
          roleId,
          avatarUrl,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else {
          onOpenChange(false);
        }
      }
    } catch (err) {
      setErrorMessage('Gagal menyimpan user. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={userToEdit ? `Edit User: ${userToEdit.name}` : "Tambah User Baru"}
      description={userToEdit ? "Perbarui profil, role, atau ganti password user." : "Buat akun Sales Representative, Admin, atau Warehouse Manager."}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Budi Santoso"
            required
          />
          <Input
            label="Email Login"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="budi@salescorp.com"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={userToEdit ? "Ganti Password (Opsional)" : "Password Akun"}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={userToEdit ? "Kosongkan jika tidak diganti" : "Minimal 6 karakter"}
            required={!userToEdit}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Role & Akses
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
            >
              {rolesList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="No. WhatsApp / HP"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+628123456789"
          />
          <Input
            label="Alamat Domisili"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Jakarta Barat"
          />
        </div>

        {/* Photo upload */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Foto Profil (Cloudinary)
          </label>
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-slate-50 font-bold text-xs">
                IMG
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
              className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Menyimpan...' : userToEdit ? 'Simpan Perubahan' : 'Buat User Baru'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

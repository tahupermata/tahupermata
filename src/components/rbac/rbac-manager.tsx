'use client';

import * as React from 'react';
import { updateRolePermissionsAction, updateUserRoleAction } from '@/app/actions/rbac-actions';
import { CreateUserModal } from './create-user-modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ShieldCheck,
  Users,
  Check,
  Lock,
  Sparkles,
  UserCheck,
  Edit2,
  Trash2,
  Search,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

const ALL_SYSTEM_PERMISSIONS = [
  { key: 'stock:view', label: 'View Stock & Catalog', group: 'Stock & Inventory' },
  { key: 'stock:manage', label: 'Manage Products & EAV Fields', group: 'Stock & Inventory' },
  { key: 'stock:assign', label: 'Assign & Dispatch Stock', group: 'Stock & Inventory' },
  { key: 'stores:view', label: 'View Store List', group: 'Stores & Toko' },
  { key: 'stores:manage', label: 'Manage Stores & Targets', group: 'Stores & Toko' },
  { key: 'sales:field', label: 'Access Field Sales Portal', group: 'Sales Operations' },
  { key: 'monitor:view', label: 'View Real-time Live Monitor', group: 'Admin Monitoring' },
  { key: 'reports:view', label: 'View Analytics & Export Reports', group: 'Reports' },
  { key: 'rbac:manage', label: 'Manage RBAC & User Roles', group: 'Security & Admin' },
];

interface RbacManagerProps {
  rolesList: Array<{
    id: string;
    name: string;
    description?: string | null;
    permissions: string[];
    usersCount?: number;
  }>;
  usersList: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    joinDate?: string | null;
    avatarUrl?: string | null;
    status: string;
    role: {
      id: string;
      name: string;
    };
  }>;
}

export function RbacManager({ rolesList, usersList }: RbacManagerProps) {
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>(rolesList[0]?.id || '');
  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<any | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState('ALL');
  const [rolePermissionsState, setRolePermissionsState] = React.useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    rolesList.forEach((r) => {
      initial[r.id] = r.permissions;
    });
    return initial;
  });
  const [savingRoleId, setSavingRoleId] = React.useState<string | null>(null);

  const selectedRole = rolesList.find((r) => r.id === selectedRoleId);
  const currentRolePerms = rolePermissionsState[selectedRoleId] || [];

  const handleTogglePermission = (permKey: string) => {
    const updated = currentRolePerms.includes(permKey)
      ? currentRolePerms.filter((k) => k !== permKey)
      : [...currentRolePerms, permKey];

    setRolePermissionsState({
      ...rolePermissionsState,
      [selectedRoleId]: updated,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingRoleId(selectedRoleId);
    try {
      await updateRolePermissionsAction(selectedRoleId, currentRolePerms);
      alert(`Permissions updated successfully for ${selectedRole?.name}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save permissions');
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleChangeUserRole = async (userId: string, newRoleId: string) => {
    try {
      await updateUserRoleAction(userId, newRoleId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateUser = () => {
    setUserToEdit(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setUserToEdit(user);
    setIsUserModalOpen(true);
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.address && u.address.toLowerCase().includes(q));

    const matchesRole = selectedRoleFilter === 'ALL' || u.role?.id === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Master User & Hak Akses (RBAC)</span>
          </h2>
          <p className="text-sm text-slate-500">
            Kelola data akun karyawan (Sales, Admin, Gudang) dan konfigurasi hak akses menu sistem.
          </p>
        </div>

        <Button
          onClick={handleOpenCreateUser}
          className="gap-2 text-xs font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer self-start sm:self-auto py-2.5 px-4 rounded-xl"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah User Baru</span>
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="users" className="gap-2 rounded-lg font-bold text-xs">
            <Users className="w-4 h-4" />
            <span>Daftar User & Karyawan ({usersList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 rounded-lg font-bold text-xs">
            <Lock className="w-4 h-4" />
            <span>Matriks Hak Akses / Role Permissions</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: User Directory (Default) */}
        <TabsContent value="users" className="space-y-4 pt-2">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama karyawan, email, nomor HP..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800"
              >
                <option value="ALL">Semua Role</option>
                {rolesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                    <tr>
                      <th className="py-3.5 px-4">Nama & Akun</th>
                      <th className="py-3.5 px-4">Kontak & WhatsApp</th>
                      <th className="py-3.5 px-4">Alamat Domisili</th>
                      <th className="py-3.5 px-4">Tanggal Masuk</th>
                      <th className="py-3.5 px-4">Hak Akses / Role</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Tidak ada user yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-700 shadow-2xs">
                                {u.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{u.name}</h4>
                                <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {u.phone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                {u.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {u.address || <span className="text-slate-400 italic">-</span>}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono">
                            {u.joinDate || <span className="text-slate-400 italic">-</span>}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={u.role.id}
                              onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-indigo-700 focus:bg-white cursor-pointer transition-colors"
                            >
                              {rolesList.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Profil & Password"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {u.email !== 'tahupermata@proton.me' && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Apakah Anda yakin ingin menghapus user "${u.name}"?`)) {
                                      const { deleteUserAction } = await import('@/app/actions/rbac-actions');
                                      await deleteUserAction(u.id);
                                    }
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Permissions Matrix */}
        <TabsContent value="permissions" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Roles Selection List */}
            <div className="lg:col-span-4 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pilih Role Sistem
              </span>
              {rolesList.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm">{r.name}</h4>
                      <p
                        className={`text-xs mt-0.5 line-clamp-1 ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {r.description || 'Custom role'}
                      </p>
                    </div>
                    <Badge
                      variant={isSelected ? 'secondary' : 'purple'}
                      className={isSelected ? 'bg-indigo-700 text-white' : ''}
                    >
                      {(rolePermissionsState[r.id] || []).length} perms
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Permissions Toggles for Selected Role */}
            <div className="lg:col-span-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <CardTitle className="text-base">
                      Konfigurasi Izin: {selectedRole?.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Centang izin akses menu dan aksi operasional yang diperbolehkan
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={savingRoleId === selectedRoleId}
                    className="shadow-xs font-bold"
                  >
                    {savingRoleId === selectedRoleId ? 'Menyimpan...' : 'Simpan Hak Akses'}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ALL_SYSTEM_PERMISSIONS.map((perm) => {
                      const isGranted = currentRolePerms.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                            isGranted
                              ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isGranted
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {isGranted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{perm.label}</span>
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              {perm.key}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit User Modal */}
      <CreateUserModal
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        rolesList={rolesList}
        userToEdit={userToEdit}
      />
    </div>
  );
}

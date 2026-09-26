'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { switchUserAction } from '@/app/actions/auth-actions';
import { UserCheck, ShieldCheck, Truck, Users } from 'lucide-react';

interface UserSwitcherProps {
  currentUserId: string;
}

const DEMO_USERS = [
  {
    id: 'user-master-tahupermata',
    name: 'Master Tahu Permata',
    role: 'Superadmin / Master',
    icon: ShieldCheck,
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'user-admin-1',
    name: 'Alex Tanuwijaya',
    role: 'Superadmin / Master',
    icon: ShieldCheck,
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'user-sales-1',
    name: 'Budi Santoso',
    role: 'Sales Rep (Field)',
    icon: UserCheck,
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'user-sales-2',
    name: 'Siti Rahmawati',
    role: 'Sales Rep 2',
    icon: Users,
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'user-wh-1',
    name: 'Joko Widodo WH',
    role: 'Warehouse Manager',
    icon: Truck,
    badgeColor: 'bg-amber-100 text-amber-700',
  },
];

export function UserSwitcher({ currentUserId }: UserSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleSwitch = (userId: string) => {
    startTransition(async () => {
      await switchUserAction(userId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500 hidden md:inline">Role Simulation:</span>
      <select
        value={currentUserId}
        disabled={isPending}
        onChange={(e) => handleSwitch(e.target.value)}
        className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        {DEMO_USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Truck,
  Store,
  Smartphone,
  Activity,
  BarChart3,
  ShieldCheck,
  Building2,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth-actions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Stock Inventory',
    href: '/stock',
    icon: Package,
    permission: 'stock:view',
  },
  {
    name: 'Assign Stock',
    href: '/assign-stock',
    icon: Truck,
    permission: 'stock:assign',
  },
  {
    name: 'Stores & Targets',
    href: '/stores',
    icon: Store,
    permission: 'stores:view',
  },
  {
    name: 'Sales Rep (Field)',
    href: '/sales',
    icon: Smartphone,
    permission: 'sales:field',
    badge: 'Mobile App',
  },
  {
    name: 'Monitor Sales Live',
    href: '/monitor-sales',
    icon: Activity,
    permission: 'monitor:view',
    badge: 'Real-time',
  },
  {
    name: 'Reports & Analytics',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports:view',
  },
  {
    name: 'Master User & RBAC',
    href: '/users',
    icon: ShieldCheck,
    permission: 'rbac:manage',
  },
  {
    name: 'Profil Perusahaan',
    href: '/settings',
    icon: Building2,
    permission: 'rbac:manage',
  },
];

interface SidebarProps {
  userPermissions: string[];
  userRoleName: string;
  userName: string;
  userAvatar?: string | null;
}

export function Sidebar({ userPermissions, userRoleName, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();

  const isSuperadmin = userRoleName.toLowerCase().includes('superadmin') || userRoleName.toLowerCase().includes('master') || userPermissions.includes('*');
  const filteredNav = NAVIGATION_ITEMS.filter((item) => {
    if (!item.permission || isSuperadmin) return true;
    return userPermissions.includes(item.permission);
  });

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-slate-100 h-screen max-h-screen sticky top-0 border-r border-slate-800 shrink-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30 text-lg tracking-wider">
          S
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            SalesPro <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Edge</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Turso + Drizzle Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge ? (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                  isActive ? 'bg-indigo-700/80 text-white' : 'bg-indigo-500/20 text-indigo-300'
                )}>
                  {item.badge}
                </span>
              ) : (
                <ChevronRight className={cn('w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity', isActive && 'opacity-100 text-indigo-200')} />
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile Card Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0 overflow-hidden">
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-100 truncate">{userName}</p>
              <p className="text-[10px] text-indigo-400 font-medium truncate">{userRoleName}</p>
            </div>
          </div>
          <form action={async () => { await logoutAction(); }}>
            <button
              type="submit"
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

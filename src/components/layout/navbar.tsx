'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bell,
  Sparkles,
  Smartphone,
  Menu,
  X,
  ShieldCheck,
  LayoutDashboard,
  Package,
  Truck,
  Store,
  Activity,
  BarChart3,
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

interface NavbarProps {
  currentUserId: string;
  userName: string;
  userRoleName: string;
  userPermissions: string[];
}

export function Navbar({ currentUserId, userName, userRoleName, userPermissions }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const isSuperadmin = userRoleName.toLowerCase().includes('superadmin') || userRoleName.toLowerCase().includes('master') || userPermissions.includes('*');
  const filteredNav = NAVIGATION_ITEMS.filter((item) => {
    if (!item.permission || isSuperadmin) return true;
    return userPermissions.includes(item.permission);
  });

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-md">
        {/* Mobile Brand / Toggle */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka Menu Navigasi"
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-black text-slate-900 flex items-center gap-1.5 tracking-tight">
            SalesPro
          </span>
        </div>

        {/* Desktop Title & Status Indicator */}
        <div className="hidden lg:flex items-center gap-3">
          <Badge variant="purple" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Turso Cloud Edge DB</span>
          </Badge>
          <span className="text-xs text-slate-400">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Logged in as: <strong className="text-slate-900">{userName}</strong> ({userRoleName})
            </span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick link to mobile field dashboard */}
          <Link
            href="/sales"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Field Mode</span>
          </Link>

          {/* Quick Link to Assign Stock */}
          <Link
            href="/assign-stock"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden xs:inline sm:inline">Assign Stock</span>
          </Link>

          {/* Notifications Icon */}
          <button
            type="button"
            title="Notifications"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
          </button>

          {/* Desktop Quick Logout Button */}
          <form action={async () => { await logoutAction(); }} className="hidden sm:block">
            <button
              type="submit"
              title="Keluar / Logout"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER / SLIDE-OVER NAVIGATION MENU                                */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-over Drawer Card */}
          <div className="relative z-10 w-4/5 max-w-xs bg-slate-900 text-slate-100 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 border-r border-slate-800">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-md text-sm">
                  S
                </div>
                <div>
                  <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
                    SalesPro <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Edge</span>
                  </h1>
                  <p className="text-[10px] text-slate-400">Menu Navigasi</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items List */}
            <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu Utama
              </div>

              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400'
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge ? (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                        isActive ? 'bg-indigo-700 text-white' : 'bg-indigo-500/20 text-indigo-300'
                      )}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-600')} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Profile & Logout Drawer Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                    {userName.charAt(0).toUpperCase()}
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
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

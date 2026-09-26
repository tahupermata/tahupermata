'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Smartphone, Package, Truck, Store, Activity, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  userPermissions?: string[];
}

export function MobileNav({ userPermissions = [] }: MobileNavProps) {
  const pathname = usePathname();

  const links = [
    { name: 'Sales', href: '/sales', icon: Smartphone, permission: 'sales:field' },
    { name: 'Stock', href: '/stock', icon: Package, permission: 'stock:view' },
    { name: 'Dispatch', href: '/assign-stock', icon: Truck, permission: 'stock:assign' },
    { name: 'Toko', href: '/stores', icon: Store, permission: 'stores:view' },
    { name: 'Monitor', href: '/monitor-sales', icon: Activity, permission: 'monitor:view' },
    { name: 'Report', href: '/reports', icon: BarChart3, permission: 'reports:view' },
  ];

  const filteredLinks = links.filter((link) => {
    if (!link.permission || userPermissions.includes('*')) return true;
    return userPermissions.includes(link.permission);
  });

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 px-1 py-1 backdrop-blur-md">
      <nav className="flex items-center justify-around">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-semibold transition-all',
                isActive
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5 mb-0.5', isActive ? 'text-indigo-600 stroke-[2.5]' : 'text-slate-400')} />
              <span className="truncate max-w-[52px]">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

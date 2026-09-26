import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tLayoutStart = performance.now();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const tLayoutEnd = performance.now();
  console.log(`[PERF Layout] ⏱️ DashboardLayout auth checked in ${(tLayoutEnd - tLayoutStart).toFixed(1)}ms for ${user.name}`);


  return (
    <div className="flex min-h-screen bg-slate-50/80">
      {/* Desktop Sidebar */}
      <Sidebar
        userPermissions={user.role.permissions}
        userRoleName={user.role.name}
        userName={user.name}
        userAvatar={user.avatarUrl}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 lg:pb-0">
        <Navbar
          currentUserId={user.id}
          userName={user.name}
          userRoleName={user.role.name}
          userPermissions={user.role.permissions}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Field Mobile Bottom Navigation */}
      <MobileNav userPermissions={user.role.permissions} />
    </div>
  );
}

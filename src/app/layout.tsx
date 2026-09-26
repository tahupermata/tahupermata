import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SalesPro - Next.js & Turso Sales Management System',
  description: 'Enterprise Sales & Inventory Management System with Dynamic Attributes, Multi-tier Units, RBAC, Field Itinerary, and Real-time Analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-full flex flex-col antialiased text-slate-900 bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}

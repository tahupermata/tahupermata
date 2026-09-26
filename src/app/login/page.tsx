'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth-actions';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-500/30 ring-4 ring-indigo-500/20">
            S
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            SalesPro Enterprise
          </h1>
          <p className="text-sm text-slate-400">
            Masuk ke Akun Sistem Manajemen Penjualan
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-slate-800 bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-slate-800">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Portal Login</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Masukkan email dan password akun Anda untuk melanjutkan.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    placeholder="nama@email.com"
                    required
                    autoComplete="email"
                    className="dark-input w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="dark-input w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isPending ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          Sales Management System &copy; 2026. Connected to Turso Edge DB.
        </p>
      </div>
    </div>
  );
}

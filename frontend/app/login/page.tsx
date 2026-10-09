'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { LOGIN } from '@/lib/graphql/mutations';
import { authTokenVar, currentUserVar } from '@/lib/apollo-client';
import { Sprout, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [login] = useMutation(LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await login({
        variables: { email, password },
      });

      if (data?.login) {
        const { token, user } = data.login;
        localStorage.setItem('agromart_token', token);
        localStorage.setItem('agromart_user', JSON.stringify(user));
        authTokenVar(token);
        currentUserVar(user);
        toast.success(`Welcome back, ${user.name}!`);
        router.push('/marketplace');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-[var(--color-primary-pale)] text-[var(--color-primary)] items-center justify-center mb-3">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[var(--color-text-primary)]">
            Welcome to AgroMart
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Sign in to access crops, fertilizers, and farm equipment
          </p>
        </div>

        <div className="card shadow-sm border border-[var(--color-border)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@agromart.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm font-semibold !py-2.5 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Login Test Accounts */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 text-center">
              Quick Test Accounts (Password123!)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('buyer@agromart.com')}
                className="text-xs py-1.5 px-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-[var(--color-border)] font-medium text-center text-gray-700"
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('seller@agromart.com')}
                className="text-xs py-1.5 px-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-[var(--color-border)] font-medium text-center text-gray-700"
              >
                Seller
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('both@agromart.com')}
                className="text-xs py-1.5 px-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-[var(--color-border)] font-medium text-center text-gray-700"
              >
                Both
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

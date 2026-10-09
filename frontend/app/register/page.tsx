'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { REGISTER } from '@/lib/graphql/mutations';
import { authTokenVar, currentUserVar } from '@/lib/apollo-client';
import { Sprout, Lock, Mail, User, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER' | 'BOTH'>('BUYER');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const [register] = useMutation(REGISTER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await register({
        variables: { name, email, password, role },
      });

      if (data?.register) {
        const { token, user } = data.register;
        localStorage.setItem('agromart_token', token);
        localStorage.setItem('agromart_user', JSON.stringify(user));
        authTokenVar(token);
        currentUserVar(user);
        toast.success(`Account created! Welcome, ${user.name}!`);
        router.push('/marketplace');
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-[var(--color-primary-pale)] text-[var(--color-primary)] items-center justify-center mb-3">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[var(--color-text-primary)]">
            Create your AgroMart Account
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Join thousands of verified farmers and agricultural merchants
          </p>
        </div>

        <div className="card shadow-sm border border-[var(--color-border)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] bg-white"
                />
              </div>
            </div>

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
                  placeholder="ramesh@agromart.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                Password (min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                Primary Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['BUYER', 'SELLER', 'BOTH'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 text-xs font-semibold rounded-md border transition-all ${
                      role === r
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                    }`}
                  >
                    {r === 'BOTH' ? 'Buyer & Seller' : r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm font-semibold !py-2.5 disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

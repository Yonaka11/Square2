import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '../api/client';
import { Loading } from './StateViews';

interface AuthContextValue {
  authRequired: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({ authRequired: false, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

type Phase = 'loading' | 'login' | 'ready';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => setPhase('login'));
    api
      .getAuthStatus()
      .then((s) => {
        setAuthRequired(s.authRequired);
        if (!s.authRequired) setPhase('ready');
        else setPhase(getToken() ? 'ready' : 'login');
      })
      .catch(() => setPhase('ready')); // if status fails, don't hard-block the app
    return () => setUnauthorizedHandler(null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await api.login(password);
      setToken(token);
      setPassword('');
      setPhase('ready');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    clearToken();
    setPhase('login');
  };

  if (phase === 'loading') return <div className="h-screen flex items-center justify-center"><Loading /></div>;

  if (phase === 'login') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Square Fee Dashboard</div>
          <p className="mt-1 text-sm text-slate-500">Admin sign-in required.</p>
          <label className="block mt-6 text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Enter admin password"
          />
          {error && <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return <AuthContext.Provider value={{ authRequired, logout }}>{children}</AuthContext.Provider>;
}

import { useState } from 'react';
import { z } from 'zod';

type AuthMode = 'login' | 'register';

type Props = {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { fullName: string; email: string; password: string }) => Promise<void>;
};

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password needs an uppercase letter.')
      .regex(/[a-z]/, 'Password needs a lowercase letter.')
      .regex(/\d/, 'Password needs a number.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export function AuthPanel({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      setLoading(true);
      if (isRegister) {
        const payload = registerSchema.parse({ fullName, email, password, confirmPassword });
        await onRegister({
          fullName: payload.fullName,
          email: payload.email,
          password: payload.password,
        });
      } else {
        const payload = loginSchema.parse({ email, password });
        await onLogin(payload);
      }
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? 'Validation failed.');
      } else {
        setError((caught as Error).message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">Welcome to GrantBridge</h2>
        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError('');
          }}
          className="rounded-lg border border-black/15 px-3 py-1 text-xs font-semibold text-ink"
        >
          {isRegister ? 'Switch to login' : 'Create account'}
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-3">
        {isRegister ? (
          <input
            className="rounded-xl border border-black/10 bg-white px-3 py-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            autoComplete="name"
            maxLength={120}
            required
          />
        ) : null}

        <input
          className="rounded-xl border border-black/10 bg-white px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          maxLength={180}
          required
        />

        <input
          className="rounded-xl border border-black/10 bg-white px-3 py-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
        />

        {isRegister ? (
          <input
            className="rounded-xl border border-black/10 bg-white px-3 py-2"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
          />
        ) : null}

        {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-zinc-800 hover:text-white disabled:opacity-60"
        >
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
        </button>
      </form>
    </div>
  );
}

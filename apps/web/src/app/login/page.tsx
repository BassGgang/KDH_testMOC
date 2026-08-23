'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck, Mail, KeyRound } from 'lucide-react';
import { getBrowserSupabase } from '@karate/db/client';

// Sign-up from this form is a development convenience only. Production is
// invite-only: accounts must be provisioned by an admin (see BACKEND_SETUP.md).
const allowSignUp = process.env.NODE_ENV !== 'production';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Only allow same-origin relative paths as the post-login target — reject
  // absolute/protocol-relative URLs to prevent an open-redirect phishing vector.
  const rawNext = params.get('next') ?? '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('メールアドレスの形式が正しくありません。例: name@example.com');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    setBusy(true);
    const supabase = getBrowserSupabase();
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) {
        setError(`アカウントを作成できませんでした。${error.message}`);
        return;
      }
      // With "Confirm email" enabled in Supabase, signUp succeeds but returns no
      // session — redirecting would just bounce back here. Surface it instead.
      if (!data.session) {
        setError(
          'アカウントは作成されましたが、メール確認が必要な設定になっています。届いた確認メールを承認するか、管理者に Supabase の Authentication → Sign In / Providers → Email → 「Confirm email」を OFF にするよう依頼してください。',
        );
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません。'
            : `サインインできませんでした。${error.message}`,
        );
        return;
      }
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-white text-navy-950 flex items-center justify-center p-6 bg-[radial-gradient(#020617_0.5px,transparent_0.5px)] [background-size:24px_24px]">
      <div className="w-full max-w-sm bg-white border-2 border-navy-950 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(2,6,23,1)] p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-navy-950 text-white flex items-center justify-center rounded-2xl">
            <Lock size={22} />
          </div>
          <div>
            <h1 className="font-black italic uppercase tracking-tighter text-xl">NexTep Secure</h1>
            <p className="text-xs font-bold text-navy-950/50 mt-1">大会運営スタッフ認証</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-950/40">メールアドレス / Email</span>
            <div className="flex items-center gap-2 border-2 border-navy-950/15 rounded-xl px-3 focus-within:border-navy-950 transition-colors">
              <Mail size={16} className="text-navy-950/40" />
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                placeholder="name@example.com"
                className="flex-1 py-3 bg-transparent outline-none font-semibold"
                aria-invalid={error != null}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-950/40">パスワード / Password</span>
            <div className="flex items-center gap-2 border-2 border-navy-950/15 rounded-xl px-3 focus-within:border-navy-950 transition-colors">
              <KeyRound size={16} className="text-navy-950/40" />
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                placeholder="8文字以上"
                className="flex-1 py-3 bg-transparent outline-none font-semibold"
                aria-invalid={error != null}
              />
            </div>
          </label>
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 bg-navy-950 text-white rounded-xl font-black tracking-[0.2em] uppercase text-sm hover:bg-navy-900 active:scale-95 transition-all disabled:opacity-40"
          >
            {busy
              ? (mode === 'signup' ? '作成中…' : '認証中…')
              : (mode === 'signup' ? 'アカウント作成 / Sign Up' : 'サインイン / Sign In')}
          </button>
          {allowSignUp && (
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-navy-950/40 hover:text-navy-950 transition-colors self-center"
            >
              {mode === 'signin' ? '初めての方はこちら（開発用） / Create Account' : 'サインインに戻る / Back to Sign In'}
            </button>
          )}
          <div className="flex items-start gap-2 text-[11px] text-navy-950/50 font-semibold bg-navy-950/5 rounded-xl p-3">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-navy-950/40" />
            <span>登録済みのメールアドレスとパスワードでサインインしてください。</span>
          </div>
        </form>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-navy-950/30">
          NexTep Karate DX · Internal Operations
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

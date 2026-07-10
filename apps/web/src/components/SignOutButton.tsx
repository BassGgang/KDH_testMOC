'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/auth/signout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-navy-950/40 hover:text-navy-950 transition-colors disabled:opacity-50"
    >
      <LogOut size={14} />
      サインアウト
    </button>
  );
}

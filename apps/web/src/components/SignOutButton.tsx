'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { clearSensitiveLocalData, getDB } from '@/lib/db/dexie';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    const pending = await getDB().outbox.count();
    if (pending > 0 && !window.confirm(
      `未同期のデータが ${pending} 件あります。サインアウトすると端末から完全に削除され、復元できません。続行しますか？`,
    )) return;

    setBusy(true);
    try {
      const response = await fetch('/auth/signout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign-out failed');
      await clearSensitiveLocalData();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('karate-')).map((key) => caches.delete(key)));
      }
      router.replace('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
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

'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudOff, Cloud, CloudUpload, AlertCircle } from 'lucide-react';
import { getDB } from '@/lib/db/dexie';
import { runSyncOnce, startSyncLoop } from '@/lib/sync/engine';
import { cn } from '@/lib/utils';

export function SyncStatus() {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const stop = startSyncLoop(5000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      stop();
    };
  }, []);

  const pending = useLiveQuery(() => getDB().outbox.count(), [], 0);
  const failing = useLiveQuery(
    () => getDB().outbox.filter((e) => e.attempts >= 3).count(),
    [],
    0,
  );

  const { Icon, label, cls } = pickVariant({ online, pending, failing });

  return (
    <button
      onClick={() => { void runSyncOnce(); }}
      title="Click to retry sync now"
      className={cn(
        'flex items-center gap-2 px-3 py-2 border rounded-xl font-black text-[10px] tracking-widest uppercase transition-colors',
        cls,
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function pickVariant({ online, pending, failing }: { online: boolean; pending: number; failing: number }) {
  if (!online) {
    return { Icon: CloudOff, label: 'OFFLINE', cls: 'bg-gray-50 text-navy-950/60 border-gray-200' };
  }
  if (failing > 0) {
    return { Icon: AlertCircle, label: `RETRY ${pending}`, cls: 'bg-red-50 text-accent-red border-red-200' };
  }
  if (pending > 0) {
    return { Icon: CloudUpload, label: `SYNCING ${pending}`, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  }
  return { Icon: Cloud, label: 'SYNCED', cls: 'bg-green-50 text-green-700 border-green-200' };
}

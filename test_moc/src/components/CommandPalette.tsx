import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, List, Calendar, Target, UserPlus, Zap } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-navy-950/40 backdrop-blur-sm px-6" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white border-2 border-navy-950 shadow-[8px_8px_0px_0px_rgba(2,6,23,1)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <Command label="Command Menu" className="flex flex-col h-full bg-white">
          <div className="flex items-center border-b border-navy-950/10 px-4">
            <Search className="mr-3 text-navy-950/30" size={18} />
            <Command.Input 
              placeholder="選手検索、大会切り替え、コマンド入力..." 
              className="w-full py-4 text-sm font-bold uppercase tracking-tight outline-none placeholder:text-navy-950/20"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
            <Command.Empty className="py-6 text-center text-xs font-bold text-navy-950/40">
              該当するコマンドが見つかりません
            </Command.Empty>

            <Command.Group heading="QUICK ACTIONS" className="px-2 py-3">
              <Item icon={<Zap size={16} />} label="LIVE SCORING START" shortcut="S" />
              <Item icon={<UserPlus size={16} />} label="NEW ATHLETE REGISTRATION" shortcut="N" />
              <Item icon={<Calendar size={16} />} label="TOURNAMENT BUILDER" shortcut="T" />
            </Command.Group>

            <Command.Separator className="h-px bg-navy-950/5 mx-2 my-2" />

            <Command.Group heading="SEARCH RESULTS" className="px-2 py-3">
              <Item icon={<Target size={16} />} label="準決勝: 佐藤 vs 渡辺" />
              <Item icon={<List size={16} />} label="2024年度 関東選手権 第3試合" />
            </Command.Group>
          </Command.List>

          <div className="p-3 bg-gray-50 border-t border-navy-950/5 flex items-center justify-between">
            <div className="flex gap-4">
                <span className="text-[10px] font-bold text-navy-950/40 italic">ESC: CLOSE</span>
                <span className="text-[10px] font-bold text-navy-950/40 italic">ENTER: RUN</span>
            </div>
            <span className="text-[10px] font-black text-navy-950/20 tracking-widest">NEXTEP COMMAND CORE</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Item({ icon, label, shortcut }: { icon: React.ReactNode; label: string; shortcut?: string }) {
  return (
    <Command.Item className="flex items-center gap-3 px-3 py-3 text-xs font-bold uppercase tracking-wider text-navy-950 aria-selected:bg-navy-950 aria-selected:text-white transition-colors cursor-pointer">
      {icon}
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="text-[10px] font-mono opacity-40">{shortcut}</kbd>}
    </Command.Item>
  );
}

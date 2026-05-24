import React, { useState } from 'react';
import ScoringInterface from './ScoringInterface';
import MatchSelection from './MatchSelection';
import MatchSettings from './MatchSettings';
import AthleteInsights from './AthleteInsights';
import { MonitorPlay, Users, BarChart3, Settings as SettingsIcon, LogOut, ChevronRight, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import { Athlete, MatchSettings as IMatchSettings } from '../types';

type Tab = 'selection' | 'settings' | 'scoring' | 'insights';

const MOCK_ATHLETES: Athlete[] = [
  { 
    id: '1', name: '田中 健太', rank: '1st Dan', affiliation: '極真館 東京', 
    stats: { attack: 85, defense: 70, speed: 90, stamina: 80, winRate: 75 }, 
    history: [
      { date: '2024-03-15', result: 'Win', tournament: '春季都大会', opponentName: '佐藤 文哉', score: '6-3' },
      { date: '2023-12-10', result: 'Loss', tournament: '関東新人戦', opponentName: '高橋 雄大', score: '2-4' }
    ] 
  },
  { 
    id: '2', name: '佐藤 文哉', rank: '2nd Dan', affiliation: '正道会館', 
    stats: { attack: 78, defense: 85, speed: 75, stamina: 88, winRate: 68 }, 
    history: [
      { date: '2024-03-15', result: 'Loss', tournament: '春季都大会', opponentName: '田中 健太', score: '3-6' }
    ] 
  },
  { 
    id: '3', name: '高橋 雄大', rank: '1st Dan', affiliation: '松濤館', 
    stats: { attack: 92, defense: 60, speed: 95, stamina: 70, winRate: 82 }, 
    history: [
      { date: '2023-12-10', result: 'Win', tournament: '関東新人戦', opponentName: '田中 健太', score: '4-2' }
    ] 
  },
  { 
    id: '4', name: '渡辺 真司', rank: 'Brown', affiliation: '和道流', 
    stats: { attack: 70, defense: 90, speed: 65, stamina: 95, winRate: 60 }, 
    history: [] 
  },
];


export default function Workspace() {
  const [activeTab, setActiveTab] = useState<Tab>('selection');
  const [selectedMatch, setSelectedMatch] = useState<{ p1: Athlete, p2: Athlete } | null>(null);
  const [matchSettings, setMatchSettings] = useState<IMatchSettings>({
    duration: 180,
    targetScore: 8,
    pointGap: 8,
    senshuEnabled: true
  });
  const [activeInsightAthlete, setActiveInsightAthlete] = useState<Athlete | null>(MOCK_ATHLETES[0]);

  const goToSettings = (p1: Athlete, p2: Athlete) => {
    setSelectedMatch({ p1, p2 });
    setActiveTab('settings');
  };

  const startMatch = (settings: IMatchSettings) => {
    setMatchSettings(settings);
    setActiveTab('scoring');
  };

  const completeMatch = () => {
    setActiveTab('insights');
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden text-navy-950">
      {/* Sidebar - Integrated with the new flow */}
      <aside className="w-20 border-r border-navy-950/10 flex flex-col items-center py-8 gap-10 bg-white">
        <div className="w-10 h-10 bg-navy-950 flex items-center justify-center mb-4">
          <span className="text-white font-black italic">NX</span>
        </div>
        
        <NavItem 
          active={activeTab === 'selection'} 
          onClick={() => setActiveTab('selection')} 
          icon={<Users size={24} />} 
          label="SELECT"
        />

        <NavItem 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<Sliders size={24} />} 
          label="RULES"
          disabled={!selectedMatch}
        />
        
        <NavItem 
          active={activeTab === 'scoring'} 
          onClick={() => setActiveTab('scoring')} 
          icon={<MonitorPlay size={24} />} 
          label="SCORE"
          disabled={!selectedMatch || activeTab === 'selection'}
        />
        
        <NavItem 
          active={activeTab === 'insights'} 
          onClick={() => setActiveTab('insights')} 
          icon={<BarChart3 size={24} />} 
          label="INSIGHTS"
        />

        <div className="mt-auto space-y-8 pb-4">
          <button className="text-navy-950/20 hover:text-navy-950 transition-colors"><SettingsIcon size={20} /></button>
          <button className="text-navy-950/20 hover:text-navy-950 transition-colors"><LogOut size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top Header indicating progress */}
        <header className="h-10 border-b border-navy-950/5 flex items-center px-8 bg-gray-50/50">
           <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className={cn(activeTab === 'selection' ? "text-navy-950" : "text-navy-950/20")}>Phase 01</span>
              <ChevronRight size={12} className="text-navy-950/10" />
              <span className={cn(activeTab === 'settings' ? "text-navy-950" : "text-navy-950/20")}>Phase 02</span>
              <ChevronRight size={12} className="text-navy-950/10" />
              <span className={cn(activeTab === 'scoring' ? "text-navy-950" : "text-navy-950/20")}>Phase 03</span>
              <ChevronRight size={12} className="text-navy-950/10" />
              <span className={cn(activeTab === 'insights' ? "text-navy-950" : "text-navy-950/20")}>Phase 04</span>
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-white">
           {activeTab === 'selection' && (
             <MatchSelection onSelect={goToSettings} />
           )}

           {activeTab === 'settings' && selectedMatch && (
             <MatchSettings 
               athlete1={selectedMatch.p1} 
               athlete2={selectedMatch.p2} 
               onBack={() => setActiveTab('selection')}
               onConfirm={startMatch} 
             />
           )}
           
           {activeTab === 'scoring' && (
             <ScoringInterface 
               athlete1={selectedMatch?.p1 || null} 
               athlete2={selectedMatch?.p2 || null} 
               settings={matchSettings}
               onComplete={completeMatch}
             />
           )}
           
           {activeTab === 'insights' && (
             <div className="h-full flex flex-col">
                <div className="flex bg-navy-950 text-white overflow-x-auto scrollbar-hide">
                   {MOCK_ATHLETES.map((a) => (
                      <button 
                        key={a.id}
                        onClick={() => setActiveInsightAthlete(a)}
                        className={cn(
                          "px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-r border-white/10 shrink-0",
                          activeInsightAthlete?.id === a.id ? "bg-white text-navy-950" : "hover:bg-white/5"
                        )}
                      >
                        {a.name}
                      </button>
                   ))}
                </div>
                <div className="flex-1 overflow-auto">
                   {activeInsightAthlete && <AthleteInsights athlete={activeInsightAthlete} />}
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}


function NavItem({ active, onClick, icon, label, disabled }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  disabled?: boolean;
}) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all group disabled:opacity-5",
        active ? "text-navy-950" : "text-navy-950/30 hover:text-navy-950"
      )}
    >
      <div className={cn(
        "p-3 transition-all",
        active ? "bg-navy-950 text-white shadow-xl" : "group-hover:bg-navy-950/5"
      )}>
        {icon}
      </div>
      <span className="text-[8px] font-black tracking-widest uppercase">{label}</span>
      {active && <div className="w-1 h-1 bg-accent-red mt-1" />}
    </button>
  );
}


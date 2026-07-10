import React, { useState } from 'react';
import ScoringInterface from './ScoringInterface';
import MatchSelection from './MatchSelection';
import MatchSettings from './MatchSettings';
import AthleteInsights from './AthleteInsights';
import { MonitorPlay, BarChart3, Settings as SettingsIcon, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Athlete, MatchSettings as IMatchSettings } from '../types';

type SidebarTab = 'match' | 'insights';
type MatchPhase = 'selection' | 'settings' | 'scoring';

export default function Workspace() {
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('match');
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('selection');
  const [selectedMatch, setSelectedMatch] = useState<{ p1: Athlete, p2: Athlete } | null>(null);
  const [matchSettings, setMatchSettings] = useState<IMatchSettings>({
    duration: 180,
    targetScore: 8,
    pointGap: 8,
    senshuEnabled: true
  });
  const [activeInsightAthlete, setActiveInsightAthlete] = useState<Athlete | null>(null);

  const goToSettings = (p1: Athlete, p2: Athlete) => {
    setSelectedMatch({ p1, p2 });
    setMatchPhase('settings');
  };

  const startMatch = (settings: IMatchSettings) => {
    setMatchSettings(settings);
    setMatchPhase('scoring');
  };

  const completeMatch = () => {
    setSelectedMatch(null);
    setMatchPhase('selection');
  };

  if (showLanding) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50/50 p-6 text-navy-950 select-none animate-in fade-in duration-300">
        <div className="max-w-4xl w-full text-center space-y-3 mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-950 text-white rounded-2xl shadow-xl mb-4 font-black italic text-2xl">
            NX
          </div>
          <h1 className="text-4xl font-black tracking-tight text-navy-950 sm:text-5xl">
            空手デジタルスコアリングシステム
          </h1>
          <p className="text-xs text-navy-950/40 font-mono tracking-widest uppercase">
            Karate Digital Scoring & Analytics Platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
          {/* MATCH Card */}
          <button
            onClick={() => {
              setActiveTab('match');
              setMatchPhase('selection');
              setShowLanding(false);
            }}
            className="group relative flex flex-col items-center justify-center p-10 bg-white border-2 border-navy-950/10 hover:border-navy-950 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-center cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-20 h-20 bg-navy-950/5 group-hover:bg-navy-950 text-navy-950 group-hover:text-white rounded-3xl flex items-center justify-center transition-all duration-300 shadow-inner mb-6">
              <MonitorPlay size={40} className="stroke-[1.5]" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">MATCH / 試合</h2>
            <p className="text-xs text-navy-950/40 font-mono tracking-widest uppercase mb-4">Real-time Score Input</p>
            <p className="text-sm font-semibold text-navy-950/60 leading-relaxed max-w-xs">
              選手選択、ルール設定、試合中のリアルタイム得点・反則入力を実行します。
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs font-black tracking-widest text-navy-950 group-hover:text-red-600 transition-colors uppercase">
              スタート / START
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* INSIGHT Card */}
          <button
            onClick={() => {
              setActiveTab('insights');
              setShowLanding(false);
            }}
            className="group relative flex flex-col items-center justify-center p-10 bg-white border-2 border-navy-950/10 hover:border-navy-950 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-center cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-20 h-20 bg-navy-950/5 group-hover:bg-navy-950 text-navy-950 group-hover:text-white rounded-3xl flex items-center justify-center transition-all duration-300 shadow-inner mb-6">
              <BarChart3 size={40} className="stroke-[1.5]" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">INSIGHT / 分析</h2>
            <p className="text-xs text-navy-950/40 font-mono tracking-widest uppercase mb-4">Athlete Analytics</p>
            <p className="text-sm font-semibold text-navy-950/60 leading-relaxed max-w-xs">
              選手のパフォーマンス、警告・反則の傾向、勝率などの詳細データを分析します。
              </p>
            <div className="mt-8 flex items-center gap-2 text-navy-950 group-hover:text-blue-600 transition-colors text-xs font-black tracking-widest uppercase">
              ダッシュボードを開く / VIEW
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <p className="text-[10px] text-navy-950/30 font-mono tracking-widest uppercase mt-16">
          Karate Scoring & Performance Index © 2026
        </p>
      </div>
    );
  }

  const isInsights = activeTab === 'insights';

  return (
    <div className={cn(
      "h-screen flex overflow-hidden transition-colors duration-500",
      isInsights ? "bg-black text-white" : "bg-slate-50 text-navy-950"
    )}>
      {/* Sidebar - Integrated with the new flow */}
      <aside className={cn(
        "w-20 border-r flex flex-col items-center py-8 gap-10 transition-colors duration-500",
        isInsights ? "bg-black border-neutral-800" : "bg-white border-navy-950/10"
      )}>
        <button 
          onClick={() => setShowLanding(true)}
          title="ホーム画面に戻る / Back to Home"
          className={cn(
            "w-10 h-10 flex items-center justify-center mb-4 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md rounded-xl",
            isInsights ? "bg-white text-black shadow-lg shadow-white/10" : "bg-navy-950 text-white"
          )}
        >
          <span className="text-white font-black italic text-sm">NX</span>
        </button>
        
        <NavItem 
          id="nav-match"
          active={activeTab === 'match'} 
          onClick={() => setActiveTab('match')} 
          icon={<MonitorPlay size={24} />} 
          label="MATCH"
          isInsights={isInsights}
        />
        
        <NavItem 
          id="nav-insights"
          active={activeTab === 'insights'} 
          onClick={() => setActiveTab('insights')} 
          icon={<BarChart3 size={24} />} 
          label="INSIGHT"
          isInsights={isInsights}
        />

        <div className="mt-auto space-y-8 pb-4">
          <button id="btn-settings" className={cn("transition-colors", isInsights ? "text-slate-500 hover:text-slate-200" : "text-navy-950/20 hover:text-navy-950")}><SettingsIcon size={20} /></button>
          <button id="btn-logout" className={cn("transition-colors", isInsights ? "text-slate-500 hover:text-slate-200" : "text-navy-950/20 hover:text-navy-950")}><LogOut size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top Header indicating progress */}
        <header className={cn(
          "h-10 border-b flex items-center px-8 transition-colors duration-500",
          isInsights ? "bg-black border-neutral-800 text-neutral-400" : "bg-white border-navy-950/5 text-navy-950"
        )}>
          {activeTab === 'match' ? (
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className={cn(matchPhase === 'selection' ? "text-navy-950" : "text-navy-950/20")}>Phase 01 選手選択 / Athlete Selection</span>
              <ChevronRight size={12} className="text-navy-950/10" />
              <span className={cn(matchPhase === 'settings' ? "text-navy-950" : "text-navy-950/20")}>Phase 02 ルール設定 / Rules</span>
              <ChevronRight size={12} className="text-navy-950/10" />
              <span className={cn(matchPhase === 'scoring' ? "text-navy-950" : "text-navy-950/20")}>Phase 03 データ入力 / Scoring</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <span>インサイト分析 / Athlete Insights & Analytics</span>
            </div>
          )}
        </header>

        <div className={cn(
          "flex-1 overflow-auto transition-colors duration-500",
          isInsights ? "bg-black" : "bg-slate-50"
        )}>
          {activeTab === 'match' && (
            <div className="h-full">
              {matchPhase === 'selection' && (
                <MatchSelection onSelect={goToSettings} />
              )}

              {matchPhase === 'settings' && selectedMatch && (
                <MatchSettings 
                  athlete1={selectedMatch.p1} 
                  athlete2={selectedMatch.p2} 
                  initialSettings={matchSettings}
                  onBack={() => {
                    setSelectedMatch(null);
                    setMatchPhase('selection');
                  }}
                  onConfirm={startMatch} 
                />
              )}
              
              {matchPhase === 'scoring' && (
                <ScoringInterface 
                  athlete1={selectedMatch?.p1 || null} 
                  athlete2={selectedMatch?.p2 || null} 
                  settings={matchSettings}
                  onComplete={completeMatch}
                />
              )}
            </div>
          )}
          
          {activeTab === 'insights' && (
            <div className="h-full overflow-auto">
              <AthleteInsights 
                athlete={activeInsightAthlete} 
                onSelectAthlete={setActiveInsightAthlete} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ id, active, onClick, icon, label, disabled, isInsights }: { 
  id: string;
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  disabled?: boolean;
  isInsights: boolean;
}) {
  return (
    <button 
      id={id}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all group disabled:opacity-5 cursor-pointer",
        isInsights 
          ? (active ? "text-slate-100" : "text-slate-500 hover:text-slate-300")
          : (active ? "text-navy-950" : "text-navy-950/30 hover:text-navy-950")
      )}
    >
      <div className={cn(
        "p-3 transition-all rounded-xl",
        active 
          ? (isInsights ? "bg-white text-black shadow-lg shadow-white/10" : "bg-navy-950 text-white shadow-xl") 
          : "group-hover:bg-navy-950/5"
      )}>
        {icon}
      </div>
      <span className="text-[8px] font-black tracking-widest uppercase">{label}</span>
      {active && (
        <div className={cn(
          "w-1 h-1 mt-1 animate-pulse rounded-full",
          isInsights ? "bg-white" : "bg-red-600"
        )} />
      )}
    </button>
  );
}

import { Athlete } from '../types';

export const MOCK_ATHLETES: Athlete[] = [
  { 
    id: '1', name: '田中 健太', kana: 'たなか けんた', rank: '1級 (茶帯)', affiliation: '小学6年', 
    stats: { attack: 85, defense: 70, speed: 90, stamina: 80, winRate: 75 }, 
    history: [
      { date: '2024-03-15', result: 'Win', tournament: '春季都大会', opponentName: '佐藤 文哉', score: '6-3' },
      { date: '2023-12-10', result: 'Loss', tournament: '関東新人戦', opponentName: '高橋 雄大', score: '2-4' }
    ] 
  },
  { 
    id: '2', name: '佐藤 文哉', kana: 'さとう ふみや', rank: '3級 (茶帯)', affiliation: '小学5年', 
    stats: { attack: 78, defense: 85, speed: 75, stamina: 88, winRate: 68 }, 
    history: [
      { date: '2024-03-15', result: 'Loss', tournament: '春季都大会', opponentName: '田中 健太', score: '3-6' }
    ] 
  },
  { 
    id: '3', name: '高橋 雄大', kana: 'たかはし ゆうだい', rank: '4級 (紫帯)', affiliation: '小学6年', 
    stats: { attack: 92, defense: 60, speed: 95, stamina: 70, winRate: 82 }, 
    history: [
      { date: '2023-12-10', result: 'Win', tournament: '関東新人戦', opponentName: '田中 健太', score: '4-2' }
    ] 
  },
  { 
    id: '4', name: '渡辺 真司', kana: 'わたなべ しんじ', rank: '5級 (緑帯)', affiliation: '小学4年', 
    stats: { attack: 70, defense: 90, speed: 65, stamina: 95, winRate: 60 }, 
    history: [
      { date: '2024-01-20', result: 'Loss', tournament: '全日本小学生選手権', opponentName: '鈴木 琴美', score: '1-3' }
    ] 
  },
  { 
    id: '5', name: '中村 優太', kana: 'なかむら ゆうた', rank: '2級 (茶帯)', affiliation: '小学6年', 
    stats: { attack: 80, defense: 88, speed: 82, stamina: 85, winRate: 72 }, 
    history: [
      { date: '2024-02-18', result: 'Win', tournament: '春期リーグ選考会', opponentName: '小林 拓己', score: '4-2' }
    ] 
  },
  { 
    id: '6', name: '鈴木 琴美', kana: 'すずき ことみ', rank: '1級 (茶帯)', affiliation: '中学1年', 
    stats: { attack: 88, defense: 80, speed: 92, stamina: 84, winRate: 84 }, 
    history: [
      { date: '2024-01-20', result: 'Win', tournament: '全日本小学生選手権', opponentName: '渡辺 真司', score: '3-1' },
      { date: '2023-11-05', result: 'Win', tournament: '山梨なでしこ杯', opponentName: '山本 美咲', score: '5-4' }
    ] 
  },
  { 
    id: '7', name: '小林 拓己', kana: 'こばやし たくみ', rank: '7級 (青帯)', affiliation: '小学5年', 
    stats: { attack: 84, defense: 76, speed: 88, stamina: 90, winRate: 70 }, 
    history: [
      { date: '2024-02-18', result: 'Loss', tournament: '春期リーグ選考会', opponentName: '中村 優太', score: '2-4' }
    ] 
  },
  { 
    id: '8', name: '山本 美咲', kana: 'やまもと みさき', rank: '9級 (黄帯)', affiliation: '小学4年', 
    stats: { attack: 90, defense: 68, speed: 86, stamina: 86, winRate: 78 }, 
    history: [
      { date: '2023-11-05', result: 'Loss', tournament: '山梨なでしこ杯', opponentName: '鈴木 琴美', score: '4-5' }
    ] 
  },
  { 
    id: '9', name: '加藤 明', kana: 'かとう あきら', rank: '10級 (黄帯)', affiliation: '小学3年', 
    stats: { attack: 76, defense: 92, speed: 78, stamina: 92, winRate: 74 }, 
    history: [
      { date: '2024-04-02', result: 'Win', tournament: '関西最強決定戦', opponentName: '吉田 大介', score: '2-0' }
    ] 
  },
  { 
    id: '10', name: '吉田 大介', kana: 'よしだ だいすけ', rank: '無級 (白帯)', affiliation: '小学2年', 
    stats: { attack: 82, defense: 82, speed: 84, stamina: 80, winRate: 65 }, 
    history: [
      { date: '2024-04-02', result: 'Loss', tournament: '関西最強決定戦', opponentName: '加藤 明', score: '0-2' }
    ] 
  },
  { 
    id: '11', name: '吉川 莉央', kana: 'よしかわ りお', rank: '6級 (緑帯)', affiliation: '小学4年', 
    stats: { attack: 75, defense: 80, speed: 83, stamina: 82, winRate: 67 }, 
    history: [
      { date: '2024-05-10', result: 'Win', tournament: '県下少年大会', opponentName: '小林 拓己', score: '3-1' }
    ] 
  },
  { 
    id: '12', name: '森下 健吾', kana: 'もりした けんご', rank: '8級 (水色帯)', affiliation: '小学3年', 
    stats: { attack: 72, defense: 74, speed: 80, stamina: 78, winRate: 58 }, 
    history: [] 
  },
  { 
    id: '13', name: '三浦 さくら', kana: 'みうら さくら', rank: '無級 (白帯)', affiliation: '小学1年', 
    stats: { attack: 65, defense: 60, speed: 70, stamina: 75, winRate: 50 }, 
    history: [] 
  }
];

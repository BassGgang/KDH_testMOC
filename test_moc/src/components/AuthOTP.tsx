import React, { useState } from 'react';
import { OTPInput, SlotProps } from 'input-otp';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AuthOTP({ onVerify }: { onVerify: () => void }) {
  const [value, setValue] = useState('');

  const handleComplete = (val: string) => {
    if (val === '123456') { // Mock logic
      onVerify();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(#020617_0.5px,transparent_0.5px)] [background-size:24px_24px] [background-opacity:0.02]">
      <div className="w-full max-w-md bg-white border-2 border-navy-950 p-10 space-y-8 shadow-[12px_12px_0px_0px_rgba(2,6,23,1)]">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-navy-950 flex items-center justify-center mb-6">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">NexTep Secure</h1>
          <p className="text-navy-950/60 font-medium text-sm">大会運営スタッフ認証</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-[0.2em] text-navy-950/40 uppercase">One-Time Password</label>
            <OTPInput
              maxLength={6}
              value={value}
              onChange={setValue}
              onComplete={handleComplete}
              containerClassName="group flex items-center justify-center gap-2"
              render={({ slots }) => (
                <>
                  {slots.map((slot, idx) => (
                    <Slot key={idx} {...slot} />
                  ))}
                </>
              )}
            />
          </div>

          <div className="bg-navy-950/5 border border-navy-910/10 p-4 rounded-sm">
             <div className="flex gap-3">
                <ShieldCheck size={18} className="text-navy-950 mt-1 shrink-0" />
                <p className="text-xs text-navy-950/70 leading-relaxed font-medium">
                  登録済みのモバイルデバイスに送信された6桁の認証コードを入力してください。 <br/>
                  <span className="text-[10px] font-mono opacity-50 mt-2 block">Demo: Enter 123456</span>
                </p>
             </div>
          </div>

          <button 
            disabled={value.length < 6}
            onClick={() => handleComplete(value)}
            className="w-full py-4 bg-navy-950 text-white font-bold flex items-center justify-center gap-2 hover:bg-navy-900 active:scale-[0.98] transition-all disabled:opacity-20"
          >
            SIGN IN TO SYSTEM
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="pt-4 text-center">
           <button className="text-[10px] font-bold text-navy-950/40 hover:text-navy-950 uppercase tracking-widest transition-colors">
              認証コードを再送する
           </button>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] font-bold text-navy-950/30 uppercase tracking-[0.5em] font-mono">
        NexTep Karate DX 2026 © Internal Operations
      </p>
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        'relative h-14 w-12 flex items-center justify-center border-b-2 border-navy-950/10 transition-all duration-300 text-2xl font-black font-mono',
        props.isActive && 'bg-navy-900/5 border-navy-950 scale-105',
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && <FakeCaret />}
    </div>
  );
}

function FakeCaret() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="h-4 w-px bg-white animate-caret-blink" />
    </div>
  );
}


import React from 'react';
import { RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';

interface Props {
  score: number;
  level: number;
  highScore: number;
  onReset: () => void;
  isMusicOn: boolean;
  onToggleMusic: () => void;
}

const GameControls: React.FC<Props> = ({ 
  score, 
  level, 
  highScore, 
  onReset, 
  isMusicOn,
  onToggleMusic
}) => {
  return (
    <div className="w-full max-w-md mx-auto mb-4 flex flex-col gap-4">
      {/* Stats Header */}
      <div className="flex justify-between items-center bg-[#3e2723] p-4 rounded-xl border-b-4 border-[#271815] shadow-lg">
        <div className="flex flex-col">
          <span className="text-[#a1887f] text-xs font-bold tracking-wider uppercase">Seviye</span>
          <span className="text-2xl font-bold text-amber-400">{level}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[#a1887f] text-xs font-bold tracking-wider uppercase">Puan</span>
          <span className="text-3xl font-black text-white tracking-widest">{score}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[#a1887f] text-xs font-bold tracking-wider uppercase flex items-center gap-1">
            <Trophy size={10} /> Rekor
          </span>
          <span className="text-xl font-bold text-orange-200">{highScore}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-2">
        <button 
          onClick={onReset}
          className="flex-1 bg-stone-700 hover:bg-stone-600 active:translate-y-1 border-b-4 border-stone-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw size={18} />
          <span className="hidden sm:inline">Yenile</span>
        </button>

        <button 
          onClick={onToggleMusic}
          className={`flex-1 ${isMusicOn ? 'bg-green-700 hover:bg-green-600 border-green-900' : 'bg-red-700 hover:bg-red-600 border-red-900'} active:translate-y-1 border-b-4 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all`}
        >
          {isMusicOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="hidden sm:inline">{isMusicOn ? 'Müzik Açık' : 'Müzik Kapalı'}</span>
        </button>
      </div>
    </div>
  );
};

export default GameControls;

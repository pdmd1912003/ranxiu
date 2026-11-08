import React, { useState } from 'react';
import { Volume2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CUTE_PINYIN_CARDS } from '../data/curriculumData';
import { playChineseAudio } from '../utils/speech';
import { HanziClickable } from './HanziClickable';

interface PinyinChartRoomProps {
  onBack: () => void;
  onGoToLesson: () => void;
  onShowStroke?: (char: string) => void;
}

export const PinyinChartRoom: React.FC<PinyinChartRoomProps> = ({ onBack, onGoToLesson, onShowStroke }) => {
  const [activeCardId, setActiveCardId] = useState<string>('c-a');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const handlePlaySound = (text: string, cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveCardId(cardId);
    setCurrentlyPlaying(cardId);
    playChineseAudio(text, {
      rate: 0.85,
      onEnd: () => setCurrentlyPlaying(null),
      onError: () => setCurrentlyPlaying(null),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 sm:px-6 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border border-black flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4 text-black" />
          </div>
          <span className="font-black text-sm text-black">
            Bảng Phát Âm Pinyin Cơ Bản
          </span>
        </div>

        <button
          onClick={onGoToLesson}
          className="cute-btn px-3.5 py-1.5 rounded-xl bg-[#DCFCE7] hover:bg-emerald-200 text-black font-black flex items-center gap-1.5 border border-black shrink-0"
        >
          <span>Vào bài học Pinyin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Pinyin Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {CUTE_PINYIN_CARDS.map((card) => {
          const isSelected = activeCardId === card.id;
          const isPlaying = currentlyPlaying === card.id;

          return (
            <div
              key={card.id}
              onClick={() => handlePlaySound(card.audioText, card.id)}
              className={`cursor-pointer rounded-3xl p-5 border-2 border-black transition-all flex flex-col justify-between select-none relative ${
                isSelected
                  ? 'bg-[#DCFCE7] text-black shadow-[5px_5px_0px_#000]'
                  : 'bg-white text-zinc-900 shadow-[4px_4px_0px_#000] hover:bg-[#FAF6EE]'
              }`}
            >
              {/* Top row: Nghe button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handlePlaySound(card.audioText, card.id, e)}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border border-black bg-[#FCE7F3] text-black hover:bg-pink-200 transition-all"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
                  <span>Nghe</span>
                </button>
              </div>

              {/* Center Letter */}
              <div className="my-5 text-center">
                <div className="font-mono font-black text-6xl tracking-tight leading-none text-black">
                  {card.letter}
                </div>
              </div>

              {/* Bottom explanations */}
              <div className="space-y-1.5 text-center text-xs">
                <div className="font-bold flex items-center justify-center gap-1 text-zinc-800">
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span>{card.pronounceGuide}</span>
                </div>

                <div className="font-semibold text-[11px]">
                  {(() => {
                    const parts = card.exampleZh.split(' ');
                    const pinyinPart = parts[0] || '';
                    const hanziPart = parts.slice(1).join(' ');
                    return (
                      <span className="text-emerald-900 font-bold">
                        <span>{pinyinPart} </span>
                        {hanziPart && (
                          <HanziClickable
                            text={hanziPart}
                            onShowStroke={onShowStroke || (() => {})}
                            className="font-hanzi text-sm font-normal text-black"
                          />
                        )}
                      </span>
                    );
                  })()}
                  <span className="text-zinc-600"> — {card.exampleVi}</span>
                </div>

                <p className="text-[10px] leading-tight pt-1 text-zinc-500">
                  {card.mouthTip}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div className="pt-4 flex items-center justify-between border-t-2 border-black">
        <button
          onClick={onBack}
          className="cute-btn px-4 py-2.5 bg-white hover:bg-[#FAF6EE] text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          onClick={onGoToLesson}
          className="cute-btn px-5 py-2.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-2"
        >
          <span>Vào Bài Học Pinyin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

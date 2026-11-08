import React from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { LEVELS } from '../data/curriculumData';
import { LevelId, Lesson } from '../types';
import { HanziClickable } from './HanziClickable';

interface LevelSelectorProps {
  lessons: Lesson[];
  onSelectLevel: (lvl: LevelId) => void;
  onOpenPinyinChart: () => void;
  onShowStroke?: (char: string) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  onSelectLevel,
  onOpenPinyinChart,
  onShowStroke,
}) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border-2 border-black rounded-3xl p-5 sm:p-6 shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center font-hanzi text-2xl text-black shadow-[2px_2px_0px_#000] shrink-0">
            汉
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Giáo Trình Tiếng Trung HSK
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FCE7F3] text-black border border-black">
                Lộ trình chuẩn
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenPinyinChart}
          className="cute-btn px-4 py-2.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-2 shrink-0"
        >
          <span>Bảng Phát Âm Pinyin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Levels List */}
      <div className="space-y-4">
        {LEVELS.map((lvl, idx) => {
          const isCompleted = lvl.progressPercent === 100;
          const isStudying = lvl.status === 'Đang học';
          const iconBg = idx % 2 === 0 ? 'bg-[#DCFCE7]' : 'bg-[#FCE7F3]';

          return (
            <div
              key={lvl.id}
              onClick={() => onSelectLevel(lvl.id)}
              className="cute-card p-5 sm:p-6 cursor-pointer group hover:bg-[#FAF6EE]/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full sm:w-auto">
                {/* Chinese Code Box (Left side: 拼音, 1级, 2级...) */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-black ${iconBg} flex items-center justify-center font-hanzi font-normal text-xl sm:text-2xl text-black shadow-[3px_3px_0px_#000] shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <HanziClickable
                    text={lvl.code}
                    onShowStroke={onShowStroke || (() => {})}
                  />
                </div>

                {/* Level Details */}
                <div className="space-y-2 flex-1">
                  {/* Title & Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-black">
                      {lvl.title}
                    </h3>

                    {/* Level Tag Pill */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-black bg-[#FAF6EE] text-black">
                      {lvl.badge}
                    </span>

                    {/* Studying Tag */}
                    {isStudying && (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FCE7F3] text-black border border-black">
                        Đang học
                      </span>
                    )}

                    {/* Completed Tag */}
                    {isCompleted && (
                      <span className="sm:hidden px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-black flex items-center gap-1 border border-black">
                        <Check className="w-3 h-3 stroke-[3]" /> Hoàn thành
                      </span>
                    )}
                  </div>

                  {/* Tags / Pills bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {lvl.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-zinc-800 border border-black/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Progress Line */}
                  <div className="w-full max-w-md pt-1.5 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#FAF6EE] rounded-full border border-black/30 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted || isStudying ? 'bg-emerald-400' : 'bg-transparent'
                        }`}
                        style={{ width: `${lvl.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                      {isCompleted ? '100%' : isStudying ? `${lvl.progressPercent}%` : 'Chưa bắt đầu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right CTA Button */}
              <div className="shrink-0 self-end sm:self-center">
                {isCompleted ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:flex px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#DCFCE7] text-black items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Hoàn thành
                    </span>
                    <div className="w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_#000] group-hover:bg-[#FCE7F3]">
                      <ChevronRight className="w-5 h-5 text-black" />
                    </div>
                  </div>
                ) : isStudying ? (
                  <button className="cute-btn px-5 py-2.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-1.5">
                    <span>Vào học</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="cute-btn px-4 py-2 bg-white hover:bg-[#FAF6EE] text-black font-extrabold text-xs rounded-2xl flex items-center gap-1 border-2 border-black">
                    <span>Vào học</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

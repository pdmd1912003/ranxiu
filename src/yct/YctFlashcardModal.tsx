import React, { useState, useEffect, useRef, useMemo } from 'react';
import HanziWriter from 'hanzi-writer';
import {
  X,
  Volume2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PenTool,
  RotateCcw,
} from 'lucide-react';
import { YctFlashcardItem } from './yctTypes';
import { YctIllustration } from './yctIllustrations';
import { playChineseAudio } from '../utils/speech';

interface YctFlashcardModalProps {
  item: YctFlashcardItem | null;
  deck?: YctFlashcardItem[];
  initialShowPinyin?: boolean;
  initialShowMeaning?: boolean;
  onSelectCard?: (card: YctFlashcardItem) => void;
  onRequestEditImage?: (slotKey: string, title: string, currentUrl?: string) => void;
  onClose: () => void;
}

export const YctFlashcardModal: React.FC<YctFlashcardModalProps> = ({
  item,
  deck = [],
  initialShowPinyin = true,
  initialShowMeaning = true,
  onSelectCard,
  onRequestEditImage,
  onClose,
}) => {
  const [showPinyin, setShowPinyin] = useState<boolean>(initialShowPinyin);
  const [showMeaning, setShowMeaning] = useState<boolean>(initialShowMeaning);
  const [showStrokeMode, setShowStrokeMode] = useState<boolean>(false);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const writersRef = useRef<HanziWriter[]>([]);

  useEffect(() => {
    setShowPinyin(initialShowPinyin);
  }, [initialShowPinyin]);

  useEffect(() => {
    setShowMeaning(initialShowMeaning);
  }, [initialShowMeaning]);

  const currentIndex = useMemo(() => {
    if (!item || deck.length <= 1) return -1;
    return deck.findIndex((d) => d.id === item.id || d.hanzi === item.hanzi);
  }, [item, deck]);

  const cjkChars = useMemo(() => {
    if (!item) return [];
    const matched = item.hanzi.match(/[\u4e00-\u9fff]/g);
    return matched ? matched.slice(0, 6) : [];
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const cleanSpeech = item.hanzi
      .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/（[^）]*）/g, '')
      .trim();
    if (cleanSpeech) {
      playChineseAudio(cleanSpeech);
    }
  }, [item?.id, item?.hanzi]);

  useEffect(() => {
    if (!item || !showStrokeMode || cjkChars.length === 0) return;

    writersRef.current = [];
    const writers: HanziWriter[] = [];
    const boxW = cjkChars.length <= 1 ? 160 : cjkChars.length === 2 ? 125 : 95;

    cjkChars.forEach((char, idx) => {
      const el = containerRefs.current[idx];
      if (!el) return;
      el.innerHTML = '';
      try {
        const w = HanziWriter.create(el, char, {
          width: boxW,
          height: boxW,
          padding: 8,
          strokeColor: '#18181b',
          outlineColor: '#e4e4e7',
          showOutline: true,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 250,
          delayBetweenLoops: 1500,
          drawingColor: '#10b981',
          highlightColor: '#ec4899',
          charDataLoader: (charToLoad, onComplete, onError) => {
            fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${charToLoad}.json`)
              .then((r) => (r.ok ? r.json() : Promise.reject()))
              .then((data) => onComplete(data))
              .catch(() => onError && onError());
          },
        });
        writers.push(w);
        w.loopCharacterAnimation().catch(() => {});
      } catch {
        //
      }
    });

    writersRef.current = writers;
  }, [item?.id, item?.hanzi, showStrokeMode, cjkChars]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0 && onSelectCard) {
        onSelectCard(deck[currentIndex - 1]);
      } else if (
        e.key === 'ArrowRight' &&
        currentIndex >= 0 &&
        currentIndex < deck.length - 1 &&
        onSelectCard
      ) {
        onSelectCard(deck[currentIndex + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, deck, onSelectCard]);

  if (!item) return null;

  const cleanTextForSpeech = item.hanzi
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();

  const handlePlayNormal = () => {
    playChineseAudio(cleanTextForSpeech, { rate: 0.85 });
  };

  const handlePlaySlow = () => {
    playChineseAudio(cleanTextForSpeech, { rate: 0.55 });
  };

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF7] rounded-[2rem] border-3 border-black shadow-[8px_8px_0px_#000] p-4 sm:p-6 flex flex-col gap-4 w-full max-w-4xl select-none relative max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Compact Header (Đã bỏ 2 nút Hiện Pinyin / Hiện Nghĩa vì bấm trực tiếp trong thẻ) */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-black/15 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-2 border-black flex items-center justify-center text-base shadow-[2px_2px_0px_#000]">
              🐼
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-black">
                  Flashcard Từ Vựng & Mẫu Câu ({currentIndex >= 0 ? `${currentIndex + 1}/${deck.length}` : '1/1'})
                </span>
                {item.isBonus && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FCE7F3] border border-black text-[10px] font-black text-pink-900">
                    * Mở rộng
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cjkChars.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStrokeMode((prev) => !prev)}
                className={`cute-btn py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  showStrokeMode ? 'bg-[#FEF08A] text-black' : 'bg-white text-zinc-800'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{showStrokeMode ? 'Xem Hình Minh Hoạ' : 'Tập Viết Nét Chữ'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="cute-btn p-1.5 bg-white hover:bg-rose-100 rounded-xl border-2 border-black"
              title="Đóng thẻ [Esc]"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* BỐ CỤC CHUẨN HÌNH 2: KHÔNG CÓ KHUNG BAO NGOÀI THỪA, KHÔNG CHỒNG 2 DIV */}
        {/* Trái: [Hình minh hoạ 1 div duy nhất] | Phải: [Hán tự lớn] / [Nghĩa, Pinyin] */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5 items-stretch min-h-[300px] sm:min-h-[340px]">
          {/* CỘT TRÁI: HÌNH MINH HOẠ (Chỉ 1 div duy nhất, không lồng 2 div) */}
          {!showStrokeMode ? (
            <YctIllustration
              item={item}
              size="fill"
              className="sm:col-span-5"
              onRequestEditImage={onRequestEditImage}
            />
          ) : (
            <div className="sm:col-span-5 border-3 border-black rounded-3xl bg-[#FAF6EE] shadow-[4px_4px_0px_#000] p-4 flex flex-col items-center justify-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {cjkChars.map((char, idx) => {
                  const boxW =
                    cjkChars.length <= 1 ? 160 : cjkChars.length === 2 ? 125 : 95;
                  return (
                    <div
                      key={`${char}-${idx}`}
                      className="relative border-2 border-black rounded-2xl bg-white shadow-[2px_2px_0px_#000] overflow-hidden"
                      style={{ width: boxW, height: boxW }}
                    >
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: 0.16 }}
                      >
                        <line
                          x1="0"
                          y1={boxW / 2}
                          x2={boxW}
                          y2={boxW / 2}
                          stroke="#000"
                          strokeDasharray="4,4"
                        />
                        <line
                          x1={boxW / 2}
                          y1="0"
                          x2={boxW / 2}
                          y2={boxW}
                          stroke="#000"
                          strokeDasharray="4,4"
                        />
                      </svg>
                      <div
                        ref={(el) => {
                          containerRefs.current[idx] = el;
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  writersRef.current.forEach((w) =>
                    w.loopCharacterAnimation().catch(() => {})
                  );
                }}
                className="text-xs font-black text-emerald-800 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Chạy lại thứ tự nét bút</span>
              </button>
            </div>
          )}

          {/* CỘT PHẢI: Ô TRÊN [HÁN TỰ CỠ LỚN] + Ô DƯỚI [NGHĨA & PINYIN] */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-4">
            {/* Ô TRÊN: HÁN TỰ LỚN, RÕ NÉT */}
            <div
              onClick={handlePlayNormal}
              className="flex-1 border-3 border-black rounded-3xl bg-[#FFFDF7] hover:bg-[#FEF9C3]/35 p-5 flex flex-col justify-center items-center text-center cursor-pointer relative transition-colors shadow-[4px_4px_0px_#000]"
              title="Bấm vào chữ Hán để nghe phát âm"
            >
              <span className="absolute top-3 left-4 text-xs font-black uppercase tracking-wider text-zinc-400">
                HÁN TỰ
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayNormal();
                }}
                className="absolute top-3 right-3.5 p-2 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-amber-300"
                title="Nghe phát âm"
              >
                <Volume2 className="w-5 h-5 text-black" />
              </button>

              <div
                className={`font-hanzi text-black leading-none break-words py-2 ${
                  item.hanzi.length <= 3
                    ? 'text-6xl sm:text-7xl md:text-8xl'
                    : item.hanzi.length <= 5
                    ? 'text-5xl sm:text-6xl md:text-7xl'
                    : 'text-4xl sm:text-5xl'
                }`}
              >
                {item.hanzi}
              </div>
            </div>

            {/* Ô DƯỚI: NGHĨA & PINYIN (Bấm trực tiếp vào từng thanh để Bật / Tắt) */}
            <div className="flex-1 border-3 border-black rounded-3xl bg-[#FAF6EE] p-4 sm:p-5 flex flex-col justify-center gap-3 shadow-[4px_4px_0px_#000]">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                NGHĨA & PINYIN (BẤM ĐỂ BẬT / TẮT)
              </span>

              {/* Thanh Pinyin */}
              <div
                onClick={() => setShowPinyin((p) => !p)}
                className={`py-3 px-4 rounded-2xl border-2 border-black cursor-pointer text-center transition-all ${
                  showPinyin
                    ? 'bg-[#DCFCE7] text-emerald-950'
                    : 'bg-zinc-200/70 border-dashed text-zinc-500'
                }`}
              >
                {showPinyin ? (
                  <span className="text-2xl sm:text-3xl font-mono font-black">
                    {item.pinyin}
                  </span>
                ) : (
                  <span className="text-sm font-bold flex items-center justify-center gap-1.5">
                    <EyeOff className="w-4 h-4" />
                    <span>Đã ẩn Pinyin (Bấm để hiện)</span>
                  </span>
                )}
              </div>

              {/* Thanh Nghĩa tiếng Việt */}
              <div
                onClick={() => setShowMeaning((m) => !m)}
                className={`py-3 px-4 rounded-2xl border-2 border-black cursor-pointer text-center transition-all ${
                  showMeaning
                    ? 'bg-[#FCE7F3] text-black'
                    : 'bg-zinc-200/70 border-dashed text-zinc-500'
                }`}
              >
                {showMeaning ? (
                  <div className="space-y-1">
                    <div className="text-xl sm:text-2xl font-black text-black">
                      {item.meaning}
                    </div>
                    {item.exampleHanzi && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          playChineseAudio(item.exampleHanzi!);
                        }}
                        className="pt-1 border-t border-black/15 text-xs flex flex-wrap items-center justify-center gap-1.5 text-zinc-800"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-hanzi text-lg text-black">
                          {item.exampleHanzi}
                        </span>
                        {showPinyin && item.examplePinyin && (
                          <span className="font-mono text-xs font-bold text-emerald-800">
                            ({item.examplePinyin})
                          </span>
                        )}
                        {item.exampleMeaning && (
                          <span className="font-bold text-xs">
                            : “{item.exampleMeaning}”
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-bold flex items-center justify-center gap-1.5">
                    <EyeOff className="w-4 h-4" />
                    <span>Đã ẩn Nghĩa (Bấm để hiện)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Audio & Deck Navigation (Y hệt hàng nút dưới cùng của Hình 2) */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
          {currentIndex >= 0 && deck.length > 1 && onSelectCard ? (
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => currentIndex > 0 && onSelectCard(deck[currentIndex - 1])}
              className="cute-btn py-2.5 px-4 bg-[#FAF6EE] hover:bg-amber-100 disabled:opacity-40 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Thẻ trước</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePlayNormal}
              className="cute-btn py-2.5 px-5 bg-[#FEF08A] hover:bg-amber-300 text-black rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Phát âm</span>
            </button>

            <button
              type="button"
              onClick={handlePlaySlow}
              className="cute-btn py-2.5 px-4 bg-[#DBEAFE] hover:bg-blue-200 text-black rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
            >
              <span>🐢</span>
              <span>Đọc chậm</span>
            </button>
          </div>

          {currentIndex >= 0 && deck.length > 1 && onSelectCard ? (
            <button
              type="button"
              disabled={currentIndex >= deck.length - 1}
              onClick={() =>
                currentIndex < deck.length - 1 && onSelectCard(deck[currentIndex + 1])
              }
              className="cute-btn py-2.5 px-4 bg-[#FAF6EE] hover:bg-amber-100 disabled:opacity-40 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <span>Thẻ tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};

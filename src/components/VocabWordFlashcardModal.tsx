import React, { useEffect, useRef, useState, useMemo } from 'react';
import HanziWriter from 'hanzi-writer';
import { X, RotateCcw, Volume2 } from 'lucide-react';
import { FlashCard } from '../types';
import { playChineseAudio } from '../utils/speech';

interface VocabWordFlashcardModalProps {
  card: FlashCard | null;
  onClose: () => void;
}

export const VocabWordFlashcardModal: React.FC<VocabWordFlashcardModalProps> = ({
  card,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const writersRef = useRef<HanziWriter[]>([]);

  // Lấy các chữ Hán trong từ (hỗ trợ từ 1, 2, 3 hoặc nhiều chữ)
  const cleanHanzi = useMemo(() => {
    if (!card) return '';
    return card.hanzi.replace(/\([^)]*\)/g, '').trim();
  }, [card]);

  const cjkChars = useMemo(() => {
    if (!cleanHanzi) return [];
    const matched = cleanHanzi.match(/[\u4e00-\u9fff]/g);
    return matched && matched.length > 0 ? matched : [cleanHanzi.charAt(0)];
  }, [cleanHanzi]);

  // Xác định kích thước ô mễ tự (Tianzige) vừa vặn trên mọi màn hình
  const boxSize = useMemo(() => {
    const count = cjkChars.length;
    if (count <= 1) return { w: 220, h: 220 };
    if (count === 2) return { w: 160, h: 160 };
    if (count === 3) return { w: 115, h: 115 };
    return { w: 95, h: 95 };
  }, [cjkChars.length]);

  // Khởi tạo và chạy animation cùng lúc cho tất cả các chữ Hán
  useEffect(() => {
    if (!card || cjkChars.length === 0) return;

    setIsLoading(true);
    // Hủy các writer cũ
    writersRef.current = [];

    // Tự động phát âm thanh khi mở flashcard để hỗ trợ ghi nhớ
    playChineseAudio(cleanHanzi, { customAudioUri: card.audioDataUri });

    const writers: HanziWriter[] = [];

    cjkChars.forEach((char, idx) => {
      const container = containerRefs.current[idx];
      if (!container) return;
      container.innerHTML = '';

      try {
        const writer = HanziWriter.create(container, char, {
          width: boxSize.w,
          height: boxSize.h,
          padding: Math.max(10, Math.floor(boxSize.w * 0.08)),
          strokeColor: '#1a1a1a',
          outlineColor: '#e4e4e7',
          showOutline: true,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 280,
          delayBetweenLoops: 1600,
          drawingColor: '#10b981',
          highlightColor: '#10b981',
          charDataLoader: (charToLoad, onComplete, onError) => {
            fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${charToLoad}.json`)
              .then((r) => {
                if (!r.ok) throw new Error('Not found');
                return r.json();
              })
              .then((data) => onComplete(data))
              .catch(() => {
                if (onError) onError();
              });
          },
        });

        writers.push(writer);

        // Chạy lặp lại animation đồng thời cùng lúc cho tất cả các chữ
        writer
          .loopCharacterAnimation()
          .catch(() => {});
      } catch (err) {
        console.warn('HanziWriter init error for char:', char, err);
      }
    });

    writersRef.current = writers;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => {
      clearTimeout(timer);
      writersRef.current = [];
    };
  }, [card?.id, cjkChars, boxSize, cleanHanzi]);

  // Đóng khi bấm phím Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!card) return null;

  const handleReplayAll = () => {
    writersRef.current.forEach((w) => {
      try {
        w.loopCharacterAnimation();
      } catch {
        //
      }
    });
  };

  const handlePlayAudio = () => {
    playChineseAudio(cleanHanzi, { customAudioUri: card.audioDataUri });
  };

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border-2 border-black shadow-[8px_8px_0px_#000] p-6 sm:p-7 flex flex-col items-center gap-5 w-full max-w-md select-none relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between w-full border-b-2 border-black/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] border border-black flex items-center justify-center font-hanzi text-xs font-black">
              字
            </div>
            <span className="text-xs font-black text-black">
              Flashcard Từ Vựng
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayAudio}
              className="p-2 bg-[#FCE7F3] hover:bg-pink-200 rounded-xl border-2 border-black transition-colors"
              title="Phát âm từ này"
            >
              <Volume2 className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FAF6EE] rounded-xl border border-black/40 transition-colors"
              title="Đóng [Esc]"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Chữ Hán: Chạy cùng lúc tất cả các chữ trên các ô mễ tự Tianzige */}
        <div className="relative w-full flex items-center justify-center py-2">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-2xl">
              <div className="w-7 h-7 border-3 border-zinc-200 border-t-black rounded-full animate-spin" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {cjkChars.map((char, idx) => (
              <div
                key={`${char}-${idx}`}
                className="relative border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[3px_3px_0px_#000]"
                style={{ width: boxSize.w, height: boxSize.h }}
              >
                {/* Lưới ô mễ tự (Tianzige Grid Lines) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ opacity: 0.15 }}
                >
                  <line
                    x1="0"
                    y1={boxSize.h / 2}
                    x2={boxSize.w}
                    y2={boxSize.h / 2}
                    stroke="#000000"
                    strokeWidth="1.2"
                    strokeDasharray="5,5"
                  />
                  <line
                    x1={boxSize.w / 2}
                    y1="0"
                    x2={boxSize.w / 2}
                    y2={boxSize.h}
                    stroke="#000000"
                    strokeWidth="1.2"
                    strokeDasharray="5,5"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2={boxSize.w}
                    y2={boxSize.h}
                    stroke="#000000"
                    strokeWidth="0.8"
                    strokeDasharray="3,6"
                  />
                  <line
                    x1={boxSize.w}
                    y1="0"
                    x2="0"
                    y2={boxSize.h}
                    stroke="#000000"
                    strokeWidth="0.8"
                    strokeDasharray="3,6"
                  />
                </svg>

                {/* Container của từng chữ HanziWriter */}
                <div
                  ref={(el) => {
                    containerRefs.current[idx] = el;
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pinyin */}
        <div className="text-center">
          <div className="inline-block text-xl sm:text-2xl font-mono font-black text-emerald-950 bg-[#DCFCE7] border-2 border-black px-4 py-1.5 rounded-2xl shadow-[2px_2px_0px_#000]">
            {card.pinyin}
          </div>
        </div>

        {/* Nghĩa Tiếng Việt */}
        <div className="text-center w-full px-4 py-2 bg-[#FAF6EE] rounded-2xl border-2 border-black/15">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">
            Nghĩa tiếng Việt
          </span>
          <p className="text-base sm:text-lg font-black text-black leading-snug">
            {card.meaning}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full pt-1">
          <button
            onClick={handleReplayAll}
            className="cute-btn flex-1 py-2.5 bg-[#FAF6EE] hover:bg-zinc-100 text-black rounded-2xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Phát lại nét viết</span>
          </button>
          <button
            onClick={handlePlayAudio}
            className="cute-btn flex-1 py-2.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black rounded-2xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000]"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Nghe phát âm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

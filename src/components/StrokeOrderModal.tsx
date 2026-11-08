import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { X, RotateCcw, Play, Pencil, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { playChineseAudio } from '../utils/speech';

interface StrokeOrderModalProps {
  character: string | null;
  onClose: () => void;
}

export const StrokeOrderModal: React.FC<StrokeOrderModalProps> = ({ character, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Extract all Chinese characters from the input string (supports single char or multi-char word)
  const chars = React.useMemo(() => {
    if (!character) return [];
    const matched = character.match(/[\u4e00-\u9fff]/g);
    return matched && matched.length > 0 ? matched : [character.charAt(0)];
  }, [character]);

  useEffect(() => {
    setSelectedCharIndex(0);
  }, [character]);

  const activeChar = chars[selectedCharIndex] || chars[0] || '';

  useEffect(() => {
    if (!activeChar || !containerRef.current) return;

    // Reset state
    setIsQuizMode(false);
    setQuizResult(null);
    setIsLoading(true);
    setLoadError(false);
    containerRef.current.innerHTML = '';

    const writer = HanziWriter.create(containerRef.current, activeChar, {
      width: 260,
      height: 260,
      padding: 16,
      strokeColor: '#1a1a1a',
      outlineColor: '#e4e4e7',
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 350,
      delayBetweenLoops: 1800,
      drawingColor: '#10b981',
      drawingWidth: 4,
      highlightColor: '#ec4899',
      charDataLoader: (char, onComplete, onError) => {
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${char}.json`)
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

    writerRef.current = writer;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    writer
      .loopCharacterAnimation()
      .then(() => {
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        setLoadError(true);
      });

    return () => {
      clearTimeout(timer);
      writerRef.current = null;
    };
  }, [activeChar]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!character || chars.length === 0) return null;

  const handleReplay = () => {
    setIsQuizMode(false);
    setQuizResult(null);
    writerRef.current?.animateCharacter();
  };

  const handleQuiz = () => {
    setIsQuizMode(true);
    setQuizResult(null);
    writerRef.current?.quiz({
      onComplete: () => {
        setQuizResult('correct');
        setIsQuizMode(false);
      },
    });
  };

  const handleLoopAgain = () => {
    setQuizResult(null);
    writerRef.current?.loopCharacterAnimation();
  };

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border-2 border-black shadow-[8px_8px_0px_#000] p-5 flex flex-col items-center gap-4 w-[350px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h3 className="font-black text-black text-base leading-tight">
            Thứ tự nét · {activeChar}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => playChineseAudio(activeChar)}
              className="p-2 bg-[#FCE7F3] hover:bg-pink-200 rounded-xl border border-black transition-colors"
              title={`Nghe phát âm chữ ${activeChar}`}
            >
              <Volume2 className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FAF6EE] rounded-xl border border-black/30 transition-colors"
              title="Đóng [Esc]"
            >
              <X className="w-4 h-4 text-zinc-700" />
            </button>
          </div>
        </div>

        {/* Multi-character selector tabs if word has >1 Hanzi */}
        {chars.length > 1 && (
          <div className="w-full flex items-center justify-between gap-2 bg-[#FAF6EE] border-2 border-black rounded-2xl p-1.5">
            <button
              disabled={selectedCharIndex === 0}
              onClick={() => setSelectedCharIndex((i) => Math.max(0, i - 1))}
              className="p-1.5 rounded-xl hover:bg-white disabled:opacity-30"
              title="Chữ trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {chars.map((ch, idx) => (
                <button
                  key={`${ch}-${idx}`}
                  onClick={() => setSelectedCharIndex(idx)}
                  className={`font-hanzi text-xl w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center ${
                    selectedCharIndex === idx
                      ? 'bg-[#DCFCE7] text-black border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-white text-zinc-800 border-black/20 hover:border-black'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <button
              disabled={selectedCharIndex === chars.length - 1}
              onClick={() => setSelectedCharIndex((i) => Math.min(chars.length - 1, i + 1))}
              className="p-1.5 rounded-xl hover:bg-white disabled:opacity-30"
              title="Chữ tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Animation Canvas */}
        <div className="relative">
          <div
            className="relative border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[3px_3px_0px_#000]"
            style={{ width: 260, height: 260 }}
          >
            {/* Tianzige Grid lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 0.15 }}
            >
              <line x1="0" y1="130" x2="260" y2="130" stroke="#000000" strokeWidth="1.2" strokeDasharray="5,5" />
              <line x1="130" y1="0" x2="130" y2="260" stroke="#000000" strokeWidth="1.2" strokeDasharray="5,5" />
              <line x1="0" y1="0" x2="260" y2="260" stroke="#000000" strokeWidth="0.7" strokeDasharray="3,6" />
              <line x1="260" y1="0" x2="0" y2="260" stroke="#000000" strokeWidth="0.7" strokeDasharray="3,6" />
            </svg>

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-zinc-200 border-t-black rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium">Đang tải nét chữ...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center px-4">
                  <span className="font-hanzi text-5xl text-zinc-800">{activeChar}</span>
                  <p className="text-xs text-zinc-500 mt-2">Không tìm thấy dữ liệu nét bút</p>
                </div>
              </div>
            )}

            {/* Quiz result overlay */}
            {quizResult === 'correct' && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#DCFCE7]/95 z-10 rounded-2xl">
                <div className="text-center space-y-2 p-4">
                  <p className="text-base font-black text-black">Hoàn thành chính xác</p>
                  <p className="text-xs text-zinc-700 font-bold">
                    Đã viết đúng thứ tự nét chữ &quot;{activeChar}&quot;
                  </p>
                  {chars.length > 1 && selectedCharIndex < chars.length - 1 && (
                    <button
                      onClick={() => setSelectedCharIndex((i) => i + 1)}
                      className="cute-btn mt-2 px-4 py-1.5 bg-black text-white rounded-xl text-xs font-black"
                    >
                      Chữ tiếp theo ({chars[selectedCharIndex + 1]}) →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={containerRef} />
          </div>

          {/* Quiz mode indicator */}
          {isQuizMode && !quizResult && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FCE7F3] text-black text-[11px] font-black px-3 py-0.5 rounded-full border-2 border-black whitespace-nowrap shadow-[1px_1px_0px_#000]">
              Vẽ từng nét chữ &quot;{activeChar}&quot;
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          {quizResult === 'correct' ? (
            <>
              <button
                onClick={handleLoopAgain}
                className="cute-btn flex-1 py-2 bg-[#FAF6EE] text-black rounded-xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Xem lại nét
              </button>
              <button
                onClick={handleQuiz}
                className="cute-btn flex-1 py-2 bg-[#DCFCE7] text-black rounded-xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Viết lại
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReplay}
                className="cute-btn flex-1 py-2 bg-[#FAF6EE] text-black rounded-xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Phát lại mẫu
              </button>
              <button
                onClick={handleQuiz}
                disabled={isQuizMode}
                className={`cute-btn flex-1 py-2 rounded-xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5 ${
                  isQuizMode
                    ? 'bg-[#FCE7F3] text-black'
                    : 'bg-[#DCFCE7] text-black hover:bg-emerald-200'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {isQuizMode ? 'Đang viết...' : 'Tập viết'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

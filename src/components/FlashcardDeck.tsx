import React, { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Eye,
  EyeOff,
  RotateCw,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Pencil,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FlashCard } from '../types';
import { playChineseAudio } from '../utils/speech';
import { HanziClickable } from './HanziClickable';

interface FlashcardDeckProps {
  cards: FlashCard[];
  lessonTitle: string;
  isSlideModeActive: boolean;
  onToggleSlideMode: () => void;
  onEditCard?: (card: FlashCard) => void;
  onShowStroke?: (char: string) => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  cards,
  lessonTitle,
  isSlideModeActive,
  onToggleSlideMode,
  onEditCard,
  onShowStroke,
}) => {
  const [deck, setDeck] = useState<FlashCard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'unmastered'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Reset index and flip state only when switching to a different lesson
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [lessonTitle]);

  // Keep deck cards synchronized when cards are edited/added without losing current card index
  useEffect(() => {
    setDeck(cards);
    setCurrentIndex((prev) => (cards.length > 0 ? Math.min(prev, cards.length - 1) : 0));
  }, [cards]);

  const activeCards = filterMode === 'unmastered'
    ? deck.filter((c) => !masteredIds.has(c.id))
    : deck;

  // Safe current card
  const currentCard = activeCards[currentIndex] || activeCards[0] || null;

  const handleNext = useCallback(() => {
    if (activeCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % activeCards.length);
  }, [activeCards.length]);

  const handlePrev = useCallback(() => {
    if (activeCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length);
  }, [activeCards.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handlePlayWordAudio = useCallback(
    (card: FlashCard, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setIsPlayingAudio(true);
      playChineseAudio(card.hanzi, {
        rate: speechRate,
        customAudioUri: card.audioDataUri || card.customAudioUrl,
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    },
    [speechRate]
  );

  const handlePlaySentenceAudio = useCallback(
    (sentenceZh: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      playChineseAudio(sentenceZh, { rate: speechRate });
    },
    [speechRate]
  );

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleMarkMastered = (cardId: string) => {
    const newMastered = new Set(masteredIds);
    const newReview = new Set(reviewIds);
    newMastered.add(cardId);
    newReview.delete(cardId);
    setMasteredIds(newMastered);
    setReviewIds(newReview);

    // Check celebration
    if (newMastered.size === deck.length && deck.length > 0) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }

    handleNext();
  };

  const handleMarkReview = (cardId: string) => {
    const newReview = new Set(reviewIds);
    const newMastered = new Set(masteredIds);
    newReview.add(cardId);
    newMastered.delete(cardId);
    setReviewIds(newReview);
    setMasteredIds(newMastered);
    handleNext();
  };

  const handleResetProgress = () => {
    setMasteredIds(new Set());
    setReviewIds(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        document.querySelector('[data-modal-open="true"]')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setShowPinyin((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        if (currentCard) {
          e.preventDefault();
          handlePlayWordAudio(currentCard);
        }
      } else if (e.key === '1') {
        if (currentCard) {
          e.preventDefault();
          handleMarkMastered(currentCard.id);
        }
      } else if (e.key === '2') {
        if (currentCard) {
          e.preventDefault();
          handleMarkReview(currentCard.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, currentCard, handlePlayWordAudio]);

  if (!currentCard || activeCards.length === 0) {
    return (
      <div className="cute-card p-10 text-center max-w-lg mx-auto space-y-4">
        <Sparkles className="w-10 h-10 text-black mx-auto" />
        <h3 className="text-xl font-black text-black">Đã hoàn thành tất cả thẻ từ vựng</h3>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => setFilterMode('all')}
            className="cute-btn px-4 py-2 bg-[#FAF6EE] hover:bg-zinc-200 text-black text-xs font-black rounded-xl border-2 border-black"
          >
            Xem Tất Cả Thẻ
          </button>
          <button
            onClick={handleResetProgress}
            className="cute-btn px-4 py-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black text-xs font-black rounded-xl border-2 border-black"
          >
            Làm Lại Từ Đầu
          </button>
        </div>
      </div>
    );
  }

  const isMastered = masteredIds.has(currentCard.id);
  const isNeedsReview = reviewIds.has(currentCard.id);

  return (
    <div
      className={`space-y-6 ${
        isSlideModeActive
          ? 'fixed inset-0 z-50 bg-[#fbfbf9] text-black flex flex-col justify-between p-6 sm:p-10 overflow-y-auto'
          : ''
      }`}
    >
      {/* Deck Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b-2 border-black/15">
        <div className="flex items-center gap-2.5">
          <div className="text-xs font-black text-black">
            {lessonTitle}
          </div>
          <span aria-hidden="true" className="text-zinc-400">·</span>
          <div className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#DCFCE7] border border-black text-black">
            Thẻ {currentIndex + 1} / {activeCards.length}
          </div>
        </div>

        {/* Classroom Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Pinyin Toggle Button */}
          <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`cute-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border-2 border-black transition-all ${
              showPinyin
                ? 'bg-[#DCFCE7] text-black'
                : 'bg-white text-zinc-600'
            }`}
            title="Bật/Tắt Pinyin (Phím tắt: P)"
          >
            {showPinyin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showPinyin ? 'Pinyin: Bật' : 'Pinyin: Ẩn'}</span>
            <span className="text-[10px] opacity-75 font-mono">[P]</span>
          </button>

          {/* Audio Speed Rate */}
          <div className="hidden sm:flex items-center gap-1 bg-white border-2 border-black p-1 rounded-xl shadow-[2px_2px_0px_#000]">
            <span className="text-[11px] text-zinc-600 px-1 font-bold">Tốc độ:</span>
            <button
              onClick={() => setSpeechRate(0.75)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                speechRate === 0.75 ? 'bg-black text-white' : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              0.75x
            </button>
            <button
              onClick={() => setSpeechRate(1.0)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                speechRate === 1.0 ? 'bg-black text-white' : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              1.0x
            </button>
          </div>

          {/* Shuffle button */}
          <button
            onClick={handleShuffle}
            className="cute-btn flex items-center gap-1 px-3 py-1.5 text-black bg-white hover:bg-[#FAF6EE] border-2 border-black rounded-xl font-bold"
            title="Xáo trộn thứ tự từ vựng"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xáo Bài</span>
          </button>

          {/* Edit Card Button */}
          {onEditCard && (
            <button
              onClick={() => onEditCard(currentCard)}
              className="cute-btn flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#FAF6EE] text-black border-2 border-black rounded-xl font-black text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Sửa</span>
            </button>
          )}

          {/* Slide Fullscreen presentation button */}
          <button
            onClick={onToggleSlideMode}
            className="cute-btn flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white border-2 border-black rounded-xl font-bold"
          >
            {isSlideModeActive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isSlideModeActive ? 'Thu Nhỏ' : 'Trình Chiếu'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Flashcard Stage */}
      <div className="relative max-w-2xl mx-auto w-full perspective-1000 my-4">
        <div
          onClick={handleFlip}
          className={`w-full min-h-[380px] sm:min-h-[420px] rounded-3xl cursor-pointer transition-transform duration-500 transform-style-3d relative select-none border-2 border-black bg-white text-black shadow-[6px_6px_0px_#000] hover:shadow-[7px_7px_0px_#000] ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARD FRONT (CHỮ HÁN & PHIÊN ÂM) ================= */}
          <div className="absolute inset-0 backface-hidden p-8 flex flex-col justify-between items-center text-center">
            {/* Top card bar */}
            <div className="w-full flex items-center justify-between text-xs">
              <span className="font-extrabold text-zinc-700 uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#FAF6EE] border border-black/30">
                {currentCard.wordType}
              </span>

              <div className="flex items-center gap-2">
                {currentCard.radical && (
                  <span className="text-zinc-800 font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#FAF6EE] border border-black/30">
                    Bộ: {currentCard.radical}
                  </span>
                )}
                {isMastered && (
                  <span className="flex items-center gap-1 text-black font-black bg-[#DCFCE7] border border-black px-2.5 py-0.5 rounded-full text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" /> Đã thuộc
                  </span>
                )}
                {isNeedsReview && (
                  <span className="flex items-center gap-1 text-black font-black bg-[#FCE7F3] border border-black px-2.5 py-0.5 rounded-full text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" /> Cần ôn lại
                  </span>
                )}
              </div>
            </div>

            {/* Center: Chữ Hán */}
            <div className="my-auto py-6 space-y-4">
              <HanziClickable
                text={currentCard.hanzi}
                onShowStroke={onShowStroke || (() => {})}
                className={`font-hanzi font-normal tracking-wide leading-none transition-transform hover:scale-105 flex justify-center text-black ${
                  isSlideModeActive ? 'text-7xl sm:text-9xl' : 'text-7xl sm:text-8xl'
                }`}
              />

              {/* Pinyin (Toggleable) */}
              <div className="h-10 flex items-center justify-center">
                {showPinyin ? (
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-950 tracking-wider bg-[#DCFCE7] px-4 py-1 rounded-2xl border border-black">
                    {currentCard.pinyin}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-zinc-500 bg-[#FAF6EE] px-3 py-1 rounded-full border border-black/20">
                    Pinyin đang ẩn · Bấm [P] để hiện
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Audio and click prompt */}
            <div className="w-full flex items-center justify-between pt-4 border-t-2 border-black/10 text-xs">
              <button
                type="button"
                onClick={(e) => handlePlayWordAudio(currentCard, e)}
                className={`cute-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black border-2 border-black transition-colors ${
                  isPlayingAudio
                    ? 'bg-black text-white'
                    : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
                }`}
                title="Nghe phát âm chuẩn (Phím tắt: A)"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                <span>Phát Âm [A]</span>
              </button>

              <div className="text-zinc-500 font-bold flex items-center gap-1.5 text-[11px]">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Nhấn thẻ hoặc [Space] để lật</span>
              </div>
            </div>
          </div>

          {/* ================= CARD BACK (NGHĨA & VÍ DỤ MINH HỌA) ================= */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 flex flex-col justify-between text-left bg-white rounded-3xl">
            {/* Top row */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <HanziClickable
                  text={currentCard.hanzi}
                  onShowStroke={onShowStroke || (() => {})}
                  className="font-hanzi text-2xl font-normal text-black"
                />
                <span className="font-mono text-sm font-black px-2 py-0.5 rounded-lg bg-[#DCFCE7] border border-black/40 text-emerald-950">
                  {currentCard.pinyin}
                </span>
                {currentCard.hanViet && (
                  <span className="text-black font-bold px-2 py-0.5 rounded-lg bg-[#FCE7F3] border border-black/30">
                    Hán Việt: {currentCard.hanViet}
                  </span>
                )}
              </div>

              <span className="text-zinc-600 font-bold">{currentCard.wordType}</span>
            </div>

            {/* Meaning highlight */}
            <div className="my-auto space-y-4">
              <div>
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider block mb-1">
                  Ý nghĩa tiếng Việt:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-black">
                  {currentCard.meaning}
                </div>
              </div>

              {/* Example sentence */}
              {currentCard.exampleSentence && (
                <div className="bg-[#FAF6EE] rounded-2xl p-4 border-2 border-black/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-black">Ví dụ:</span>
                    <button
                      onClick={(e) => handlePlaySentenceAudio(currentCard.exampleSentence.hanzi, e)}
                      className="cute-btn flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FCE7F3] hover:bg-pink-200 text-black border border-black font-bold"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe câu</span>
                    </button>
                  </div>

                  <HanziClickable
                    text={currentCard.exampleSentence.hanzi}
                    onShowStroke={onShowStroke || (() => {})}
                    className="font-hanzi text-lg sm:text-xl font-normal text-black"
                  />
                  <div className="font-mono text-xs sm:text-sm font-bold text-emerald-800">
                    {currentCard.exampleSentence.pinyin}
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-600 font-medium">
                    — {currentCard.exampleSentence.meaning}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom back bar */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-black/10 text-xs text-zinc-500">
              <button
                onClick={(e) => handlePlayWordAudio(currentCard, e)}
                className="cute-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCE7F3] hover:bg-pink-200 text-black border-2 border-black font-black"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe lại từ</span>
              </button>

              <span className="flex items-center gap-1 font-bold">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Bấm để lật lại</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Grading */}
      <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Prev / Next buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="cute-btn flex items-center gap-1 px-4 py-2 bg-white hover:bg-[#FAF6EE] text-black border-2 border-black rounded-xl text-xs font-black"
            title="Thẻ trước [Mũi tên trái]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thẻ Trước</span>
          </button>

          <button
            onClick={handleNext}
            className="cute-btn flex items-center gap-1 px-4 py-2 bg-white hover:bg-[#FAF6EE] text-black border-2 border-black rounded-xl text-xs font-black"
            title="Thẻ kế tiếp [Mũi tên phải]"
          >
            <span>Kế Tiếp</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick check buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkReview(currentCard.id)}
            className="cute-btn flex items-center gap-1.5 px-4 py-2 bg-[#FCE7F3] hover:bg-pink-200 border-2 border-black text-black rounded-xl text-xs font-black"
            title="Đánh dấu cần ôn lại [Phím 2]"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Cần Ôn Lại [2]</span>
          </button>

          <button
            onClick={() => handleMarkMastered(currentCard.id)}
            className="cute-btn flex items-center gap-1.5 px-4 py-2 bg-[#DCFCE7] hover:bg-emerald-200 border-2 border-black text-black rounded-xl text-xs font-black"
            title="Đánh dấu đã thuộc [Phím 1]"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Đã Thuộc [1]</span>
          </button>
        </div>
      </div>

      {/* Progress & Shortcut Indicator */}
      <div className="max-w-2xl mx-auto w-full pt-3 flex flex-wrap items-center justify-between text-xs text-zinc-600 border-t-2 border-black/10 font-bold">
        <div className="flex items-center gap-3">
          <span>Tiến độ:</span>
          <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] border border-black/40 text-black font-black">
            {masteredIds.size} đã thuộc
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#FCE7F3] border border-black/40 text-black font-black">
            {reviewIds.size} cần ôn lại
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500">
          <span>Phím tắt:</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-black/40 font-mono">Space</kbd>
          <span>lật</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-black/40 font-mono">P</kbd>
          <span>pinyin</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-black/40 font-mono">A</kbd>
          <span>nghe</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Volume2,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  MessageCircle,
  Music,
  Gamepad2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Award,
  RotateCcw,
  Presentation,
  Minimize2,
  Plus,
  Trash2,
  Video,
  Upload,
  Play,
  Pause,
  Link2,
} from 'lucide-react';
import { YctLesson, YctLevelInfo, YctFlashcardItem } from './yctTypes';
import { YctIllustration, YctCustomSlotImage } from './yctIllustrations';
import { YctClickableText } from './YctClickableText';
import { YctDialogueAudioBar } from './YctDialogueAudioBar';
import {
  useYctMediaStore,
  getYouTubeEmbedUrl,
  YctCustomMatchingPair,
  fileToDataUrl,
} from './yctMediaStorage';
import { playChineseAudio } from '../utils/speech';

export type YctLessonTab =
  | 'all'
  | 'vocab'
  | 'flashcard-deck'
  | 'dialogue'
  | 'story-song'
  | 'activity'
  | 'mock-test';

interface YctLessonViewProps {
  levelInfo: YctLevelInfo;
  lessons: YctLesson[];
  activeLesson: YctLesson;
  onSelectLesson: (lesson: YctLesson) => void;
  onBackToRoadmap: () => void;
  onOpenFlashcard: (item: YctFlashcardItem, deck?: YctFlashcardItem[]) => void;
  onOpenCertificate: () => void;
  onRequestEditImage: (slotKey: string, title: string, currentUrl?: string) => void;
  onRequestEditAudio: (slotKey: string, title: string, currentUrl?: string) => void;
  onRequestAddVideo: (songId: string, title: string) => void;
  isSlideMode?: boolean;
  onToggleSlideMode?: () => void;
}

const MATCH_PAGE_SIZE = 4; // Hiển thị 4 cặp nối mỗi lượt để vừa khít mọi màn hình nhỏ không cần cuộn

export const YctLessonView: React.FC<YctLessonViewProps> = ({
  levelInfo,
  lessons,
  activeLesson,
  onSelectLesson,
  onBackToRoadmap,
  onOpenFlashcard,
  onOpenCertificate,
  onRequestEditImage,
  onRequestEditAudio,
  onRequestAddVideo,
  isSlideMode = false,
  onToggleSlideMode,
}) => {
  const {
    getCustomAudio,
    songVideos,
    activeSongVideoId,
    selectSongVideo,
    removeSongVideo,
    customMatchingPairs,
    saveLessonMatchingPairs,
    resetLessonMatchingPairs,
    setCustomImage,
  } = useYctMediaStore();

  const [activeTab, setActiveTab] = useState<YctLessonTab>('all');
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);

  // State cho bộ Flashcard Deck trực tiếp trong bài
  const [deckIndex, setDeckIndex] = useState<number>(0);

  // State cho Bài thi mẫu (lưu đáp án học sinh chọn)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  // State cho Karaoke Video mặc định khi bài hát chưa có video tải lên
  const [activeKaraokeSongId, setActiveKaraokeSongId] = useState<string | null>(null);
  const [karaokeLineIndex, setKaraokeLineIndex] = useState<number>(0);
  const karaokeTimerRef = useRef<number | null>(null);

  // State cho Trò chơi "Cùng nối nhé: Nối Hán tự & Hình minh hoạ" (hỗ trợ nối 2 chiều & chia lượt vừa màn hình nhỏ)
  const [selectedLeftPairId, setSelectedLeftPairId] = useState<string | null>(null);
  const [selectedRightPairId, setSelectedRightPairId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [wrongAttemptPairId, setWrongAttemptPairId] = useState<string | null>(null);
  const [matchPage, setMatchPage] = useState<number>(0);
  const [showAllMatchAtOnce, setShowAllMatchAtOnce] = useState<boolean>(false);

  const [isAddingMatchPair, setIsAddingMatchPair] = useState<boolean>(false);
  const [newPairHanzi, setNewPairHanzi] = useState<string>('');
  const [newPairPinyin, setNewPairPinyin] = useState<string>('');
  const [newPairMeaning, setNewPairMeaning] = useState<string>('');
  const [newPairImageUrl, setNewPairImageUrl] = useState<string>('');
  const newPairFileRef = useRef<HTMLInputElement | null>(null);

  // Reset trạng thái nối hình khi đổi bài học
  useEffect(() => {
    setSelectedLeftPairId(null);
    setSelectedRightPairId(null);
    setMatchedPairIds([]);
    setWrongAttemptPairId(null);
    setMatchPage(0);
    setDeckIndex(0);
  }, [activeLesson.id]);

  // Dừng karaoke khi unmount
  useEffect(() => {
    return () => {
      if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
    };
  }, []);

  // Tổng hợp tất cả thẻ (Key Sentences + Vocab) của bài học hiện tại
  const fullLessonDeck = useMemo(() => {
    return [...activeLesson.keySentences, ...activeLesson.vocabItems];
  }, [activeLesson]);

  const currentDeckCard =
    fullLessonDeck[Math.min(deckIndex, Math.max(0, fullLessonDeck.length - 1))] ||
    activeLesson.vocabItems[0];

  // Danh sách các cặp nối "Hán tự - Hình minh hoạ" của bài học hiện tại
  const activeMatchingPairs: YctCustomMatchingPair[] = useMemo(() => {
    const customList = customMatchingPairs[activeLesson.id];
    if (customList && customList.length > 0) {
      return customList;
    }
    return activeLesson.vocabItems.slice(0, 8).map((v) => ({
      id: `match_${v.id}`,
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      meaning: v.meaning,
      emoji: v.emoji,
      customImageKey: `match_img_${activeLesson.id}_${v.id}`,
    }));
  }, [activeLesson, customMatchingPairs]);

  // Chia trang (4 cặp / trang) để trên màn hình nhỏ 2 cột trái-phải luôn nằm gọn trong 1 khung nhìn, không cần cuộn
  const totalMatchPages = Math.max(
    1,
    Math.ceil(activeMatchingPairs.length / MATCH_PAGE_SIZE)
  );
  const safeMatchPage = Math.min(matchPage, totalMatchPages - 1);

  const visibleLeftPairs = useMemo(() => {
    if (showAllMatchAtOnce) return activeMatchingPairs;
    const start = safeMatchPage * MATCH_PAGE_SIZE;
    return activeMatchingPairs.slice(start, start + MATCH_PAGE_SIZE);
  }, [activeMatchingPairs, safeMatchPage, showAllMatchAtOnce]);

  // Xáo trộn cột Hình minh hoạ bên phải trong cùng nhóm đang hiển thị để học sinh nối ngay ngang tầm mắt!
  const visibleRightPairs = useMemo(() => {
    const arr = [...visibleLeftPairs];
    return arr.sort((a, b) => {
      const hashA =
        a.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7;
      const hashB =
        b.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7;
      return hashA - hashB || a.hanzi.localeCompare(b.hanzi);
    });
  }, [visibleLeftPairs]);

  // Xử lý nối 2 chiều (bấm Trái trước hoặc bấm Phải trước đều được)
  const checkAndConnectPair = (leftId: string, rightId: string, pairObj: YctCustomMatchingPair) => {
    if (leftId === rightId) {
      const nextMatched = Array.from(new Set([...matchedPairIds, rightId]));
      setMatchedPairIds(nextMatched);
      setSelectedLeftPairId(null);
      setSelectedRightPairId(null);
      setWrongAttemptPairId(null);
      playChineseAudio(pairObj.hanzi);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.75 } });
      } catch {
        //
      }
    } else {
      setWrongAttemptPairId(rightId);
      setTimeout(() => setWrongAttemptPairId(null), 650);
    }
  };

  const handleClickLeftHanzi = (leftPair: YctCustomMatchingPair) => {
    playChineseAudio(leftPair.hanzi);
    if (matchedPairIds.includes(leftPair.id)) return;

    if (selectedRightPairId) {
      // Nếu đã chọn Hình bên phải trước đó -> kiểm tra nối ngay
      checkAndConnectPair(leftPair.id, selectedRightPairId, leftPair);
    } else {
      setSelectedLeftPairId((prev) => (prev === leftPair.id ? null : leftPair.id));
    }
  };

  const handleClickRightIllustration = (rightPair: YctCustomMatchingPair) => {
    if (matchedPairIds.includes(rightPair.id)) return;

    if (selectedLeftPairId) {
      // Nếu đã chọn Hán tự bên trái trước đó -> kiểm tra nối ngay
      checkAndConnectPair(selectedLeftPairId, rightPair.id, rightPair);
    } else {
      setSelectedRightPairId((prev) => (prev === rightPair.id ? null : rightPair.id));
    }
  };

  const handleAddCustomPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPairHanzi.trim()) return;
    const newId = `custom_pair_${Date.now()}`;
    const imgKey = `match_img_${activeLesson.id}_${newId}`;
    if (newPairImageUrl.trim()) {
      await setCustomImage(imgKey, newPairImageUrl.trim());
    }
    const nextPairs: YctCustomMatchingPair[] = [
      ...activeMatchingPairs,
      {
        id: newId,
        hanzi: newPairHanzi.trim(),
        pinyin: newPairPinyin.trim() || '',
        meaning: newPairMeaning.trim() || newPairHanzi.trim(),
        emoji: '🖼️',
        customImageKey: imgKey,
      },
    ];
    await saveLessonMatchingPairs(activeLesson.id, nextPairs);
    setNewPairHanzi('');
    setNewPairPinyin('');
    setNewPairMeaning('');
    setNewPairImageUrl('');
    setIsAddingMatchPair(false);
  };

  const handleDeletePair = async (pairId: string) => {
    const nextPairs = activeMatchingPairs.filter((p) => p.id !== pairId);
    await saveLessonMatchingPairs(activeLesson.id, nextPairs);
    setMatchedPairIds((prev) => prev.filter((id) => id !== pairId));
  };

  const handleSelectAnswer = (questionId: string, option: string, correct: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
    if (option === correct) {
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {
        //
      }
    }
  };

  const handlePlayQuestionAudio = (qId: string, fallbackChineseText: string) => {
    const customAudio = getCustomAudio(`mock-q-audio:${qId}`);
    if (customAudio) {
      const audio = new Audio(customAudio);
      audio.play().catch(() => {});
      return;
    }
    playChineseAudio(fallbackChineseText.replace(/^\d+\.\s*/, ''));
  };

  const masterLessonListeningAudio = getCustomAudio(
    `mock-lesson-audio:${activeLesson.id}`
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Thanh điều hướng bài học gọn nhẹ */}
      <div className="bg-white rounded-3xl border-3 border-black shadow-[4px_4px_0px_#000] p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onBackToRoadmap}
              className="cute-btn px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-amber-100 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Bản đồ {levelInfo.title}</span>
            </button>

            <select
              value={activeLesson.id}
              onChange={(e) => {
                const found = lessons.find((l) => l.id === e.target.value);
                if (found) {
                  setDeckIndex(0);
                  onSelectLesson(found);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer focus:outline-none"
            >
              {lessons.map((les) => (
                <option key={les.id} value={les.id}>
                  Bài {les.lessonNumber}: {les.titleZh} ({les.titleVi})
                </option>
              ))}
            </select>
          </div>

          {/* Nút Trình Chiếu */}
          <div className="flex flex-wrap items-center gap-1.5">
            {onToggleSlideMode && (
              <button
                type="button"
                onClick={onToggleSlideMode}
                className={`cute-btn px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  isSlideMode
                    ? 'bg-[#FCE7F3] text-black'
                    : 'bg-black text-white hover:bg-zinc-800'
                }`}
              >
                {isSlideMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Thoát Trình Chiếu</span>
                  </>
                ) : (
                  <>
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Trình Chiếu</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Banner Tiêu đề Bài học gọn gàng (Click mở Flashcard + Có nút đổi hình) */}
        <div
          onClick={() =>
            onOpenFlashcard(
              {
                id: `${activeLesson.id}-title`,
                hanzi: activeLesson.titleZh,
                pinyin: activeLesson.titlePinyin,
                meaning: `Bài ${activeLesson.lessonNumber}: ${activeLesson.titleVi}`,
                emoji: activeLesson.themeEmoji,
                colorBg: activeLesson.themeColor,
                category: `Tiêu đề Bài ${activeLesson.lessonNumber} (Trang ${activeLesson.pageNumber})`,
              },
              fullLessonDeck
            )
          }
          className="rounded-2xl border-2 border-black p-3.5 sm:p-4 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:translate-y-[-1px] transition-transform"
          style={{ backgroundColor: activeLesson.themeColor }}
        >
          <div className="flex items-center gap-3.5">
            <YctCustomSlotImage
              slotKey={`lesson-banner:${activeLesson.id}`}
              title={`Hình đại diện Bài ${activeLesson.lessonNumber}`}
              fallbackEmoji={activeLesson.themeEmoji}
              bgColor="#FFFFFF"
              sizeClass="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl"
              emojiClass="text-2xl sm:text-3xl"
              badgeLabel={`Bài ${activeLesson.lessonNumber}`}
              onRequestEditImage={onRequestEditImage}
            />

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-white border border-black text-[10px] font-black text-black">
                  Sách YCT 1 · Trang {activeLesson.pageNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FEF08A] border border-black text-[10px] font-black text-black">
                  Click mọi mục để mở Flashcard
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-hanzi text-black flex items-center gap-2 mt-0.5">
                <span>{activeLesson.titleZh}</span>
                <Volume2 className="w-5 h-5 text-black/70" />
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                {showPinyin && (
                  <span className="text-xs sm:text-sm font-mono font-black text-emerald-950">
                    {activeLesson.titlePinyin}
                  </span>
                )}
                {showMeaning && (
                  <span className="text-xs sm:text-sm font-black text-zinc-900">
                    · {activeLesson.titleVi}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold text-zinc-800 bg-white/90 rounded-xl border border-black p-2.5 max-w-xs">
            <p>{activeLesson.shortDesc}</p>
          </div>
        </div>

        {/* Các Tab chuyển nhanh phần học */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: '🌟 Tất cả', icon: Sparkles, color: 'bg-[#FEF08A]' },
            {
              id: 'vocab',
              label: `🎨 Từ vựng (${activeLesson.vocabItems.length})`,
              icon: BookOpen,
              color: 'bg-[#DCFCE7]',
            },
            {
              id: 'flashcard-deck',
              label: '🃏 Trình chiếu Flashcard',
              icon: Layers,
              color: 'bg-[#FCE7F3]',
            },
            ...(activeLesson.dialogues.length > 0
              ? [
                  {
                    id: 'dialogue',
                    label: `💬 Hội thoại (${activeLesson.dialogues.length})`,
                    icon: MessageCircle,
                    color: 'bg-[#DBEAFE]',
                  },
                ]
              : []),
            ...(activeLesson.stories.length > 0 || activeLesson.songs.length > 0
              ? [
                  {
                    id: 'story-song',
                    label: '🎬 Truyện & Video Bài hát',
                    icon: Music,
                    color: 'bg-[#EDE9FE]',
                  },
                ]
              : []),
            {
              id: 'activity',
              label: '🧩 Cùng nối Hán tự & Hình',
              icon: Gamepad2,
              color: 'bg-[#FFEDD5]',
            },
            ...(activeLesson.mockQuestions.length > 0
              ? [
                  {
                    id: 'mock-test',
                    label: `🏆 Bài thi mẫu (${activeLesson.mockQuestions.length})`,
                    icon: Award,
                    color: 'bg-[#FFE4E6]',
                  },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as YctLessonTab)}
                className={`cute-btn px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? `${tab.color} text-black ring-2 ring-black`
                    : 'bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* PHẦN 1: FLASHCARD TỪ VỰNG & MẪU CÂU (Y HỆT HÌNH THỨ 2 CỦA NGƯỜI DÙNG) */}
      {/* - Đã bỏ 2 nút Hiện Pinyin / Hiện Nghĩa ở góc trên                    */}
      {/* - Đã bỏ khung viền bao ngoài thừa và bỏ div lồng bên trong Hình      */}
      {/* - Hình minh hoạ và Hán tự phóng to rõ, không bị co cụm              */}
      {/* =================================================================== */}
      {(activeTab === 'flashcard-deck' || activeTab === 'all') && currentDeckCard && (
        <section className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCE7F3] border-2 border-black flex items-center justify-center text-lg shadow-[2px_2px_0px_#000]">
                🃏
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-black">
                  Flashcard Từ Vựng & Mẫu Câu ({deckIndex + 1}/{fullLessonDeck.length})
                </h2>
                <p className="text-xs font-bold text-zinc-500">
                  Bấm trực tiếp vào ô Pinyin hoặc Nghĩa bên trong thẻ để Bật / Tắt hiển thị
                </p>
              </div>
            </div>
          </div>

          {/* BỐ CỤC Y HỆT HÌNH 2: Trái là 1 khối Hình minh hoạ duy nhất | Phải trên là Hán tự lớn | Phải dưới là Nghĩa & Pinyin */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5 items-stretch min-h-[300px] sm:min-h-[340px]">
            {/* CỘT TRÁI: HÌNH MINH HOẠ (Chỉ 1 div duy nhất, không chồng 2 div) */}
            <div
              onClick={() => onOpenFlashcard(currentDeckCard, fullLessonDeck)}
              className="sm:col-span-5 cursor-pointer flex"
              title="Bấm để mở rộng Flashcard hoặc bấm 'Đổi hình' để tải ảnh/URL"
            >
              <YctIllustration
                item={currentDeckCard}
                size="fill"
                onRequestEditImage={onRequestEditImage}
              />
            </div>

            {/* CỘT PHẢI: Ô TRÊN [HÁN TỰ CỠ LỚN] + Ô DƯỚI [NGHĨA, PINYIN] */}
            <div className="sm:col-span-7 flex flex-col justify-between gap-4">
              {/* Ô PHẢI TRÊN: HÁN TỰ LỚN */}
              <div
                onClick={() => playChineseAudio(currentDeckCard.hanzi)}
                className="flex-1 border-3 border-black rounded-3xl bg-[#FFFDF7] hover:bg-[#FEF9C3]/40 p-5 flex flex-col items-center justify-center text-center cursor-pointer relative shadow-[4px_4px_0px_#000] transition-colors"
                title="Bấm vào Hán tự để nghe phát âm"
              >
                <span className="absolute top-3 left-4 text-xs font-black uppercase text-zinc-400">
                  HÁN TỰ
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playChineseAudio(currentDeckCard.hanzi);
                  }}
                  className="absolute top-3 right-3.5 p-2 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-amber-300"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-5 h-5 text-black" />
                </button>
                <div
                  className={`font-hanzi text-black leading-none py-2 ${
                    currentDeckCard.hanzi.length <= 3
                      ? 'text-6xl sm:text-7xl md:text-8xl'
                      : currentDeckCard.hanzi.length <= 5
                      ? 'text-5xl sm:text-6xl md:text-7xl'
                      : 'text-4xl sm:text-5xl'
                  }`}
                >
                  {currentDeckCard.hanzi}
                </div>
              </div>

              {/* Ô PHẢI DƯỚI: NGHĨA, PINYIN */}
              <div className="flex-1 border-3 border-black rounded-3xl bg-[#FAF6EE] p-4 sm:p-5 flex flex-col justify-center gap-3 shadow-[4px_4px_0px_#000]">
                <span className="text-xs font-black uppercase text-zinc-500">
                  NGHĨA & PINYIN (BẤM ĐỂ BẬT / TẮT)
                </span>

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
                      {currentDeckCard.pinyin}
                    </span>
                  ) : (
                    <span className="text-sm font-bold flex items-center justify-center gap-1.5">
                      <EyeOff className="w-4 h-4" />
                      <span>Đã ẩn Pinyin (Bấm vào đây để hiện)</span>
                    </span>
                  )}
                </div>

                <div
                  onClick={() => setShowMeaning((m) => !m)}
                  className={`py-3 px-4 rounded-2xl border-2 border-black cursor-pointer text-center transition-all ${
                    showMeaning
                      ? 'bg-[#FCE7F3] text-black'
                      : 'bg-zinc-200/70 border-dashed text-zinc-500'
                  }`}
                >
                  {showMeaning ? (
                    <span className="text-xl sm:text-2xl font-black text-black">
                      {currentDeckCard.meaning}
                    </span>
                  ) : (
                    <span className="text-sm font-bold flex items-center justify-center gap-1.5">
                      <EyeOff className="w-4 h-4" />
                      <span>Đã ẩn Nghĩa (Bấm vào đây để hiện)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hàng nút điều hướng dưới cùng (Không có viền thừa bao ngoài) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              disabled={deckIndex <= 0}
              onClick={() => setDeckIndex((i) => Math.max(0, i - 1))}
              className="cute-btn px-4 py-2.5 rounded-2xl bg-[#FAF6EE] hover:bg-amber-100 disabled:opacity-40 text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Thẻ trước</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => playChineseAudio(currentDeckCard.hanzi)}
                className="cute-btn px-5 py-2.5 rounded-2xl bg-[#FEF08A] hover:bg-amber-300 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Phát âm</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFlashcard(currentDeckCard, fullLessonDeck)}
                className="cute-btn px-5 py-2.5 rounded-2xl bg-[#DBEAFE] hover:bg-blue-200 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Phóng to & Tập viết nét chữ</span>
              </button>
            </div>

            <button
              type="button"
              disabled={deckIndex >= fullLessonDeck.length - 1}
              onClick={() => setDeckIndex((i) => Math.min(fullLessonDeck.length - 1, i + 1))}
              className="cute-btn px-4 py-2.5 rounded-2xl bg-[#FAF6EE] hover:bg-amber-100 disabled:opacity-40 text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <span>Thẻ tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* PHẦN 2: CÙNG HỌC NHÉ · TỪ VỰNG TRONG BÀI (KHÔNG CHỒNG 2 DIV, TO RÕ) */}
      {/* =================================================================== */}
      {(activeTab === 'all' || activeTab === 'vocab') && (
        <section className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                🎨
              </div>
              <div>
                <h2 className="text-lg font-black text-black">
                  Cùng học nhé! · Flashcard Từ vựng ({activeLesson.vocabItems.length} từ)
                </h2>
                <p className="text-xs font-bold text-zinc-500">
                  Bấm vào ô Pinyin hoặc Nghĩa trên thẻ để bật/tắt · Bấm vào thẻ để mở lớn & tập viết
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeLesson.vocabItems.map((vocab) => (
              <div
                key={vocab.id}
                onClick={() => onOpenFlashcard(vocab, activeLesson.vocabItems)}
                className="grid grid-cols-12 gap-3.5 items-stretch min-h-[210px] cursor-pointer group"
              >
                {/* CỘT TRÁI: HÌNH MINH HOẠ (Chỉ 1 div duy nhất, không chồng 2 div) */}
                <YctIllustration
                  item={vocab}
                  size="fill"
                  className="col-span-5"
                  onRequestEditImage={onRequestEditImage}
                />

                {/* CỘT PHẢI: Ô TRÊN [HÁN TỰ LỚN] + Ô DƯỚI [NGHĨA, PINYIN] */}
                <div className="col-span-7 flex flex-col justify-between gap-3">
                  {/* Ô TRÊN: HÁN TỰ LỚN */}
                  <div className="flex-1 border-3 border-black rounded-3xl bg-[#FFFDF7] group-hover:bg-[#FEF9C3]/35 p-3.5 flex items-center justify-center text-center relative shadow-[4px_4px_0px_#000] transition-colors">
                    <span className="absolute top-2 left-3 text-[10px] font-black uppercase text-zinc-400">
                      HÁN TỰ {vocab.isBonus ? '(*)' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playChineseAudio(
                          vocab.hanzi.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭]/g, '').trim()
                        );
                      }}
                      className="absolute top-2 right-2.5 p-1.5 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-amber-300"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4 text-black" />
                    </button>

                    <div
                      className={`font-hanzi text-black leading-none mt-2 ${
                        vocab.hanzi.length <= 2
                          ? 'text-5xl sm:text-6xl'
                          : vocab.hanzi.length <= 4
                          ? 'text-4xl sm:text-5xl'
                          : 'text-3xl sm:text-4xl'
                      }`}
                    >
                      {vocab.hanzi}
                    </div>
                  </div>

                  {/* Ô DƯỚI: NGHĨA, PINYIN (Bấm trực tiếp để Bật / Tắt) */}
                  <div className="flex-1 border-3 border-black rounded-3xl bg-[#FAF6EE] p-3 flex flex-col justify-center gap-2 shadow-[4px_4px_0px_#000]">
                    <span className="text-[10px] font-black uppercase text-zinc-500">
                      NGHĨA & PINYIN (BẤM ĐỂ BẬT / TẮT)
                    </span>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPinyin((p) => !p);
                      }}
                      className={`py-1.5 px-3 rounded-xl border-2 border-black text-center transition-all ${
                        showPinyin
                          ? 'bg-[#DCFCE7] text-emerald-950'
                          : 'bg-zinc-200/70 border-dashed text-zinc-500'
                      }`}
                    >
                      {showPinyin ? (
                        <span className="text-base sm:text-lg font-mono font-black">
                          {vocab.pinyin}
                        </span>
                      ) : (
                        <span className="text-xs font-bold">Đã ẩn Pinyin 👁️</span>
                      )}
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMeaning((m) => !m);
                      }}
                      className={`py-1.5 px-3 rounded-xl border-2 border-black text-center transition-all ${
                        showMeaning
                          ? 'bg-[#FCE7F3] text-black'
                          : 'bg-zinc-200/70 border-dashed text-zinc-500'
                      }`}
                    >
                      {showMeaning ? (
                        <span className="text-sm sm:text-base font-black text-zinc-900 line-clamp-1">
                          {vocab.meaning}
                        </span>
                      ) : (
                        <span className="text-xs font-bold">Đã ẩn Nghĩa 👁️</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Những câu quan trọng */}
          {activeLesson.keySentences.length > 0 && (
            <div className="pt-4 border-t-2 border-black/10 space-y-3">
              <h3 className="text-sm font-black text-black flex items-center gap-1.5">
                <span>⭐ Những câu quan trọng trong bài (重点句子):</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLesson.keySentences.map((ks) => (
                  <div
                    key={ks.id}
                    onClick={() => onOpenFlashcard(ks, fullLessonDeck)}
                    className="border-3 border-black rounded-3xl p-3.5 bg-[#FFFDF7] hover:bg-[#FEF9C3]/40 shadow-[4px_4px_0px_#000] flex items-center gap-3.5 cursor-pointer"
                  >
                    <YctIllustration
                      item={ks}
                      size="sm"
                      onRequestEditImage={onRequestEditImage}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-hanzi text-black">
                        <YctClickableText
                          text={ks.hanzi}
                          lessonVocab={activeLesson.vocabItems}
                          fallbackItem={ks}
                          onOpenFlashcard={onOpenFlashcard}
                        />
                      </div>
                      {showPinyin && (
                        <div className="text-xs sm:text-sm font-mono font-black text-emerald-800">
                          {ks.pinyin}
                        </div>
                      )}
                      {showMeaning && (
                        <div className="text-xs sm:text-sm font-black text-zinc-800">
                          {ks.meaning}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playChineseAudio(ks.hanzi);
                      }}
                      className="p-2 rounded-xl bg-[#FCE7F3] border-2 border-black shrink-0"
                    >
                      <Volume2 className="w-4 h-4 text-black" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* =================================================================== */}
      {/* PHẦN 3: CÙNG ĐỌC NHÉ · HỘI THOẠI TRANH (CÓ ĐỔI HÌNH FILE/URL)       */}
      {/* =================================================================== */}
      {(activeTab === 'all' || activeTab === 'dialogue') &&
        activeLesson.dialogues.length > 0 && (
          <section className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#DBEAFE] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                  💬
                </div>
                <div>
                  <h2 className="text-lg font-black text-black">
                    Cùng đọc nhé! · Bài đọc đối thoại (一起读)
                  </h2>
                  <p className="text-xs font-bold text-zinc-500">
                    Click vào từng câu để mở Flashcard · Bấm biểu tượng máy ảnh 📷 để tải ảnh minh hoạ hoặc dán URL
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {activeLesson.dialogues.map((dlg) => {
                const dlgDeck: YctFlashcardItem[] = dlg.lines.map((l) => ({
                  id: l.id,
                  hanzi: l.hanzi,
                  pinyin: l.pinyin,
                  meaning: `${l.speaker}: ${l.meaning}`,
                  emoji: l.speakerAvatar,
                  colorBg: l.speakerColor,
                  category: dlg.title,
                }));

                return (
                  <div
                    key={dlg.id}
                    className="rounded-3xl border-2 border-black bg-[#FAF6EE] p-4 sm:p-5 shadow-[4px_4px_0px_#000] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/15 pb-3">
                      <div className="flex items-center gap-2.5">
                        <YctCustomSlotImage
                          slotKey={`dlg-scene:${dlg.id}`}
                          title={dlg.title}
                          fallbackEmoji={dlg.sceneEmoji}
                          bgColor="#FFFFFF"
                          sizeClass="w-12 h-12 rounded-2xl"
                          emojiClass="text-2xl"
                          onRequestEditImage={onRequestEditImage}
                        />
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-black">
                            {dlg.title}
                          </h3>
                          <p className="text-xs font-bold text-zinc-600">
                            {dlg.sceneDescription}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* THANH PHÁT & GẮN AUDIO HỘI THOẠI (TƯƠNG TỰ BÀI KHOÁ TRANG HSK) */}
                    <YctDialogueAudioBar
                      dialogue={dlg}
                      lessonId={activeLesson.id}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {dlg.lines.map((line, idx) => {
                        const lineCard: YctFlashcardItem = dlgDeck[idx];
                        return (
                          <div
                            key={line.id}
                            onClick={() => onOpenFlashcard(lineCard, dlgDeck)}
                            className="rounded-2xl border-2 border-black p-4 shadow-[3px_3px_0px_#000] cursor-pointer hover:translate-y-[-1px] transition-all flex items-start gap-3"
                            style={{ backgroundColor: line.speakerColor }}
                          >
                            <YctCustomSlotImage
                              slotKey={`dlg-line:${line.id}`}
                              title={`${line.speaker}: ${line.hanzi}`}
                              fallbackEmoji={line.speakerAvatar}
                              bgColor="#FFFFFF"
                              sizeClass="w-14 h-14 rounded-2xl"
                              emojiClass="text-xl"
                              badgeLabel={`#${idx + 1}`}
                              onRequestEditImage={onRequestEditImage}
                            />

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-black text-zinc-800">
                                  {line.speaker}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playChineseAudio(line.hanzi);
                                  }}
                                  className="p-1 rounded-lg bg-white/80 border border-black hover:bg-white"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-black" />
                                </button>
                              </div>

                              <div className="text-2xl font-hanzi text-black">
                                <YctClickableText
                                  text={line.hanzi}
                                  lessonVocab={activeLesson.vocabItems}
                                  fallbackItem={lineCard}
                                  onOpenFlashcard={onOpenFlashcard}
                                />
                              </div>

                              {showPinyin && (
                                <div className="text-xs sm:text-sm font-mono font-black text-emerald-950">
                                  {line.pinyin}
                                </div>
                              )}
                              {showMeaning && (
                                <div className="text-xs sm:text-sm font-bold text-zinc-900">
                                  {line.meaning}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {/* =================================================================== */}
      {/* PHẦN 4: ĐỌC CHUYỆN & VIDEO BÀI HÁT CHO CÁC BÉ NGHE VÀ HỌC THEO       */}
      {/* =================================================================== */}
      {(activeTab === 'all' || activeTab === 'story-song') &&
        (activeLesson.stories.length > 0 || activeLesson.songs.length > 0) && (
          <div className="space-y-6">
            {activeLesson.stories.map((story) => {
              const storyDeck: YctFlashcardItem[] = story.panels.map((p) => ({
                id: p.id,
                hanzi: p.hanzi,
                pinyin: p.pinyin,
                meaning: p.meaning,
                emoji: p.emoji,
                colorBg: p.bgColor,
                category: story.titleVi,
              }));

              return (
                <section
                  key={story.id}
                  className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                        📖
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-black flex items-center gap-2">
                          <span>{story.titleVi}</span>
                          <span className="font-hanzi text-xl text-emerald-900">
                            ({story.titleZh})
                          </span>
                        </h2>
                        <p className="text-xs font-bold text-zinc-500">
                          {story.instructionVi} · Giáo viên có thể bấm 📷 để tải hình hoặc gắn URL cho từng tranh
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const fullText = story.panels.map((p) => p.hanzi).join(' ');
                        playChineseAudio(fullText);
                      }}
                      className="cute-btn px-3.5 py-2 rounded-2xl bg-[#DCFCE7] hover:bg-emerald-300 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe toàn bộ câu chuyện</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {story.panels.map((panel, idx) => {
                      const panelCard = storyDeck[idx];
                      return (
                        <div
                          key={panel.id}
                          onClick={() => onOpenFlashcard(panelCard, storyDeck)}
                          className="rounded-3xl border-2 border-black p-4 shadow-[4px_4px_0px_#000] cursor-pointer hover:translate-y-[-2px] transition-all flex items-start gap-3.5"
                          style={{ backgroundColor: panel.bgColor }}
                        >
                          <YctCustomSlotImage
                            slotKey={`story-panel:${panel.id}`}
                            title={`Tranh ${panel.panelNumber}: ${panel.hanzi}`}
                            fallbackEmoji={panel.emoji}
                            bgColor="#FFFFFF"
                            sizeClass="w-20 h-20 rounded-2xl"
                            emojiClass="text-3xl"
                            badgeLabel={`Tranh ${panel.panelNumber}`}
                            onRequestEditImage={onRequestEditImage}
                          />

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-full bg-white border border-black text-[10px] font-black">
                                Cảnh {panel.panelNumber}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playChineseAudio(panel.hanzi);
                                }}
                                className="p-1.5 rounded-xl bg-white border border-black hover:bg-amber-100"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-black" />
                              </button>
                            </div>

                            <div className="text-2xl font-hanzi text-black leading-snug">
                              <YctClickableText
                                text={panel.hanzi}
                                lessonVocab={activeLesson.vocabItems}
                                fallbackItem={panelCard}
                                onOpenFlashcard={onOpenFlashcard}
                              />
                            </div>

                            {showPinyin && (
                              <div className="text-xs sm:text-sm font-mono font-black text-emerald-950">
                                {panel.pinyin}
                              </div>
                            )}
                            {showMeaning && (
                              <div className="text-xs sm:text-sm font-bold text-zinc-800">
                                {panel.meaning}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* CÙNG HÁT NHÉ: VIDEO BÀI HÁT CHO CÁC BÉ NGHE & HỌC THEO */}
            {activeLesson.songs.map((song) => {
              const songDeck: YctFlashcardItem[] = song.lines.map((l) => ({
                id: l.id,
                hanzi: l.hanzi,
                pinyin: l.pinyin,
                meaning: l.meaning,
                emoji: l.emoji || '🎵',
                colorBg: '#FCE7F3',
                category: song.titleVi,
              }));

              const videosForSong = songVideos[song.id] || [];
              const selectedVidId = activeSongVideoId[song.id] || videosForSong[0]?.id || '';
              const activeVideoObj = videosForSong.find((v) => v.id === selectedVidId);
              const ytEmbedUrl = activeVideoObj
                ? getYouTubeEmbedUrl(activeVideoObj.url)
                : null;
              const isKaraokePlaying = activeKaraokeSongId === song.id;

              const toggleKaraokeVideo = () => {
                if (isKaraokePlaying) {
                  if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
                  setActiveKaraokeSongId(null);
                  return;
                }
                setActiveKaraokeSongId(song.id);
                setKaraokeLineIndex(0);
                if (song.lines[0]) playChineseAudio(song.lines[0].hanzi);
                let step = 0;
                if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
                karaokeTimerRef.current = window.setInterval(() => {
                  step += 1;
                  if (step >= song.lines.length) {
                    if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
                    setActiveKaraokeSongId(null);
                    setKaraokeLineIndex(0);
                  } else {
                    setKaraokeLineIndex(step);
                    playChineseAudio(song.lines[step].hanzi);
                  }
                }, 3200);
              };

              return (
                <section
                  key={song.id}
                  className="bg-gradient-to-r from-[#DCFCE7]/60 via-white to-[#FEF9C3]/60 rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#FCE7F3] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                        🎬
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-black">
                          Video Bài Hát Thiếu Nhi · {song.titleVi}
                        </h2>
                        <p className="text-xs font-bold text-zinc-600">
                          Các bạn nhỏ xem video, nghe nhạc và hát theo · Giáo viên có thể thêm & chọn video từ File hoặc URL
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRequestAddVideo(song.id, song.titleVi)}
                        className="cute-btn px-3.5 py-2 rounded-2xl bg-[#FEF08A] hover:bg-amber-300 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-4 h-4 text-pink-600" />
                        <span>+ Thêm / Chọn Video (Từ File hoặc URL)</span>
                      </button>
                    </div>
                  </div>

                  {videosForSong.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 bg-white/90 p-2.5 rounded-2xl border-2 border-black">
                      <span className="text-xs font-black text-zinc-700 mr-1">
                        🎞️ Chọn Video phát ({videosForSong.length}):
                      </span>
                      {videosForSong.map((vid, vIdx) => {
                        const isSelected = vid.id === activeVideoObj?.id;
                        return (
                          <div
                            key={vid.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black transition-all ${
                              isSelected ? 'bg-[#DCFCE7] shadow-[2px_2px_0px_#000]' : 'bg-[#FAF6EE]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => selectSongVideo(song.id, vid.id)}
                              className="flex items-center gap-1 cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5 text-emerald-800" />
                              <span>
                                {vIdx + 1}. {vid.title}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSongVideo(song.id, vid.id)}
                              className="p-0.5 rounded hover:bg-rose-200 text-rose-700 cursor-pointer"
                              title="Xoá video này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    <div className="lg:col-span-7">
                      {activeVideoObj ? (
                        <div className="w-full aspect-video rounded-3xl border-3 border-black shadow-[5px_5px_0px_#000] overflow-hidden bg-black relative">
                          {ytEmbedUrl ? (
                            <iframe
                              src={ytEmbedUrl}
                              title={activeVideoObj.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              key={activeVideoObj.url}
                              src={activeVideoObj.url}
                              controls
                              className="w-full h-full object-contain bg-black"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-3xl border-3 border-black shadow-[5px_5px_0px_#000] bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-white p-5 flex flex-col justify-between relative overflow-hidden">
                          <div className="flex items-center justify-between z-10">
                            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/30 text-xs font-black flex items-center gap-1.5">
                              <span>🎤 Sân Khấu Video Ca Nhạc YCT</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onRequestAddVideo(song.id, song.titleVi)}
                              className="px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-amber-300 text-black border-2 border-black text-xs font-black flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Tải Video File / Dán URL</span>
                            </button>
                          </div>

                          <div className="my-auto text-center space-y-2 z-10 py-2">
                            <div className="text-4xl sm:text-5xl animate-bounce">
                              🐼🎶👧👦🎵
                            </div>
                            <div className="font-hanzi text-2xl sm:text-4xl text-[#FEF08A] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              {song.lines[karaokeLineIndex]?.hanzi || song.titleZh}
                            </div>
                            {showPinyin && (
                              <div className="text-sm sm:text-base font-mono font-black text-emerald-300">
                                {song.lines[karaokeLineIndex]?.pinyin || song.titlePinyin}
                              </div>
                            )}
                            {showMeaning && (
                              <div className="text-xs sm:text-sm font-bold text-pink-200">
                                {song.lines[karaokeLineIndex]?.meaning || song.titleVi}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 z-10 pt-2 border-t border-white/15">
                            <button
                              type="button"
                              onClick={toggleKaraokeVideo}
                              className="px-4 py-2 rounded-xl bg-[#DCFCE7] hover:bg-emerald-300 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              {isKaraokePlaying ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  <span>Tạm dừng Karaoke</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  <span>Phát Video Karaoke Mẫu ({song.audioTrack})</span>
                                </>
                              )}
                            </button>

                            <span className="text-[11px] font-bold text-white/80">
                              Bấm &ldquo;+ Thêm / Chọn Video&rdquo; để mở video từ máy hoặc YouTube
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-3xl border-3 border-black p-4 shadow-[4px_4px_0px_#000] space-y-2.5 max-h-[360px] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <span className="text-xs font-black text-black">
                          🎶 Lời bài hát (Click để xem Flashcard):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const lyrics = song.lines.map((l) => l.hanzi).join(' ');
                            playChineseAudio(lyrics);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FCE7F3] border border-black text-[11px] font-black text-black flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Đọc lời</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {song.lines.map((line, idx) => {
                          const lineCard = songDeck[idx];
                          const isHighlighted =
                            isKaraokePlaying && karaokeLineIndex === idx;
                          return (
                            <div
                              key={line.id}
                              onClick={() => onOpenFlashcard(lineCard, songDeck)}
                              className={`rounded-2xl border-2 border-black p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isHighlighted
                                  ? 'bg-[#FEF08A] scale-[1.01] shadow-[2px_2px_0px_#000]'
                                  : 'bg-[#FAF6EE] hover:bg-[#FEF9C3]/50'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xl font-hanzi text-black">
                                  <YctClickableText
                                    text={line.hanzi}
                                    lessonVocab={activeLesson.vocabItems}
                                    fallbackItem={lineCard}
                                    onOpenFlashcard={onOpenFlashcard}
                                  />
                                </div>
                                {showPinyin && (
                                  <div className="text-[11px] font-mono font-black text-emerald-800">
                                    {line.pinyin}
                                  </div>
                                )}
                                {showMeaning && (
                                  <div className="text-[11px] font-bold text-zinc-700">
                                    {line.meaning}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playChineseAudio(line.hanzi);
                                }}
                                className="p-1.5 rounded-xl bg-white border border-black shrink-0"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-black" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

      {/* =================================================================== */}
      {/* PHẦN 5: CÙNG NỐI NHÉ: NỐI HÁN TỰ VÀ HÌNH MINH HOẠ                   */}
      {/* - Thiết kế 2 cột song song ngang tầm mắt trên MỌI màn hình nhỏ      */}
      {/* - Chia 4 cặp/lượt (hoặc xem tất cả) để KHÔNG BAO GIỜ phải cuộn      */}
      {/* - Bỏ chồng 2 div ở ô Hình minh hoạ (không bị đè chữ như Hình 3)     */}
      {/* =================================================================== */}
      {(activeTab === 'all' || activeTab === 'activity') && (
        <div className="space-y-6">
          <section className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-black/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFEDD5] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                  🧩
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-black">
                    Cùng nối nhé! · Nối Hán Tự Với Hình Minh Hoạ ({matchedPairIds.length}/{activeMatchingPairs.length} cặp)
                  </h2>
                  <p className="text-xs font-bold text-zinc-600">
                    Bấm chọn <strong>Hán tự</strong> bên trái và <strong>Hình minh hoạ</strong> bên phải (hoặc ngược lại) ngay ngang tầm mắt — không cần cuộn trang!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeMatchingPairs.length > MATCH_PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setShowAllMatchAtOnce((v) => !v)}
                    className="cute-btn px-2.5 py-1.5 rounded-xl bg-[#EDE9FE] text-purple-950 text-xs font-black cursor-pointer"
                  >
                    {showAllMatchAtOnce ? 'Chia 4 cặp / màn hình' : 'Hiện tất cả'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAddingMatchPair((v) => !v)}
                  className="cute-btn px-3 py-1.5 rounded-xl bg-[#DCFCE7] hover:bg-emerald-300 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm cặp nối</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMatchedPairIds([]);
                    setSelectedLeftPairId(null);
                    setSelectedRightPairId(null);
                  }}
                  className="cute-btn px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-amber-100 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Chơi lại</span>
                </button>

                {customMatchingPairs[activeLesson.id] && (
                  <button
                    type="button"
                    onClick={() => resetLessonMatchingPairs(activeLesson.id)}
                    className="cute-btn px-2.5 py-1.5 rounded-xl bg-[#FFE4E6] text-rose-950 text-[11px] font-black cursor-pointer"
                  >
                    Mặc định
                  </button>
                )}
              </div>
            </div>

            {/* Form Thêm cặp nối Hán tự & Hình minh hoạ mới */}
            {isAddingMatchPair && (
              <form
                onSubmit={handleAddCustomPair}
                className="bg-[#FAF6EE] rounded-2xl border-2 border-black p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-black">
                    ➕ Thêm cặp nối Hán tự & Hình minh hoạ mới:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingMatchPair(false)}
                    className="text-xs font-bold text-zinc-500 hover:text-black"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newPairHanzi}
                    onChange={(e) => setNewPairHanzi(e.target.value)}
                    placeholder="Hán tự (VD: 小猫) *"
                    className="px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
                  />
                  <input
                    type="text"
                    value={newPairPinyin}
                    onChange={(e) => setNewPairPinyin(e.target.value)}
                    placeholder="Pinyin (VD: xiǎo māo)"
                    className="px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
                  />
                  <input
                    type="text"
                    value={newPairMeaning}
                    onChange={(e) => setNewPairMeaning(e.target.value)}
                    placeholder="Nghĩa (VD: Con mèo nhỏ)"
                    className="px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={newPairFileRef}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const dataUrl = await fileToDataUrl(f);
                        setNewPairImageUrl(dataUrl);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newPairFileRef.current?.click()}
                    className="cute-btn px-3 py-2 rounded-xl bg-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Chọn file Hình từ máy</span>
                  </button>

                  <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
                    <input
                      type="text"
                      value={
                        newPairImageUrl.startsWith('data:')
                          ? '(Đã tải ảnh từ máy tính)'
                          : newPairImageUrl
                      }
                      onChange={(e) => setNewPairImageUrl(e.target.value)}
                      placeholder="Hoặc dán đường dẫn URL hình minh hoạ..."
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cute-btn px-4 py-2 rounded-xl bg-[#FEF08A] text-xs font-black text-black cursor-pointer"
                  >
                    Lưu cặp nối
                  </button>
                </div>
              </form>
            )}

            {/* Thanh chuyển lượt (4 cặp / màn hình) để máy màn hình nhỏ không cần cuộn */}
            {!showAllMatchAtOnce && totalMatchPages > 1 && (
              <div className="flex items-center justify-between gap-2 bg-[#FAF6EE] px-3.5 py-2 rounded-2xl border-2 border-black">
                <button
                  type="button"
                  disabled={safeMatchPage <= 0}
                  onClick={() => {
                    setSelectedLeftPairId(null);
                    setSelectedRightPairId(null);
                    setMatchPage((p) => Math.max(0, p - 1));
                  }}
                  className="cute-btn px-3 py-1 rounded-xl bg-white disabled:opacity-40 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Nhóm trước</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalMatchPages }).map((_, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setSelectedLeftPairId(null);
                        setSelectedRightPairId(null);
                        setMatchPage(pIdx);
                      }}
                      className={`px-3 py-1 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                        safeMatchPage === pIdx
                          ? 'bg-[#FEF08A] text-black shadow-[2px_2px_0px_#000]'
                          : 'bg-white text-zinc-600'
                      }`}
                    >
                      Lượt {pIdx + 1}/{totalMatchPages}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={safeMatchPage >= totalMatchPages - 1}
                  onClick={() => {
                    setSelectedLeftPairId(null);
                    setSelectedRightPairId(null);
                    setMatchPage((p) => Math.min(totalMatchPages - 1, p + 1));
                  }}
                  className="cute-btn px-3 py-1 rounded-xl bg-white disabled:opacity-40 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <span>Nhóm tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* BẢNG TRÒ CHƠI NỐI 2 CỘT LUÔN NẰM NGANG NHAU (KỂ CẢ TRÊN MÀN HÌNH NHỎ) */}
            {/* Mỗi hàng có chiều cao bằng nhau (h-24 sm:h-28), chỉ 1 lớp div duy nhất */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 items-stretch">
              {/* Header Cột Trái */}
              <div className="px-2.5 py-1.5 rounded-xl bg-[#DBEAFE] border-2 border-black text-[11px] sm:text-xs font-black text-black text-center">
                1️⃣ HÁN TỰ (Bấm chọn chữ)
              </div>

              {/* Header Cột Phải */}
              <div className="px-2.5 py-1.5 rounded-xl bg-[#FCE7F3] border-2 border-black text-[11px] sm:text-xs font-black text-black text-center">
                2️⃣ HÌNH MINH HOẠ (Bấm nối hình)
              </div>

              {/* Render từng cặp hàng ngang song song để 2 cột cao bằng nhau tuyệt đối */}
              {visibleLeftPairs.map((leftPair, rowIdx) => {
                const rightPair = visibleRightPairs[rowIdx];

                const isLeftMatched = matchedPairIds.includes(leftPair.id);
                const isLeftSelected = selectedLeftPairId === leftPair.id;
                const leftCardItem: YctFlashcardItem = {
                  id: leftPair.id,
                  hanzi: leftPair.hanzi,
                  pinyin: leftPair.pinyin,
                  meaning: leftPair.meaning,
                  emoji: leftPair.emoji || '🐼',
                  illustrationKey: leftPair.hanzi,
                };

                const isRightMatched = rightPair
                  ? matchedPairIds.includes(rightPair.id)
                  : false;
                const isRightSelected = rightPair
                  ? selectedRightPairId === rightPair.id
                  : false;
                const isRightWrong = rightPair
                  ? wrongAttemptPairId === rightPair.id
                  : false;
                const rightCardItem: YctFlashcardItem | null = rightPair
                  ? {
                      id: rightPair.id,
                      hanzi: rightPair.hanzi,
                      pinyin: rightPair.pinyin,
                      meaning: rightPair.meaning,
                      emoji: rightPair.emoji || '🐼',
                      illustrationKey: rightPair.hanzi,
                    }
                  : null;

                return (
                  <React.Fragment key={leftPair.id}>
                    {/* Ô BÊN TRÁI: HÁN TỰ */}
                    <div
                      onClick={() => handleClickLeftHanzi(leftPair)}
                      className={`h-24 sm:h-28 rounded-2xl border-3 border-black px-3 sm:px-4 flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                        isLeftMatched
                          ? 'bg-[#DCFCE7] border-emerald-800 shadow-[2px_2px_0px_#000]'
                          : isLeftSelected
                          ? 'bg-[#FEF08A] ring-4 ring-pink-500 shadow-[4px_4px_0px_#000] scale-[1.01]'
                          : 'bg-[#FFFDF7] hover:bg-[#FEF9C3]/40 shadow-[3px_3px_0px_#000]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-black text-[11px] font-black flex items-center justify-center shrink-0">
                          {safeMatchPage * MATCH_PAGE_SIZE + rowIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-3xl sm:text-5xl font-hanzi text-black leading-none truncate">
                            {leftPair.hanzi}
                          </div>
                          {showPinyin && leftPair.pinyin && (
                            <div className="text-xs sm:text-sm font-mono font-black text-emerald-900 mt-1 truncate">
                              {leftPair.pinyin}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isLeftMatched && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                            ✓
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFlashcard(leftCardItem, fullLessonDeck);
                          }}
                          className="px-2 py-1 rounded-lg bg-white border border-black text-[10px] font-black hover:bg-amber-100 hidden sm:inline-block"
                          title="Mở Flashcard từ này"
                        >
                          🃏
                        </button>
                        {activeMatchingPairs.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePair(leftPair.id);
                            }}
                            className="p-1 rounded-lg bg-white border border-black text-rose-700 hover:bg-rose-100 hidden sm:inline-flex"
                            title="Xoá cặp nối này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ô BÊN PHẢI: HÌNH MINH HOẠ (Chỉ 1 div duy nhất, không chồng 2 div!) */}
                    {rightPair && rightCardItem ? (
                      <div
                        onClick={() => handleClickRightIllustration(rightPair)}
                        className={`h-24 sm:h-28 rounded-2xl border-3 border-black overflow-hidden relative cursor-pointer transition-all select-none ${
                          isRightMatched
                            ? 'ring-3 ring-emerald-600 shadow-[2px_2px_0px_#000]'
                            : isRightWrong
                            ? 'ring-4 ring-rose-500 animate-pulse'
                            : isRightSelected
                            ? 'ring-4 ring-pink-500 shadow-[4px_4px_0px_#000] scale-[1.01]'
                            : 'hover:scale-[1.01] shadow-[3px_3px_0px_#000]'
                        }`}
                      >
                        {/* Nhãn góc trái trên */}
                        <span className="absolute top-1.5 left-2 z-20 px-2 py-0.5 rounded-full bg-white/95 border border-black text-[10px] font-black text-black">
                          Hình {String.fromCharCode(65 + rowIdx)}
                        </span>

                        {/* Nhãn đã nối đúng góc phải trên */}
                        {isRightMatched && (
                          <span className="absolute top-1.5 right-2 z-20 px-2 py-0.5 rounded-full bg-emerald-600 border border-black text-white text-[11px] font-black">
                            ✓ {rightPair.hanzi}
                          </span>
                        )}

                        {/* Hình minh hoạ không viền trong (frameless=true) để không bao giờ bị chồng 2 div */}
                        <YctIllustration
                          item={rightCardItem}
                          size="match"
                          frameless
                          customSlotKey={rightPair.customImageKey}
                          onRequestEditImage={onRequestEditImage}
                        />
                      </div>
                    ) : (
                      <div />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* Các hoạt động tương tác bổ trợ trong bài */}
          {activeLesson.activities
            .filter((act) => act.items && act.items.length > 0)
            .map((act) => {
              const actDeck: YctFlashcardItem[] = (act.items || []).map((it) => ({
                id: it.id,
                hanzi: it.hanzi,
                pinyin: it.pinyin,
                meaning: it.meaning,
                emoji: it.emoji,
                colorBg: '#FEF3C7',
                category: act.titleVi,
              }));

              return (
                <section
                  key={act.id}
                  className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b-2 border-black/10 pb-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                      🎯
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-black">{act.titleVi}</h2>
                      <p className="text-xs font-bold text-zinc-500">
                        {act.instructionVi} · Bấm 📷 trên thẻ bất kỳ để tải ảnh minh hoạ hoặc dùng URL
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {(act.items || []).map((item, idx) => {
                      const card = actDeck[idx];
                      return (
                        <div
                          key={item.id}
                          onClick={() => onOpenFlashcard(card, actDeck)}
                          className="cute-card p-3.5 bg-[#FFFDF7] hover:bg-[#FEF08A]/40 cursor-pointer flex flex-col items-center text-center gap-1.5"
                        >
                          {item.group && (
                            <span className="px-2 py-0.5 rounded-full bg-[#EDE9FE] border border-black text-[10px] font-black text-purple-950">
                              {item.group}
                            </span>
                          )}
                          <YctCustomSlotImage
                            slotKey={`act-item:${item.id}`}
                            title={`${item.hanzi} (${item.meaning})`}
                            fallbackEmoji={item.emoji}
                            bgColor="#FAF6EE"
                            sizeClass="w-16 h-16 rounded-2xl"
                            emojiClass="text-3xl"
                            onRequestEditImage={onRequestEditImage}
                          />
                          <div className="text-2xl font-hanzi text-black">{item.hanzi}</div>
                          {showPinyin && (
                            <div className="text-xs font-mono font-black text-emerald-800">
                              {item.pinyin}
                            </div>
                          )}
                          {showMeaning && (
                            <div className="text-xs font-bold text-zinc-700">
                              {item.meaning}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
        </div>
      )}

      {/* =================================================================== */}
      {/* PHẦN 6: BÀI THI MẪU YCT (PHẦN NGHE CÓ AUDIO RIÊNG TẢI FILE / URL)   */}
      {/* =================================================================== */}
      {(activeTab === 'all' || activeTab === 'mock-test') &&
        activeLesson.mockQuestions.length > 0 && (
          <section className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                  🏆
                </div>
                <div>
                  <h2 className="text-lg font-black text-black">
                    Bài thi mẫu YCT · Bài {activeLesson.lessonNumber} (测试页)
                  </h2>
                  <p className="text-xs font-bold text-zinc-500">
                    Phần Nghe có Audio riêng (giáo viên có thể tải file âm thanh gốc hoặc nhập URL) · Mọi hình ảnh đều có thể tải lên hoặc dùng URL
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onRequestEditAudio(
                      `mock-lesson-audio:${activeLesson.id}`,
                      `Audio Bài Nghe Chung - Bài thi mẫu Bài ${activeLesson.lessonNumber}`,
                      masterLessonListeningAudio
                    )
                  }
                  className="cute-btn px-3 py-1.5 rounded-xl bg-[#DBEAFE] hover:bg-blue-200 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-800" />
                  <span>
                    {masterLessonListeningAudio
                      ? 'Đổi Audio Bài Nghe Chung'
                      : '+ Gắn File/URL Audio Cả Bài Nghe'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserAnswers({})}
                  className="cute-btn px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-amber-100 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại</span>
                </button>
              </div>
            </div>

            {masterLessonListeningAudio && (
              <div className="p-3.5 rounded-2xl bg-[#DBEAFE]/60 border-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <span>🎧 File Audio Phần Thi Nghe (Bài {activeLesson.lessonNumber}):</span>
                </span>
                <audio controls src={masterLessonListeningAudio} className="h-9 w-full sm:w-96" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLesson.mockQuestions.map((q) => {
                const selected = userAnswers[q.id];
                const isCorrect = selected === q.correctAnswer;
                const customQuestionAudio = getCustomAudio(`mock-q-audio:${q.id}`);

                const qCard: YctFlashcardItem = {
                  id: q.id,
                  hanzi: q.promptHanzi,
                  pinyin: q.promptPinyin,
                  meaning: q.promptMeaning,
                  emoji: q.visualEmoji,
                  colorBg: q.part === 'listening' ? '#DBEAFE' : '#FCE7F3',
                  category: `Bài thi mẫu Bài ${activeLesson.lessonNumber} - Câu ${q.questionNumber}`,
                };

                return (
                  <div
                    key={q.id}
                    className="rounded-3xl border-2 border-black bg-[#FAF6EE] p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border border-black text-[11px] font-black ${
                            q.part === 'listening'
                              ? 'bg-[#DBEAFE] text-blue-950'
                              : 'bg-[#FCE7F3] text-pink-950'
                          }`}
                        >
                          Câu {q.questionNumber} ·{' '}
                          {q.part === 'listening' ? '🎧 Phần Nghe' : '📖 Phần Đọc'}
                        </span>

                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayQuestionAudio(
                                q.id,
                                q.transcriptHanzi || q.promptHanzi
                              )
                            }
                            className="cute-btn px-2.5 py-1 rounded-xl bg-[#FEF08A] text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Nghe câu {q.questionNumber}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onRequestEditAudio(
                                `mock-q-audio:${q.id}`,
                                `Audio Nghe Câu ${q.questionNumber} (Bài ${activeLesson.lessonNumber})`,
                                customQuestionAudio
                              )
                            }
                            className={`cute-btn px-2 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer ${
                              customQuestionAudio
                                ? 'bg-[#DCFCE7] text-emerald-950'
                                : 'bg-white text-zinc-800'
                            }`}
                            title="Tải file audio gốc lên hoặc nhập URL audio cho câu hỏi này"
                          >
                            <Upload className="w-3 h-3" />
                            <span>{customQuestionAudio ? 'Đổi Audio' : '+ Audio'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenFlashcard(qCard)}
                            className="cute-btn px-2 py-1 rounded-xl bg-white text-[10px] font-black cursor-pointer"
                            title="Mở Flashcard câu này"
                          >
                            🃏 Thẻ
                          </button>
                        </div>
                      </div>

                      {customQuestionAudio && (
                        <div className="bg-white px-2.5 py-1.5 rounded-xl border border-black flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-800 shrink-0">
                            🎧 Audio gốc:
                          </span>
                          <audio
                            controls
                            src={customQuestionAudio}
                            className="h-7 w-full"
                          />
                        </div>
                      )}

                      <div
                        onClick={() => onOpenFlashcard(qCard)}
                        className="p-3 rounded-2xl bg-white border-2 border-black flex items-center gap-3 cursor-pointer hover:bg-amber-50/50"
                      >
                        <YctCustomSlotImage
                          slotKey={`mock-q-img:${q.id}`}
                          title={`Hình câu hỏi ${q.questionNumber} (Bài ${activeLesson.lessonNumber})`}
                          fallbackEmoji={q.visualEmoji}
                          bgColor="#FAF6EE"
                          sizeClass="w-16 h-16 rounded-2xl"
                          emojiClass="text-3xl"
                          onRequestEditImage={onRequestEditImage}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-500">{q.visualDesc}</p>
                          <div className="text-xl font-hanzi text-black mt-0.5">
                            {q.promptHanzi}
                          </div>
                          {showPinyin && (
                            <div className="text-xs font-mono font-bold text-emerald-800">
                              {q.promptPinyin}
                            </div>
                          )}
                          {showMeaning && (
                            <div className="text-xs font-bold text-zinc-700">
                              {q.promptMeaning}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {q.questionType === 'true-false' ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        {['✓', '✕'].map((ans) => {
                          const isChosen = selected === ans;
                          return (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, ans, q.correctAnswer)}
                              className={`cute-btn py-2.5 px-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                                isChosen
                                  ? ans === q.correctAnswer
                                    ? 'bg-[#DCFCE7] text-emerald-950 ring-2 ring-black'
                                    : 'bg-[#FFE4E6] text-rose-950 ring-2 ring-black'
                                  : 'bg-white hover:bg-zinc-100 text-black'
                              }`}
                            >
                              <span>{ans === '✓' ? '✓ Đúng' : '✕ Sai'}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {(q.options || []).map((opt) => {
                          const isChosen = selected === opt.label;
                          const optImgKey = `mock-opt-img:${q.id}:${opt.label}`;
                          return (
                            <div
                              key={opt.label}
                              onClick={() =>
                                handleSelectAnswer(q.id, opt.label, q.correctAnswer)
                              }
                              className={`cute-btn p-2.5 rounded-2xl text-left text-xs font-bold flex items-center gap-2 cursor-pointer relative ${
                                isChosen
                                  ? opt.label === q.correctAnswer
                                    ? 'bg-[#DCFCE7] text-emerald-950 ring-2 ring-black'
                                    : 'bg-[#FFE4E6] text-rose-950 ring-2 ring-black'
                                  : 'bg-white hover:bg-zinc-100 text-black'
                              }`}
                            >
                              <span className="w-6 h-6 rounded-lg bg-[#FEF08A] border border-black flex items-center justify-center font-black shrink-0">
                                {opt.label}
                              </span>

                              <YctCustomSlotImage
                                slotKey={optImgKey}
                                title={`Hình đáp án ${opt.label} - Câu ${q.questionNumber}`}
                                fallbackEmoji={opt.emoji || '🖼️'}
                                bgColor="#FAF6EE"
                                sizeClass="w-10 h-10 rounded-xl"
                                emojiClass="text-lg"
                                onRequestEditImage={onRequestEditImage}
                              />

                              <div className="min-w-0 flex-1">
                                {opt.hanzi && (
                                  <span className="font-hanzi text-base block">
                                    {opt.hanzi}
                                  </span>
                                )}
                                {showMeaning && opt.meaning && (
                                  <span className="text-[11px] text-zinc-700 block truncate">
                                    {opt.meaning}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selected && (
                      <div
                        className={`p-2.5 rounded-xl border border-black text-xs font-bold flex items-start gap-2 ${
                          isCorrect ? 'bg-[#DCFCE7] text-emerald-950' : 'bg-[#FFE4E6] text-rose-950'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-black">
                            {isCorrect
                              ? 'Hoan hô! Bé trả lời chính xác! '
                              : `Chưa đúng rồi! Đáp án chuẩn là ${q.correctAnswer}. `}
                          </span>
                          {q.explanationVi && <span>{q.explanationVi}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {/* Nút Trao Bằng Khen YCT ở cuối bài */}
      <div className="bg-gradient-to-r from-[#FEF08A] via-[#FCE7F3] to-[#DCFCE7] rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000]">
            🎓
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-black">
              Hoàn thành bài học & Khen thưởng học sinh!
            </h3>
            <p className="text-xs font-bold text-zinc-700">
              Mở Bằng khen YCT 1 (Trang 69–70) hoặc chuyển sang bài học tiếp theo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCertificate}
            className="cute-btn px-4 py-2 rounded-xl bg-white hover:bg-amber-100 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>Mở Bằng Khen YCT 1</span>
          </button>

          {activeLesson.lessonNumber < lessons.length && (
            <button
              type="button"
              onClick={() => {
                const nextLesson = lessons.find(
                  (l) => l.lessonNumber === activeLesson.lessonNumber + 1
                );
                if (nextLesson) {
                  setDeckIndex(0);
                  onSelectLesson(nextLesson);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="cute-btn px-4 py-2 rounded-xl bg-black text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <span>Sang Bài {activeLesson.lessonNumber + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

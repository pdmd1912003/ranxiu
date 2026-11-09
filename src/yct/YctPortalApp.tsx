import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Award,
  Volume2,
  EyeOff,
  Search,
  LogOut,
  KeyRound,
  ArrowLeft,
  Compass,
  Star,
  Layers,
  X,
  Presentation,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { TeacherSession } from '../types';
import { YctLevelId, YctLesson, YctFlashcardItem } from './yctTypes';
import { YCT_LEVELS, ALL_YCT_LESSONS, ALL_YCT1_VOCAB_ITEMS } from './yct1Data';
import { YctIllustration, YctCustomSlotImage } from './yctIllustrations';
import { YctFlashcardModal } from './YctFlashcardModal';
import { YctCertificateModal } from './YctCertificateModal';
import { YctLessonView } from './YctLessonView';
import {
  YctMediaPickerModal,
  YctMediaPickerTarget,
} from './YctMediaPickerModal';
import { useYctMediaStore } from './yctMediaStorage';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { playChineseAudio } from '../utils/speech';

interface YctPortalAppProps {
  teacherSession: TeacherSession;
  onUpdateTeacherName: (newName: string) => void;
  onLogout: () => void;
  onSwitchPortal: () => void;
}

type YctViewMode = 'home' | 'roadmap' | 'lesson' | 'vocab-bank';

export const YctPortalApp: React.FC<YctPortalAppProps> = ({
  teacherSession,
  onUpdateTeacherName,
  onLogout,
  onSwitchPortal,
}) => {
  const [viewMode, setViewMode] = useState<YctViewMode>('home');
  const [activeLevelId, setActiveLevelId] = useState<YctLevelId>('yct1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('yct1-l1');
  const [isSlideMode, setIsSlideMode] = useState<boolean>(false);

  // Tự động ẩn Header khi cuộn xuống (khi chưa bấm Trình Chiếu)
  const [isHeaderHiddenOnScroll, setIsHeaderHiddenOnScroll] = useState<boolean>(false);
  const lastScrollYRef = useRef<number>(0);

  // Global Pinyin & Meaning toggles for Vocab Bank & Roadmap preview
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Flashcard Modal State
  const [activeFlashcard, setActiveFlashcard] = useState<YctFlashcardItem | null>(null);
  const [activeFlashcardDeck, setActiveFlashcardDeck] = useState<YctFlashcardItem[]>([]);

  // Media Picker Modal State (cho phép tải Hình, Video, Audio từ File hoặc URL)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<YctMediaPickerTarget | null>(
    null
  );

  const { syncStatus, syncDetail, syncAllToFirebase } = useYctMediaStore();
  const [isSyncingManual, setIsSyncingManual] = useState<boolean>(false);

  const handleManualSyncFirebase = async () => {
    setIsSyncingManual(true);
    try {
      await syncAllToFirebase();
    } finally {
      setIsSyncingManual(false);
    }
  };

  // Certificate & Change Password Modals
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState<boolean>(false);

  // Theo dõi cuộn trang: Khi chưa bấm Trình chiếu, cuộn xuống sẽ ẩn Header đi để không chiếm chỗ
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 45 && currentY > lastScrollYRef.current + 6) {
        setIsHeaderHiddenOnScroll(true);
      } else if (currentY < lastScrollYRef.current - 6 || currentY <= 20) {
        setIsHeaderHiddenOnScroll(false);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Nhấn phím Esc để thoát chế độ Trình Chiếu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSlideMode && !activeFlashcard && !mediaPickerTarget) {
        setIsSlideMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideMode, activeFlashcard, mediaPickerTarget]);

  const currentLevelInfo = useMemo(
    () => YCT_LEVELS.find((l) => l.id === activeLevelId) || YCT_LEVELS[0],
    [activeLevelId]
  );

  const currentLevelLessons = useMemo(
    () => ALL_YCT_LESSONS.filter((l) => l.levelId === activeLevelId),
    [activeLevelId]
  );

  const activeLesson = useMemo(
    () =>
      currentLevelLessons.find((l) => l.id === selectedLessonId) ||
      currentLevelLessons[0] ||
      ALL_YCT_LESSONS[0],
    [currentLevelLessons, selectedLessonId]
  );

  const filteredVocabBank = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_YCT1_VOCAB_ITEMS;
    return ALL_YCT1_VOCAB_ITEMS.filter(
      (v) =>
        v.hanzi.toLowerCase().includes(q) ||
        v.pinyin.toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleOpenFlashcard = (item: YctFlashcardItem, deck?: YctFlashcardItem[]) => {
    setActiveFlashcard(item);
    setActiveFlashcardDeck(deck && deck.length > 0 ? deck : [item]);
  };

  const handleRequestEditImage = (
    slotKey: string,
    title: string,
    currentUrl?: string
  ) => {
    setMediaPickerTarget({
      mediaType: 'image',
      slotKey,
      title,
      currentValue: currentUrl,
    });
  };

  const handleRequestEditAudio = (
    slotKey: string,
    title: string,
    currentUrl?: string
  ) => {
    setMediaPickerTarget({
      mediaType: 'audio',
      slotKey,
      title,
      currentValue: currentUrl,
    });
  };

  const handleRequestAddVideo = (songId: string, title: string) => {
    setMediaPickerTarget({
      mediaType: 'video',
      slotKey: songId,
      title: `Video bài hát: ${title}`,
    });
  };

  const handleSelectLevel = (lvlId: YctLevelId) => {
    setActiveLevelId(lvlId);
    const firstLes = ALL_YCT_LESSONS.find((l) => l.levelId === lvlId);
    if (firstLes) setSelectedLessonId(firstLes.id);
    setViewMode('roadmap');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterLesson = (lesson: YctLesson) => {
    setActiveLevelId(lesson.levelId);
    setSelectedLessonId(lesson.id);
    setViewMode('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col text-zinc-900 selection:bg-[#FEF08A] selection:text-black">
      {/* Slim Top Navigation Bar (Tự động ẩn đi khi cuộn xuống nếu chưa bật Trình chiếu) */}
      {!isSlideMode && (
        <header
          className={`sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-md border-b-2 border-black shadow-[0_2px_0px_#000] transition-all duration-200 ${
            isHeaderHiddenOnScroll
              ? '-translate-y-full opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="max-w-6xl mx-auto px-3 sm:px-5 h-13 flex items-center justify-between gap-2 overflow-x-auto">
            {/* Brand Logo gọn nhẹ */}
            <div
              onClick={() => setViewMode('home')}
              className="flex items-center gap-2 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-base group-hover:rotate-[-6deg] transition-transform">
                🐼
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-black tracking-tight">
                  Ranxiu YCT
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-[#FCE7F3] border border-black text-[10px] font-black text-pink-950">
                  1–6
                </span>
              </div>
            </div>

            {/* Level Pills (YCT 1 -> YCT 6) mỏng gọn */}
            <div className="flex items-center gap-1 shrink-0">
              {YCT_LEVELS.map((lvl) => {
                const isSelected =
                  activeLevelId === lvl.id &&
                  viewMode !== 'home' &&
                  viewMode !== 'vocab-bank';
                return (
                  <button
                    key={lvl.id}
                    onClick={() => handleSelectLevel(lvl.id)}
                    className={`px-2 py-1 rounded-lg border border-black text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                      isSelected
                        ? `${lvl.themeColor} text-black shadow-[1.5px_1.5px_0px_#000]`
                        : 'bg-white hover:bg-amber-50 text-zinc-800'
                    }`}
                  >
                    <span>YCT {lvl.bookNumber}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setViewMode('vocab-bank')}
                className={`px-2.5 py-1 rounded-lg border border-black text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                  viewMode === 'vocab-bank'
                    ? 'bg-[#DCFCE7] text-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'bg-[#FAF6EE] hover:bg-emerald-100 text-black'
                }`}
                title="Bảng từ vựng YCT 1 A-Z (Trang 62–64)"
              >
                <Layers className="w-3 h-3 text-emerald-700" />
                <span className="hidden md:inline">Kho Từ</span>
              </button>

              <button
                onClick={() => setIsCertModalOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-black bg-[#FEF08A] hover:bg-amber-300 text-black text-[11px] font-black flex items-center gap-1 cursor-pointer"
                title="Bằng khen YCT 1 (Trang 69–70)"
              >
                <Award className="w-3 h-3 text-amber-700" />
                <span className="hidden lg:inline">Bằng Khen</span>
              </button>
            </div>

            {/* Nút Đồng bộ Firebase + Trình Chiếu + Tài khoản Giáo viên & Đổi trang */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleManualSyncFirebase}
                disabled={isSyncingManual}
                className={`px-2 py-1 rounded-lg border border-black text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                  syncStatus === 'connected'
                    ? 'bg-[#DCFCE7] hover:bg-emerald-200 text-black'
                    : 'bg-[#FAF6EE] hover:bg-amber-100 text-black'
                }`}
                title={`${syncDetail} — Bấm để đồng bộ ngay toàn bộ dữ liệu YCT lên Firebase`}
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    isSyncingManual || syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden lg:inline">Đồng bộ Firebase</span>
              </button>

              <button
                onClick={() => setIsSlideMode(true)}
                className="px-2.5 py-1 rounded-lg border-2 border-black bg-black text-white hover:bg-zinc-800 text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-[1.5px_1.5px_0px_#000]"
                title="Bật chế độ Trình Chiếu toàn màn hình (ẩn thanh điều hướng)"
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Trình Chiếu</span>
              </button>

              <button
                onClick={() => setIsChangePassOpen(true)}
                className="px-2 py-1 rounded-lg border border-black bg-white hover:bg-zinc-100 text-[11px] font-black text-zinc-800 flex items-center gap-1 cursor-pointer"
                title="Đổi mật khẩu hoặc tên giáo viên"
              >
                <KeyRound className="w-3 h-3 text-emerald-700" />
                <span className="hidden xl:inline max-w-[90px] truncate">
                  {teacherSession.teacherName}
                </span>
              </button>

              <button
                onClick={onSwitchPortal}
                className="px-2 py-1 rounded-lg border border-black bg-[#EDE9FE] hover:bg-purple-200 text-[11px] font-black text-purple-950 flex items-center gap-1 cursor-pointer"
                title="Quay về màn hình chọn cổng HSK / YCT"
              >
                <Compass className="w-3 h-3" />
                <span className="hidden sm:inline">Đổi Trang</span>
              </button>

              <button
                onClick={onLogout}
                className="p-1 rounded-lg border border-black bg-[#FFE4E6] hover:bg-rose-200 text-rose-950 cursor-pointer"
                title="Đăng xuất khỏi trang YCT"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Floating Exit Slide Mode Button */}
      {isSlideMode && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
          <button
            onClick={() => setIsSlideMode(false)}
            className="cute-btn px-3.5 py-2 rounded-xl bg-black text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Thoát Trình Chiếu [Esc]</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 mx-auto w-full px-4 sm:px-6 py-5 ${
          isSlideMode ? 'max-w-7xl' : 'max-w-6xl'
        }`}
      >
        {/* ================================================================= */}
        {/* MÀN HÌNH 1: TRANG CHỦ CHỌN CẤP ĐỘ YCT 1 -> YCT 6 */}
        {/* ================================================================= */}
        {viewMode === 'home' && (
          <div className="space-y-7">
            <div className="bg-gradient-to-r from-[#DCFCE7] via-[#FEF9C3] to-[#FCE7F3] rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black">
                  <span>🎈 Vương Quốc Tiếng Trung Thiếu Nhi Quốc Tế</span>
                  <span className="font-hanzi text-sm text-pink-600">标准教程 YCT 1–6</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight">
                  Chào mừng <span className="text-emerald-700">{teacherSession.teacherName}</span> và các bé đến với lớp học YCT! 🌟
                </h1>

                <p className="text-xs sm:text-sm font-bold text-zinc-700 leading-relaxed">
                  Tất cả từ vựng, bài hát (kèm Video), trò chơi nối Hán tự & Hình minh hoạ và bài thi nghe đều hỗ trợ giáo viên <strong>tải file trực tiếp từ máy hoặc nhập URL</strong>!
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={() => handleSelectLevel('yct1')}
                    className="cute-btn px-4 py-2.5 rounded-2xl bg-[#FEF08A] hover:bg-amber-300 text-black font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Vào Giáo Án YCT 1 (12 Bài)</span>
                  </button>

                  <button
                    onClick={() => setViewMode('vocab-bank')}
                    className="cute-btn px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-50 text-black font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>Kho Từ Vựng YCT 1 (A–Z)</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border-3 border-black shadow-[4px_4px_0px_#000] p-4 text-center space-y-2 shrink-0 w-full md:w-56 flex flex-col items-center">
                <YctCustomSlotImage
                  slotKey="home-mascot-banner"
                  title="Hình linh vật trang chủ YCT"
                  fallbackEmoji="🐼👑🎂"
                  bgColor="#FEF9C3"
                  sizeClass="w-24 h-24 rounded-2xl"
                  emojiClass="text-4xl"
                  onRequestEditImage={handleRequestEditImage}
                />
                <div className="font-hanzi text-xl text-black">你好！我是星星</div>
                <p className="text-[11px] font-bold text-zinc-600">
                  6 Quyển Giáo Trình Chuẩn YCT
                </p>
              </div>
            </div>

            {/* 6 Cấp độ YCT (YCT 1 -> YCT 6) */}
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-black text-black">
                  🌈 Chọn Cấp Độ Giáo Trình YCT (YCT 1 – YCT 6)
                </h2>
                <p className="text-xs font-bold text-zinc-600">
                  Bấm vào từng cấp độ để mở bài học · Bấm biểu tượng 📷 trên hình để đổi ảnh đại diện cấp độ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {YCT_LEVELS.map((lvl) => {
                  const lvlLessons = ALL_YCT_LESSONS.filter((l) => l.levelId === lvl.id);
                  return (
                    <div
                      key={lvl.id}
                      onClick={() => handleSelectLevel(lvl.id)}
                      className="cute-card p-5 flex flex-col justify-between gap-3.5 cursor-pointer bg-white hover:bg-[#FFFDF7]"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <YctCustomSlotImage
                            slotKey={`level-icon:${lvl.id}`}
                            title={`Hình đại diện ${lvl.title}`}
                            fallbackEmoji={lvl.mascotEmoji}
                            bgColor="#FEF9C3"
                            sizeClass="w-14 h-14 rounded-2xl"
                            emojiClass="text-2xl"
                            onRequestEditImage={handleRequestEditImage}
                          />
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FEF08A] border border-black text-[11px] font-black text-black">
                              {lvl.badge}
                            </span>
                            <span className="block text-[11px] font-bold text-zinc-500 mt-1">
                              {lvl.yctExamLevel} · {lvl.hoursRange}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-black flex items-center gap-2">
                            <span>{lvl.title}</span>
                            <span className="font-hanzi text-base text-zinc-600">
                              ({lvl.titleZh})
                            </span>
                          </h3>
                          <p className="text-xs font-bold text-zinc-600 mt-1 leading-relaxed">
                            {lvl.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/10">
                        <span className="text-xs font-black text-emerald-800">
                          📚 {lvlLessons.length} bài học
                        </span>
                        <span
                          className={`px-3 py-1 rounded-xl ${lvl.themeColor} border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black`}
                        >
                          Vào lớp YCT {lvl.bookNumber} →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danh sách nhanh 12 Bài học YCT 1 ngay trên Trang chủ */}
            <div className="bg-white rounded-[2rem] border-3 border-black shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b-2 border-black/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_#000]">
                  📗
                </div>
                <div>
                  <h2 className="text-lg font-black text-black">
                    Mục Lục Giáo Án Chuẩn YCT 1 (Đầy đủ 12 Bài · Trang 6–70)
                  </h2>
                  <p className="text-xs font-bold text-zinc-500">
                    Bấm vào bài học để mở giáo án, hoặc bấm nút 🃏 để xem ngay Flashcard bài đó!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {ALL_YCT_LESSONS.filter((l) => l.levelId === 'yct1').map((les) => (
                  <div
                    key={les.id}
                    onClick={() => handleEnterLesson(les)}
                    className="cute-card p-3.5 flex flex-col justify-between gap-2.5 cursor-pointer hover:bg-amber-50/40"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <YctCustomSlotImage
                          slotKey={`lesson-banner:${les.id}`}
                          title={`Hình Bài ${les.lessonNumber}: ${les.titleVi}`}
                          fallbackEmoji={les.themeEmoji}
                          bgColor={les.themeColor}
                          sizeClass="w-12 h-12 rounded-2xl"
                          emojiClass="text-lg"
                          badgeLabel={`Bài ${les.lessonNumber}`}
                          onRequestEditImage={handleRequestEditImage}
                        />
                        <div>
                          <div className="text-xl font-hanzi text-black">{les.titleZh}</div>
                          <div className="text-[11px] font-mono font-bold text-emerald-800">
                            {les.titlePinyin}
                          </div>
                          <div className="text-xs font-black text-zinc-800">{les.titleVi}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (les.vocabItems[0]) {
                            handleOpenFlashcard(les.vocabItems[0], les.vocabItems);
                          }
                        }}
                        className="cute-btn px-2 py-1 rounded-xl bg-[#FCE7F3] text-[10px] font-black text-black shrink-0"
                      >
                        🃏 {les.vocabItems.length} thẻ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MÀN HÌNH 2: BẢN ĐỒ BÀI HỌC (ROADMAP) CỦA CẤP ĐỘ ĐANG CHỌN */}
        {/* ================================================================= */}
        {viewMode === 'roadmap' && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border-3 border-black shadow-[5px_5px_0px_#000] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('home')}
                  className="cute-btn px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-amber-100 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>6 Cấp độ YCT</span>
                </button>

                <YctCustomSlotImage
                  slotKey={`level-icon:${currentLevelInfo.id}`}
                  title={`Hình đại diện ${currentLevelInfo.title}`}
                  fallbackEmoji={currentLevelInfo.mascotEmoji}
                  bgColor="#FEF9C3"
                  sizeClass="w-12 h-12 rounded-2xl"
                  emojiClass="text-2xl"
                  onRequestEditImage={handleRequestEditImage}
                />

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black text-black">
                      {currentLevelInfo.title}
                    </h1>
                    <span className="font-hanzi text-lg text-emerald-800">
                      ({currentLevelInfo.titleZh})
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-600">
                    {currentLevelInfo.yctExamLevel} · {currentLevelInfo.vocabCount} từ vựng ·{' '}
                    {currentLevelInfo.hoursRange}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {currentLevelLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-3xl border-3 border-black shadow-[5px_5px_0px_#000] p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
                    <div
                      onClick={() => handleEnterLesson(lesson)}
                      className="flex items-center gap-3.5 cursor-pointer group"
                    >
                      <YctCustomSlotImage
                        slotKey={`lesson-banner:${lesson.id}`}
                        title={`Hình Bài ${lesson.lessonNumber}`}
                        fallbackEmoji={lesson.themeEmoji}
                        bgColor={lesson.themeColor}
                        sizeClass="w-14 h-14 rounded-2xl"
                        emojiClass="text-2xl"
                        badgeLabel={`Bài ${lesson.lessonNumber}`}
                        onRequestEditImage={handleRequestEditImage}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-black text-[10px] font-black">
                            Trang {lesson.pageNumber}
                          </span>
                          <span className="text-xs font-bold text-zinc-500">
                            {lesson.vocabItems.length} từ mới · {lesson.dialogues.length} hội thoại
                          </span>
                        </div>
                        <h3 className="text-2xl font-hanzi text-black mt-0.5 group-hover:text-emerald-700">
                          {lesson.titleZh}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {showPinyin && (
                            <span className="text-xs font-mono font-black text-emerald-800">
                              {lesson.titlePinyin}
                            </span>
                          )}
                          {showMeaning && (
                            <span className="text-xs sm:text-sm font-black text-zinc-800">
                              · {lesson.titleVi}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (lesson.vocabItems[0]) {
                            handleOpenFlashcard(lesson.vocabItems[0], lesson.vocabItems);
                          }
                        }}
                        className="cute-btn px-3 py-2 rounded-xl bg-[#FCE7F3] hover:bg-pink-200 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Flashcard ({lesson.vocabItems.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEnterLesson(lesson)}
                        className="cute-btn px-3.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-amber-300 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Vào Dạy Bài {lesson.lessonNumber}</span>
                      </button>
                    </div>
                  </div>

                  {/* Các thẻ từ vựng xem nhanh */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black text-zinc-500">
                      Từ vựng (Click mở thẻ):
                    </span>
                    {lesson.vocabItems.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleOpenFlashcard(v, lesson.vocabItems)}
                        className="px-2.5 py-1 rounded-xl bg-[#FAF6EE] hover:bg-[#FEF08A] border-2 border-black shadow-[1.5px_1.5px_0px_#000] text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{v.emoji || '🌟'}</span>
                        <span className="font-hanzi text-base text-black">{v.hanzi}</span>
                        {showPinyin && (
                          <span className="font-mono text-[11px] font-bold text-emerald-800">
                            {v.pinyin}
                          </span>
                        )}
                        {showMeaning && (
                          <span className="text-[11px] font-bold text-zinc-600">
                            · {v.meaning}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MÀN HÌNH 3: CHI TIẾT GIÁO ÁN BÀI HỌC (LESSON VIEW) */}
        {/* ================================================================= */}
        {viewMode === 'lesson' && (
          <YctLessonView
            levelInfo={currentLevelInfo}
            lessons={currentLevelLessons}
            activeLesson={activeLesson}
            onSelectLesson={(les) => setSelectedLessonId(les.id)}
            onBackToRoadmap={() => setViewMode('roadmap')}
            onOpenFlashcard={handleOpenFlashcard}
            onOpenCertificate={() => setIsCertModalOpen(true)}
            onRequestEditImage={handleRequestEditImage}
            onRequestEditAudio={handleRequestEditAudio}
            onRequestAddVideo={handleRequestAddVideo}
            isSlideMode={isSlideMode}
            onToggleSlideMode={() => setIsSlideMode((s) => !s)}
          />
        )}

        {/* ================================================================= */}
        {/* MÀN HÌNH 4: BẢNG TỪ VỰNG YCT 1 A-Z (BỐ CỤC CHUẨN HÌNH 2, KHÔNG LỒNG 2 DIV) */}
        {/* ================================================================= */}
        {viewMode === 'vocab-bank' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-3 border-black shadow-[5px_5px_0px_#000] p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setViewMode('home')}
                    className="cute-btn px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-amber-100 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Trang chủ YCT</span>
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-black">
                      Bảng Từ Vựng YCT 1 · 词语表 ({ALL_YCT1_VOCAB_ITEMS.length} từ · Trang 62–64)
                    </h1>
                    <p className="text-xs font-bold text-zinc-500">
                      Bấm trực tiếp vào ô Pinyin hoặc Nghĩa bên trong thẻ để bật / tắt hiển thị
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm từ vựng theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt (VD: 老师, māo, táo, gia đình)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FAF6EE] border-2 border-black text-xs sm:text-sm font-bold text-black focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredVocabBank.map((vocab) => (
                <div
                  key={vocab.id}
                  onClick={() => handleOpenFlashcard(vocab, filteredVocabBank)}
                  className="grid grid-cols-12 gap-3.5 items-stretch min-h-[210px] cursor-pointer group"
                >
                  {/* BÊN TRÁI: HÌNH MINH HOẠ (1 div duy nhất, không chồng 2 div) */}
                  <YctIllustration
                    item={vocab}
                    size="fill"
                    className="col-span-5"
                    onRequestEditImage={handleRequestEditImage}
                  />

                  {/* BÊN PHẢI: Ô TRÊN [HÁN TỰ LỚN] + Ô DƯỚI [NGHĨA, PINYIN] */}
                  <div className="col-span-7 flex flex-col justify-between gap-3">
                    <div className="flex-1 border-3 border-black rounded-3xl bg-[#FFFDF7] group-hover:bg-[#FEF9C3]/35 p-3.5 flex items-center justify-center text-center relative shadow-[4px_4px_0px_#000] transition-colors">
                      <span className="absolute top-2 left-3 text-[10px] font-black uppercase text-zinc-400">
                        Bài {vocab.lessonNumber} · HÁN TỰ
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playChineseAudio(vocab.hanzi);
                        }}
                        className="absolute top-2 right-2.5 p-1.5 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
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
                          <span className="text-xs font-bold flex items-center justify-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Đã ẩn Pinyin</span>
                          </span>
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
                          <span className="text-xs font-bold flex items-center justify-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Đã ẩn Nghĩa</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Kid Footer */}
      {!isSlideMode && (
        <footer className="border-t-2 border-black bg-[#FFFDF7] py-5 text-xs font-bold text-zinc-600 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>🐼🎈</span>
              <span className="font-black text-black">Ranxiu YCT Kids</span>
              <span>· Giáo trình chuẩn YCT 1–6 (Độc lập với cổng HSK)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-black font-bold ${
                  syncStatus === 'connected'
                    ? 'bg-[#DCFCE7] text-black'
                    : syncStatus === 'syncing' || syncStatus === 'connecting'
                    ? 'bg-[#FAF6EE] text-black'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{syncDetail}</span>
              </div>

              <button
                onClick={handleManualSyncFirebase}
                disabled={isSyncingManual}
                className="cute-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FCE7F3] hover:bg-pink-200 text-black border border-black font-black text-[11px] cursor-pointer"
                title="Đẩy toàn bộ giáo trình YCT, hình ảnh, video & audio hội thoại/bài thi lên Cloud Firestore"
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    isSyncingManual || syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>Đồng bộ Firebase</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Interactive YCT Flashcard Modal */}
      <YctFlashcardModal
        item={activeFlashcard}
        deck={activeFlashcardDeck}
        initialShowPinyin={showPinyin}
        initialShowMeaning={showMeaning}
        onSelectCard={(card) => setActiveFlashcard(card)}
        onRequestEditImage={handleRequestEditImage}
        onClose={() => setActiveFlashcard(null)}
      />

      {/* Media Picker Modal (Tải File hoặc Nhập URL cho Hình ảnh, Video, Audio) */}
      <YctMediaPickerModal
        target={mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
      />

      {/* YCT 1 Certificate Modal */}
      <YctCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        defaultTeacherName={teacherSession.teacherName}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        onNameUpdated={onUpdateTeacherName}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, PlusCircle, Presentation, KeyRound, LogOut } from 'lucide-react';
import { LevelId } from '../types';

interface TopNavProps {
  currentView: 'curriculum' | 'pinyin-chart' | 'lesson-tree' | 'lesson';
  activeLevelId: LevelId;
  onSelectLevel: (lvl: LevelId) => void;
  onOpenTeacherModal: () => void;
  onOpenPinyinChart: () => void;
  onGoHome: () => void;
  isSlideModeActive: boolean;
  onToggleSlideMode: () => void;
  teacherName?: string;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  activeLevelId,
  onSelectLevel,
  onOpenTeacherModal,
  onOpenPinyinChart,
  onGoHome,
  isSlideModeActive,
  onToggleSlideMode,
  teacherName,
  onOpenChangePassword,
  onLogout,
}) => {
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState<boolean>(false);
  const lastScrollYRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 45 && currentY > lastScrollYRef.current + 6) {
        setIsHiddenOnScroll(true);
      } else if (currentY < lastScrollYRef.current - 6 || currentY <= 20) {
        setIsHiddenOnScroll(false);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-[#fbfbf9]/95 backdrop-blur-md border-b-2 border-black transition-all duration-200 ${
        isHiddenOnScroll
          ? '-translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-4">
        {/* Brand: Ranxiu */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center font-hanzi text-base text-black shadow-[2px_2px_0px_#000] transition-transform">
            染
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-black">
              Ranxiu
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FCE7F3] text-black border border-black font-normal font-hanzi">
              HSK
            </span>
          </div>
        </button>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-zinc-700">
          <button
            onClick={onGoHome}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              currentView === 'curriculum'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'hover:bg-[#FAF6EE] text-zinc-700'
            }`}
          >
            Các Cấp Độ
          </button>

          <button
            onClick={onOpenPinyinChart}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
              currentView === 'pinyin-chart'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'hover:bg-[#FAF6EE] text-zinc-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Bảng Pinyin</span>
          </button>

          <button
            onClick={() => onSelectLevel('hsk1')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              (currentView === 'lesson-tree' || currentView === 'lesson') && activeLevelId === 'hsk1'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'hover:bg-[#FAF6EE] text-zinc-700'
            }`}
          >
            HSK 1
          </button>

          <button
            onClick={() => onSelectLevel('hsk2')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              (currentView === 'lesson-tree' || currentView === 'lesson') && activeLevelId === 'hsk2'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'hover:bg-[#FAF6EE] text-zinc-700'
            }`}
          >
            HSK 2
          </button>

          <button
            onClick={() => onSelectLevel('hsk3')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              (currentView === 'lesson-tree' || currentView === 'lesson') && activeLevelId === 'hsk3'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'hover:bg-[#FAF6EE] text-zinc-700'
            }`}
          >
            HSK 3 - 6
          </button>
        </nav>

        {/* Primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTeacherModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-black bg-[#DCFCE7] hover:bg-emerald-200 border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
            title="Tạo bài khóa và thêm audio riêng"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo Bài Khóa</span>
            <span className="sm:hidden">Thêm</span>
          </button>

          <button
            onClick={onToggleSlideMode}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap ${
              isSlideModeActive ? 'bg-[#FCE7F3] text-black' : 'bg-black text-white'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSlideModeActive ? 'Thoát Slide' : 'Trình Chiếu'}</span>
          </button>

          {/* Teacher Profile & Controls */}
          {teacherName && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l-2 border-black/15">
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#FAF6EE] hover:bg-[#FEF08A] border-2 border-black text-xs font-bold text-black shadow-[1.5px_1.5px_0px_#000] transition-colors"
                title="Cài đặt tài khoản & Đổi mật mã giáo viên"
              >
                <span className="text-xs">👩‍🏫</span>
                <span className="max-w-[90px] truncate hidden md:inline">{teacherName}</span>
                <KeyRound className="w-3 h-3 text-zinc-600" />
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white hover:bg-rose-100 border-2 border-black text-xs font-black text-zinc-800 hover:text-red-700 shadow-[1.5px_1.5px_0px_#000] transition-colors"
                title="Đăng xuất / Chọn trang khác (HSK / YCT)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Đổi trang</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

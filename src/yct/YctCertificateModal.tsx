import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Award, Sparkles, Volume2 } from 'lucide-react';
import { playChineseAudio } from '../utils/speech';

interface YctCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTeacherName?: string;
}

export const YctCertificateModal: React.FC<YctCertificateModalProps> = ({
  isOpen,
  onClose,
  defaultTeacherName = 'Cô Nhiên Tú',
}) => {
  const [studentName, setStudentName] = useState('Bé Nguyệt Nguyệt (月月)');
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [awardDate, setAwardDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [langMode, setLangMode] = useState<'both' | 'zh' | 'vi'>('both');

  if (!isOpen) return null;

  const handleCelebrate = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      //
    }
    playChineseAudio('恭喜你学完YCT标准教程一，表现优秀！');
  };

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF7] rounded-[2rem] border-3 border-black shadow-[8px_8px_0px_#000] p-5 sm:p-7 w-full max-w-2xl max-h-[94vh] overflow-y-auto relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#FEF08A] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Award className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-black">
                Bằng Khen YCT 1 · YCT 奖状 (Trang 69–70)
              </h3>
              <p className="text-xs font-bold text-zinc-500">
                Trao tặng học sinh hoàn thành xuất sắc Giáo trình chuẩn YCT 1
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cute-btn p-2 bg-white hover:bg-rose-100 rounded-2xl border-2 border-black"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Inputs to customize student name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 bg-[#FAF6EE] p-3 rounded-2xl border-2 border-black/20">
          <div>
            <label className="block text-[11px] font-black text-zinc-700 mb-1">
              Tên bé nhận bằng khen:
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-zinc-700 mb-1">
              Giáo viên trao tặng:
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-zinc-700 mb-1">
              Ngày cấp:
            </label>
            <input
              type="text"
              value={awardDate}
              onChange={(e) => setAwardDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black"
            />
          </div>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setLangMode('both')}
            className={`cute-btn px-3 py-1.5 rounded-xl text-xs font-black ${
              langMode === 'both' ? 'bg-[#FEF08A] text-black' : 'bg-white text-zinc-600'
            }`}
          >
            Song ngữ Trung - Việt
          </button>
          <button
            onClick={() => setLangMode('zh')}
            className={`cute-btn px-3 py-1.5 rounded-xl text-xs font-black ${
              langMode === 'zh' ? 'bg-[#DCFCE7] text-black' : 'bg-white text-zinc-600'
            }`}
          >
            Bản Tiếng Trung (Trang 69)
          </button>
          <button
            onClick={() => setLangMode('vi')}
            className={`cute-btn px-3 py-1.5 rounded-xl text-xs font-black ${
              langMode === 'vi' ? 'bg-[#FCE7F3] text-black' : 'bg-white text-zinc-600'
            }`}
          >
            Bản Tiếng Việt (Trang 70)
          </button>
        </div>

        {/* Certificate Frame */}
        <div className="relative rounded-3xl border-4 border-amber-500 bg-gradient-to-b from-[#FFFDF5] via-white to-[#FEF9C3]/40 p-6 sm:p-8 shadow-[6px_6px_0px_#000] text-center space-y-5 overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-2xl">
            <span>🌹</span>
            <span>🌟</span>
            <span>🏆</span>
            <span>🌟</span>
            <span>🌹</span>
          </div>

          <div className="space-y-1">
            {(langMode === 'both' || langMode === 'zh') && (
              <h2 className="text-3xl sm:text-4xl font-hanzi text-rose-600 drop-shadow-xs">
                YCT 奖状
              </h2>
            )}
            {(langMode === 'both' || langMode === 'vi') && (
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600">
                Bằng khen YCT
              </h3>
            )}
          </div>

          <div className="py-2">
            <p className="text-xs font-bold text-zinc-500 mb-1">
              Khen tặng em (同学):
            </p>
            <div className="inline-block px-6 py-2 rounded-2xl bg-[#FEF08A] border-2 border-black shadow-[3px_3px_0px_#000] text-xl sm:text-2xl font-black text-black">
              {studentName || 'Bé Chăm Ngoan'}
            </div>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            {(langMode === 'both' || langMode === 'zh') && (
              <p
                onClick={() =>
                  playChineseAudio('恭喜你学完YCT标准教程1，表现优秀，特颁此奖状表示鼓励。')
                }
                className="font-hanzi text-xl sm:text-2xl text-zinc-900 leading-relaxed cursor-pointer hover:text-rose-600 transition-colors"
                title="Bấm để nghe đọc lời khen tiếng Trung"
              >
                恭喜你学完《YCT标准教程1》，表现优秀，特颁此奖状表示鼓励。
              </p>
            )}
            {(langMode === 'both' || langMode === 'vi') && (
              <p className="text-sm sm:text-base font-black text-zinc-800 leading-relaxed">
                Chúc mừng em đã học xong <span className="text-emerald-700">Giáo trình chuẩn YCT 1</span> với thành tích xuất sắc!
              </p>
            )}
          </div>

          {/* Cute Kids Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-amber-300/60 text-xs font-bold text-zinc-700">
            <div className="flex items-center gap-2 text-2xl">
              <span>👧🐱</span>
              <span>👦🐮</span>
              <span>👧🐑</span>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-zinc-500">Giáo viên (教师签名): </span>
                <span className="font-black text-black underline decoration-dotted">
                  {teacherName}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Ngày (日期): </span>
                <span className="font-black text-black">{awardDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Celebrate Button */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={handleCelebrate}
            className="cute-btn px-6 py-3 rounded-2xl bg-[#DCFCE7] hover:bg-emerald-300 text-black font-black text-sm flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Trao Bằng Khen & Bắn Pháo Hoa Chúc Mừng 🎉</span>
          </button>
          <button
            onClick={() =>
              playChineseAudio('恭喜你学完YCT标准教程1，表现优秀，特颁此奖状表示鼓励。')
            }
            className="cute-btn px-4 py-3 rounded-2xl bg-[#FCE7F3] hover:bg-pink-200 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Đọc lời khen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

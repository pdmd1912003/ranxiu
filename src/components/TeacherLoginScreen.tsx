import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  BookOpen,
  User,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Baby,
} from 'lucide-react';
import {
  loginTeacher,
  getSavedTeacherName,
  getCloudTeacherAuth,
  PortalType,
} from '../utils/auth';
import { TeacherSession } from '../types';

interface TeacherLoginScreenProps {
  onLoginSuccess: (session: TeacherSession, portal: PortalType) => void;
  defaultPortal?: PortalType | null;
}

export const TeacherLoginScreen: React.FC<TeacherLoginScreenProps> = ({
  onLoginSuccess,
  defaultPortal = null,
}) => {
  // Bước 1: Chọn trang trước khi đăng nhập (null = chưa chọn, 'hsk' = Trang HSK, 'yct' = Trang YCT)
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(defaultPortal);
  const [username, setUsername] = useState(getSavedTeacherName());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Tải thông tin mới nhất từ Cloud Firestore khi mở trang
    getCloudTeacherAuth().then((cfg) => {
      if (cfg && cfg.username) {
        setUsername(cfg.username);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) {
      setErrorMsg('Vui lòng chọn trang muốn vào trước khi đăng nhập!');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập giáo viên!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật mã truy cập!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await loginTeacher(username, password, rememberMe, selectedPortal);
      if (res.success && res.session) {
        onLoginSuccess(res.session, selectedPortal);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi xác thực!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF6EE] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none"
      style={{ backgroundImage: "url('/panda-bg.jpg')" }}
    >
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-[#DCFCE7] rounded-full filter blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#FCE7F3] rounded-full filter blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-[#FEF08A] rounded-full filter blur-3xl opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-3xl">
        {/* App Logo & Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-3xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center font-hanzi text-2xl font-bold text-black shadow-[3px_3px_0px_#000] rotate-[-2deg] hover:rotate-0 transition-transform">
              染
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-black tracking-tight">Ranxiu</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FCE7F3] text-black border border-black font-hanzi font-bold">
                  汉语
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-bold">
                Hệ Thống Giảng Dạy Tiếng Trung Độc Lập (HSK & YCT)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black shadow-[2px_2px_0px_#000] text-xs font-bold text-zinc-700 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {selectedPortal === null
                ? 'Bước 1/2: Chọn trang dạy học trước khi đăng nhập'
                : selectedPortal === 'yct'
                ? 'Bước 2/2: Đăng nhập vào Trang YCT Thiếu Nhi (YCT 1 - YCT 6)'
                : 'Bước 2/2: Đăng nhập vào Trang HSK Chuẩn (HSK 1 - HSK 6)'}
            </span>
          </div>
        </div>

        {/* STEP 1: PORTAL SELECTION BEFORE LOGIN */}
        {selectedPortal === null ? (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border-3 border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-black">
                Chọn Trang Giảng Dạy Muốn Vào
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 font-bold">
                Hai trang <span className="text-black underline">HSK</span> và{' '}
                <span className="text-black underline">YCT</span> hoạt động hoàn toàn riêng biệt, không tương tác với nhau. Vui lòng chọn trang trước khi đăng nhập:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Trang HSK */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal('hsk');
                  setErrorMsg(null);
                }}
                className="text-left rounded-3xl p-6 bg-[#DCFCE7] hover:bg-emerald-200 border-3 border-black shadow-[5px_5px_0px_#000] hover:translate-y-[-2px] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                      TRANG HSK (NGƯỜI LỚN & HỌC VIÊN)
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000] group-hover:scale-110 transition-transform">
                      🎓
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-black flex items-center gap-2">
                    <GraduationCap className="w-6 h-6" />
                    <span>Cổng Giáo Trình HSK</span>
                  </h3>
                  <p className="text-xs font-bold text-zinc-700 mt-2 leading-relaxed">
                    Giáo trình Chuẩn New HSK 1 – HSK 6, Bảng Pinyin, Từ vựng, Ngữ pháp, Bài khóa, Tập viết chữ Hán & Quản trị giáo án đám mây.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      Pinyin
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      HSK 1 - HSK 6
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      Ngữ pháp & Bài khóa
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t-2 border-black/15 flex items-center justify-between text-xs font-black text-black">
                  <span>Chọn Trang HSK & Đăng nhập</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black text-white group-hover:bg-zinc-800 transition-colors">
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>

              {/* Card 2: Trang YCT (Tiếng Trung Trẻ Em) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal('yct');
                  setErrorMsg(null);
                }}
                className="text-left rounded-3xl p-6 bg-[#FEF08A] hover:bg-yellow-300 border-3 border-black shadow-[5px_5px_0px_#000] hover:translate-y-[-2px] transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-[#FCE7F3] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                      TRANG YCT (TIẾNG TRUNG TRẺ EM)
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000] group-hover:scale-110 transition-transform">
                      🐼
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-black flex items-center gap-2">
                    <Baby className="w-6 h-6" />
                    <span>Cổng Thiếu Nhi YCT</span>
                  </h3>
                  <p className="text-xs font-bold text-zinc-800 mt-2 leading-relaxed">
                    Thiết kế sinh động dành riêng cho trẻ nhỏ từ <strong>YCT 1 đến YCT 6</strong>. Toàn bộ giáo án, từ vựng, truyện tranh, bài hát đều click mở <strong>Flashcard (Hình ảnh, Pinyin, Nghĩa, Hán tự)</strong> có nút bật/tắt Pinyin & Nghĩa.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      YCT 1 - YCT 6
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      Flashcard Hình Ảnh
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-black text-[11px] font-black">
                      Bật/Tắt Pinyin & Nghĩa
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t-2 border-black/15 flex items-center justify-between text-xs font-black text-black">
                  <span>Chọn Trang YCT & Đăng nhập</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black text-white group-hover:bg-zinc-800 transition-colors">
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: LOGIN INTO SELECTED PORTAL */
          <div className="max-w-md mx-auto bg-white rounded-3xl border-3 border-black shadow-[6px_6px_0px_#000] p-6 sm:p-8 space-y-5">
            {/* Back to Portal Chooser button */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal(null);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-zinc-200 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Chọn lại trang (HSK / YCT)</span>
              </button>

              <span
                className={`px-3 py-1 rounded-full border-2 border-black text-xs font-black ${
                  selectedPortal === 'yct' ? 'bg-[#FEF08A]' : 'bg-[#DCFCE7]'
                }`}
              >
                {selectedPortal === 'yct' ? '🐼 Trang YCT (1-6)' : '🎓 Trang HSK (1-6)'}
              </span>
            </div>

            <div className="border-b-2 border-black/10 pb-4">
              <h2 className="text-xl font-black text-black flex items-center gap-2">
                <Lock className="w-5 h-5 text-zinc-800" />
                <span>
                  {selectedPortal === 'yct'
                    ? 'Đăng Nhập Trang YCT Thiếu Nhi'
                    : 'Đăng Nhập Trang Giáo Trình HSK'}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-bold mt-1">
                {selectedPortal === 'yct'
                  ? 'Đăng nhập vào không gian dạy tiếng Trung trẻ em YCT 1 – YCT 6 (tách biệt hoàn toàn với trang HSK).'
                  : 'Đăng nhập vào không gian dạy giáo trình chuẩn HSK 1 – HSK 6 (tách biệt hoàn toàn với trang YCT).'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-[#FCE7F3] border-2 border-black text-xs font-bold text-red-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Teacher Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-600" />
                  <span>
                    Tên đăng nhập giáo viên <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Nhập tên đăng nhập..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#fbfbf9] border-2 border-black text-sm font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000] transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>
                    Mật mã truy cập <span className="text-red-500">*</span>
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Nhập mật mã..."
                    autoFocus
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-2xl bg-[#fbfbf9] border-2 border-black text-sm font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black p-1 focus:outline-none"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-700">
                    Ghi nhớ đăng nhập trang {selectedPortal.toUpperCase()} trên thiết bị này
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-2xl border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  selectedPortal === 'yct'
                    ? 'bg-[#FEF08A] hover:bg-yellow-300'
                    : 'bg-[#DCFCE7] hover:bg-emerald-300'
                }`}
              >
                {isLoading ? (
                  <span>Đang kiểm tra...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {selectedPortal === 'yct'
                        ? 'Vào Lớp Học YCT Thiếu Nhi 🐼'
                        : 'Vào Lớp Học HSK Chuẩn 🎓'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Features List */}
            <div className="pt-2 border-t-2 border-black/10 grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-600">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  {selectedPortal === 'yct' ? 'Giáo trình YCT 1 – YCT 6' : 'Giáo trình New HSK 1 – 6'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <span>
                  {selectedPortal === 'yct'
                    ? 'Flashcard Hình Ảnh & Bật/Tắt'
                    : 'Audio & Giáo án trực tuyến'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

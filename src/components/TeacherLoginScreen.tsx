import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Sparkles, BookOpen, User, AlertCircle } from 'lucide-react';
import { loginTeacher, getSavedTeacherName, getCloudTeacherAuth } from '../utils/auth';
import { TeacherSession } from '../types';

interface TeacherLoginScreenProps {
  onLoginSuccess: (session: TeacherSession) => void;
}

export const TeacherLoginScreen: React.FC<TeacherLoginScreenProps> = ({ onLoginSuccess }) => {
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
      const res = await loginTeacher(username, password, rememberMe);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
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
      <div className="relative z-10 w-full max-w-md">
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
              <p className="text-xs text-zinc-600 font-bold">Cổng Dạy Học & Quản Trị Giáo Án</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black shadow-[2px_2px_0px_#000] text-xs font-bold text-zinc-700 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khu vực bảo mật dành riêng cho Giáo viên</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl border-2 border-black shadow-[6px_6px_0px_#000] p-6 sm:p-8 space-y-5">
          <div className="border-b-2 border-black/10 pb-4">
            <h2 className="text-xl font-black text-black flex items-center gap-2">
              <Lock className="w-5 h-5 text-zinc-800" />
              <span>Đăng Nhập Giáo Viên</span>
            </h2>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Vui lòng nhập tên đăng nhập và mật mã truy cập đã thiết lập trên hệ thống.
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
                <span>Tên đăng nhập giáo viên <span className="text-red-500">*</span></span>
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
                <span>Mật mã truy cập <span className="text-red-500">*</span></span>
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
                  Ghi nhớ đăng nhập trên thiết bị này
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-[#DCFCE7] hover:bg-emerald-300 border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Đang kiểm tra...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Vào Lớp Học & Giảng Dạy</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Features List */}
          <div className="pt-2 border-t-2 border-black/10 grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-600">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Giáo trình New HSK 1 & 2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              <span>Audio & Giáo án trực tuyến</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

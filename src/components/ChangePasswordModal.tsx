import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle, User, ShieldCheck, Lock } from 'lucide-react';
import { updateTeacherCredentials, getSavedTeacherName } from '../utils/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNameUpdated?: (newName: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onNameUpdated,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [teacherName, setTeacherName] = useState(getSavedTeacherName());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPass.trim()) {
      setErrorMsg('Vui lòng nhập mật mã hiện tại để xác thực!');
      return;
    }

    if (newPass.trim() && newPass.trim().length < 4) {
      setErrorMsg('Mật mã mới phải có ít nhất 4 ký tự!');
      return;
    }

    if (newPass.trim() && newPass.trim() !== confirmPass.trim()) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateTeacherCredentials(
        currentPass,
        newPass.trim() ? newPass.trim() : undefined,
        teacherName.trim() ? teacherName.trim() : undefined
      );

      if (res.success) {
        setSuccessMsg(res.message);
        if (res.updatedUsername) {
          onNameUpdated?.(res.updatedUsername);
        }
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật thông tin!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-black shadow-[6px_6px_0px_#000] p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-black bg-[#FAF6EE] hover:bg-rose-100 flex items-center justify-center transition-all focus:outline-none cursor-pointer"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 pb-2 border-b-2 border-black/10">
          <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000]">
            <KeyRound className="w-5 h-5 text-emerald-800" />
          </div>
          <div>
            <h3 className="text-base font-black text-black">Cài Đặt Tài Khoản Giáo Viên</h3>
            <p className="text-xs text-zinc-500 font-medium">Đổi tên đăng nhập & mật mã máy chủ</p>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#FCE7F3] border-2 border-black text-xs font-bold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-[#DCFCE7] border-2 border-black text-xs font-bold text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Teacher Username */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-zinc-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-600" />
              <span>Tên đăng nhập giáo viên</span>
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6EE] border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white"
            />
          </div>

          <div className="pt-2 border-t border-black/10">
            {/* Current Password */}
            <div className="space-y-1 mb-2.5">
              <label className="block text-xs font-black text-zinc-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Mật mã hiện tại <span className="text-red-500">*</span></span>
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Nhập mật mã đang dùng để xác thực"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6EE] border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
              Đổi Mật Mã Mới (Để trống nếu chỉ đổi tên)
            </span>

            {/* New Password */}
            <div className="space-y-1 mb-2.5">
              <label className="block text-xs font-black text-zinc-800">
                Mật mã mới (tối thiểu 4 ký tự)
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Nhập mật mã mới..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6EE] border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-zinc-800">
                Xác nhận lại mật mã mới
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Nhập lại mật mã mới..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6EE] border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-black/20 text-[11px] text-zinc-600 font-medium">
            💡 Sau khi lưu, thông tin mới sẽ được áp dụng cho toàn bộ các thiết bị (máy tính, điện thoại). Chỉ một mình thầy/cô có thông tin này mới có thể truy cập.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-xs font-black text-black cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#DCFCE7] hover:bg-emerald-300 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu lên máy chủ...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

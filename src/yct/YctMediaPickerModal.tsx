import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link2,
  Image as ImageIcon,
  Volume2,
  Video,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  fileToDataUrl,
  setYctCustomImage,
  setYctCustomAudio,
  addYctSongVideo,
  getYouTubeEmbedUrl,
} from './yctMediaStorage';

export interface YctMediaPickerTarget {
  mediaType: 'image' | 'audio' | 'video';
  slotKey: string; // image slotKey, audio slotKey, or songId
  title: string;
  currentValue?: string;
}

interface YctMediaPickerModalProps {
  target: YctMediaPickerTarget | null;
  onClose: () => void;
}

export const YctMediaPickerModal: React.FC<YctMediaPickerModalProps> = ({
  target,
  onClose,
}) => {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState<string>(
    target?.currentValue && !target.currentValue.startsWith('data:')
      ? target.currentValue
      : ''
  );
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [previewData, setPreviewData] = useState<string | null>(
    target?.currentValue || null
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!target) return null;

  const acceptAttr =
    target.mediaType === 'image'
      ? 'image/*'
      : target.mediaType === 'audio'
      ? 'audio/*,.mp3,.wav,.m4a,.ogg'
      : 'video/*,.mp4,.webm,.mov';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewData(dataUrl);
      if (target.mediaType === 'video' && !videoTitle.trim()) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch {
      setErrorMsg('Không thể đọc file này. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập đường dẫn URL!');
      return;
    }
    setErrorMsg(null);
    setPreviewData(trimmed);
  };

  const handleSave = async () => {
    const finalValue = mode === 'url' ? urlInput.trim() || previewData : previewData;
    if (!finalValue) {
      setErrorMsg('Vui lòng tải file lên hoặc nhập đường dẫn URL trước khi lưu!');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      if (target.mediaType === 'image') {
        await setYctCustomImage(target.slotKey, finalValue);
      } else if (target.mediaType === 'audio') {
        await setYctCustomAudio(target.slotKey, finalValue);
      } else if (target.mediaType === 'video') {
        await addYctSongVideo(target.slotKey, {
          title:
            videoTitle.trim() ||
            (mode === 'file' ? 'Video tải lên từ máy' : 'Video từ URL'),
          url: finalValue,
          sourceType: mode,
        });
      }
      onClose();
    } catch {
      setErrorMsg('Có lỗi khi lưu dữ liệu. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setIsSaving(true);
    try {
      if (target.mediaType === 'image') {
        await setYctCustomImage(target.slotKey, null);
      } else if (target.mediaType === 'audio') {
        await setYctCustomAudio(target.slotKey, null);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const ytEmbed =
    target.mediaType === 'video' && previewData ? getYouTubeEmbedUrl(previewData) : null;

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[320] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF7] rounded-[2rem] border-3 border-black shadow-[8px_8px_0px_#000] p-5 sm:p-6 w-full max-w-lg space-y-4 select-none max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF08A] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              {target.mediaType === 'image' && <ImageIcon className="w-5 h-5 text-black" />}
              {target.mediaType === 'audio' && <Volume2 className="w-5 h-5 text-black" />}
              {target.mediaType === 'video' && <Video className="w-5 h-5 text-black" />}
            </div>
            <div>
              <h3 className="text-base font-black text-black">
                {target.mediaType === 'image' && 'Cập Nhật Hình Minh Hoạ'}
                {target.mediaType === 'audio' && 'Gắn Audio Cho Phần Nghe'}
                {target.mediaType === 'video' && 'Thêm Video Cho Bài Hát'}
              </h3>
              <p className="text-xs font-bold text-zinc-600 line-clamp-1">
                {target.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cute-btn p-1.5 rounded-xl bg-white hover:bg-rose-100"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Mode Switcher: Tải File Lên vs Nhập URL */}
        <div className="grid grid-cols-2 gap-2.5 bg-[#FAF6EE] p-1.5 rounded-2xl border-2 border-black">
          <button
            type="button"
            onClick={() => {
              setMode('file');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === 'file'
                ? 'bg-[#DCFCE7] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Chọn File Từ Máy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('url');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === 'url'
                ? 'bg-[#FEF08A] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>2. Dán Đường Dẫn URL</span>
          </button>
        </div>

        {/* Nếu là Video thì cho phép đặt tên hiển thị */}
        {target.mediaType === 'video' && (
          <div className="space-y-1">
            <label className="block text-xs font-black text-zinc-800">
              Tên tiêu đề Video (tuỳ chọn):
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="VD: Video bài hát vui nhộn cho bé..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none"
            />
          </div>
        )}

        {/* Input Area */}
        {mode === 'file' ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-black rounded-2xl bg-[#FAF6EE] hover:bg-[#FEF9C3]/50 p-6 text-center cursor-pointer transition-colors space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6 text-emerald-700" />
              </div>
              <p className="text-xs sm:text-sm font-black text-black">
                Bấm vào đây để chọn{' '}
                {target.mediaType === 'image'
                  ? 'file Hình ảnh (PNG, JPG, GIF, WEBP...)'
                  : target.mediaType === 'audio'
                  ? 'file Âm thanh (MP3, WAV, M4A, OGG...)'
                  : 'file Video (MP4, WEBM, MOV...)'}{' '}
                từ máy tính
              </p>
              <p className="text-[11px] font-bold text-zinc-500">
                Dữ liệu được lưu trực tiếp vào trình duyệt để sử dụng lâu dài
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-black text-zinc-800">
              {target.mediaType === 'image' && 'Nhập đường dẫn URL hình ảnh:'}
              {target.mediaType === 'audio' && 'Nhập đường dẫn URL file âm thanh (MP3/WAV...):'}
              {target.mediaType === 'video' &&
                'Nhập đường dẫn URL Video (Link YouTube hoặc link file .mp4):'}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreviewData(e.target.value.trim() || null);
                }}
                placeholder={
                  target.mediaType === 'image'
                    ? 'https://example.com/hinh-minh-hoa.png'
                    : target.mediaType === 'audio'
                    ? 'https://example.com/audio-nghe-yct1.mp3'
                    : 'https://www.youtube.com/watch?v=... hoặc https://.../video.mp4'
                }
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="cute-btn px-3 py-2 rounded-xl bg-[#FEF08A] text-xs font-black text-black"
              >
                Xem thử
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FFE4E6] border-2 border-black text-xs font-black text-rose-900">
            {errorMsg}
          </div>
        )}

        {/* Preview Box */}
        {previewData && (
          <div className="p-3.5 rounded-2xl bg-white border-2 border-black space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-zinc-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Xem trước nội dung đã chọn:</span>
              </span>
            </div>

            {target.mediaType === 'image' && (
              <div className="w-full h-44 rounded-xl bg-[#FAF6EE] border border-black/20 flex items-center justify-center overflow-hidden">
                <img
                  src={previewData}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {target.mediaType === 'audio' && (
              <audio controls src={previewData} className="w-full h-10" />
            )}

            {target.mediaType === 'video' && (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-black">
                {ytEmbed ? (
                  <iframe
                    src={ytEmbed}
                    title="YouTube video preview"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={previewData} controls className="w-full h-full object-contain" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black/10">
          {target.mediaType !== 'video' && target.currentValue ? (
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isSaving}
              className="cute-btn px-3 py-2 rounded-xl bg-[#FFE4E6] hover:bg-rose-200 text-rose-950 text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cute-btn px-4 py-2 rounded-xl bg-white text-xs font-black text-zinc-700 cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="cute-btn px-5 py-2 rounded-xl bg-[#DCFCE7] hover:bg-emerald-300 text-xs font-black text-black flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu áp dụng'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

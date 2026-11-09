import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Upload,
  Link2,
  Mic,
  Square,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
  Music,
  Headphones,
} from 'lucide-react';
import { YctDialogueSection } from './yctTypes';
import { useYctMediaStore, fileToDataUrl } from './yctMediaStorage';
import { VoiceRecorder, playChineseAudio, stopAllAudio } from '../utils/speech';

interface YctDialogueAudioBarProps {
  dialogue: YctDialogueSection;
  lessonId: string;
}

export const YctDialogueAudioBar: React.FC<YctDialogueAudioBarProps> = ({
  dialogue,
  lessonId,
}) => {
  const { getCustomAudio, getCustomAudioName, setCustomAudio } = useYctMediaStore();

  const slotKey = `yct-dlg-audio:${lessonId}:${dialogue.id}`;
  const customAudioSrc = getCustomAudio(slotKey);
  const customAudioFileName = getCustomAudioName(slotKey);
  const hasCustomAudio = Boolean(customAudioSrc);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState<boolean>(false);
  const [mediaUrlInput, setMediaUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const stopPlayback = () => {
    stopAllAudio();
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    stopPlayback();
    if (customAudioSrc && !customAudioSrc.startsWith('data:')) {
      setMediaUrlInput(customAudioSrc);
    } else {
      setMediaUrlInput('');
    }
    return () => {
      stopPlayback();
    };
  }, [dialogue.id, lessonId, customAudioSrc]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    // 1. Nếu giáo viên đã gắn file Audio riêng -> phát trực tiếp file đó
    if (customAudioSrc && audioRef.current) {
      stopAllAudio();
      const el = audioRef.current;
      if (el.ended || el.currentTime >= (el.duration || 0) - 0.2) {
        el.currentTime = 0;
      }
      setIsPlaying(true);
      el.play().catch((err) => {
        console.warn('Play audio error:', err);
        setIsPlaying(false);
      });
      return;
    }

    // 2. Dự phòng: phát lần lượt từng câu hội thoại bằng TTS
    if (!dialogue.lines || dialogue.lines.length === 0) return;

    setIsPlaying(true);
    let idx = 0;

    const playNextLine = () => {
      if (idx >= dialogue.lines.length) {
        setIsPlaying(false);
        return;
      }
      const line = dialogue.lines[idx];
      idx++;
      playChineseAudio(line.hanzi, {
        onEnd: () => {
          ttsTimeoutRef.current = setTimeout(playNextLine, 450);
        },
        onError: () => setIsPlaying(false),
      });
    };

    playNextLine();
  };

  // 1. Tải file audio từ máy tính (.mp3, .m4a, .wav, .ogg)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      showToast(`Đang tải lên "${file.name}"...`);
      const dataUrl = await fileToDataUrl(file);
      await setCustomAudio(slotKey, dataUrl, file.name);
      showToast(`Đã lưu "${file.name}" cho hội thoại "${dialogue.title}"!`);
      setIsMediaPanelOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu file âm thanh.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 2. Lưu đường dẫn URL Audio
  const handleSaveAudioUrl = async () => {
    const trimmed = mediaUrlInput.trim();
    const displayName = trimmed ? trimmed.split('/').pop() || 'Audio URL' : undefined;
    await setCustomAudio(slotKey, trimmed || null, displayName);
    showToast(trimmed ? 'Đã lưu đường dẫn Audio hội thoại!' : 'Đã xóa đường dẫn Audio');
    setIsMediaPanelOpen(false);
  };

  // 3. Thu âm trực tiếp giọng giáo viên
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (recorderRef.current) {
        setIsUploading(true);
        try {
          const uri = await recorderRef.current.stop();
          const displayLabel = `Ghi âm hội thoại (${new Date().toLocaleTimeString('vi-VN')})`;
          await setCustomAudio(slotKey, uri, displayLabel);
          showToast('Đã lưu bản thu âm hội thoại của giáo viên!');
          setIsMediaPanelOpen(false);
        } catch (e) {
          console.error('Record error', e);
        } finally {
          setIsUploading(false);
        }
      }
      setIsRecording(false);
    } else {
      try {
        recorderRef.current = new VoiceRecorder();
        await recorderRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        alert('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
      }
    }
  };

  // Xoá audio riêng để quay về giọng đọc mặc định
  const handleClearAudio = async () => {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa file audio riêng của "${dialogue.title}" và quay về giọng đọc mặc định?`
    );
    if (!ok) return;

    stopPlayback();
    setMediaUrlInput('');
    await setCustomAudio(slotKey, null);
    showToast('Đã gỡ audio riêng, chuyển về giọng đọc mặc định.');
  };

  return (
    <div className="space-y-3">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#DCFCE7] border border-black text-black text-xs font-black shadow-[1px_1px_0px_#000]">
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Player Bar (Tương tự phần Bài Khóa bên trang HSK) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-3">
          {/* Nút Play / Pause lớn */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0 cursor-pointer transition-all ${
              isPlaying
                ? 'bg-[#FCE7F3] text-black shadow-[1px_1px_0px_#000]'
                : 'bg-[#DCFCE7] hover:bg-emerald-300 text-black shadow-[2px_2px_0px_#000]'
            }`}
            title={
              isPlaying
                ? 'Tạm dừng audio hội thoại'
                : 'Phát audio toàn bộ đoạn hội thoại này'
            }
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-black">
                {hasCustomAudio ? 'Audio riêng hội thoại:' : 'Audio hội thoại:'}
              </span>
              <span className="text-xs font-bold text-emerald-900 bg-[#DCFCE7] px-2 py-0.5 rounded-lg border border-black/30 inline-flex items-center gap-1">
                {hasCustomAudio ? <Music className="w-3 h-3" /> : null}
                <span>
                  {customAudioFileName ||
                    (hasCustomAudio
                      ? 'Audio hội thoại giáo viên'
                      : `Giọng đọc hội thoại (${dialogue.audioTrack})`)}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              {isPlaying
                ? '🔊 Đang phát audio đoạn hội thoại...'
                : 'Nghe phát âm toàn đoạn hội thoại hoặc gắn file audio riêng của giáo viên'}
            </p>
          </div>
        </div>

        {/* Trình phát <audio> & Nút Gắn / Đổi / Xoá Audio */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {customAudioSrc && (
            <audio
              ref={audioRef}
              src={customAudioSrc}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="h-8 w-44 sm:w-56"
            />
          )}

          <button
            type="button"
            onClick={() => setIsMediaPanelOpen(!isMediaPanelOpen)}
            className="cute-btn flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black bg-[#FCE7F3] hover:bg-pink-200 text-black cursor-pointer"
            title="Gắn hoặc thay đổi file audio hội thoại (Tải file, Dán URL, hoặc Thu âm)"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{hasCustomAudio ? 'Đổi Audio' : 'Gắn Audio'}</span>
          </button>

          {hasCustomAudio && (
            <button
              type="button"
              onClick={handleClearAudio}
              className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 hover:text-red-800 border-2 border-black cursor-pointer"
              title="Xóa audio hội thoại này, quay về giọng đọc mặc định"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Khung cài đặt Audio 3 cột: 1. Tải file (.mp3, .m4a) | 2. Dán link URL | 3. Thu âm giáo viên */}
      {isMediaPanelOpen && (
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <h5 className="text-xs font-black text-black flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-700" />
              <span>Cài đặt Audio Hội Thoại cho &quot;{dialogue.title}&quot;</span>
            </h5>
            <button
              type="button"
              onClick={() => setIsMediaPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Tải file */}
            <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-black/30 flex flex-col justify-between gap-2">
              <div className="text-[11px] font-black text-black flex items-center gap-1">
                <Upload className="w-3 h-3 text-emerald-700" />
                <span>1. Tải file (.mp3, .m4a)</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="cute-btn w-full py-1.5 px-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-black text-xs rounded-lg border border-black flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span>{isUploading ? 'Đang tải...' : 'Chọn file...'}</span>
              </button>
            </div>

            {/* 2. Dán Link URL */}
            <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-black/30 flex flex-col justify-between gap-2">
              <div className="text-[11px] font-black text-black flex items-center gap-1">
                <Link2 className="w-3 h-3 text-blue-700" />
                <span>2. Dán link URL</span>
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2 py-1 text-xs rounded border border-black/30 bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveAudioUrl}
                  className="cute-btn w-full py-1 px-2 bg-white hover:bg-zinc-100 text-black font-black text-[11px] rounded border border-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Lưu link</span>
                </button>
              </div>
            </div>

            {/* 3. Thu âm trực tiếp */}
            <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-black/30 flex flex-col justify-between gap-2">
              <div className="text-[11px] font-black text-black flex items-center gap-1">
                <Mic className="w-3 h-3 text-pink-700" />
                <span>3. Thu âm giáo viên</span>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleToggleRecord}
                className={`cute-btn w-full py-1.5 px-2 font-black text-xs rounded-lg border border-black flex items-center justify-center gap-1 cursor-pointer ${
                  isRecording
                    ? 'bg-black text-white animate-pulse'
                    : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
                }`}
              >
                {isRecording ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Mic className="w-3 h-3" />
                )}
                <span>{isRecording ? 'Dừng & Lưu' : 'Bắt đầu thu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

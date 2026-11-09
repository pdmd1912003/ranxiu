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
import { ReadingText, LevelId, FlashCard } from '../types';
import {
  loadCustomAudioData,
  uploadAudioMediaToFirebase,
  deleteCustomAudioFromFirebase,
} from '../utils/storage';
import { fileToDataUri, VoiceRecorder, playChineseAudio, stopAllAudio } from '../utils/speech';

interface ReadingTextAudioBarProps {
  readingText: ReadingText;
  levelId: LevelId;
  lessonId: string;
  mode?: 'readingText' | 'vocab';
  cards?: FlashCard[];
  onUpdateTextAudio?: (updatedFields: Partial<ReadingText>) => void;
}

export const ReadingTextAudioBar: React.FC<ReadingTextAudioBarProps> = ({
  readingText,
  levelId,
  lessonId,
  mode = 'readingText',
  cards = [],
  onUpdateTextAudio,
}) => {
  const isVocabMode = mode === 'vocab';
  const targetId = isVocabMode ? `${readingText.id}_vocab` : readingText.id;
  const currentAudioUrl = isVocabMode ? readingText.vocabAudioUrl : readingText.audioUrl;
  const currentAudioDataUri = isVocabMode ? readingText.vocabAudioDataUri : readingText.audioDataUri;
  const currentAudioFileName = isVocabMode ? readingText.vocabAudioFileName : readingText.audioFileName;

  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
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

  const hasCustomAudio = Boolean(resolvedAudioSrc || currentAudioUrl || currentAudioDataUri);

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

  // Load custom audio when readingText or mode changes
  useEffect(() => {
    let isCancelled = false;
    stopPlayback();

    const rawUrl = currentAudioUrl || '';
    setMediaUrlInput(rawUrl.startsWith('firestore://') ? '' : rawUrl);

    if (currentAudioDataUri || currentAudioUrl) {
      setIsLoadingAudio(true);
      loadCustomAudioData(lessonId, targetId, currentAudioUrl, currentAudioDataUri)
        .then((src) => {
          if (!isCancelled) {
            setResolvedAudioSrc(src);
            setIsLoadingAudio(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setResolvedAudioSrc(null);
            setIsLoadingAudio(false);
          }
        });
    } else {
      setResolvedAudioSrc(null);
      setIsLoadingAudio(false);
    }

    return () => {
      isCancelled = true;
      stopPlayback();
    };
  }, [readingText.id, currentAudioUrl, currentAudioDataUri, lessonId, targetId]);

  // Toggle play/pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    // 1. If has custom audio file, play it directly
    if (resolvedAudioSrc && audioRef.current) {
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

    // 2. Fallback: play via TTS
    if (isVocabMode) {
      // Đọc tuần tự từng từ vựng trong danh sách
      if (!cards || cards.length === 0) return;

      setIsPlaying(true);
      let idx = 0;

      const playNextWord = () => {
        if (idx >= cards.length) {
          setIsPlaying(false);
          return;
        }
        const card = cards[idx];
        const cleanHanzi = card.hanzi.replace(/\([^)]*\)/g, '').trim();
        idx++;

        playChineseAudio(cleanHanzi, {
          onEnd: () => {
            ttsTimeoutRef.current = setTimeout(playNextWord, 650);
          },
          onError: () => setIsPlaying(false),
        });
      };

      playNextWord();
      return;
    }

    // Fallback: play reading text sentences
    if (!readingText.sentences || readingText.sentences.length === 0) return;

    setIsPlaying(true);
    let idx = 0;

    const playNextSentence = () => {
      if (idx >= readingText.sentences.length) {
        setIsPlaying(false);
        return;
      }
      const s = readingText.sentences[idx];
      idx++;
      playChineseAudio(s.hanzi, {
        onEnd: () => {
          ttsTimeoutRef.current = setTimeout(playNextSentence, 450);
        },
        onError: () => setIsPlaying(false),
      });
    };

    playNextSentence();
  };

  // Upload file audio
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateTextAudio) return;

    setIsUploading(true);
    try {
      showToast(`Đang tải lên "${file.name}"...`);
      const dataUri = await fileToDataUri(file);
      const cloudRef = await uploadAudioMediaToFirebase(
        file,
        file.name,
        levelId,
        lessonId,
        targetId,
        dataUri
      );

      setResolvedAudioSrc(dataUri);
      if (isVocabMode) {
        onUpdateTextAudio({
          vocabAudioUrl: cloudRef,
          vocabAudioDataUri: undefined,
          vocabAudioFileName: file.name,
        });
      } else {
        onUpdateTextAudio({
          audioUrl: cloudRef,
          audioDataUri: undefined,
          audioFileName: file.name,
        });
      }

      showToast(`Đã lưu "${file.name}" cho ${isVocabMode ? 'từ vựng bài khóa' : 'bài khóa'}!`);
      setIsMediaPanelOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Không thể lưu file âm thanh.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Save Audio URL
  const handleSaveAudioUrl = () => {
    if (!onUpdateTextAudio) return;
    const trimmed = mediaUrlInput.trim();
    setResolvedAudioSrc(trimmed || null);

    if (isVocabMode) {
      onUpdateTextAudio({
        vocabAudioUrl: trimmed || undefined,
        vocabAudioDataUri: undefined,
        vocabAudioFileName: trimmed ? trimmed.split('/').pop() || 'Audio URL' : undefined,
      });
    } else {
      onUpdateTextAudio({
        audioUrl: trimmed || undefined,
        audioDataUri: undefined,
        audioFileName: trimmed ? trimmed.split('/').pop() || 'Audio URL' : undefined,
      });
    }

    showToast(trimmed ? 'Đã lưu đường dẫn Audio' : 'Đã xóa đường dẫn Audio');
    setIsMediaPanelOpen(false);
  };

  // Record Teacher Audio
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (recorderRef.current && onUpdateTextAudio) {
        setIsUploading(true);
        try {
          const uri = await recorderRef.current.stop();
          const res = await fetch(uri);
          const blob = await res.blob();
          const recName = `Ghi_am_${isVocabMode ? 'tu_vung_' : 'bai_khoa_'}${Date.now()}.webm`;
          const displayLabel = `Ghi âm ${isVocabMode ? 'từ vựng' : 'bài khóa'} (${new Date().toLocaleTimeString('vi-VN')})`;
          const cloudRef = await uploadAudioMediaToFirebase(
            blob,
            recName,
            levelId,
            lessonId,
            targetId,
            uri
          );
          setResolvedAudioSrc(uri);

          if (isVocabMode) {
            onUpdateTextAudio({
              vocabAudioUrl: cloudRef,
              vocabAudioDataUri: undefined,
              vocabAudioFileName: displayLabel,
            });
          } else {
            onUpdateTextAudio({
              audioUrl: cloudRef,
              audioDataUri: undefined,
              audioFileName: displayLabel,
            });
          }

          showToast('Đã lưu bản thu âm của giáo viên!');
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
        showToast('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
      }
    }
  };

  // Clear / Delete Custom Audio (không hiển thị alert/confirm của trình duyệt)
  const handleClearAudio = async () => {
    if (!onUpdateTextAudio) return;

    stopPlayback();
    setResolvedAudioSrc(null);
    setMediaUrlInput('');

    await deleteCustomAudioFromFirebase(lessonId, targetId, currentAudioUrl);

    if (isVocabMode) {
      onUpdateTextAudio({
        vocabAudioUrl: undefined,
        vocabAudioDataUri: undefined,
        vocabAudioFileName: undefined,
      });
    } else {
      onUpdateTextAudio({
        audioUrl: undefined,
        audioDataUri: undefined,
        audioFileName: undefined,
      });
    }

    showToast('Đã gỡ audio riêng, chuyển về giọng đọc mặc định.');
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-[#FAF6EE] border-b-2 border-black/10">
      {/* Toast */}
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

      {/* Main Player Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-3">
          {/* Big Play / Pause Button */}
          <button
            onClick={handleTogglePlay}
            disabled={isLoadingAudio}
            className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0 transition-all ${
              isPlaying
                ? 'bg-[#FCE7F3] text-black shadow-[1px_1px_0px_#000]'
                : 'bg-[#DCFCE7] hover:bg-emerald-300 text-black shadow-[2px_2px_0px_#000]'
            }`}
            title={
              isPlaying
                ? `Tạm dừng audio ${isVocabMode ? 'từ vựng' : 'bài khóa'}`
                : `Phát audio ${isVocabMode ? 'danh sách từ vựng của bài khóa này' : 'toàn bộ bài khóa này'}`
            }
          >
            {isLoadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-black">
                {isVocabMode
                  ? hasCustomAudio
                    ? 'Audio riêng từ vựng:'
                    : 'Audio từ vựng bài khóa:'
                  : hasCustomAudio
                  ? 'Audio riêng bài khóa:'
                  : 'Audio bài khóa:'}
              </span>
              <span className="text-xs font-bold text-emerald-900 bg-[#DCFCE7] px-2 py-0.5 rounded-lg border border-black/30 inline-flex items-center gap-1">
                {hasCustomAudio ? <Music className="w-3 h-3" /> : null}
                <span>
                  {currentAudioFileName ||
                    (hasCustomAudio
                      ? isVocabMode
                        ? 'Audio từ vựng giáo viên'
                        : 'Audio bài khóa giáo viên'
                      : isVocabMode
                      ? 'Giọng đọc từ vựng'
                      : 'Giọng đọc bài khóa')}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              {isPlaying
                ? `🔊 Đang phát audio ${isVocabMode ? 'danh sách từ vựng' : 'bài khóa'}...`
                : isVocabMode
                ? 'Phát âm trọn bộ từ mới của bài khóa này (file riêng biệt với audio bài khóa)'
                : 'Nghe phát âm toàn bài khóa để nắm bắt ngữ điệu và ngữ cảnh'}
            </p>
          </div>
        </div>

        {/* Audio Element & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {resolvedAudioSrc && (
            <audio
              ref={audioRef}
              src={resolvedAudioSrc}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="h-8 w-44 sm:w-56"
            />
          )}

          {/* Change / Attach Audio Button */}
          {onUpdateTextAudio && (
            <button
              onClick={() => setIsMediaPanelOpen(!isMediaPanelOpen)}
              className="cute-btn flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black bg-[#FCE7F3] hover:bg-pink-200 text-black"
              title={`Gắn hoặc thay đổi file audio ${isVocabMode ? 'từ vựng' : 'bài khóa'}`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>
                {hasCustomAudio
                  ? isVocabMode
                    ? 'Đổi Audio Từ Vựng'
                    : 'Đổi Audio'
                  : isVocabMode
                  ? 'Gắn Audio Từ Vựng'
                  : 'Gắn Audio'}
              </span>
            </button>
          )}

          {/* Delete Audio Button */}
          {hasCustomAudio && onUpdateTextAudio && (
            <button
              onClick={handleClearAudio}
              className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 hover:text-red-800 border-2 border-black"
              title={`Xóa audio ${isVocabMode ? 'từ vựng' : 'bài khóa'} này, quay về giọng đọc mặc định`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Drawer: Upload / URL / Record */}
      {isMediaPanelOpen && onUpdateTextAudio && (
        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <h5 className="text-xs font-black text-black flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Cài đặt Audio {isVocabMode ? 'Từ Vựng riêng' : 'Bài Khóa'} cho &quot;{readingText.title}&quot;
              </span>
            </h5>
            <button
              onClick={() => setIsMediaPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-zinc-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Upload File */}
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
                className="cute-btn w-full py-1.5 px-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-black text-xs rounded-lg border border-black flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
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
                  className="cute-btn w-full py-1 px-2 bg-white hover:bg-zinc-100 text-black font-black text-[11px] rounded border border-black flex items-center justify-center gap-1"
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
                className={`cute-btn w-full py-1.5 px-2 font-black text-xs rounded-lg border border-black flex items-center justify-center gap-1 ${
                  isRecording
                    ? 'bg-black text-white animate-pulse'
                    : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
                }`}
              >
                {isRecording ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isRecording ? 'Dừng & Lưu' : 'Bắt đầu thu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

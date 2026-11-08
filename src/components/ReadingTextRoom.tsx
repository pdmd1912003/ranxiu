import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Eye,
  EyeOff,
  Mic,
  Square,
  User,
  Music,
  PlusCircle,
  Pencil,
  Upload,
  Link2,
  Trash2,
  CheckCircle2,
  Headphones,
  X,
  Loader2,
  Focus,
} from 'lucide-react';
import { ReadingText, ReadingSentence, LevelId } from '../types';
import { playChineseAudio, stopAllAudio, VoiceRecorder, fileToDataUri } from '../utils/speech';
import {
  uploadAudioMediaToFirebase,
  loadCustomAudioData,
  deleteCustomAudioFromFirebase,
} from '../utils/storage';
import { HanziClickable } from './HanziClickable';

interface ReadingTextRoomProps {
  readingTexts: ReadingText[];
  lessonTitle: string;
  levelId?: LevelId;
  lessonId?: string;
  onOpenTeacherModal: () => void;
  onEditText?: (text: ReadingText) => void;
  onUpdateTextAudio?: (textId: string, updatedFields: Partial<ReadingText>) => void;
  onShowStroke?: (char: string) => void;
}

export const ReadingTextRoom: React.FC<ReadingTextRoomProps> = ({
  readingTexts,
  lessonTitle,
  levelId = 'hsk1',
  lessonId = 'hsk1-l1',
  onOpenTeacherModal,
  onEditText,
  onUpdateTextAudio,
  onShowStroke,
}) => {
  const [selectedTextIndex, setSelectedTextIndex] = useState<number>(0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoScrollToActive, setAutoScrollToActive] = useState<boolean>(true);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Tự động cuộn mượt và focus vào câu đang đọc (giúp theo dõi bài khóa không cần scroll bằng tay)
  useEffect(() => {
    if (!autoScrollToActive) return;
    if (activeSentenceIndex !== null && sentenceRefs.current[activeSentenceIndex]) {
      const el = sentenceRefs.current[activeSentenceIndex];
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [activeSentenceIndex, autoScrollToActive]);

  // Resolved playable audio source (Data URI or HTTP URL) from Firebase / IndexedDB
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const sentenceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Teacher / Media File Attachment Panel per Bài Khóa
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState<boolean>(false);
  const [mediaUrlInput, setMediaUrlInput] = useState<string>('');
  const [isRecordingTeacher, setIsRecordingTeacher] = useState<boolean>(false);
  const [mediaSavedToast, setMediaSavedToast] = useState<string | null>(null);
  const teacherRecorderRef = useRef<VoiceRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Student recording sandbox
  const [isRecordingStudent, setIsRecordingStudent] = useState<boolean>(false);
  const [studentAudioUri, setStudentAudioUri] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);

  const currentText = readingTexts[selectedTextIndex] || readingTexts[0] || null;

  const stopCustomAndTtsAudio = () => {
    stopAllAudio();
    if (sentenceStopTimerRef.current) {
      clearTimeout(sentenceStopTimerRef.current);
      sentenceStopTimerRef.current = null;
    }
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
  };

  // Reset selected text index when lesson changes
  useEffect(() => {
    setSelectedTextIndex(0);
    setIsMediaPanelOpen(false);
    stopCustomAndTtsAudio();
    setIsPlayingAll(false);
    setActiveSentenceIndex(null);
  }, [lessonTitle]);

  // Load / resolve custom audio from Firebase Firestore / IndexedDB whenever currentText changes
  useEffect(() => {
    let isCancelled = false;
    stopCustomAndTtsAudio();
    setIsPlayingAll(false);
    setActiveSentenceIndex(null);

    if (!currentText) {
      setResolvedAudioSrc(null);
      return;
    }

    const rawUrl = currentText.audioUrl || '';
    setMediaUrlInput(rawUrl.startsWith('firestore://') ? '' : rawUrl);

    if (currentText.audioDataUri || currentText.audioUrl) {
      setIsLoadingAudio(true);
      loadCustomAudioData(lessonId, currentText.id, currentText.audioUrl, currentText.audioDataUri)
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
      stopCustomAndTtsAudio();
    };
  }, [selectedTextIndex, currentText?.id, currentText?.audioUrl, currentText?.audioDataUri, lessonId]);

  // Sync playbackRate with speechRate (0.75x / 1.0x) on the custom <audio> element
  useEffect(() => {
    if (customAudioRef.current) {
      customAudioRef.current.playbackRate = speechRate;
    }
  }, [speechRate, resolvedAudioSrc]);

  if (!currentText) {
    return (
      <div className="cute-card p-10 text-center space-y-4">
        <h3 className="text-lg font-black text-black">Chưa có bài khóa trong bài học này</h3>
        <button
          onClick={onOpenTeacherModal}
          className="cute-btn px-4 py-2 bg-[#DCFCE7] text-black text-xs font-black rounded-xl inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tạo Bài Khóa Mới</span>
        </button>
      </div>
    );
  }

  const hasCustomAudio = Boolean(resolvedAudioSrc || currentText.audioUrl || currentText.audioDataUri);

  const showSavedFeedback = (msg: string) => {
    setMediaSavedToast(msg);
    setTimeout(() => setMediaSavedToast(null), 3500);
  };

  /**
   * Computes proportional start & end ratios [0..1] for each sentence based on character count,
   * so clicking a sentence or playing the teacher's full audio highlights sentences accurately.
   */
  const getSentenceTimeRanges = () => {
    const weights = currentText.sentences.map((s) => Math.max(s.hanzi.length, 2));
    const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;
    let cumulative = 0;
    return weights.map((w) => {
      const startRatio = cumulative / totalWeight;
      cumulative += w;
      const endRatio = cumulative / totalWeight;
      return { startRatio, endRatio };
    });
  };

  /**
   * Plays a specific sentence:
   * - If the bài khóa has custom audio from the teacher (`resolvedAudioSrc`), uses that custom audio
   *   instead of browser TTS (`giọng đọc sẵn`)!
   * - Otherwise falls back to standard Chinese TTS.
   */
  const handlePlaySentence = (sentence: ReadingSentence, index: number) => {
    if (resolvedAudioSrc && customAudioRef.current) {
      stopAllAudio();
      if (sentenceStopTimerRef.current) {
        clearTimeout(sentenceStopTimerRef.current);
        sentenceStopTimerRef.current = null;
      }

      const audioEl = customAudioRef.current;
      audioEl.playbackRate = speechRate;
      setActiveSentenceIndex(index);

      const duration = audioEl.duration;
      if (duration && isFinite(duration) && duration > 0 && currentText.sentences.length > 1) {
        const ranges = getSentenceTimeRanges();
        const range = ranges[index] || { startRatio: 0, endRatio: 1 };
        const startSec = range.startRatio * duration;
        const segmentDurationMs = ((range.endRatio - range.startRatio) * duration * 1000) / speechRate;

        audioEl.currentTime = startSec;
        setIsPlayingAll(true);
        audioEl.play().catch((err) => console.warn('Custom audio play error:', err));

        sentenceStopTimerRef.current = setTimeout(() => {
          if (customAudioRef.current) {
            customAudioRef.current.pause();
          }
          setIsPlayingAll(false);
          setActiveSentenceIndex(null);
        }, Math.max(segmentDurationMs + 350, 1200));
      } else {
        // Single sentence or metadata not loaded yet: play full teacher audio
        audioEl.currentTime = 0;
        setIsPlayingAll(true);
        audioEl.play().catch((err) => console.warn('Custom audio play error:', err));
      }
      return;
    }

    // Fallback when no custom audio is attached: use built-in Chinese TTS
    setActiveSentenceIndex(index);
    playChineseAudio(sentence.hanzi, {
      rate: speechRate,
      onEnd: () => {
        if (!isPlayingAll) {
          setActiveSentenceIndex(null);
        }
      },
      onError: () => setActiveSentenceIndex(null),
    });
  };

  /**
   * Plays the entire Bài Khóa:
   * - If the teacher provided a custom audio file (`resolvedAudioSrc`), plays that custom audio file
   *   directly and highlights sentences along the timeline.
   * - Otherwise reads sentence-by-sentence with Chinese TTS.
   */
  const handlePlayAll = () => {
    if (isPlayingAll) {
      stopCustomAndTtsAudio();
      setIsPlayingAll(false);
      setActiveSentenceIndex(null);
      return;
    }

    // 1. Prioritize teacher's custom uploaded/recorded audio file if present
    if (resolvedAudioSrc && customAudioRef.current) {
      stopAllAudio();
      if (sentenceStopTimerRef.current) {
        clearTimeout(sentenceStopTimerRef.current);
        sentenceStopTimerRef.current = null;
      }
      const audioEl = customAudioRef.current;
      audioEl.playbackRate = speechRate;
      if (audioEl.ended || audioEl.currentTime >= (audioEl.duration || 0) - 0.2) {
        audioEl.currentTime = 0;
      }
      setIsPlayingAll(true);
      setActiveSentenceIndex(0);
      audioEl.play().catch((err) => {
        console.warn('Could not play custom audio:', err);
        setIsPlayingAll(false);
        setActiveSentenceIndex(null);
      });
      return;
    }

    // 2. Fallback: Built-in TTS sentence by sentence when no custom audio is attached
    setIsPlayingAll(true);
    let idx = 0;

    const playNext = () => {
      if (idx >= currentText.sentences.length) {
        setIsPlayingAll(false);
        setActiveSentenceIndex(null);
        return;
      }

      setActiveSentenceIndex(idx);
      const sentence = currentText.sentences[idx];
      idx++;

      playChineseAudio(sentence.hanzi, {
        rate: speechRate,
        onEnd: () => {
          setTimeout(playNext, 550);
        },
        onError: () => {
          setIsPlayingAll(false);
          setActiveSentenceIndex(null);
        },
      });
    };

    playNext();
  };

  // Update active sentence highlight as the teacher's custom audio plays
  const handleCustomAudioTimeUpdate = () => {
    const audioEl = customAudioRef.current;
    if (!audioEl || !isPlayingAll || sentenceStopTimerRef.current) return;
    const duration = audioEl.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;

    const progress = audioEl.currentTime / duration;
    const ranges = getSentenceTimeRanges();
    const foundIdx = ranges.findIndex((r) => progress >= r.startRatio && progress <= r.endRatio);
    if (foundIdx !== -1 && foundIdx !== activeSentenceIndex) {
      setActiveSentenceIndex(foundIdx);
    }
  };

  // Teacher / User uploads media file for this specific Bài Khóa (syncs to Firebase Firestore `audio_media`)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateTextAudio) return;

    setIsUploadingAudio(true);
    try {
      showSavedFeedback(`Đang tải và lưu "${file.name}" lên Firebase...`);
      const dataUri = await fileToDataUri(file);
      const cloudRef = await uploadAudioMediaToFirebase(
        file,
        file.name,
        levelId,
        lessonId,
        currentText.id,
        dataUri
      );

      setResolvedAudioSrc(dataUri);
      onUpdateTextAudio(currentText.id, {
        audioUrl: cloudRef,
        audioDataUri: undefined,
        audioFileName: file.name,
      });
      showSavedFeedback(`Đã lưu "${file.name}" cho ${currentText.title}!`);
      setIsMediaPanelOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu file âm thanh. Vui lòng thử lại.');
    } finally {
      setIsUploadingAudio(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Teacher / User saves custom audio URL/path
  const handleSaveAudioUrl = () => {
    if (!onUpdateTextAudio) return;
    const trimmed = mediaUrlInput.trim();
    setResolvedAudioSrc(trimmed || null);
    onUpdateTextAudio(currentText.id, {
      audioUrl: trimmed || undefined,
      audioDataUri: undefined,
      audioFileName: trimmed ? trimmed.split('/').pop() || 'Audio URL' : undefined,
    });
    showSavedFeedback(trimmed ? 'Đã lưu đường dẫn Audio' : 'Đã xóa đường dẫn Audio');
    setIsMediaPanelOpen(false);
  };

  // Teacher records custom audio for this Bài Khóa (syncs to Firebase)
  const handleToggleTeacherRecord = async () => {
    if (isRecordingTeacher) {
      if (teacherRecorderRef.current && onUpdateTextAudio) {
        setIsUploadingAudio(true);
        try {
          const uri = await teacherRecorderRef.current.stop();
          const res = await fetch(uri);
          const blob = await res.blob();
          const recName = `Ghi_am_giao_vien_${Date.now()}.webm`;
          const displayLabel = `Ghi âm giáo viên (${new Date().toLocaleTimeString('vi-VN')})`;
          const cloudRef = await uploadAudioMediaToFirebase(
            blob,
            recName,
            levelId,
            lessonId,
            currentText.id,
            uri
          );
          setResolvedAudioSrc(uri);
          onUpdateTextAudio(currentText.id, {
            audioUrl: cloudRef,
            audioDataUri: undefined,
            audioFileName: displayLabel,
          });
          showSavedFeedback('Đã lưu bản thu âm của giáo viên lên Firebase!');
          setIsMediaPanelOpen(false);
        } catch (e) {
          console.error('Teacher record error', e);
        } finally {
          setIsUploadingAudio(false);
        }
      }
      setIsRecordingTeacher(false);
    } else {
      try {
        teacherRecorderRef.current = new VoiceRecorder();
        await teacherRecorderRef.current.start();
        setIsRecordingTeacher(true);
      } catch (err: any) {
        alert('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
      }
    }
  };

  const handleClearCustomAudio = async () => {
    if (!onUpdateTextAudio) return;
    stopCustomAndTtsAudio();
    setIsPlayingAll(false);
    setActiveSentenceIndex(null);
    setResolvedAudioSrc(null);
    setMediaUrlInput('');

    await deleteCustomAudioFromFirebase(lessonId, currentText.id, currentText.audioUrl);
    onUpdateTextAudio(currentText.id, {
      audioDataUri: undefined,
      audioUrl: undefined,
      audioFileName: undefined,
    });
    showSavedFeedback('Đã gỡ file audio riêng, chuyển về giọng đọc mặc định.');
  };

  // Student microphone practice
  const handleToggleStudentRecord = async () => {
    if (isRecordingStudent) {
      if (recorderRef.current) {
        try {
          const uri = await recorderRef.current.stop();
          setStudentAudioUri(uri);
        } catch (e) {
          console.error('Stop recording error', e);
        }
      }
      setIsRecordingStudent(false);
    } else {
      try {
        recorderRef.current = new VoiceRecorder();
        await recorderRef.current.start();
        setIsRecordingStudent(true);
        setStudentAudioUri(null);
      } catch (err: any) {
        alert('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector tabs if multiple reading texts in lesson */}
      {readingTexts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {readingTexts.map((txt, idx) => {
            const txtHasAudio = Boolean(txt.audioDataUri || txt.audioUrl);
            return (
              <button
                key={txt.id}
                onClick={() => {
                  stopCustomAndTtsAudio();
                  setIsPlayingAll(false);
                  setActiveSentenceIndex(null);
                  setSelectedTextIndex(idx);
                }}
                className={`cute-btn px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border-2 border-black ${
                  selectedTextIndex === idx
                    ? 'bg-[#DCFCE7] text-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white text-zinc-800 hover:bg-[#FAF6EE]'
                }`}
              >
                <span>{txt.title}</span>
                {txt.titleZh && (
                  <span className="font-hanzi text-xs opacity-80">({txt.titleZh})</span>
                )}
                {txtHasAudio && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-600 inline-block"
                    title="Đã có file audio riêng của giáo viên"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Reading Stage Card */}
      <div className="cute-card p-6 sm:p-7 space-y-5">
        {/* Full-Width Stacked Header: Title + Toolbar on top, Context spanning 100% width below */}
        <div className="space-y-4 pb-5 border-b-2 border-black/10">
          {/* Top Bar: Title on left, Controls evenly distributed on right */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-black">
                {currentText.title}
              </h2>
              {currentText.titleZh && (
                <span className="font-hanzi text-lg sm:text-xl text-zinc-600 font-normal">
                  ({currentText.titleZh})
                </span>
              )}
              {hasCustomAudio && (
                <span className="text-black font-black text-xs bg-[#DCFCE7] border border-black px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  <span>{currentText.audioFileName || 'Audio giáo viên'}</span>
                </span>
              )}
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Primary Play Button: Uses Teacher's Custom Audio if present, otherwise TTS */}
              <button
                onClick={handlePlayAll}
                disabled={isLoadingAudio}
                className={`cute-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black border-2 border-black transition-all ${
                  isPlayingAll
                    ? 'bg-[#FCE7F3] text-black'
                    : 'bg-[#DCFCE7] hover:bg-emerald-200 text-black'
                }`}
                title={
                  hasCustomAudio
                    ? 'Phát file audio riêng của giáo viên cho bài khóa này'
                    : 'Đọc tự động toàn bài khóa bằng giọng đọc mặc định'
                }
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlayingAll ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-black" />
                )}
                <span>
                  {isPlayingAll
                    ? 'Tạm Dừng'
                    : hasCustomAudio
                    ? 'Phát Audio Bài Khóa'
                    : 'Đọc Tự Động'}
                </span>
              </button>

              {/* Attach / Manage Custom Audio Media File Button */}
              {onUpdateTextAudio && (
                <button
                  onClick={() => setIsMediaPanelOpen(!isMediaPanelOpen)}
                  className="cute-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black border-2 border-black bg-[#FCE7F3] hover:bg-pink-200 text-black transition-all"
                >
                  <Headphones className="w-4 h-4" />
                  <span>{hasCustomAudio ? 'Đổi Audio' : 'Gắn Audio'}</span>
                </button>
              )}

              {/* Pinyin Toggle */}
              <button
                onClick={() => setShowPinyin(!showPinyin)}
                className={`cute-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border-2 border-black transition-all ${
                  showPinyin ? 'bg-[#FAF6EE] text-black' : 'bg-white text-zinc-500'
                }`}
              >
                {showPinyin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>Pinyin</span>
              </button>

              {/* Auto Scroll Focus Toggle */}
              <button
                onClick={() => setAutoScrollToActive(!autoScrollToActive)}
                className={`cute-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border-2 border-black transition-all ${
                  autoScrollToActive
                    ? 'bg-[#DCFCE7] text-black shadow-[1px_1px_0px_#000]'
                    : 'bg-white text-zinc-500'
                }`}
                title={
                  autoScrollToActive
                    ? 'Đang bật tự động cuộn màn hình theo câu đọc'
                    : 'Đã tắt tự động cuộn màn hình'
                }
              >
                <Focus className="w-4 h-4" />
                <span>{autoScrollToActive ? 'Tự Cuộn' : 'Tự Cuộn: Tắt'}</span>
              </button>

              {/* Vietnamese Meaning Toggle */}
              <button
                onClick={() => setShowMeaning(!showMeaning)}
                className={`cute-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border-2 border-black transition-all ${
                  showMeaning ? 'bg-[#FAF6EE] text-black' : 'bg-white text-zinc-500'
                }`}
              >
                <span>Dịch Nghĩa</span>
              </button>

              {/* Edit Reading Text Button */}
              {onEditText && (
                <button
                  onClick={() => onEditText(currentText)}
                  className="cute-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-black bg-white hover:bg-[#FAF6EE] text-black border-2 border-black"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
              )}

              {/* Speed Rate */}
              <div className="flex items-center gap-1 bg-white border-2 border-black px-2 py-1 rounded-xl text-zinc-800 shadow-[2px_2px_0px_#000]">
                <span className="text-[11px] text-zinc-500 font-bold">Tốc độ:</span>
                <button
                  onClick={() => setSpeechRate(0.75)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    speechRate === 0.75 ? 'bg-black text-white' : ''
                  }`}
                >
                  0.75x
                </button>
                <button
                  onClick={() => setSpeechRate(1.0)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    speechRate === 1.0 ? 'bg-black text-white' : ''
                  }`}
                >
                  1.0x
                </button>
              </div>
            </div>
          </div>

          {/* Full-width Context Banner */}
          {currentText.summary && (
            <div className="w-full text-xs sm:text-sm text-zinc-700 font-medium bg-[#FAF6EE] border-2 border-black/15 rounded-2xl px-4 py-3 leading-relaxed">
              <span className="font-black text-black mr-1.5">Bối cảnh:</span>
              {currentText.summary}
            </div>
          )}
        </div>

        {/* Toast notification when audio is updated */}
        {mediaSavedToast && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#DCFCE7] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_#000]">
            {isUploadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{mediaSavedToast}</span>
          </div>
        )}

        {/* Dedicated Custom Media Player Bar (Active when teacher audio is attached) */}
        {hasCustomAudio && (
          <div className="p-4 rounded-2xl bg-[#DCFCE7]/60 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayAll}
                className="w-10 h-10 rounded-xl bg-black text-white border-2 border-black flex items-center justify-center shrink-0"
                title="Phát / Tạm dừng file audio bài khóa"
              >
                {isPlayingAll ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
              </button>
              <div>
                <div className="text-xs font-black text-black">
                  Đang dùng Audio riêng của bài khóa:{' '}
                  <span className="underline">{currentText.audioFileName || currentText.title}</span>
                </div>
                <div className="text-[11px] text-zinc-700 font-semibold mt-0.5">
                  Đã thay thế giọng đọc mặc định bằng file audio này
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {resolvedAudioSrc ? (
                <audio
                  ref={customAudioRef}
                  controls
                  src={resolvedAudioSrc}
                  onPlay={() => setIsPlayingAll(true)}
                  onPause={() => {
                    setIsPlayingAll(false);
                    if (sentenceStopTimerRef.current) {
                      clearTimeout(sentenceStopTimerRef.current);
                      sentenceStopTimerRef.current = null;
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingAll(false);
                    setActiveSentenceIndex(null);
                  }}
                  onTimeUpdate={handleCustomAudioTimeUpdate}
                  className="h-9 w-full sm:w-64 rounded-lg"
                />
              ) : (
                <div className="text-xs font-bold text-zinc-600 flex items-center gap-1.5 px-3 py-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải audio từ Firebase...</span>
                </div>
              )}
              {onUpdateTextAudio && (
                <button
                  onClick={handleClearCustomAudio}
                  className="p-2 rounded-xl bg-white hover:bg-[#FCE7F3] text-black border-2 border-black"
                  title="Gỡ file audio này để quay về giọng đọc mặc định"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Inline Teacher / User Media Attachment Drawer */}
        {isMediaPanelOpen && onUpdateTextAudio && (
          <div className="p-5 rounded-2xl bg-[#FAF6EE] border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-black flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                <span>Gắn Audio riêng cho &quot;{currentText.title}&quot;</span>
              </h4>
              <button
                onClick={() => setIsMediaPanelOpen(false)}
                className="p-1.5 rounded-xl bg-white border border-black hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Upload Media File */}
              <div className="p-3.5 rounded-xl bg-white border-2 border-black space-y-2.5 flex flex-col justify-between">
                <div className="text-xs font-black text-black flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>1. Tải File Audio (.mp3, .wav, .m4a)</span>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingAudio}
                    onClick={() => fileInputRef.current?.click()}
                    className="cute-btn w-full py-2 px-3 bg-[#DCFCE7] hover:bg-emerald-200 disabled:opacity-50 text-black font-black text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                  >
                    {isUploadingAudio ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingAudio ? 'Đang tải lên...' : 'Chọn File...'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Paste Media URL / Local Path */}
              <div className="p-3.5 rounded-xl bg-white border-2 border-black space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-black text-black flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>2. Dán Link Audio URL</span>
                  </div>
                  <input
                    type="text"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-2 px-2.5 py-1.5 text-xs rounded-lg border border-black/40 focus:outline-none focus:border-black"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveAudioUrl}
                  className="cute-btn w-full py-2 px-3 bg-[#FAF6EE] hover:bg-zinc-200 text-black font-black text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu Đường Dẫn</span>
                </button>
              </div>

              {/* Option 3: Record Voice Directly */}
              <div className="p-3.5 rounded-xl bg-white border-2 border-black space-y-2.5 flex flex-col justify-between">
                <div className="text-xs font-black text-black flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  <span>3. Giáo Viên Thu Âm Trực Tiếp</span>
                </div>
                <button
                  type="button"
                  disabled={isUploadingAudio}
                  onClick={handleToggleTeacherRecord}
                  className={`cute-btn w-full py-2 px-3 font-black text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5 ${
                    isRecordingTeacher
                      ? 'bg-black text-white animate-pulse'
                      : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
                  }`}
                >
                  {isRecordingTeacher ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecordingTeacher ? 'Dừng & Lưu' : 'Bắt Đầu Thu Âm'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sentences List */}
        <div className="space-y-3.5">
          {currentText.sentences.map((sentence, index) => {
            const isActive = activeSentenceIndex === index;

            return (
              <div
                key={sentence.id || `${currentText.id}-s-${index}`}
                ref={(el) => {
                  sentenceRefs.current[index] = el;
                }}
                onClick={() => handlePlaySentence(sentence, index)}
                className={`scroll-mt-28 cursor-pointer rounded-2xl p-4 sm:p-5 border-2 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-[#DCFCE7] border-black shadow-[6px_6px_0px_#000] ring-2 ring-emerald-500 scale-[1.01]'
                    : 'bg-white hover:bg-[#FAF6EE] border-black/20 hover:border-black'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  {/* Speaker Label & Active Indicator */}
                  <div className="flex flex-wrap items-center gap-2">
                    {sentence.speaker && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-[#FAF6EE] border border-black px-2.5 py-0.5 rounded-lg">
                        <User className="w-3 h-3" />
                        <span>{sentence.speaker}</span>
                      </div>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                        <Volume2 className="w-3 h-3" />
                        <span>Đang đọc...</span>
                      </span>
                    )}
                  </div>

                  {/* Hanzi & Pinyin */}
                  <div className="text-xl sm:text-2xl font-hanzi font-normal text-black leading-relaxed pt-0.5">
                    {showPinyin ? (
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs sm:text-sm font-bold text-emerald-800 select-all">
                          {sentence.pinyin}
                        </div>
                        <div>
                          <HanziClickable
                            text={sentence.hanzi}
                            onShowStroke={onShowStroke || (() => {})}
                          />
                        </div>
                      </div>
                    ) : (
                      <HanziClickable
                        text={sentence.hanzi}
                        onShowStroke={onShowStroke || (() => {})}
                      />
                    )}
                  </div>

                  {/* Vietnamese Meaning Translation */}
                  {showMeaning && (
                    <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pt-1 border-t border-black/10">
                      {sentence.meaning}
                    </p>
                  )}
                </div>

                {/* Sentence audio play trigger */}
                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySentence(sentence, index);
                    }}
                    className={`cute-btn p-2.5 rounded-xl border-2 border-black transition-colors ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
                    }`}
                    title={
                      hasCustomAudio
                        ? 'Nghe đoạn này bằng file Audio giáo viên'
                        : 'Nghe câu này'
                    }
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student Recording Bar */}
        <div className="pt-4 border-t-2 border-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-black text-zinc-700">
            Luyện phát âm cá nhân
          </span>

          <div className="flex items-center gap-2.5">
            {studentAudioUri && (
              <button
                onClick={() => {
                  const audio = new Audio(studentAudioUri);
                  audio.play();
                }}
                className="cute-btn px-3.5 py-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black text-xs font-black rounded-xl border-2 border-black flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Nghe Lại</span>
              </button>
            )}

            <button
              onClick={handleToggleStudentRecord}
              className={`cute-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all ${
                isRecordingStudent
                  ? 'bg-black text-white animate-pulse'
                  : 'bg-[#FCE7F3] hover:bg-pink-200 text-black'
              }`}
            >
              {isRecordingStudent ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecordingStudent ? 'Dừng Ghi Âm' : 'Thu Âm Thử'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

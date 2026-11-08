import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Mic,
  Square,
  Play,
  Upload,
  Download,
  FileText,
  CreditCard,
  Save,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { LevelId, Lesson, ReadingSentence, ReadingText, FlashCard } from '../types';
import { LEVELS } from '../data/curriculumData';
import { VoiceRecorder } from '../utils/speech';
import {
  addCustomReadingText,
  addCustomFlashcard,
  exportLessonsToJSON,
  importLessonsFromJSON,
  uploadAudioMediaToFirebase,
} from '../utils/storage';

interface TeacherCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
  onRefreshLessons: (updatedLessons: Lesson[]) => void;
  defaultLevelId?: LevelId;
  defaultLessonId?: string;
}

export const TeacherCreatorModal: React.FC<TeacherCreatorModalProps> = ({
  isOpen,
  onClose,
  lessons,
  onRefreshLessons,
  defaultLevelId = 'hsk1',
  defaultLessonId,
}) => {
  const [activeTab, setActiveTab] = useState<'reading' | 'flashcard' | 'manage'>('reading');

  // Reading Text Form State
  const [targetLevel, setTargetLevel] = useState<LevelId>(defaultLevelId);
  const [targetLessonId, setTargetLessonId] = useState<string>('');
  const [isCreatingNewLesson, setIsCreatingNewLesson] = useState<boolean>(false);
  const [newLessonTitleVi, setNewLessonTitleVi] = useState<string>('');
  const [textTitle, setTextTitle] = useState<string>('');
  const [textTitleZh, setTextTitleZh] = useState<string>('');
  const [textTitlePinyin, setTextTitlePinyin] = useState<string>('');
  const [textSummary, setTextSummary] = useState<string>('');

  // Sentences
  const [sentences, setSentences] = useState<Array<{
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
  }>>([
    { speaker: 'Giáo viên', hanzi: '同学们好！', pinyin: 'Tóngxuémen hǎo!', meaning: 'Chào các em học sinh!' },
    { speaker: 'Học sinh', hanzi: '老师好！', pinyin: 'Lǎoshī hǎo!', meaning: 'Chúng em chào cô ạ!' },
  ]);

  // Audio Recording & Upload for Reading Text
  const [audioSourceType, setAudioSourceType] = useState<'tts' | 'record' | 'upload'>('tts');
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<any>(null);

  // Flashcard Form State
  const [fcLevel, setFcLevel] = useState<LevelId>(defaultLevelId);
  const [fcLessonId, setFcLessonId] = useState<string>('');
  const [fcHanzi, setFcHanzi] = useState<string>('');
  const [fcPinyin, setFcPinyin] = useState<string>('');
  const [fcMeaning, setFcMeaning] = useState<string>('');
  const [fcWordType, setFcWordType] = useState<string>('Danh từ');
  const [fcHanViet, setFcHanViet] = useState<string>('');
  const [fcRadical, setFcRadical] = useState<string>('');
  const [fcExHanzi, setFcExHanzi] = useState<string>('');
  const [fcExPinyin, setFcExPinyin] = useState<string>('');
  const [fcExMeaning, setFcExMeaning] = useState<string>('');

  // Status feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetLevel(defaultLevelId);
      setFcLevel(defaultLevelId);
      if (defaultLessonId) {
        setTargetLessonId(defaultLessonId);
        setFcLessonId(defaultLessonId);
      }
    }
  }, [isOpen, defaultLevelId, defaultLessonId]);

  if (!isOpen) return null;

  const currentLevelLessons = lessons.filter((l) => l.levelId === targetLevel);

  // Add sentence row
  const handleAddSentence = () => {
    setSentences([
      ...sentences,
      { speaker: '', hanzi: '', pinyin: '', meaning: '' },
    ]);
  };

  const handleRemoveSentence = (index: number) => {
    setSentences(sentences.filter((_, i) => i !== index));
  };

  const handleSentenceChange = (index: number, field: string, value: string) => {
    const updated = [...sentences];
    (updated[index] as any)[field] = value;
    setSentences(updated);
  };

  // Microphone recording
  const handleStartRecording = async () => {
    try {
      recorderRef.current = new VoiceRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordedAudioUri(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
    }
  };

  const handleStopRecording = async () => {
    if (recorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      try {
        const base64Uri = await recorderRef.current.stop();
        setRecordedAudioUri(base64Uri);
      } catch (e: any) {
        alert('Lỗi dừng ghi âm: ' + e.message);
      }
      setIsRecording(false);
    }
  };

  // File upload for audio
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('File audio quá lớn. Vui lòng chọn file dưới 20MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRecordedAudioUri(ev.target?.result as string);
        setAudioSourceType('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Reading Text
  const handleSaveReadingText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim()) {
      alert('Vui lòng nhập tiêu đề bài khóa!');
      return;
    }
    if (sentences.length === 0 || !sentences[0].hanzi.trim()) {
      alert('Vui lòng nhập ít nhất một câu chữ Hán!');
      return;
    }

    let finalLessonId = targetLessonId;
    if (!finalLessonId || isCreatingNewLesson) {
      finalLessonId = `custom-les-${Date.now()}`;
    }

    const newTextId = `rt-${Date.now()}`;
    let finalAudioUrl: string | undefined = undefined;
    if (recordedAudioUri) {
      try {
        setSuccessMessage('Đang lưu file audio lên Firebase...');
        const res = await fetch(recordedAudioUri);
        const blob = await res.blob();
        finalAudioUrl = await uploadAudioMediaToFirebase(
          blob,
          'Audio_giao_vien.mp3',
          targetLevel,
          finalLessonId,
          newTextId,
          recordedAudioUri
        );
      } catch (err) {
        console.warn('Error uploading audio in TeacherCreatorModal:', err);
      }
    }

    const readingTextObj: ReadingText = {
      id: newTextId,
      title: textTitle,
      titleZh: textTitleZh || textTitle,
      titlePinyin: textTitlePinyin,
      levelId: targetLevel,
      lessonId: finalLessonId,
      summary: textSummary,
      audioUrl: finalAudioUrl,
      audioFileName: finalAudioUrl ? 'Audio giáo viên' : undefined,
      isCustom: true,
      createdAt: Date.now(),
      sentences: sentences.map((s, idx) => ({
        id: `s-${idx}-${Date.now()}`,
        speaker: s.speaker,
        hanzi: s.hanzi,
        pinyin: s.pinyin,
        meaning: s.meaning,
      })),
    };

    const updated = addCustomReadingText(targetLevel, finalLessonId, readingTextObj);
    onRefreshLessons(updated);

    setSuccessMessage('Đã tạo thành công bài khóa mới kèm audio của giáo viên!');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  // Submit Flashcard
  const handleSaveFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcHanzi.trim() || !fcMeaning.trim()) {
      alert('Vui lòng nhập chữ Hán và ý nghĩa tiếng Việt!');
      return;
    }

    const lessonTarget = fcLessonId || lessons.find((l) => l.levelId === fcLevel)?.id || `custom-les-${Date.now()}`;

    const newCard: FlashCard = {
      id: `fc-custom-${Date.now()}`,
      hanzi: fcHanzi,
      pinyin: fcPinyin,
      meaning: fcMeaning,
      wordType: fcWordType,
      hanViet: fcHanViet,
      radical: fcRadical,
      levelId: fcLevel,
      lessonId: lessonTarget,
      isCustom: true,
      exampleSentence: {
        hanzi: fcExHanzi || `${fcHanzi}。`,
        pinyin: fcExPinyin || fcPinyin,
        meaning: fcExMeaning || fcMeaning,
      },
    };

    const updated = addCustomFlashcard(fcLevel, lessonTarget, newCard);
    onRefreshLessons(updated);

    // Reset card inputs
    setFcHanzi('');
    setFcPinyin('');
    setFcMeaning('');
    setFcHanViet('');
    setFcExHanzi('');
    setFcExPinyin('');
    setFcExMeaning('');

    setSuccessMessage('Đã thêm thẻ từ vựng dò bài thành công!');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // Export JSON
  const handleExport = () => {
    exportLessonsToJSON(lessons);
  };

  // Import JSON
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importLessonsFromJSON(file);
        onRefreshLessons(imported);
        alert('Đã nhập thành công giáo án từ tệp JSON!');
      } catch (err: any) {
        alert('Lỗi nhập file: ' + err.message);
      }
    }
  };

  return (
    <div
      data-modal-open="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000] border-2 border-black overflow-hidden my-auto"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#FAF6EE]">
          <div>
            <h3 className="text-lg font-black text-black">
              Soạn Bài Khóa & Audio
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 flex items-center justify-center shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b-2 border-black/15 px-6 bg-white gap-4 text-xs font-black py-2">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTab === 'reading'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'text-zinc-600 hover:bg-[#FAF6EE]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tạo Bài Khóa & Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcard')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTab === 'flashcard'
                ? 'bg-[#FCE7F3] text-black border border-black'
                : 'text-zinc-600 hover:bg-[#FAF6EE]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Thêm Từ Vựng</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTab === 'manage'
                ? 'bg-[#DCFCE7] text-black border border-black'
                : 'text-zinc-600 hover:bg-[#FAF6EE]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Xuất / Nhập JSON</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: CREATE READING TEXT & ADD AUDIO */}
          {activeTab === 'reading' && (
            <form onSubmit={handleSaveReadingText} className="space-y-6">
              {/* Level & Lesson Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cấp độ bài giảng
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e) => {
                      setTargetLevel(e.target.value as LevelId);
                      setTargetLessonId('');
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} - {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn bài học cần thêm bài khóa
                  </label>
                  <select
                    value={targetLessonId}
                    onChange={(e) => setTargetLessonId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="">-- Tạo bài học hoàn toàn mới --</option>
                    {currentLevelLessons.map((les) => (
                      <option key={les.id} value={les.id}>
                        {les.titleVi} ({les.titleZh})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề bài khóa (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Luyện đọc đàm thoại mua sắm"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề Chữ Hán
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 练习买东西"
                    value={textTitleZh}
                    onChange={(e) => setTextTitleZh(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 font-hanzi focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pinyin Tiêu Đề
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Liànxí mǎi dōngxi"
                    value={textTitlePinyin}
                    onChange={(e) => setTextTitlePinyin(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Summary / Instruction */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả bài khóa / Gợi ý luyện phản xạ cho học sinh
                </label>
                <input
                  type="text"
                  placeholder="VD: Học sinh đóng vai A và B trả lời trong vòng 5 giây"
                  value={textSummary}
                  onChange={(e) => setTextSummary(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Audio Source Options (TTS, Direct Microphone Record, or Upload File) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Âm thanh cho bài khóa (Audio)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Tự ghi âm giọng thầy/cô hoặc tải file</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAudioSourceType('tts')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                      audioSourceType === 'tts'
                        ? 'border-red-600 bg-white text-red-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold">1. Giọng Đọc Mẫu Trình Duyệt</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tự động phát âm từng câu chuẩn zh-CN</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioSourceType('record')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                      audioSourceType === 'record'
                        ? 'border-red-600 bg-white text-red-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-rose-600" />
                      <span>2. Thu Âm Trực Tiếp Mic</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Giáo viên tự đọc bài và thu giọng ngay</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioSourceType('upload')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                      audioSourceType === 'upload'
                        ? 'border-red-600 bg-white text-red-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>3. Tải Lên Tệp Audio</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Chọn file .mp3, .wav, .m4a có sẵn</div>
                  </button>
                </div>

                {/* Microphone Recording Panel */}
                {audioSourceType === 'record' && (
                  <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs font-semibold text-slate-800">
                        {isRecording ? 'Đang thu âm giọng đọc...' : 'Bấm nút để bắt đầu thu âm qua Micro'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Thời gian thu: <span className="font-mono font-bold">{recordingSeconds}s</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 animate-pulse"
                        >
                          <Square className="w-4 h-4" />
                          <span>Dừng & Lưu Bản Thu</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 shadow-xs"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Bắt Đầu Thu Âm</span>
                        </button>
                      )}

                      {recordedAudioUri && !isRecording && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = new Audio(recordedAudioUri);
                            a.play();
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-800" />
                          <span>Nghe Lại Bản Thu</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Panel */}
                {audioSourceType === 'upload' && (
                  <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">Chọn file audio từ máy tính:</div>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileUpload}
                      className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-900 cursor-pointer"
                    />
                    {recordedAudioUri && (
                      <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Đã nạp file âm thanh thành công!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sentences List Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Các câu trong bài khóa (Lời thoại / Đoạn văn)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSentence}
                    className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Câu Mới</span>
                  </button>
                </div>

                {sentences.map((sent, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">Câu số {index + 1}</span>
                      {sentences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSentence(index)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Xóa câu này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Người nói (VD: A, Lý Lệ)"
                          value={sent.speaker}
                          onChange={(e) => handleSentenceChange(index, 'speaker', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Chữ Hán * (VD: 你好，今天天气真好！)"
                          value={sent.hanzi}
                          onChange={(e) => handleSentenceChange(index, 'hanzi', e.target.value)}
                          className="w-full text-xs font-hanzi font-normal rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Pinyin (VD: Nǐ hǎo, jīntiān tiānqì zhēn hǎo!)"
                          value={sent.pinyin}
                          onChange={(e) => handleSentenceChange(index, 'pinyin', e.target.value)}
                          className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2 bg-white text-teal-800"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Dịch nghĩa tiếng Việt (VD: Chào bạn, hôm nay thời tiết đẹp thật!)"
                          value={sent.meaning}
                          onChange={(e) => handleSentenceChange(index, 'meaning', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Bài Khóa Của Giáo Viên</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ADD VOCABULARY FLASHCARD */}
          {activeTab === 'flashcard' && (
            <form onSubmit={handleSaveFlashcard} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cấp độ từ vựng
                  </label>
                  <select
                    value={fcLevel}
                    onChange={(e) => {
                      setFcLevel(e.target.value as LevelId);
                      setFcLessonId('');
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} - {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thêm vào bài học
                  </label>
                  <select
                    value={fcLessonId}
                    onChange={(e) => setFcLessonId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                  >
                    {lessons
                      .filter((l) => l.levelId === fcLevel)
                      .map((les) => (
                        <option key={les.id} value={les.id}>
                          {les.titleVi}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 学习"
                    value={fcHanzi}
                    onChange={(e) => setFcHanzi(e.target.value)}
                    className="w-full text-xs font-hanzi font-normal rounded-lg border border-slate-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pinyin
                  </label>
                  <input
                    type="text"
                    placeholder="VD: xuéxí"
                    value={fcPinyin}
                    onChange={(e) => setFcPinyin(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Từ loại
                  </label>
                  <select
                    value={fcWordType}
                    onChange={(e) => setFcWordType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white"
                  >
                    <option value="Danh từ">Danh từ</option>
                    <option value="Động từ">Động từ</option>
                    <option value="Tính từ">Tính từ</option>
                    <option value="Phó từ">Phó từ</option>
                    <option value="Đại từ">Đại từ</option>
                    <option value="Giới từ">Giới từ</option>
                    <option value="Thành ngữ">Thành ngữ (成语)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ý nghĩa tiếng Việt *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Học tập, rèn luyện"
                    value={fcMeaning}
                    onChange={(e) => setFcMeaning(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hán Việt
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Học tập"
                    value={fcHanViet}
                    onChange={(e) => setFcHanViet(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
                  />
                </div>
              </div>

              {/* Example sentence */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Câu ví dụ minh họa cách dùng trong câu
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Câu chữ Hán (VD: 我喜欢学习汉语。)"
                    value={fcExHanzi}
                    onChange={(e) => setFcExHanzi(e.target.value)}
                    className="w-full text-xs font-hanzi font-normal rounded-lg border border-slate-300 p-2.5 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Pinyin câu ví dụ (VD: Wǒ xǐhuan xuéxí Hànyǔ.)"
                    value={fcExPinyin}
                    onChange={(e) => setFcExPinyin(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2.5 bg-white text-teal-800"
                  />
                  <input
                    type="text"
                    placeholder="Dịch nghĩa câu ví dụ (VD: Tôi thích học tiếng Trung.)"
                    value={fcExMeaning}
                    onChange={(e) => setFcExMeaning(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Thẻ Flashcard</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MANAGE CURRICULUM (EXPORT / IMPORT) */}
          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-red-700" />
                  <span>Xuất Tệp Giáo Án (Export JSON)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải toàn bộ giáo án gồm danh sách bài học, các bài khóa tự tạo và các file audio đã thu âm
                  thành một tệp JSON về máy tính để sao lưu hoặc mang sang lớp học khác.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Xuống Tệp Giáo Án (.json)</span>
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-teal-700" />
                  <span>Nhập Tệp Giáo Án (Import JSON)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải lên tệp giáo án JSON đã lưu trước đó để khôi phục hoặc sử dụng bài giảng do giáo viên khác chia sẻ.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

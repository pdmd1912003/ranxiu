import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  Mic,
  Square,
  Play,
  Upload,
  CheckCircle,
  Volume2,
  BookOpen,
} from 'lucide-react';
import { FlashCard, ReadingText, LevelId, Lesson } from '../types';
import { VoiceRecorder } from '../utils/speech';
import {
  getAllLessons,
  addCustomFlashcard,
  updateFlashcard,
  deleteFlashcard,
  updateReadingText,
  deleteReadingText,
  uploadAudioMediaToFirebase,
  loadCustomAudioData,
} from '../utils/storage';

export type EditModalTarget =
  | {
      type: 'flashcard';
      card: FlashCard;
      levelId: LevelId;
      lessonId: string;
      readingTextId?: string;
    }
  | {
      type: 'add-flashcard';
      levelId: LevelId;
      lessonId: string;
      readingTextId?: string;
      readingTextTitle?: string;
    }
  | { type: 'reading'; readingText: ReadingText; levelId: LevelId; lessonId: string }
  | null;

interface EditItemModalProps {
  target: EditModalTarget;
  isOpen: boolean;
  onClose: () => void;
  onRefreshLessons: (updatedLessons: Lesson[]) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  target,
  isOpen,
  onClose,
  onRefreshLessons,
}) => {
  // Flashcard fields
  const [fcHanzi, setFcHanzi] = useState<string>('');
  const [fcPinyin, setFcPinyin] = useState<string>('');
  const [fcMeaning, setFcMeaning] = useState<string>('');
  const [fcWordType, setFcWordType] = useState<string>('Danh từ (dt.)');
  const [fcHanViet, setFcHanViet] = useState<string>('');
  const [fcRadical, setFcRadical] = useState<string>('');
  const [fcReadingTextId, setFcReadingTextId] = useState<string>('');
  const [fcExHanzi, setFcExHanzi] = useState<string>('');
  const [fcExPinyin, setFcExPinyin] = useState<string>('');
  const [fcExMeaning, setFcExMeaning] = useState<string>('');

  // Reading Text fields
  const [rtTitle, setRtTitle] = useState<string>('');
  const [rtTitleZh, setRtTitleZh] = useState<string>('');
  const [rtTitlePinyin, setRtTitlePinyin] = useState<string>('');
  const [rtSummary, setRtSummary] = useState<string>('');
  const [rtSentences, setRtSentences] = useState<
    Array<{
      id: string;
      speaker?: string;
      hanzi: string;
      pinyin: string;
      meaning: string;
    }>
  >([]);

  // Audio recording/upload
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lessonReadingTexts = useMemo(() => {
    if (!target) return [];
    const foundLesson = getAllLessons().find((l) => l.id === target.lessonId);
    return foundLesson?.readingTexts || [];
  }, [target]);

  const selectedReadingTextObj = useMemo(() => {
    if (!fcReadingTextId) return null;
    return lessonReadingTexts.find((rt) => rt.id === fcReadingTextId) || null;
  }, [lessonReadingTexts, fcReadingTextId]);

  useEffect(() => {
    if (!target) return;
    setFeedbackMsg(null);
    setErrorMsg(null);

    if (target.type === 'flashcard') {
      const c = target.card;
      setFcHanzi(c.hanzi || '');
      setFcPinyin(c.pinyin || '');
      setFcMeaning(c.meaning || '');
      setFcWordType(c.wordType || 'Danh từ (dt.)');
      setFcHanViet(c.hanViet || '');
      setFcRadical(c.radical || '');
      setFcReadingTextId(c.readingTextId || target.readingTextId || '');
      setFcExHanzi(c.exampleSentence?.hanzi || '');
      setFcExPinyin(c.exampleSentence?.pinyin || '');
      setFcExMeaning(c.exampleSentence?.meaning || '');
      setAudioUri(c.audioDataUri || c.customAudioUrl || null);
      loadCustomAudioData(target.lessonId, c.id, c.customAudioUrl, c.audioDataUri).then((src) => {
        if (src) setAudioUri(src);
      });
    } else if (target.type === 'add-flashcard') {
      setFcHanzi('');
      setFcPinyin('');
      setFcMeaning('');
      setFcWordType('Danh từ (dt.)');
      setFcHanViet('');
      setFcRadical('');
      setFcReadingTextId(target.readingTextId || '');
      setFcExHanzi('');
      setFcExPinyin('');
      setFcExMeaning('');
      setAudioUri(null);
      setAudioFileName(undefined);
    } else if (target.type === 'reading') {
      const r = target.readingText;
      setRtTitle(r.title || '');
      setRtTitleZh(r.titleZh || '');
      setRtTitlePinyin(r.titlePinyin || '');
      setRtSummary(r.summary || '');
      setAudioFileName(r.audioFileName);
      setRtSentences(
        r.sentences?.map((s, idx) => ({
          id: s.id || `s-${idx + 1}`,
          speaker: s.speaker || '',
          hanzi: s.hanzi,
          pinyin: s.pinyin,
          meaning: s.meaning,
        })) || []
      );
      setAudioUri(r.audioDataUri || r.audioUrl || null);
      loadCustomAudioData(target.lessonId, r.id, r.audioUrl, r.audioDataUri).then((src) => {
        if (src) setAudioUri(src);
      });
    }
  }, [target]);

  if (!isOpen || !target) return null;

  // Audio Recording
  const handleStartRecord = async () => {
    try {
      setErrorMsg(null);
      recorderRef.current = new VoiceRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((p) => p + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMsg('Không thể truy cập Microphone: ' + (err.message || 'Lỗi'));
    }
  };

  const handleStopRecord = async () => {
    if (recorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      try {
        const uri = await recorderRef.current.stop();
        setAudioUri(uri);
        setAudioFileName(`Ghi âm giáo viên (${new Date().toLocaleTimeString('vi-VN')})`);
      } catch (e: any) {
        setErrorMsg('Lỗi dừng ghi âm: ' + e.message);
      }
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAudioUri(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Flashcard Save (Both Edit & Add New)
  const handleSaveFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcHanzi.trim() || !fcMeaning.trim()) {
      setErrorMsg('Vui lòng nhập chữ Hán và ý nghĩa tiếng Việt!');
      return;
    }

    if (target.type === 'flashcard') {
      const updated = updateFlashcard(target.levelId, target.lessonId, target.card.id, {
        hanzi: fcHanzi.trim(),
        pinyin: fcPinyin.trim(),
        meaning: fcMeaning.trim(),
        wordType: fcWordType.trim() || 'Danh từ (dt.)',
        hanViet: fcHanViet.trim() || undefined,
        radical: fcRadical.trim() || undefined,
        readingTextId: fcReadingTextId || undefined,
        audioDataUri: audioUri || undefined,
        exampleSentence: {
          hanzi: fcExHanzi.trim() || `${fcHanzi.trim()}。`,
          pinyin: fcExPinyin.trim() || fcPinyin.trim(),
          meaning: fcExMeaning.trim() || fcMeaning.trim(),
        },
      });

      onRefreshLessons(updated);
      setFeedbackMsg('Đã cập nhật thẻ từ vựng thành công!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 600);
    } else if (target.type === 'add-flashcard') {
      const newCard: FlashCard = {
        id: `fc-custom-${Date.now()}`,
        hanzi: fcHanzi.trim(),
        pinyin: fcPinyin.trim(),
        meaning: fcMeaning.trim(),
        wordType: fcWordType.trim() || 'Danh từ (dt.)',
        hanViet: fcHanViet.trim() || undefined,
        radical: fcRadical.trim() || undefined,
        levelId: target.levelId,
        lessonId: target.lessonId,
        readingTextId: fcReadingTextId || undefined,
        audioDataUri: audioUri || undefined,
        isCustom: true,
        exampleSentence: {
          hanzi: fcExHanzi.trim() || `${fcHanzi.trim()}。`,
          pinyin: fcExPinyin.trim() || fcPinyin.trim(),
          meaning: fcExMeaning.trim() || fcMeaning.trim(),
        },
      };

      const updated = addCustomFlashcard(target.levelId, target.lessonId, newCard);
      onRefreshLessons(updated);
      setFeedbackMsg('Đã thêm từ vựng mới vào bài khóa thành công!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 600);
    }
  };

  // Delete Flashcard IMMEDIATELY (không hiển thị alert/confirm của trình duyệt)
  const handleDeleteCard = () => {
    if (target.type === 'flashcard') {
      const updated = deleteFlashcard(target.levelId, target.lessonId, target.card.id);
      onRefreshLessons(updated);
      onClose();
    }
  };

  // Submit Reading Text Save
  const handleSaveReadingText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rtTitle.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề bài khóa!');
      return;
    }
    if (rtSentences.length === 0 || !rtSentences[0].hanzi.trim()) {
      setErrorMsg('Bài khóa cần ít nhất 1 câu chữ Hán!');
      return;
    }

    if (target.type === 'reading') {
      let finalAudioUrl = target.readingText.audioUrl;
      if (audioUri && audioUri.startsWith('data:')) {
        try {
          setFeedbackMsg('Đang lưu file audio lên Firebase...');
          const res = await fetch(audioUri);
          const blob = await res.blob();
          finalAudioUrl = await uploadAudioMediaToFirebase(
            blob,
            audioFileName || 'audio.mp3',
            target.levelId,
            target.lessonId,
            target.readingText.id,
            audioUri
          );
        } catch (err) {
          console.warn('Could not upload audio in EditItemModal:', err);
        }
      } else if (audioUri) {
        finalAudioUrl = audioUri;
      }

      const updated = updateReadingText(target.levelId, target.lessonId, target.readingText.id, {
        title: rtTitle.trim(),
        titleZh: rtTitleZh.trim() || rtTitle.trim(),
        titlePinyin: rtTitlePinyin.trim(),
        summary: rtSummary.trim(),
        audioUrl: finalAudioUrl || undefined,
        audioDataUri: undefined,
        audioFileName: audioFileName || target.readingText.audioFileName,
        sentences: rtSentences.map((s, idx) => ({
          id: s.id || `s-${idx}-${Date.now()}`,
          speaker: s.speaker,
          hanzi: s.hanzi,
          pinyin: s.pinyin,
          meaning: s.meaning,
        })),
      });

      onRefreshLessons(updated);
      setFeedbackMsg('Đã cập nhật bài khóa thành công!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 600);
    }
  };

  // Delete Reading Text IMMEDIATELY (không hiển thị alert/confirm của trình duyệt)
  const handleDeleteReadingText = () => {
    if (target.type === 'reading') {
      const updated = deleteReadingText(target.levelId, target.lessonId, target.readingText.id);
      onRefreshLessons(updated);
      onClose();
    }
  };

  // Sentence manipulations
  const handleAddSentence = () => {
    setRtSentences([
      ...rtSentences,
      { id: `s-${Date.now()}`, speaker: '', hanzi: '', pinyin: '', meaning: '' },
    ]);
  };

  const handleSentenceChange = (idx: number, field: string, val: string) => {
    const list = [...rtSentences];
    (list[idx] as any)[field] = val;
    setRtSentences(list);
  };

  const handleRemoveSentence = (idx: number) => {
    setRtSentences(rtSentences.filter((_, i) => i !== idx));
  };

  const isFlashcardMode = target.type === 'flashcard' || target.type === 'add-flashcard';

  return (
    <div
      data-modal-open="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000] border-2 border-black overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#FAF6EE]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-black">
              {target.type === 'add-flashcard'
                ? `Thêm Từ Vựng Mới ${target.readingTextTitle ? `· ${target.readingTextTitle}` : ''}`
                : target.type === 'flashcard'
                ? 'Chỉnh Sửa Thẻ Từ Vựng'
                : 'Chỉnh Sửa Bài Khóa'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 flex items-center justify-center shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className="bg-emerald-100 border-b-2 border-black px-6 py-2 text-xs font-black text-emerald-900 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-100 border-b-2 border-black px-6 py-2 text-xs font-black text-rose-900 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 font-black">
              ✕
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* FLASHCARD EDIT / CREATE FORM */}
          {isFlashcardMode && (
            <form onSubmit={handleSaveFlashcard} className="space-y-4">
              {/* Chọn Bài Khóa mà từ vựng này thuộc về */}
              {lessonReadingTexts.length > 0 && (
                <div className="bg-[#DCFCE7]/50 rounded-2xl p-3.5 border-2 border-black">
                  <label className="block text-xs font-black text-black mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Thuộc Bài Khóa (课文):</span>
                  </label>
                  <select
                    value={fcReadingTextId}
                    onChange={(e) => setFcReadingTextId(e.target.value)}
                    className="w-full text-xs font-black rounded-xl border-2 border-black p-2 bg-white text-black"
                  >
                    <option value="">-- Tự động phân nhóm theo câu / Từ vựng mở rộng --</option>
                    {lessonReadingTexts.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.title} {rt.titleZh ? `(${rt.titleZh})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Chữ Hán *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 好, 老师..."
                    value={fcHanzi}
                    onChange={(e) => setFcHanzi(e.target.value)}
                    className="w-full text-base font-hanzi font-normal rounded-xl border-2 border-black p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Pinyin *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: hǎo, lǎoshī..."
                    value={fcPinyin}
                    onChange={(e) => setFcPinyin(e.target.value)}
                    className="w-full text-sm font-mono font-bold rounded-xl border-2 border-black p-2 bg-white text-teal-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Từ loại</label>
                  <input
                    type="text"
                    list="hsk-word-types-list"
                    placeholder="VD: Danh từ (dt.)"
                    value={fcWordType}
                    onChange={(e) => setFcWordType(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-2 border-black p-2.5 bg-white"
                  />
                  <datalist id="hsk-word-types-list">
                    <option value="Danh từ (dt.)" />
                    <option value="Động từ (đgt.)" />
                    <option value="Tính từ (tt.)" />
                    <option value="Đại từ (đt.)" />
                    <option value="Phó từ (pht.)" />
                    <option value="Lượng từ (lt.)" />
                    <option value="Số từ (st.)" />
                    <option value="Trợ từ (trt.)" />
                    <option value="Hậu tố (htố.)" />
                    <option value="Lời chào" />
                    <option value="Danh từ riêng" />
                    <option value="Cụm từ" />
                    <option value="Giới từ" />
                    <option value="Thành ngữ (成语)" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    Ý nghĩa tiếng Việt *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tốt, khỏe / Thầy cô giáo"
                    value={fcMeaning}
                    onChange={(e) => setFcMeaning(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-2 border-black p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    Hán Việt & Bộ thủ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Hán Việt (VD: Hảo)"
                      value={fcHanViet}
                      onChange={(e) => setFcHanViet(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border-2 border-black p-2 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Bộ thủ"
                      value={fcRadical}
                      onChange={(e) => setFcRadical(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border-2 border-black p-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Example sentence */}
              <div className="bg-amber-50/60 rounded-2xl p-4 border-2 border-black space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-black text-black">
                    Câu ví dụ minh họa cách dùng
                  </label>
                  {selectedReadingTextObj && selectedReadingTextObj.sentences.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-800">
                      Bấm câu bên dưới để lấy nhanh từ {selectedReadingTextObj.title}:
                    </span>
                  )}
                </div>

                {/* Gợi ý chọn nhanh câu ví dụ từ Bài khóa */}
                {selectedReadingTextObj && selectedReadingTextObj.sentences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {selectedReadingTextObj.sentences.map((s, idx) => (
                      <button
                        key={s.id || idx}
                        type="button"
                        onClick={() => {
                          setFcExHanzi(s.hanzi);
                          setFcExPinyin(s.pinyin);
                          setFcExMeaning(s.meaning);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#DCFCE7] border border-black text-xs font-hanzi text-black transition-colors cursor-pointer"
                        title={`${s.pinyin} — ${s.meaning}`}
                      >
                        {s.hanzi}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Câu chữ Hán (VD: 老师，您好！)"
                  value={fcExHanzi}
                  onChange={(e) => setFcExHanzi(e.target.value)}
                  className="w-full text-xs font-hanzi font-normal rounded-xl border-2 border-black p-2 bg-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Pinyin câu (VD: Lǎoshī, nín hǎo!)"
                    value={fcExPinyin}
                    onChange={(e) => setFcExPinyin(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border-2 border-black p-2 bg-white text-teal-800"
                  />
                  <input
                    type="text"
                    placeholder="Dịch nghĩa câu ví dụ (VD: Chào cô ạ!)"
                    value={fcExMeaning}
                    onChange={(e) => setFcExMeaning(e.target.value)}
                    className="w-full text-xs rounded-xl border-2 border-black p-2 bg-white text-zinc-700 font-medium"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t-2 border-black/10 flex items-center justify-between">
                {target.type === 'flashcard' ? (
                  <button
                    type="button"
                    onClick={handleDeleteCard}
                    className="cute-btn px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-black border-2 border-black flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Thẻ Này</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cute-btn px-4 py-2 bg-white hover:bg-zinc-100 text-black rounded-xl text-xs font-bold border-2 border-black cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="cute-btn px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    {target.type === 'add-flashcard' ? (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Từ Vựng</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Thay Đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* READING TEXT EDIT FORM */}
          {target.type === 'reading' && (
            <form onSubmit={handleSaveReadingText} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    Tiêu đề (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rtTitle}
                    onChange={(e) => setRtTitle(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-2 border-black p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    Tiêu đề Chữ Hán
                  </label>
                  <input
                    type="text"
                    value={rtTitleZh}
                    onChange={(e) => setRtTitleZh(e.target.value)}
                    className="w-full text-xs font-hanzi font-normal rounded-xl border-2 border-black p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Pinyin Tiêu Đề</label>
                  <input
                    type="text"
                    value={rtTitlePinyin}
                    onChange={(e) => setRtTitlePinyin(e.target.value)}
                    className="w-full text-xs font-mono font-bold rounded-xl border-2 border-black p-2 bg-white text-teal-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">
                  Mô tả bài khóa / Ghi chú phản xạ
                </label>
                <input
                  type="text"
                  value={rtSummary}
                  onChange={(e) => setRtSummary(e.target.value)}
                  className="w-full text-xs rounded-xl border-2 border-black p-2 bg-white"
                />
              </div>

              {/* Audio panel */}
              <div className="bg-emerald-50 rounded-2xl p-4 border-2 border-black space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                    <span>Âm thanh cho bài khóa</span>
                  </label>
                  {audioUri && (
                    <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-400">
                      ✓ Đã có audio riêng
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecord}
                      className="cute-btn px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Dừng Ghi Âm ({recordSeconds}s)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecord}
                      className="cute-btn px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5 text-rose-600" />
                      <span>{audioUri ? 'Thu Âm Lại' : 'Bắt Đầu Thu Âm'}</span>
                    </button>
                  )}

                  <label className="cute-btn px-3 py-1.5 bg-white hover:bg-zinc-100 text-black border-2 border-black rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải File Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {audioUri && (
                    <button
                      type="button"
                      onClick={() => {
                        const a = new Audio(audioUri);
                        a.play();
                      }}
                      className="cute-btn px-3 py-1.5 bg-white text-emerald-800 border-2 border-black rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-emerald-700" />
                      <span>Nghe thử</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sentences List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black">
                    Các câu trong bài khóa ({rtSentences.length} câu)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSentence}
                    className="cute-btn px-2.5 py-1 bg-[#FEF08A] text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Câu</span>
                  </button>
                </div>

                {rtSentences.map((sent, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 rounded-2xl border-2 border-black space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-500">Câu {idx + 1}</span>
                      {rtSentences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSentence(idx)}
                          className="text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Người nói"
                        value={sent.speaker || ''}
                        onChange={(e) => handleSentenceChange(idx, 'speaker', e.target.value)}
                        className="text-xs font-bold rounded-xl border-2 border-black p-1.5 bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Chữ Hán *"
                        value={sent.hanzi}
                        onChange={(e) => handleSentenceChange(idx, 'hanzi', e.target.value)}
                        className="sm:col-span-3 text-xs font-hanzi font-normal rounded-xl border-2 border-black p-1.5 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Pinyin"
                        value={sent.pinyin}
                        onChange={(e) => handleSentenceChange(idx, 'pinyin', e.target.value)}
                        className="text-xs font-mono font-bold rounded-xl border-2 border-black p-1.5 bg-white text-teal-800"
                      />
                      <input
                        type="text"
                        placeholder="Nghĩa tiếng Việt"
                        value={sent.meaning}
                        onChange={(e) => handleSentenceChange(idx, 'meaning', e.target.value)}
                        className="text-xs rounded-xl border-2 border-black p-1.5 bg-white text-zinc-800"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t-2 border-black/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDeleteReadingText}
                  className="cute-btn px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-black border-2 border-black flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Bài Khóa</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cute-btn px-4 py-2 bg-white hover:bg-zinc-100 text-black rounded-xl text-xs font-bold border-2 border-black"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="cute-btn px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

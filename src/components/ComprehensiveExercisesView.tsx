import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Eye,
  EyeOff,
  Volume2,
  Sparkles,
  HelpCircle,
  FileEdit,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  ComprehensiveExerciseSection,
  ExerciseQuestion,
  ExerciseOption,
  LevelId,
} from '../types';
import { HanziClickable } from './HanziClickable';
import { playChineseAudio } from '../utils/speech';

interface ComprehensiveExercisesViewProps {
  exercises: ComprehensiveExerciseSection[];
  levelId: LevelId;
  lessonId: string;
  lessonTitle?: string;
  onUpdateExercises?: (
    levelId: LevelId,
    lessonId: string,
    updatedExercises: ComprehensiveExerciseSection[]
  ) => void;
  onShowStroke?: (char: string) => void;
}

export const ComprehensiveExercisesView: React.FC<ComprehensiveExercisesViewProps> = ({
  exercises,
  levelId,
  lessonId,
  lessonTitle,
  onUpdateExercises,
  onShowStroke,
}) => {
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [checkResults, setCheckResults] = useState<Record<string, boolean | null>>({});

  // Chế độ chỉnh sửa của giáo viên
  const [isTeacherEditMode, setIsTeacherEditMode] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<ExerciseQuestion | null>(null);

  // Thêm câu hỏi mới vào section nào
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newQuestionDraft, setNewQuestionDraft] = useState<Partial<ExerciseQuestion>>({
    promptZh: '',
    promptPinyin: '',
    promptVi: '',
    answer: '',
    explanation: '',
  });

  // State chỉnh sửa Word Bank (Bảng từ cho sẵn)
  const [editingWordBankSectionId, setEditingWordBankSectionId] = useState<string | null>(null);
  const [draftWordBank, setDraftWordBank] = useState<ExerciseOption[]>([]);

  // Bật/Tắt xem tất cả đáp án
  const handleToggleRevealAll = () => {
    const allQuestions: ExerciseQuestion[] = exercises.flatMap((s) => s.questions);
    const allRevealed = allQuestions.every((q) => revealedAnswers[q.id]);

    const nextState: Record<string, boolean> = {};
    allQuestions.forEach((q) => {
      nextState[q.id] = !allRevealed;
    });
    setRevealedAnswers(nextState);
  };

  const handleToggleRevealOne = (qId: string) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleInputChange = (qId: string, val: string) => {
    setUserInputs((prev) => ({ ...prev, [qId]: val }));
    // Reset check result when user edits
    if (checkResults[qId] !== undefined) {
      setCheckResults((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const handleCheckAnswer = (q: ExerciseQuestion) => {
    const input = (userInputs[q.id] || '').trim().toLowerCase();
    if (!input) return;

    const answerStr = q.answer.toLowerCase();
    // Check if input matches option key (A, B, C...) or hanzi in answer
    const isCorrect =
      answerStr.includes(input) ||
      input.replace(/[^a-z0-9\u4e00-\u9fff]/gi, '') ===
        answerStr.replace(/[^a-z0-9\u4e00-\u9fff]/gi, '');

    setCheckResults((prev) => ({ ...prev, [q.id]: isCorrect }));
    if (!revealedAnswers[q.id]) {
      setRevealedAnswers((prev) => ({ ...prev, [q.id]: true }));
    }
  };

  // ================= Quản lý Sửa / Xóa / Thêm =================

  const handleStartEditQuestion = (q: ExerciseQuestion) => {
    setEditingQuestionId(q.id);
    setDraftQuestion({ ...q });
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setDraftQuestion(null);
  };

  const handleSaveQuestion = (secIdx: number, qIdx: number) => {
    if (!draftQuestion) return;
    const updatedSections = [...exercises];
    const targetSection = { ...updatedSections[secIdx] };
    const updatedQuestions = [...targetSection.questions];

    updatedQuestions[qIdx] = {
      ...draftQuestion,
      promptZh: draftQuestion.promptZh.trim(),
      promptPinyin: draftQuestion.promptPinyin?.trim() || '',
      promptVi: draftQuestion.promptVi?.trim() || '',
      answer: draftQuestion.answer.trim(),
      explanation: draftQuestion.explanation?.trim() || '',
    };

    targetSection.questions = updatedQuestions;
    updatedSections[secIdx] = targetSection;

    onUpdateExercises?.(levelId, lessonId, updatedSections);
    setEditingQuestionId(null);
    setDraftQuestion(null);
  };

  const handleDeleteQuestion = (secIdx: number, qId: string) => {
    const updatedSections = [...exercises];
    const targetSection = { ...updatedSections[secIdx] };
    targetSection.questions = targetSection.questions
      .filter((q) => q.id !== qId)
      .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));

    updatedSections[secIdx] = targetSection;
    onUpdateExercises?.(levelId, lessonId, updatedSections);
  };

  const handleStartAddQuestion = (secId: string) => {
    setAddingToSectionId(secId);
    setNewQuestionDraft({
      promptZh: '',
      promptPinyin: '',
      promptVi: '',
      answer: '',
      explanation: '',
    });
  };

  const handleCancelAddQuestion = () => {
    setAddingToSectionId(null);
  };

  const handleSaveNewQuestion = (secIdx: number) => {
    if (!newQuestionDraft.promptZh?.trim() || !newQuestionDraft.answer?.trim()) {
      return;
    }

    const updatedSections = [...exercises];
    const targetSection = { ...updatedSections[secIdx] };
    const nextNum = (targetSection.questions.length || 0) + 1;

    const newQ: ExerciseQuestion = {
      id: `q-custom-${Date.now()}`,
      questionNumber: nextNum,
      promptZh: newQuestionDraft.promptZh.trim(),
      promptPinyin: newQuestionDraft.promptPinyin?.trim() || '',
      promptVi: newQuestionDraft.promptVi?.trim() || '',
      answer: newQuestionDraft.answer.trim(),
      explanation: newQuestionDraft.explanation?.trim() || '',
    };

    targetSection.questions = [...targetSection.questions, newQ];
    updatedSections[secIdx] = targetSection;

    onUpdateExercises?.(levelId, lessonId, updatedSections);
    setAddingToSectionId(null);
    setNewQuestionDraft({
      promptZh: '',
      promptPinyin: '',
      promptVi: '',
      answer: '',
      explanation: '',
    });
  };

  // Word Bank Edit
  const handleStartEditWordBank = (sec: ComprehensiveExerciseSection) => {
    setEditingWordBankSectionId(sec.id);
    setDraftWordBank(sec.wordBank ? [...sec.wordBank] : []);
  };

  const handleSaveWordBank = (secIdx: number) => {
    const updatedSections = [...exercises];
    const targetSection = { ...updatedSections[secIdx] };
    targetSection.wordBank = draftWordBank.filter((wb) => wb.text.trim() !== '');
    updatedSections[secIdx] = targetSection;

    onUpdateExercises?.(levelId, lessonId, updatedSections);
    setEditingWordBankSectionId(null);
    setDraftWordBank([]);
  };

  const handleAddWordBankItem = () => {
    const nextKeyChar = String.fromCharCode(65 + draftWordBank.length); // 'A', 'B', 'C'...
    setDraftWordBank([
      ...draftWordBank,
      { key: nextKeyChar, text: '', pinyin: '', meaning: '' },
    ]);
  };

  const handleRemoveWordBankItem = (index: number) => {
    setDraftWordBank(draftWordBank.filter((_, i) => i !== index));
  };

  const totalQuestionCount = exercises.reduce(
    (acc, sec) => acc + (sec.questions?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="cute-card p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-2 z-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl bg-[#DCFCE7] border-2 border-black text-black shadow-[2px_2px_0px_#000]">
            Bài tập tổng hợp · 综合练习 ({totalQuestionCount} câu)
          </span>
          {lessonTitle && (
            <span className="text-sm font-bold text-zinc-600 hidden sm:inline">
              ({lessonTitle})
            </span>
          )}
        </div>

        {/* Buttons: Pinyin Toggle, Meaning Toggle, Reveal All, Edit Mode */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPinyin((prev) => !prev)}
            className={`cute-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 border-black transition-all ${
              showPinyin
                ? 'bg-[#DCFCE7] text-black shadow-[2px_2px_0px_#000]'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="Bật/Tắt phiên âm Pinyin"
          >
            {showPinyin ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pinyin: Bật</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Pinyin: Tắt</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowMeaning((prev) => !prev)}
            className={`cute-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 border-black transition-all ${
              showMeaning
                ? 'bg-[#FCE7F3] text-black shadow-[2px_2px_0px_#000]'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="Bật/Tắt dịch nghĩa tiếng Việt"
          >
            {showMeaning ? (
              <>
                <Eye className="w-3.5 h-3.5 text-pink-700" />
                <span>Nghĩa: Bật</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Nghĩa: Tắt</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleRevealAll}
            className="cute-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 border-black bg-white hover:bg-amber-50 shadow-[2px_2px_0px_#000]"
            title="Hiện hoặc ẩn tất cả đáp án"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Đáp án tất cả</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTeacherEditMode((prev) => !prev)}
            className={`cute-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 border-black transition-all ${
              isTeacherEditMode
                ? 'bg-[#FEF08A] text-black shadow-[3px_3px_0px_#000]'
                : 'bg-white hover:bg-yellow-50 text-black shadow-[2px_2px_0px_#000]'
            }`}
            title="Bật chế độ sửa để Thêm, Sửa hoặc Xoá câu bài tập"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isTeacherEditMode ? 'Xong sửa' : '✏️ Sửa bài tập'}</span>
          </button>
        </div>
      </div>

      {/* Notice bar when in Teacher Edit Mode */}
      {isTeacherEditMode && (
        <div className="bg-[#FEF08A] border-2 border-black rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-black shadow-[2px_2px_0px_#000]">
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-black shrink-0" />
            <span>
              Chế độ Chỉnh sửa Bài tập: Bạn có thể sửa câu hỏi, đáp án, giải thích hoặc thêm/xoá các câu bài tập bên dưới.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsTeacherEditMode(false)}
            className="cute-btn px-3 py-1 bg-white border border-black rounded-xl text-xs font-black shrink-0"
          >
            Hoàn tất
          </button>
        </div>
      )}

      {/* Exercise Sections */}
      {exercises.length === 0 ? (
        <div className="cute-card p-10 text-center space-y-4 bg-white">
          <p className="text-zinc-600 font-bold">Chưa có câu bài tập nào cho bài học này.</p>
          <button
            type="button"
            onClick={() => {
              const defaultSec: ComprehensiveExerciseSection = {
                id: `ex-sec-${Date.now()}`,
                title: 'I. 选词填空 · Chọn từ thích hợp điền vào chỗ trống',
                description: 'Chọn từ trong khung điền vào chỗ trống thích hợp.',
                wordBank: [
                  { key: 'A', text: '你好' },
                  { key: 'B', text: '老师' },
                ],
                questions: [],
              };
              onUpdateExercises?.(levelId, lessonId, [defaultSec]);
              setIsTeacherEditMode(true);
            }}
            className="cute-btn px-4 py-2 bg-[#DCFCE7] text-black border-2 border-black rounded-xl font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-[2px_2px_0px_#000]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo phần bài tập tổng hợp</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {exercises.map((section, secIdx) => {
            const isEditingWordBank = editingWordBankSectionId === section.id;

            return (
              <div
                key={section.id || secIdx}
                className="cute-card p-6 sm:p-8 bg-white space-y-6"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black/10 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-black">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-xs sm:text-sm text-zinc-600 font-medium">
                        {section.description}
                      </p>
                    )}
                  </div>

                  {isTeacherEditMode && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditWordBank(section)}
                        className="cute-btn px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000]"
                        title="Chỉnh sửa bảng từ cho sẵn (Word Bank)"
                      >
                        <Pencil className="w-3.5 h-3.5 inline mr-1" />
                        <span>Sửa bảng từ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartAddQuestion(section.id)}
                        className="cute-btn px-3 py-1.5 rounded-xl bg-[#DCFCE7] hover:bg-emerald-200 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000]"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        <span>Thêm câu bài tập</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Word Bank Form (When Teacher is editing word bank) */}
                {isEditingWordBank ? (
                  <div className="bg-[#FAF6EE] border-2 border-black rounded-2xl p-4 sm:p-5 space-y-4 shadow-[3px_3px_0px_#000]">
                    <div className="flex items-center justify-between border-b border-black/20 pb-2">
                      <h4 className="text-sm font-black text-black">
                        Chỉnh sửa Bảng từ cho sẵn (Word Bank)
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddWordBankItem}
                        className="cute-btn px-3 py-1 bg-[#DCFCE7] border border-black rounded-lg text-xs font-black"
                      >
                        + Thêm từ lựa chọn
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {draftWordBank.map((wb, wbIdx) => (
                        <div
                          key={wbIdx}
                          className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-black/30"
                        >
                          <input
                            type="text"
                            value={wb.key}
                            onChange={(e) => {
                              const updated = [...draftWordBank];
                              updated[wbIdx].key = e.target.value.toUpperCase();
                              setDraftWordBank(updated);
                            }}
                            className="w-10 px-1 py-1 text-center font-black border border-black rounded-lg text-sm bg-zinc-50"
                            placeholder="Key"
                          />
                          <input
                            type="text"
                            value={wb.text}
                            onChange={(e) => {
                              const updated = [...draftWordBank];
                              updated[wbIdx].text = e.target.value;
                              setDraftWordBank(updated);
                            }}
                            className="flex-1 px-2 py-1 font-hanzi font-bold border border-black/40 rounded-lg text-base"
                            placeholder="Chữ Hán"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveWordBankItem(wbIdx)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingWordBankSectionId(null)}
                        className="cute-btn px-3 py-1.5 bg-white border border-black rounded-xl text-xs font-black"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveWordBank(secIdx)}
                        className="cute-btn px-4 py-1.5 bg-[#DCFCE7] border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_#000]"
                      >
                        Lưu bảng từ
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Word Bank Display (Bảng từ cho sẵn A, B, C, D, E) */
                  section.wordBank &&
                  section.wordBank.length > 0 && (
                    <div className="bg-[#FAF6EE] border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#000]">
                      <div className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bảng từ lựa chọn (Bấm vào từ để nghe phát âm):</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {section.wordBank.map((opt, oIdx) => (
                          <button
                            key={opt.key || oIdx}
                            type="button"
                            onClick={() => playChineseAudio(opt.text)}
                            className="group px-4 py-2 bg-white hover:bg-[#DCFCE7] rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
                            title={`Phát âm: ${opt.text}`}
                          >
                            <span className="font-mono font-black text-sm text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-300">
                              {opt.key}
                            </span>
                            <span className="font-hanzi text-lg sm:text-xl font-bold text-black">
                              {opt.text}
                            </span>
                            {opt.pinyin && (
                              <span className="font-mono text-xs font-semibold text-emerald-800 hidden sm:inline">
                                ({opt.pinyin})
                              </span>
                            )}
                            <Volume2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black ml-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* Form Thêm Câu Bài Tập Mới */}
                {addingToSectionId === section.id && (
                  <div className="bg-[#DCFCE7]/40 border-2 border-black rounded-3xl p-5 sm:p-6 space-y-4 shadow-[3px_3px_0px_#000]">
                    <div className="flex items-center justify-between border-b-2 border-black/15 pb-2">
                      <h4 className="text-base font-black text-black flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-800" />
                        <span>Thêm câu bài tập mới (Câu {section.questions.length + 1})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={handleCancelAddQuestion}
                        className="p-1 rounded-lg hover:bg-black/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-black text-black mb-1">
                          Đề bài chữ Hán (Dùng dấu <code className="px-1 bg-white border border-black rounded">______</code> cho chỗ trống):
                        </label>
                        <textarea
                          rows={2}
                          value={newQuestionDraft.promptZh || ''}
                          onChange={(e) =>
                            setNewQuestionDraft({
                              ...newQuestionDraft,
                              promptZh: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: 你工作忙______？ hoặc hội thoại A: ... / B: ..."
                          className="w-full px-3.5 py-2 rounded-xl border-2 border-black font-hanzi text-base font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-black mb-1">
                            Phiên âm Pinyin:
                          </label>
                          <input
                            type="text"
                            value={newQuestionDraft.promptPinyin || ''}
                            onChange={(e) =>
                              setNewQuestionDraft({
                                ...newQuestionDraft,
                                promptPinyin: e.target.value,
                              })
                            }
                            placeholder="Ví dụ: Nǐ gōngzuò máng ______?"
                            className="w-full px-3 py-2 rounded-xl border border-black font-mono text-xs font-bold text-emerald-800 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-black mb-1">
                            Dịch nghĩa tiếng Việt:
                          </label>
                          <input
                            type="text"
                            value={newQuestionDraft.promptVi || ''}
                            onChange={(e) =>
                              setNewQuestionDraft({
                                ...newQuestionDraft,
                                promptVi: e.target.value,
                              })
                            }
                            placeholder="Ví dụ: Công việc của bạn có bận không?"
                            className="w-full px-3 py-2 rounded-xl border border-black text-xs font-semibold bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-black mb-1">
                            Đáp án đúng:
                          </label>
                          <input
                            type="text"
                            value={newQuestionDraft.answer || ''}
                            onChange={(e) =>
                              setNewQuestionDraft({
                                ...newQuestionDraft,
                                answer: e.target.value,
                              })
                            }
                            placeholder="Ví dụ: B (吗) hoặc 吗"
                            className="w-full px-3 py-2 rounded-xl border-2 border-black text-sm font-bold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-black mb-1">
                            Giải thích đáp án:
                          </label>
                          <input
                            type="text"
                            value={newQuestionDraft.explanation || ''}
                            onChange={(e) =>
                              setNewQuestionDraft({
                                ...newQuestionDraft,
                                explanation: e.target.value,
                              })
                            }
                            placeholder="Ví dụ: Trợ từ nghi vấn 吗 dùng ở cuối câu hỏi..."
                            className="w-full px-3 py-2 rounded-xl border border-black text-xs font-medium bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelAddQuestion}
                        className="cute-btn px-4 py-1.5 bg-white border-2 border-black rounded-xl text-xs font-black"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNewQuestion(secIdx)}
                        className="cute-btn px-5 py-1.5 bg-[#DCFCE7] hover:bg-emerald-200 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_#000]"
                      >
                        + Lưu câu hỏi
                      </button>
                    </div>
                  </div>
                )}

                {/* Danh Sách Câu Hỏi Bài Tập */}
                <div className="space-y-4">
                  {section.questions.map((q, qIdx) => {
                    const isEditingThisQ = editingQuestionId === q.id && draftQuestion !== null;
                    const isRevealed = Boolean(revealedAnswers[q.id]);
                    const checkResult = checkResults[q.id];
                    const cleanAudioText = q.promptZh.replace(/______/g, ' ').replace(/[()（）]/g, '');

                    if (isEditingThisQ) {
                      return (
                        <div
                          key={q.id || qIdx}
                          className="bg-[#FEF08A]/30 border-2 border-black rounded-3xl p-5 space-y-4 shadow-[3px_3px_0px_#000]"
                        >
                          <div className="flex items-center justify-between border-b-2 border-black/15 pb-2">
                            <h4 className="text-sm font-black text-black flex items-center gap-1.5">
                              <Pencil className="w-4 h-4" />
                              <span>Sửa câu bài tập {q.questionNumber || qIdx + 1}</span>
                            </h4>
                            <button
                              type="button"
                              onClick={handleCancelEditQuestion}
                              className="p-1 rounded-lg hover:bg-black/10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-xs font-black text-black mb-1">
                                Câu hỏi chữ Hán:
                              </label>
                              <textarea
                                rows={2}
                                value={draftQuestion.promptZh}
                                onChange={(e) =>
                                  setDraftQuestion({
                                    ...draftQuestion,
                                    promptZh: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl border-2 border-black font-hanzi text-base font-bold bg-white"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-black text-black mb-1">
                                  Pinyin:
                                </label>
                                <input
                                  type="text"
                                  value={draftQuestion.promptPinyin || ''}
                                  onChange={(e) =>
                                    setDraftQuestion({
                                      ...draftQuestion,
                                      promptPinyin: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl border border-black font-mono text-xs font-bold text-emerald-800 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black text-black mb-1">
                                  Nghĩa tiếng Việt:
                                </label>
                                <input
                                  type="text"
                                  value={draftQuestion.promptVi || ''}
                                  onChange={(e) =>
                                    setDraftQuestion({
                                      ...draftQuestion,
                                      promptVi: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl border border-black text-xs font-semibold bg-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-black text-black mb-1">
                                  Đáp án đúng:
                                </label>
                                <input
                                  type="text"
                                  value={draftQuestion.answer}
                                  onChange={(e) =>
                                    setDraftQuestion({
                                      ...draftQuestion,
                                      answer: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl border-2 border-black text-sm font-bold bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black text-black mb-1">
                                  Giải thích:
                                </label>
                                <input
                                  type="text"
                                  value={draftQuestion.explanation || ''}
                                  onChange={(e) =>
                                    setDraftQuestion({
                                      ...draftQuestion,
                                      explanation: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl border border-black text-xs bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(secIdx, q.id)}
                              className="cute-btn inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 text-xs font-black"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xoá câu này</span>
                            </button>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditQuestion}
                                className="cute-btn px-3 py-1.5 bg-white border border-black rounded-xl text-xs font-black"
                              >
                                Huỷ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveQuestion(secIdx, qIdx)}
                                className="cute-btn inline-flex items-center gap-1 px-4 py-1.5 bg-[#DCFCE7] border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_#000]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Lưu thay đổi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Render Standard Question View
                    return (
                      <div
                        key={q.id || qIdx}
                        className="group p-5 bg-[#FAF6EE]/60 hover:bg-[#FAF6EE] rounded-3xl border-2 border-black/15 hover:border-black transition-all space-y-3"
                      >
                        {/* Header của câu hỏi: Số câu, Chữ Hán, Nút loa, Nút sửa/xoá */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                            <span className="w-8 h-8 rounded-xl bg-white border-2 border-black font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                              {q.questionNumber || qIdx + 1}
                            </span>

                            <div className="space-y-1.5 flex-1">
                              {/* Chữ Hán câu hỏi */}
                              <div className="font-hanzi text-xl sm:text-2xl md:text-3xl font-normal text-black leading-relaxed whitespace-pre-line">
                                <HanziClickable
                                  text={q.promptZh}
                                  onShowStroke={onShowStroke || (() => {})}
                                  className="hover:text-emerald-700 transition-colors"
                                />
                              </div>

                              {/* Pinyin */}
                              {showPinyin && q.promptPinyin && (
                                <p className="font-mono text-xs sm:text-sm font-bold text-emerald-800 whitespace-pre-line tracking-wide">
                                  {q.promptPinyin}
                                </p>
                              )}

                              {/* Dịch nghĩa tiếng Việt */}
                              {showMeaning && q.promptVi && (
                                <p className="text-xs sm:text-sm text-zinc-600 font-medium whitespace-pre-line">
                                  — {q.promptVi}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Tools for this question */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => playChineseAudio(cleanAudioText)}
                              className="cute-btn p-2 bg-[#FCE7F3] hover:bg-pink-200 rounded-xl text-black border-2 border-black"
                              title="Nghe phát âm câu hỏi"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleRevealOne(q.id)}
                              className={`cute-btn p-2 rounded-xl text-black border-2 border-black ${
                                isRevealed ? 'bg-[#DCFCE7]' : 'bg-white hover:bg-zinc-100'
                              }`}
                              title={isRevealed ? 'Ẩn đáp án' : 'Xem đáp án'}
                            >
                              <HelpCircle className="w-4 h-4 text-emerald-800" />
                            </button>

                            {isTeacherEditMode && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditQuestion(q)}
                                  className="cute-btn p-2 rounded-xl bg-white hover:bg-yellow-100 text-black border-2 border-black"
                                  title="Chỉnh sửa câu hỏi này"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(secIdx, q.id)}
                                  className="cute-btn p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-300"
                                  title="Xoá câu hỏi này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Interactive Input & Answer Area */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-black/10">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                            <input
                              type="text"
                              value={userInputs[q.id] || ''}
                              onChange={(e) => handleInputChange(q.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCheckAnswer(q);
                              }}
                              placeholder="Nhập chữ Hán hoặc chữ cái (A, B...)"
                              className="w-full px-3.5 py-1.5 rounded-xl border-2 border-black/60 bg-white font-bold text-xs sm:text-sm focus:border-black focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleCheckAnswer(q)}
                              className="cute-btn px-3 py-1.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black border-2 border-black rounded-xl text-xs font-black shrink-0"
                            >
                              Kiểm tra
                            </button>
                          </div>

                          {checkResult !== null && checkResult !== undefined && (
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                                checkResult
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                                  : 'bg-amber-100 text-amber-800 border-amber-400'
                              }`}
                            >
                              {checkResult ? '🎉 Chính xác!' : '💡 Thử lại hoặc xem đáp án bên dưới'}
                            </span>
                          )}
                        </div>

                        {/* Revealed Answer Card */}
                        {isRevealed && (
                          <div className="p-3.5 bg-white rounded-2xl border-2 border-emerald-400/80 shadow-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#DCFCE7] text-emerald-900 border border-emerald-300">
                                Đáp án chính xác:
                              </span>
                              <span className="font-hanzi text-base sm:text-lg font-black text-black">
                                {q.answer}
                              </span>
                            </div>
                            {q.explanation && (
                              <p className="text-xs text-zinc-600 font-semibold pl-1">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

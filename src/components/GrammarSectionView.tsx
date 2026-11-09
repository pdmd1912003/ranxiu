import React, { useState } from 'react';
import {
  Pencil,
  Volume2,
  Eye,
  EyeOff,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { GrammarNote, LevelId } from '../types';
import { HanziClickable } from './HanziClickable';
import { playChineseAudio } from '../utils/speech';

interface GrammarSectionViewProps {
  grammarList: GrammarNote[];
  levelId: LevelId;
  lessonId: string;
  lessonTitle?: string;
  onUpdateGrammarNote?: (
    levelId: LevelId,
    lessonId: string,
    grammarIndex: number,
    updatedNote: GrammarNote
  ) => void;
  onShowStroke?: (char: string) => void;
}

export type SegmentColor = 'blue' | 'red' | 'green' | 'purple';

export interface ColoredSegment {
  text: string;
  color: SegmentColor;
}

const COLOR_CLASS_MAP: Record<SegmentColor, string> = {
  blue: 'text-[#0066B3]',
  red: 'text-[#E60012]',
  green: 'text-[#009944]',
  purple: 'text-[#7C3AED]',
};

const COMMON_GRAMMAR_FUNCTORS = [
  '不是',
  '不会',
  '不能',
  '没有',
  '不客气',
  '没关系',
  '不用',
  '可以',
  '应该',
  '喜欢',
  '认识',
  '学习',
  '工作',
  '觉得',
  '知道',
  '希望',
  '准备',
  '开始',
  '正在',
  '已经',
  '一起',
  '怎么',
  '什么',
  '多少',
  '哪里',
  '哪儿',
  '是',
  '会',
  '能',
  '想',
  '要',
  '有',
  '在',
  '叫',
  '姓',
  '去',
  '来',
  '看',
  '听',
  '说',
  '读',
  '写',
  '吃',
  '喝',
  '买',
  '做',
  '学',
  '住',
  '坐',
  '回',
  '给',
  '找',
  '懂',
  '到',
  '完',
  '好',
  '的',
  '们',
  '吗',
  '呢',
  '吧',
  '了',
  '过',
  '着',
  '不',
  '没',
  '很',
  '太',
  '真',
  '最',
  '更',
  '也',
  '都',
  '还',
  '只',
  '就',
  '才',
  '比',
  '把',
  '被',
  '让',
  '跟',
  '和',
  '对',
  '向',
  '離',
  '离',
  '从',
];

/**
 * Trích xuất các từ khoá chữ Hán có trong phần tiêu đề và cấu trúc của điểm ngữ pháp
 */
function extractGrammarKeywords(note: GrammarNote): string[] {
  const source = `${note.structure || ''} ${note.title || ''}`;
  const matches = source.match(/[\u4e00-\u9fff]+/g) || [];
  const unique = Array.from(new Set(matches));
  return unique.sort((a, b) => b.length - a.length);
}

/**
 * Phân tách công thức cấu trúc (structure) thành các dòng và các thành phần có màu:
 * Thành phần 1: Xanh dương (#0066B3)
 * Thành phần 2: Đỏ (#E60012)
 * Thành phần 3: Xanh lá (#009944)
 */
function parseStructureFormula(structure: string): ColoredSegment[][] {
  const lines = structure
    .split('|')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      return [{ text: parts[0], color: 'red' as SegmentColor }];
    }

    if (parts.length === 2) {
      const hasHanzi0 = /[\u4e00-\u9fff]/.test(parts[0]);
      const hasHanzi1 = /[\u4e00-\u9fff]/.test(parts[1]);
      if (hasHanzi0 && !hasHanzi1) {
        return [
          { text: parts[0], color: 'red' },
          { text: parts[1], color: 'green' },
        ];
      }
      return [
        { text: parts[0], color: 'blue' },
        { text: parts[1], color: 'red' },
      ];
    }

    const palette: SegmentColor[] = ['blue', 'red', 'green', 'purple'];
    return parts.map((part, idx) => ({
      text: part,
      color: palette[idx % palette.length],
    }));
  });
}

/**
 * Phân tách câu ví dụ chữ Hán thành các cụm màu (Xanh dương - Đỏ - Xanh lá)
 * để khớp trực quan với hộp cấu trúc giống hình mẫu.
 * - Nếu giáo viên chủ động gõ dấu cách hoặc ký tự `|` (VD: "我 会 做饭"), ưu tiên tách theo khoảng trắng / `|`.
 * - Nếu viết liền (VD: "我会做饭"), tự động nhận diện từ trọng tâm trong cấu trúc ngữ pháp hoặc động từ/hư từ chính.
 */
function segmentChineseSentence(sentence: string, note: GrammarNote): ColoredSegment[] {
  const trimmed = sentence.trim();
  if (!trimmed) return [];

  // 1. Nếu có dấu `|` phân cách tường minh
  if (trimmed.includes('|')) {
    const parts = trimmed
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    const palette: SegmentColor[] = ['blue', 'red', 'green', 'purple'];
    return parts.map((p, idx) => ({
      text: p,
      color: palette[idx % palette.length],
    }));
  }

  // 2. Nếu giáo viên gõ dấu cách giữa các thành phần (VD: "我 会 做饭")
  const spaceParts = trimmed.split(/\s+/).filter(Boolean);
  if (spaceParts.length >= 2) {
    const palette: SegmentColor[] = ['blue', 'red', 'green', 'purple'];
    return spaceParts.map((p, idx) => ({
      text: p,
      color: palette[idx % palette.length],
    }));
  }

  // 3. Tự động tách câu viết liền theo từ khoá ngữ pháp (ưu tiên từ khoá của bài học trước)
  const noteKeywords = extractGrammarKeywords(note);
  const allKeywords = [
    ...noteKeywords,
    ...COMMON_GRAMMAR_FUNCTORS.filter((k) => !noteKeywords.includes(k)),
  ];

  for (const kw of allKeywords) {
    const idx = trimmed.indexOf(kw);
    if (idx !== -1) {
      const before = trimmed.slice(0, idx);
      const after = trimmed.slice(idx + kw.length);

      // Nếu từ khoá nằm ở giữa câu -> đủ 3 thành phần: Chủ ngữ (Blue) + Từ khoá (Red) + Vị ngữ/Tân ngữ (Green)
      if (before && after) {
        // Nếu phần sau chỉ là dấu câu (VD: "你是老师吗？" với kw = "吗")
        if (/^[。！？.!?,，、；：]+$/.test(after)) {
          // Thử tách phần `before` thêm 1 nhịp để câu có đủ 3 màu đẹp mắt
          for (const subKw of COMMON_GRAMMAR_FUNCTORS) {
            if (subKw === kw) continue;
            const subIdx = before.indexOf(subKw);
            if (subIdx > 0 && subIdx < before.length - subKw.length) {
              return [
                { text: before.slice(0, subIdx), color: 'blue' },
                { text: before.slice(subIdx), color: 'green' },
                { text: kw + after, color: 'red' },
              ];
            }
          }
          return [
            { text: before, color: 'blue' },
            { text: kw + after, color: 'red' },
          ];
        }

        return [
          { text: before, color: 'blue' },
          { text: kw, color: 'red' },
          { text: after, color: 'green' },
        ];
      }

      // Nếu từ khoá nằm ở đầu câu (before rỗng) nhưng có phần sau
      if (!before && after) {
        return [
          { text: kw, color: 'red' },
          { text: after, color: 'green' },
        ];
      }

      // Nếu từ khoá nằm ở cuối câu (after rỗng) nhưng có phần trước
      if (before && !after) {
        return [
          { text: before, color: 'blue' },
          { text: kw, color: 'red' },
        ];
      }
    }
  }

  // 4. Nếu câu có dấu phẩy ngăn cách 2 vế (VD: "对不起，没关系。")
  const commaMatch = trimmed.match(/^([^，,]+[，,])(.+)$/);
  if (commaMatch) {
    return [
      { text: commaMatch[1], color: 'blue' },
      { text: commaMatch[2], color: 'red' },
    ];
  }

  // 5. Fallback cho câu ngắn không khớp từ khoá
  if (trimmed.length >= 3) {
    return [
      { text: trimmed.slice(0, 1), color: 'blue' },
      { text: trimmed.slice(1, 2), color: 'red' },
      { text: trimmed.slice(2), color: 'green' },
    ];
  }

  return [{ text: trimmed, color: 'blue' }];
}

export const GrammarSectionView: React.FC<GrammarSectionViewProps> = ({
  grammarList,
  levelId,
  lessonId,
  lessonTitle,
  onUpdateGrammarNote,
  onShowStroke,
}) => {
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);

  // State phục vụ chỉnh sửa từng điểm ngữ pháp
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState<GrammarNote | null>(null);

  const handleStartEdit = (idx: number, note: GrammarNote) => {
    setEditingIndex(idx);
    setDraftNote({
      ...note,
      title: note.title || '',
      explanation: note.explanation || '',
      structure: note.structure || '',
      examples: (note.examples || []).map((ex) => ({
        zh: ex.zh || ex.hanzi || '',
        pinyin: ex.pinyin || '',
        vi: ex.vi || ex.meaning || '',
      })),
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setDraftNote(null);
  };

  const handleSaveEdit = (idx: number) => {
    if (!draftNote) return;
    const cleanedNote: GrammarNote = {
      ...draftNote,
      title: draftNote.title.trim() || `Điểm ngữ pháp ${idx + 1}`,
      explanation: draftNote.explanation.trim(),
      structure: draftNote.structure?.trim() || '',
      examples: (draftNote.examples || [])
        .filter((ex) => (ex.zh || ex.hanzi || '').trim() !== '')
        .map((ex) => ({
          zh: (ex.zh || ex.hanzi || '').trim(),
          pinyin: (ex.pinyin || '').trim(),
          vi: (ex.vi || ex.meaning || '').trim(),
        })),
    };

    onUpdateGrammarNote?.(levelId, lessonId, idx, cleanedNote);
    setEditingIndex(null);
    setDraftNote(null);
  };

  const handleExampleChange = (
    exIdx: number,
    field: 'zh' | 'pinyin' | 'vi',
    value: string
  ) => {
    if (!draftNote) return;
    const nextExamples = [...(draftNote.examples || [])];
    nextExamples[exIdx] = {
      ...nextExamples[exIdx],
      [field]: value,
    };
    setDraftNote({
      ...draftNote,
      examples: nextExamples,
    });
  };

  const handleAddExample = () => {
    if (!draftNote) return;
    setDraftNote({
      ...draftNote,
      examples: [
        ...(draftNote.examples || []),
        { zh: '', pinyin: '', vi: '' },
      ],
    });
  };

  const handleRemoveExample = (exIdx: number) => {
    if (!draftNote) return;
    setDraftNote({
      ...draftNote,
      examples: (draftNote.examples || []).filter((_, i) => i !== exIdx),
    });
  };

  return (
    <div className="space-y-6">
      {/* Thanh công cụ Ngữ Pháp: Bật/Tắt Pinyin, Bật/Tắt Nghĩa & Chú thích màu cấu trúc */}
      <div className="cute-card p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-2 z-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl bg-[#DCFCE7] border-2 border-black text-black shadow-[2px_2px_0px_#000]">
            Ngữ pháp trọng tâm · {grammarList.length} chủ điểm
          </span>
          {lessonTitle && (
            <span className="text-sm font-bold text-zinc-600 hidden sm:inline">
              ({lessonTitle})
            </span>
          )}
          {/* Chú giải màu sắc thành phần câu */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-extrabold bg-[#FAF6EE] px-3 py-1.5 rounded-xl border border-black/30">
            <span className="text-[#0066B3]">● Chủ ngữ / Thành phần 1</span>
            <span className="text-zinc-400">+</span>
            <span className="text-[#E60012]">● Từ ngữ pháp / Động từ</span>
            <span className="text-zinc-400">+</span>
            <span className="text-[#009944]">● Động từ / Tân ngữ</span>
          </div>
        </div>

        {/* Nút Bật / Tắt Pinyin & Nghĩa */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPinyin((prev) => !prev)}
            className={`cute-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 border-black transition-all ${
              showPinyin
                ? 'bg-[#DCFCE7] text-black shadow-[2px_2px_0px_#000]'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="Bật hoặc tắt hiển thị Pinyin trong toàn bộ tab Ngữ pháp"
          >
            {showPinyin ? (
              <>
                <Eye className="w-4 h-4 text-emerald-700" />
                <span>Pinyin: Đang Bật</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-zinc-500" />
                <span>Pinyin: Đang Tắt</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowMeaning((prev) => !prev)}
            className={`cute-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 border-black transition-all ${
              showMeaning
                ? 'bg-[#FCE7F3] text-black shadow-[2px_2px_0px_#000]'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="Bật hoặc tắt hiển thị nghĩa tiếng Việt của câu ví dụ"
          >
            {showMeaning ? (
              <>
                <Eye className="w-4 h-4 text-pink-700" />
                <span>Nghĩa: Đang Bật</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-zinc-500" />
                <span>Nghĩa: Đang Tắt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Danh sách từng Điểm Ngữ Pháp */}
      <div className="space-y-8">
        {grammarList.map((note, idx) => {
          const isEditing = editingIndex === idx && draftNote !== null;
          const structureLines = note.structure
            ? parseStructureFormula(note.structure)
            : [];

          return (
            <div
              key={note.id || idx}
              className="cute-card p-6 sm:p-8 md:p-10 bg-white space-y-6 sm:space-y-8"
            >
              {/* Header của Điểm Ngữ Pháp: Badge + Tiêu đề lớn */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black/10 pb-5">
                <div className="space-y-2 max-w-4xl">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-lg bg-[#DCFCE7] border-2 border-black text-black shadow-[2px_2px_0px_#000]">
                      Điểm ngữ pháp {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-black tracking-tight leading-snug">
                    {note.title}
                  </h3>
                </div>
              </div>

              {/* Phần Mô tả (Description) + Nút hình cây bút để sửa */}
              {!isEditing ? (
                <div className="bg-[#FAF6EE] border-2 border-black/20 rounded-2xl p-4 sm:p-6 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Giải thích ngữ pháp</span>
                    </div>
                    <p className="text-base sm:text-xl md:text-2xl text-zinc-800 leading-relaxed font-semibold whitespace-pre-line">
                      {note.explanation}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(idx, note)}
                    className="cute-btn shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FCE7F3] text-black border-2 border-black text-xs sm:text-sm font-black shadow-[2px_2px_0px_#000]"
                    title="Chỉnh sửa giải thích, cấu trúc và câu ví dụ của điểm ngữ pháp này"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Sửa</span>
                  </button>
                </div>
              ) : (
                /* Khung Chỉnh Sửa Điểm Ngữ Pháp khi bấm nút cây bút */
                <div className="bg-[#FAF6EE] border-2 border-black rounded-3xl p-5 sm:p-6 space-y-5 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between border-b-2 border-black/15 pb-3">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-black" />
                      <h4 className="text-base sm:text-lg font-black text-black">
                        Chỉnh sửa Điểm ngữ pháp {idx + 1}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-lg hover:bg-black/10 text-zinc-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-black text-black mb-1.5">
                        Tiêu đề ngữ pháp:
                      </label>
                      <input
                        type="text"
                        value={draftNote.title}
                        onChange={(e) =>
                          setDraftNote({ ...draftNote, title: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Nhập tiêu đề điểm ngữ pháp..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-black text-black mb-1.5">
                        Mô tả / Giải thích (Description):
                      </label>
                      <textarea
                        rows={3}
                        value={draftNote.explanation}
                        onChange={(e) =>
                          setDraftNote({
                            ...draftNote,
                            explanation: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white text-sm sm:text-base font-semibold leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Nhập giải thích chi tiết cho điểm ngữ pháp..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-black text-black mb-1">
                        Cấu trúc (Dùng dấu <code className="px-1.5 py-0.5 bg-white border border-black rounded">+</code> để tách các màu Xanh dương + Đỏ + Xanh lá, dùng <code className="px-1.5 py-0.5 bg-white border border-black rounded">|</code> nếu có nhiều dòng):
                      </label>
                      <input
                        type="text"
                        value={draftNote.structure || ''}
                        onChange={(e) =>
                          setDraftNote({
                            ...draftNote,
                            structure: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Ví dụ: Chủ ngữ + 会 + động từ"
                      />
                    </div>

                    {/* Chỉnh sửa các câu ví dụ */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs sm:text-sm font-black text-black">
                          Các câu ví dụ (Mẹo: Gõ dấu cách giữa các phần như{' '}
                          <span className="px-1.5 py-0.5 bg-white border border-black/40 rounded font-hanzi">
                            我 会 做饭
                          </span>{' '}
                          để tuỳ chỉnh màu Xanh dương - Đỏ - Xanh lá theo ý muốn):
                        </label>
                        <button
                          type="button"
                          onClick={handleAddExample}
                          className="cute-btn inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-black border-2 border-black text-xs font-black"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm câu ví dụ</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(draftNote.examples || []).map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-3 bg-white rounded-2xl border-2 border-black grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                          >
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={ex.zh || ''}
                                onChange={(e) =>
                                  handleExampleChange(exIdx, 'zh', e.target.value)
                                }
                                placeholder="Chữ Hán (VD: 我 会 做饭)"
                                className="w-full px-3 py-2 rounded-xl border border-black/40 font-hanzi text-base font-bold focus:outline-none focus:border-black"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={ex.pinyin || ''}
                                onChange={(e) =>
                                  handleExampleChange(
                                    exIdx,
                                    'pinyin',
                                    e.target.value
                                  )
                                }
                                placeholder="Pinyin (VD: Wǒ huì zuòfàn.)"
                                className="w-full px-3 py-2 rounded-xl border border-black/40 font-mono text-xs sm:text-sm font-bold text-emerald-800 focus:outline-none focus:border-black"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={ex.vi || ''}
                                onChange={(e) =>
                                  handleExampleChange(exIdx, 'vi', e.target.value)
                                }
                                placeholder="Nghĩa tiếng Việt"
                                className="w-full px-3 py-2 rounded-xl border border-black/40 text-xs sm:text-sm font-semibold focus:outline-none focus:border-black"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveExample(exIdx)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-300"
                                title="Xoá câu ví dụ này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="cute-btn px-4 py-2 rounded-xl bg-white text-black border-2 border-black text-xs sm:text-sm font-black"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(idx)}
                      className="cute-btn inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#DCFCE7] hover:bg-emerald-200 text-black border-2 border-black text-xs sm:text-sm font-black shadow-[2px_2px_0px_#000]"
                    >
                      <Check className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hộp CẤU TRÚC to, căn giữa, phân màu Xanh dương + Đỏ + Xanh lá giống hình mẫu */}
              {structureLines.length > 0 && (
                <div className="py-2">
                  <div className="max-w-4xl mx-auto rounded-[2rem] border-[3px] border-[#4ADE80] ring-4 ring-[#DCFCE7] bg-white px-6 sm:px-10 py-6 sm:py-8 text-center shadow-sm space-y-4">
                    {structureLines.map((segments, lineIdx) => (
                      <div
                        key={lineIdx}
                        className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 gap-y-2 text-2xl sm:text-4xl md:text-[42px] font-extrabold tracking-tight leading-tight"
                      >
                        {segments.map((seg, segIdx) => (
                          <React.Fragment key={segIdx}>
                            {segIdx > 0 && (
                              <span className="text-black font-black select-none">
                                +
                              </span>
                            )}
                            <span
                              className={`${COLOR_CLASS_MAP[seg.color]} font-serif sm:font-sans`}
                            >
                              {seg.text}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách CÂU VÍ DỤ to, căn giữa, tách màu thành phần tương ứng */}
              {note.examples && note.examples.length > 0 && (
                <div className="space-y-6 pt-2">
                  <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
                    {note.examples.map((ex, eIdx) => {
                      const zhText = ex.zh || ex.hanzi || '';
                      const viText = ex.vi || ex.meaning || '';
                      const coloredSegments = segmentChineseSentence(
                        zhText,
                        note
                      );
                      const cleanAudioText = zhText.replace(/\|/g, ' ');

                      return (
                        <div
                          key={eIdx}
                          className="group relative rounded-3xl bg-[#FAF6EE]/70 hover:bg-[#FAF6EE] border-2 border-black/15 hover:border-black transition-all px-5 sm:px-8 py-5 sm:py-6 flex flex-col items-center text-center gap-2.5"
                        >
                          {/* Dòng chữ Hán cỡ lớn phân tách màu Xanh dương - Đỏ - Xanh lá */}
                          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-7 gap-y-2">
                            {coloredSegments.map((seg, sIdx) => (
                              <HanziClickable
                                key={sIdx}
                                text={seg.text}
                                onShowStroke={onShowStroke || (() => {})}
                                className={`font-hanzi text-3xl sm:text-5xl md:text-[54px] font-normal leading-tight tracking-wide ${
                                  COLOR_CLASS_MAP[seg.color]
                                }`}
                              />
                            ))}

                            <button
                              type="button"
                              onClick={() => playChineseAudio(cleanAudioText)}
                              className="cute-btn p-2.5 sm:p-3 bg-[#FCE7F3] hover:bg-pink-200 rounded-2xl text-black border-2 border-black shrink-0 shadow-[2px_2px_0px_#000] ml-1"
                              title="Nghe phát âm câu ví dụ"
                            >
                              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                          </div>

                          {/* Dòng Pinyin (Bật / Tắt theo nút Pinyin) */}
                          {showPinyin && ex.pinyin && (
                            <div className="font-mono text-base sm:text-xl md:text-2xl text-emerald-800 font-bold tracking-wide">
                              {ex.pinyin}
                            </div>
                          )}

                          {/* Dòng Nghĩa tiếng Việt (Bật / Tắt theo nút Nghĩa) */}
                          {showMeaning && viText && (
                            <div className="text-sm sm:text-lg md:text-xl text-zinc-700 font-semibold">
                              — {viText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

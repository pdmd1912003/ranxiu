import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Volume2,
  FileText,
  CreditCard,
  PlusCircle,
  Plus,
  Presentation,
  List,
  Sparkles,
  Pencil,
  Brush,
  BookOpen,
} from 'lucide-react';
import { LevelInfo, Lesson, LevelId, FlashCard, ReadingText } from '../types';
import { FlashcardDeck } from './FlashcardDeck';
import { ReadingTextRoom } from './ReadingTextRoom';
import { HanziClickable } from './HanziClickable';
import { playChineseAudio } from '../utils/speech';
import { VocabWordFlashcardModal } from './VocabWordFlashcardModal';
import { ReadingTextAudioBar } from './ReadingTextAudioBar';

export type LessonTabType = 'flashcards' | 'reading' | 'vocab-list' | 'grammar' | 'hanzi-writer';

export interface ReadingTextVocabGroup {
  id: string;
  readingText: ReadingText | null;
  title: string;
  titleZh?: string;
  summary?: string;
  cards: FlashCard[];
}

export function groupFlashcardsByReadingText(
  flashcards: FlashCard[],
  readingTexts: ReadingText[]
): ReadingTextVocabGroup[] {
  if (!readingTexts || readingTexts.length === 0) {
    return [
      {
        id: 'all',
        readingText: null,
        title: 'Tất cả từ vựng',
        cards: flashcards,
      },
    ];
  }

  const textMatchers = readingTexts.map((rt) => {
    const combinedSentenceText = rt.sentences.map((s) => s.hanzi).join(' ');
    const combinedSentencePinyin = rt.sentences.map((s) => s.pinyin || '').join(' ').toLowerCase();
    const sentenceList = rt.sentences;
    return {
      rt,
      combinedSentenceText,
      combinedSentencePinyin,
      sentenceList,
    };
  });

  const groups: ReadingTextVocabGroup[] = readingTexts.map((rt, idx) => ({
    id: rt.id || `rt-${idx}`,
    readingText: rt,
    title: rt.title,
    titleZh: rt.titleZh,
    summary: rt.summary,
    cards: [],
  }));

  const unassignedCards: FlashCard[] = [];

  flashcards.forEach((card) => {
    const cleanHanzi = card.hanzi.replace(/\([^)]*\)/g, '').trim();
    const cleanExample = card.exampleSentence?.hanzi
      ? card.exampleSentence.hanzi.replace(/\([^)]*\)/g, '').trim()
      : '';

    let matchedIdx = -1;

    // 0. Explicit assignment: if teacher assigned card.readingTextId to a specific Bài khóa
    if (card.readingTextId) {
      matchedIdx = groups.findIndex((g) => g.id === card.readingTextId);
    }

    // 1. Exact Example Sentence match: if card's example sentence matches an exact sentence in a Bài khóa
    if (matchedIdx === -1 && cleanExample) {
      matchedIdx = textMatchers.findIndex((m) =>
        m.sentenceList.some((s) => s.hanzi.replace(/\([^)]*\)/g, '').trim() === cleanExample)
      );
    }

    // 2. Direct match: cleanHanzi appears in reading text sentences
    if (matchedIdx === -1 && cleanHanzi) {
      matchedIdx = textMatchers.findIndex((m) => m.combinedSentenceText.includes(cleanHanzi));
    }

    // 3. Partial Example sentence match
    if (matchedIdx === -1 && cleanExample) {
      matchedIdx = textMatchers.findIndex(
        (m) =>
          m.combinedSentenceText.includes(cleanExample) ||
          cleanExample.includes(m.combinedSentenceText) ||
          m.sentenceList.some(
            (s) => s.hanzi.includes(cleanExample) || cleanExample.includes(s.hanzi)
          )
      );
    }

    // 4. Fallback: all individual characters appear in text
    if (matchedIdx === -1 && cleanHanzi.length > 1) {
      const chars = Array.from(cleanHanzi);
      matchedIdx = textMatchers.findIndex((m) =>
        chars.every((c) => m.combinedSentenceText.includes(c))
      );
    }

    if (matchedIdx !== -1) {
      groups[matchedIdx].cards.push(card);
    } else {
      unassignedCards.push(card);
    }
  });

  // Giữ tất cả các nhóm Bài khóa (kể cả khi tạm thời có 0 từ) để giáo viên luôn có thể bấm "+ Thêm từ vựng"
  const result: ReadingTextVocabGroup[] = [...groups];

  if (unassignedCards.length > 0) {
    result.push({
      id: 'supplemental',
      readingText: null,
      title: 'Từ vựng bổ sung & mở rộng',
      summary: 'Các từ vựng bổ trợ và luyện tập thêm của bài học',
      cards: unassignedCards,
    });
  }

  return result.length > 0
    ? result
    : [
        {
          id: 'all',
          readingText: null,
          title: 'Tất cả từ vựng',
          cards: flashcards,
        },
      ];
}

interface LessonDetailViewProps {
  levelInfo: LevelInfo;
  lessons: Lesson[];
  initialLessonId?: string;
  initialTab?: LessonTabType;
  onBack: () => void;
  onSelectLessonChange?: (lessonId: string) => void;
  onSelectTabChange?: (tab: LessonTabType) => void;
  onOpenTeacherModal: (levelId: LevelId, lessonId?: string) => void;
  isSlideModeActive: boolean;
  onToggleSlideMode: () => void;
  onEditCard?: (
    card: FlashCard,
    levelId: LevelId,
    lessonId: string,
    readingTextId?: string
  ) => void;
  onAddCardToReadingText?: (
    levelId: LevelId,
    lessonId: string,
    readingTextId?: string,
    readingTextTitle?: string
  ) => void;
  onEditText?: (text: ReadingText, levelId: LevelId, lessonId: string) => void;
  onUpdateTextAudio?: (
    levelId: LevelId,
    lessonId: string,
    textId: string,
    updatedFields: Partial<ReadingText>
  ) => void;
  onShowStroke?: (char: string) => void;
}

export const LessonDetailView: React.FC<LessonDetailViewProps> = ({
  levelInfo,
  lessons,
  initialLessonId,
  initialTab = 'vocab-list',
  onBack,
  onSelectLessonChange,
  onSelectTabChange,
  onOpenTeacherModal,
  isSlideModeActive,
  onToggleSlideMode,
  onEditCard,
  onAddCardToReadingText,
  onEditText,
  onUpdateTextAudio,
  onShowStroke,
}) => {
  const [currentLessonId, setCurrentLessonId] = useState<string>(
    initialLessonId || lessons[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<LessonTabType>(initialTab);

  // Only sync when parent explicitly changes initialLessonId
  useEffect(() => {
    if (initialLessonId) {
      setCurrentLessonId(initialLessonId);
    }
  }, [initialLessonId]);

  // Only sync when parent explicitly changes initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Ensure currentLessonId points to a valid lesson in the current level
  const selectedLessonIndex = useMemo(() => {
    if (!lessons.length) return 0;
    const idx = lessons.findIndex((l) => l.id === currentLessonId);
    return idx !== -1 ? idx : 0;
  }, [lessons, currentLessonId]);

  const currentLesson = lessons[selectedLessonIndex] || lessons[0] || null;

  // Quản lý việc lọc / hiển thị từ vựng theo từng bài khóa
  const [selectedVocabTextId, setSelectedVocabTextId] = useState<string>('all');
  const [activeFlashcardWord, setActiveFlashcardWord] = useState<FlashCard | null>(null);

  useEffect(() => {
    setSelectedVocabTextId('all');
  }, [currentLessonId]);

  const vocabGroups = useMemo(() => {
    if (!currentLesson) return [];
    return groupFlashcardsByReadingText(
      currentLesson.flashcards || [],
      currentLesson.readingTexts || []
    );
  }, [currentLesson]);

  const displayedVocabGroups = useMemo(() => {
    if (selectedVocabTextId === 'all') return vocabGroups;
    return vocabGroups.filter((g) => g.id === selectedVocabTextId);
  }, [vocabGroups, selectedVocabTextId]);

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLessonId(lesson.id);
    onSelectLessonChange?.(lesson.id);
  };

  const handleSwitchTab = (tab: LessonTabType) => {
    setActiveTab(tab);
    onSelectTabChange?.(tab);
  };

  // Extract unique Chinese characters in current lesson for Hanzi Writer tab
  const lessonCharacters = useMemo(() => {
    if (!currentLesson) return [];
    const seen = new Set<string>();
    const list: Array<{ char: string; word: string; pinyin: string; meaning: string }> = [];
    for (const card of currentLesson.flashcards) {
      const cleanWord = card.hanzi.replace(/\([^)]*\)/g, '').trim();
      const chars = cleanWord.match(/[\u4e00-\u9fff]/g) || [];
      for (const ch of chars) {
        if (!seen.has(ch)) {
          seen.add(ch);
          list.push({
            char: ch,
            word: cleanWord,
            pinyin: card.pinyin,
            meaning: card.meaning,
          });
        }
      }
    }
    return list;
  }, [currentLesson]);

  if (!currentLesson) {
    return (
      <div className="cute-card p-10 text-center space-y-4 max-w-md mx-auto">
        <h3 className="text-xl font-black text-black">Chưa có bài học nào</h3>
        <button
          onClick={() => onOpenTeacherModal(levelInfo.id)}
          className="cute-btn px-4 py-2 bg-[#DCFCE7] text-black font-extrabold text-xs rounded-xl inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tạo Bài Học Mới</span>
        </button>
      </div>
    );
  }

  const grammarList = currentLesson.grammarNotes || currentLesson.grammarPoints || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Level Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl border-2 border-black bg-white hover:bg-[#FAF6EE] flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
            title="Quay lại lộ trình bài học"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-xs uppercase text-zinc-500">
                <span className="font-hanzi">{levelInfo.code}</span> · {levelInfo.title}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#DCFCE7] border border-black text-black">
                Bài {currentLesson.lessonNumber} / {lessons.length}
              </span>
              {currentLesson.titleZh && (
                <span className="font-hanzi text-xs font-bold px-2 py-0.5 rounded-md bg-[#FCE7F3] border border-black text-black">
                  {currentLesson.titleZh}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-black mt-0.5">{currentLesson.titleVi}</h1>
            {currentLesson.titlePinyin && (
              <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                {currentLesson.titlePinyin}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onOpenTeacherModal(levelInfo.id, currentLesson.id)}
            className="cute-btn px-3.5 py-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm Bài Khóa / Audio</span>
          </button>

          <button
            onClick={onToggleSlideMode}
            className="cute-btn px-4 py-2 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
          >
            <Presentation className="w-4 h-4" />
            <span>Trình Chiếu Slide</span>
          </button>
        </div>
      </div>

      {/* Quick Lesson Switcher Strip (Bài 1 -> Bài 15) */}
      {lessons.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
          {lessons.map((les, idx) => (
            <button
              key={les.id}
              onClick={() => handleSelectLesson(les)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black whitespace-nowrap transition-all ${
                selectedLessonIndex === idx
                  ? 'bg-[#DCFCE7] text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-white text-zinc-700 hover:bg-[#FAF6EE]'
              }`}
              title={les.titleVi}
            >
              Bài {les.lessonNumber}
            </button>
          ))}
        </div>
      )}

      {/* Lesson Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] overflow-x-auto">
        <button
          onClick={() => handleSwitchTab('vocab-list')}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'vocab-list'
              ? 'bg-[#DCFCE7] text-black border border-black'
              : 'text-zinc-700 hover:bg-[#FAF6EE]'
          }`}
        >
          <List className="w-4 h-4" />
          <span>1. Từ Vựng ({currentLesson.flashcards.length})</span>
        </button>

        <button
          onClick={() => handleSwitchTab('flashcards')}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'flashcards'
              ? 'bg-[#FCE7F3] text-black border border-black'
              : 'text-zinc-700 hover:bg-[#FAF6EE]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>2. Flashcard ({currentLesson.flashcards.length})</span>
        </button>

        <button
          onClick={() => handleSwitchTab('reading')}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'reading'
              ? 'bg-[#DCFCE7] text-black border border-black'
              : 'text-zinc-700 hover:bg-[#FAF6EE]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Bài Khóa ({currentLesson.readingTexts.length})</span>
        </button>

        {grammarList.length > 0 && (
          <button
            onClick={() => handleSwitchTab('grammar')}
            className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'grammar'
                ? 'bg-[#FCE7F3] text-black border border-black'
                : 'text-zinc-700 hover:bg-[#FAF6EE]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>4. Ngữ Pháp ({grammarList.length})</span>
          </button>
        )}

        <button
          onClick={() => handleSwitchTab('hanzi-writer')}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'hanzi-writer'
              ? 'bg-[#DCFCE7] text-black border border-black'
              : 'text-zinc-700 hover:bg-[#FAF6EE]'
          }`}
        >
          <Brush className="w-4 h-4" />
          <span>5. Tập Viết ({lessonCharacters.length})</span>
        </button>
      </div>

      {/* Main Content Stage */}
      {activeTab === 'flashcards' && (
        <FlashcardDeck
          cards={currentLesson.flashcards}
          lessonTitle={currentLesson.titleVi}
          isSlideModeActive={isSlideModeActive}
          onToggleSlideMode={onToggleSlideMode}
          onEditCard={(card) => onEditCard && onEditCard(card, levelInfo.id, currentLesson.id)}
          onShowStroke={onShowStroke}
        />
      )}

      {activeTab === 'reading' && (
        <ReadingTextRoom
          readingTexts={currentLesson.readingTexts}
          lessonTitle={currentLesson.titleVi}
          levelId={levelInfo.id}
          lessonId={currentLesson.id}
          onOpenTeacherModal={() => onOpenTeacherModal(levelInfo.id, currentLesson.id)}
          onEditText={(txt) => onEditText && onEditText(txt, levelInfo.id, currentLesson.id)}
          onUpdateTextAudio={(textId, updatedFields) =>
            onUpdateTextAudio &&
            onUpdateTextAudio(levelInfo.id, currentLesson.id, textId, updatedFields)
          }
          onShowStroke={onShowStroke}
        />
      )}

      {activeTab === 'vocab-list' && (
        <div className="space-y-4">
          {/* Header Bar & Reading Text Filter Pills */}
          <div className="cute-card p-4 sm:p-5 space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border-2 border-black flex items-center justify-center font-hanzi text-sm font-black shadow-[1px_1px_0px_#000]">
                  词
                </div>
                <div>
                  <h3 className="font-black text-black text-base">
                    Từ Vựng Theo Từng Bài Khóa · {currentLesson.titleVi}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Từ mới được chia nhỏ tương ứng theo từng bài khóa để dễ học và nắm bắt
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-black text-black px-3 py-1 rounded-xl bg-[#DCFCE7] border-2 border-black shadow-[2px_2px_0px_#000] shrink-0">
                  Tổng {currentLesson.flashcards.length} từ
                </span>
              </div>
            </div>

            {/* Reading Text Filter Pills */}
            {vocabGroups.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                <button
                  onClick={() => setSelectedVocabTextId('all')}
                  className={`cute-btn px-3.5 py-1.5 text-xs font-black rounded-xl transition-all whitespace-nowrap border-2 border-black ${
                    selectedVocabTextId === 'all'
                      ? 'bg-[#DCFCE7] text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-[#FAF6EE] text-zinc-700 hover:bg-white'
                  }`}
                >
                  <span>Tất cả bài khóa ({currentLesson.flashcards.length})</span>
                </button>

                {vocabGroups.map((group) => {
                  const isSelected = selectedVocabTextId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedVocabTextId(group.id)}
                      className={`cute-btn px-3 py-1.5 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border-2 border-black ${
                        isSelected
                          ? 'bg-[#FCE7F3] text-black shadow-[2px_2px_0px_#000]'
                          : 'bg-[#FAF6EE] text-zinc-700 hover:bg-white'
                      }`}
                    >
                      <span>{group.title}</span>
                      {group.titleZh && (
                        <span className="font-hanzi text-xs opacity-75">({group.titleZh})</span>
                      )}
                      <span className="px-1.5 py-0.2 bg-black/10 rounded-md text-[10px] font-mono font-black">
                        {group.cards.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grouped Reading Text Vocabulary Sections */}
          <div className="space-y-5">
            {displayedVocabGroups.map((group) => (
              <div key={group.id} className="cute-card overflow-hidden">
                {/* Group Header */}
                <div className="p-4 sm:p-5 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6EE]">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] border border-black flex items-center justify-center text-xs shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-black" />
                      </div>
                      <h4 className="font-black text-black text-base">{group.title}</h4>
                      {group.titleZh && (
                        <span className="font-hanzi text-sm text-zinc-600 font-normal">
                          ({group.titleZh})
                        </span>
                      )}
                      <span className="text-xs font-black text-black px-2.5 py-0.5 rounded-lg bg-[#DCFCE7] border border-black shadow-[1px_1px_0px_#000]">
                        {group.cards.length} từ vựng
                      </span>
                    </div>
                    {group.summary && (
                      <p className="text-xs text-zinc-600 font-medium pl-9 leading-relaxed">
                        {group.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                    {onAddCardToReadingText && (
                      <button
                        onClick={() =>
                          onAddCardToReadingText(
                            levelInfo.id,
                            currentLesson.id,
                            group.readingText?.id,
                            group.title
                          )
                        }
                        className="cute-btn px-3 py-1.5 bg-[#FCE7F3] hover:bg-pink-200 text-black text-xs font-black rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[1px_1px_0px_#000] cursor-pointer"
                        title={`Thêm từ vựng còn thiếu vào ${group.title}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm từ vựng</span>
                      </button>
                    )}

                    {group.readingText && (
                      <button
                        onClick={() => handleSwitchTab('reading')}
                        className="cute-btn px-3 py-1.5 bg-white hover:bg-emerald-100 text-black text-xs font-black rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[1px_1px_0px_#000] cursor-pointer"
                        title="Chuyển sang xem bài khóa tương ứng"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Xem bài khóa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Phát Audio từ vựng riêng biệt cho bài khóa này (tách biệt hoàn toàn với audio bài khóa) */}
                {group.readingText && (
                  <ReadingTextAudioBar
                    readingText={group.readingText}
                    levelId={levelInfo.id}
                    lessonId={currentLesson.id}
                    mode="vocab"
                    cards={group.cards}
                    onUpdateTextAudio={(fields) =>
                      onUpdateTextAudio &&
                      onUpdateTextAudio(
                        levelInfo.id,
                        currentLesson.id,
                        group.readingText!.id,
                        fields
                      )
                    }
                  />
                )}

                {/* Vocabulary Cards List */}
                {group.cards.length === 0 ? (
                  <div className="p-6 text-center space-y-2.5 bg-white">
                    <p className="text-xs font-bold text-zinc-500">
                      Chưa có từ vựng nào trong phần này.
                    </p>
                    {onAddCardToReadingText && (
                      <button
                        onClick={() =>
                          onAddCardToReadingText(
                            levelInfo.id,
                            currentLesson.id,
                            group.readingText?.id,
                            group.title
                          )
                        }
                        className="cute-btn px-3.5 py-1.5 bg-[#DCFCE7] hover:bg-emerald-200 text-black text-xs font-black rounded-xl border-2 border-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm từ vựng cho {group.title}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y-2 divide-black/10">
                    {group.cards.map((card, idx) => {
                      const cleanHanzi = card.hanzi.replace(/\([^)]*\)/g, '').trim();
                      return (
                        <div
                          key={card.id}
                          className="p-4 sm:px-6 hover:bg-[#FAF6EE]/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-black text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              {/* Bấm vào từ sẽ mở Flashcard chạy cùng lúc các chữ Hán */}
                              <button
                                type="button"
                                onClick={() => setActiveFlashcardWord(card)}
                                className="font-hanzi text-3xl font-normal text-black hover:text-emerald-700 hover:scale-105 transition-all text-left cursor-pointer rounded-lg px-1 hover:bg-[#DCFCE7]/60"
                                title="Bấm để mở flashcard xem nét viết cả từ"
                              >
                                {card.hanzi}
                              </button>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-black text-emerald-950 bg-[#DCFCE7] border border-black/40 px-2.5 py-0.5 rounded-lg">
                                  {card.pinyin}
                                </span>
                                <span className="text-xs text-zinc-700 font-bold bg-[#FAF6EE] border border-black/25 px-2 py-0.5 rounded-lg">
                                  {card.wordType}
                                </span>
                                {card.hanViet && (
                                  <span className="text-xs text-pink-950 font-bold bg-[#FCE7F3] border border-black/30 px-2 py-0.5 rounded-lg">
                                    Hán Việt: {card.hanViet}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-sm font-black text-zinc-900 pl-9">
                              Nghĩa: {card.meaning}
                            </div>

                            {/* Full Example Sentence */}
                            {card.exampleSentence && card.exampleSentence.hanzi && (
                              <div className="ml-9 p-3 rounded-xl bg-[#FAF6EE] border border-black/15 flex items-center justify-between gap-3">
                                <div className="space-y-0.5 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-black text-black bg-[#DCFCE7] border border-black/30 px-1.5 py-0.5 rounded">
                                      Ví dụ
                                    </span>
                                    <HanziClickable
                                      text={card.exampleSentence.hanzi}
                                      onShowStroke={onShowStroke || (() => {})}
                                      className="font-hanzi text-base text-black"
                                    />
                                    <span className="font-mono text-emerald-800 font-bold">
                                      ({card.exampleSentence.pinyin})
                                    </span>
                                  </div>
                                  <p className="text-zinc-600 font-medium">
                                    — {card.exampleSentence.meaning}
                                  </p>
                                </div>
                                <button
                                  onClick={() => playChineseAudio(card.exampleSentence.hanzi)}
                                  className="p-2 rounded-xl bg-[#FCE7F3] hover:bg-pink-200 border border-black/40 shrink-0"
                                  title="Nghe câu ví dụ"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-black" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons per word */}
                          <div className="flex flex-wrap items-center gap-2 pl-9 lg:pl-0 shrink-0">
                            <button
                              onClick={() => setActiveFlashcardWord(card)}
                              className="cute-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#DCFCE7] hover:bg-emerald-200 text-black border-2 border-black"
                              title="Mở flashcard viết nét toàn bộ từ"
                            >
                              <Brush className="w-3.5 h-3.5" />
                              <span>Tập viết</span>
                            </button>

                            {onEditCard && (
                              <button
                                onClick={() =>
                                  onEditCard(
                                    card,
                                    levelInfo.id,
                                    currentLesson.id,
                                    group.readingText?.id
                                  )
                                }
                                className="cute-btn flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#FAF6EE] text-black border-2 border-black"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                            )}

                            <button
                              onClick={() =>
                                playChineseAudio(cleanHanzi, {
                                  customAudioUri: card.audioDataUri,
                                })
                              }
                              className="cute-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#FCE7F3] hover:bg-pink-200 text-black border-2 border-black"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Nghe</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'grammar' && grammarList.length > 0 && (
        <div className="space-y-4">
          {grammarList.map((note, idx) => (
            <div key={note.id || idx} className="cute-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-[#DCFCE7] border border-black text-black">
                  Điểm ngữ pháp {idx + 1}
                </span>
              </div>

              <h3 className="text-lg font-black text-black">{note.title}</h3>
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                {note.explanation}
              </p>

              {note.structure && (
                <div className="bg-[#FAF6EE] border-2 border-black rounded-2xl p-3.5 font-mono text-xs sm:text-sm font-bold text-black shadow-[2px_2px_0px_#000]">
                  <span className="text-zinc-500 font-sans block mb-1 font-semibold">
                    Cấu trúc:
                  </span>
                  {note.structure}
                </div>
              )}

              {note.examples && note.examples.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-black text-zinc-700 block">Câu ví dụ:</span>
                  {note.examples.map((ex, eIdx) => {
                    const zhText = ex.zh || ex.hanzi || '';
                    const viText = ex.vi || ex.meaning || '';
                    return (
                      <div
                        key={eIdx}
                        className="p-3.5 bg-[#FAF6EE] rounded-xl border-2 border-black/15 hover:border-black transition-colors flex items-center justify-between gap-3 text-xs sm:text-sm"
                      >
                        <div className="space-y-0.5">
                          <div>
                            <HanziClickable
                              text={zhText}
                              onShowStroke={onShowStroke || (() => {})}
                              className="font-hanzi text-base sm:text-lg font-normal text-black mr-2"
                            />
                            <span className="font-mono text-emerald-800 font-bold mr-2">
                              {ex.pinyin}
                            </span>
                          </div>
                          <div className="text-zinc-600 font-medium">— {viText}</div>
                        </div>
                        <button
                          onClick={() => playChineseAudio(zhText)}
                          className="cute-btn p-2 bg-[#FCE7F3] hover:bg-pink-200 rounded-xl text-black border-2 border-black shrink-0"
                          title="Nghe câu ví dụ"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'hanzi-writer' && (
        <div className="cute-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b-2 border-black/10">
            <h3 className="text-lg font-black text-black">
              Tập Viết Chữ Hán · {currentLesson.titleVi}
            </h3>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#DCFCE7] border-2 border-black shadow-[2px_2px_0px_#000]">
              {lessonCharacters.length} chữ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {lessonCharacters.map((item) => (
              <button
                key={item.char}
                onClick={() => onShowStroke && onShowStroke(item.char)}
                className="cute-card p-3.5 flex flex-col items-center text-center gap-1.5 hover:bg-[#FAF6EE] transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-black bg-white flex items-center justify-center relative overflow-hidden shadow-[2px_2px_0px_#000] group-hover:bg-[#DCFCE7]">
                  <span className="font-hanzi text-4xl text-black">{item.char}</span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 line-clamp-1">
                  {item.pinyin}
                </span>
                <span className="text-[11px] text-zinc-600 font-bold line-clamp-1">
                  Từ: {item.word}
                </span>
                <span className="text-[10px] font-black text-black bg-[#FCE7F3] px-2 py-0.5 rounded-md border border-black/40">
                  Tập viết
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal Flashcard hiển thị chạy đồng thời tất cả các chữ Hán của từ */}
      {activeFlashcardWord && (
        <VocabWordFlashcardModal
          card={activeFlashcardWord}
          onClose={() => setActiveFlashcardWord(null)}
        />
      )}
    </div>
  );
};

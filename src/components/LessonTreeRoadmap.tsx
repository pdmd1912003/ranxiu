import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  PlusCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Volume2,
  Brush,
} from 'lucide-react';
import { LevelInfo, Lesson, LevelId } from '../types';
import { NEW_HSK1_CHARACTERS } from '../data/curriculumData';
import { HanziClickable } from './HanziClickable';
import { playChineseAudio } from '../utils/speech';
import { LessonTabType } from './LessonDetailView';

interface LessonTreeRoadmapProps {
  levelInfo: LevelInfo;
  lessons: Lesson[];
  onBack: () => void;
  onSelectLesson: (lesson: Lesson, defaultTab?: LessonTabType) => void;
  onOpenTeacherModal: (levelId: LevelId) => void;
  onShowStroke?: (char: string) => void;
}

export const LessonTreeRoadmap: React.FC<LessonTreeRoadmapProps> = ({
  levelInfo,
  lessons,
  onBack,
  onSelectLesson,
  onOpenTeacherModal,
  onShowStroke,
}) => {
  const [showCharacters, setShowCharacters] = useState<boolean>(false);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl border-2 border-black bg-white hover:bg-[#FAF6EE] flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title="Quay lại danh sách cấp độ"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-xs uppercase text-zinc-500">
                LỘ TRÌNH ({lessons.length} BÀI)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#DCFCE7] border border-black text-black font-hanzi">
                <HanziClickable text={levelInfo.code} onShowStroke={onShowStroke || (() => {})} />
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black">
              {levelInfo.title}
            </h1>
          </div>
        </div>

        <button
          onClick={() => onOpenTeacherModal(levelInfo.id)}
          className="cute-btn px-4 py-2 bg-[#DCFCE7] hover:bg-emerald-200 text-black font-extrabold text-xs rounded-xl flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Thêm Bài Khóa & Audio</span>
        </button>
      </div>

      {/* HSK 1 & HSK 2 Textbook Characters Cast Banner */}
      {(levelInfo.id === 'hsk1' || levelInfo.id === 'hsk2') && (
        <div className="cute-card p-4 sm:p-5 bg-[#FAF6EE] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Nhân Vật Giáo Trình ({levelInfo.title})</span>
            </h2>

            <button
              onClick={() => setShowCharacters(!showCharacters)}
              className="cute-btn px-3.5 py-1.5 bg-white hover:bg-[#DCFCE7] text-black font-black text-xs rounded-xl border-2 border-black flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <span>{showCharacters ? 'Thu gọn' : 'Xem 11 nhân vật'}</span>
              {showCharacters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showCharacters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t-2 border-black/10">
              {NEW_HSK1_CHARACTERS.map((char) => (
                <div
                  key={char.id}
                  className="p-3 rounded-2xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <HanziClickable
                        text={char.nameZh}
                        onShowStroke={onShowStroke || (() => {})}
                        className="font-hanzi text-base font-normal text-black"
                      />
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        ({char.namePinyin})
                      </span>
                    </div>
                    <div className="text-xs font-black text-zinc-900">{char.nameVi}</div>
                    <p className="text-[11px] text-zinc-600 font-medium mt-0.5 leading-snug">
                      {char.role}
                    </p>
                  </div>
                  <button
                    onClick={() => playChineseAudio(char.nameZh)}
                    className="p-1.5 rounded-lg bg-[#FCE7F3] hover:bg-pink-200 border border-black/40 shrink-0"
                    title={`Nghe tên ${char.nameVi}`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Central Spine Tree */}
      <div className="relative my-8">
        {/* Vertical center timeline line */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-[3px] bg-black"
        />

        <div className="space-y-8">
          {lessons.map((lesson, index) => {
            const isLeft = index % 2 === 0;
            const nodeNumber = index + 1;

            return (
              <div key={lesson.id} className="relative flex flex-col md:flex-row items-center">
                {/* Desktop Left Slot */}
                <div className="w-full md:w-1/2 md:pr-10">
                  {isLeft ? (
                    <LessonNodeCard
                      lesson={lesson}
                      onSelectLesson={onSelectLesson}
                      onShowStroke={onShowStroke}
                    />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>

                {/* Center Node Badge on Spine (1, 2, 3...) */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-xl border-2 border-black bg-[#DCFCE7] text-black font-mono font-black text-sm items-center justify-center shadow-[2px_2px_0px_#000]">
                  {nodeNumber}
                </div>

                {/* Desktop Right Slot */}
                <div className="w-full md:w-1/2 md:pl-10 mt-4 md:mt-0">
                  {!isLeft ? (
                    <LessonNodeCard
                      lesson={lesson}
                      onSelectLesson={onSelectLesson}
                      onShowStroke={onShowStroke}
                    />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface LessonNodeCardProps {
  lesson: Lesson;
  onSelectLesson: (lesson: Lesson, defaultTab?: LessonTabType) => void;
  onShowStroke?: (char: string) => void;
}

const LessonNodeCard: React.FC<LessonNodeCardProps> = ({ lesson, onSelectLesson }) => {
  const getPillColorClasses = (action: string) => {
    switch (action) {
      case 'vocab':
        return 'bg-[#DCFCE7] text-black hover:bg-emerald-200';
      case 'flashcard':
        return 'bg-[#FCE7F3] text-black hover:bg-pink-200';
      case 'reading':
        return 'bg-[#DCFCE7] text-black hover:bg-emerald-200';
      case 'grammar':
        return 'bg-[#FAF6EE] text-black hover:bg-zinc-200';
      case 'exercises':
        return 'bg-[#FEF08A] text-black hover:bg-yellow-200';
      default:
        return 'bg-white text-black hover:bg-[#FAF6EE]';
    }
  };

  return (
    <div
      onClick={() => onSelectLesson(lesson, 'vocab-list')}
      className="cute-card p-5 cursor-pointer group hover:bg-[#FAF6EE]/50 transition-all space-y-3"
    >
      {/* Top row: Bài & Duration */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg font-bold border-2 border-black bg-[#DCFCE7] text-black shadow-[1px_1px_0px_#000]">
            Bài {lesson.lessonNumber}
          </span>

          {lesson.titleZh && (
            <span className="font-hanzi text-xs font-normal px-2 py-0.5 rounded-lg bg-[#FAF6EE] border border-black/30 text-zinc-800">
              {lesson.titleZh}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{lesson.durationMinutes || 45} phút</span>
          </span>

          <div className="w-7 h-7 rounded-xl border-2 border-black flex items-center justify-center bg-white shadow-[1px_1px_0px_#000] group-hover:bg-[#FCE7F3]">
            <ChevronRight className="w-4 h-4 text-black" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-base sm:text-lg font-black text-black">
          {lesson.titleVi}
        </h3>
        {lesson.titlePinyin && (
          <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
            {lesson.titlePinyin}
          </p>
        )}
      </div>

      {/* Action Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {lesson.pills.map((pill, pIdx) => (
          <button
            key={pIdx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (pill.action === 'flashcard') {
                onSelectLesson(lesson, 'flashcards');
              } else if (pill.action === 'reading') {
                onSelectLesson(lesson, 'reading');
              } else if (pill.action === 'grammar') {
                onSelectLesson(lesson, 'grammar');
              } else if (pill.action === 'exercises') {
                onSelectLesson(lesson, 'exercises');
              } else if (pill.action === 'hanzi-writer') {
                onSelectLesson(lesson, 'hanzi-writer');
              } else {
                onSelectLesson(lesson, 'vocab-list');
              }
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border border-black shadow-[1px_1px_0px_#000] transition-transform active:translate-x-0.5 active:translate-y-0.5 ${getPillColorClasses(
              pill.action
            )}`}
          >
            {pill.label}
          </button>
        ))}

        {/* Exercises quick-launch pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLesson(lesson, 'exercises');
          }}
          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-black shadow-[1px_1px_0px_#000] bg-[#FEF08A] text-black hover:bg-yellow-200 flex items-center gap-1 transition-transform active:translate-x-0.5 active:translate-y-0.5"
        >
          <span>Bài tập</span>
        </button>

        {/* Hanzi Writer quick-launch pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLesson(lesson, 'hanzi-writer');
          }}
          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-black shadow-[1px_1px_0px_#000] bg-[#FCE7F3] text-black hover:bg-pink-200 flex items-center gap-1 transition-transform active:translate-x-0.5 active:translate-y-0.5"
        >
          <Brush className="w-3 h-3" />
          <span>Tập viết</span>
        </button>
      </div>
    </div>
  );
};

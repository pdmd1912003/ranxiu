export type LevelId = 'pinyin' | 'hsk1' | 'hsk2' | 'hsk3' | 'hsk4' | 'hsk5' | 'hsk6';

export interface LevelInfo {
  id: LevelId;
  code: string; // '拼音', '1级', '2级', '3级', '4级', '5级', '6级'
  title: string;
  badge: string; // 'Nhập môn', 'Sơ cấp', 'Trung cấp', 'Cao cấp'
  status?: string; // 'Hoàn thành', 'Đang học', 'Chưa bắt đầu'
  subtitle: string;
  bgIconColor: string; // 'bg-amber-100', 'bg-sky-100', etc.
  tags: string[];
  progressPercent: number; // 0 to 100
}

export interface ExampleSentence {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface FlashCard {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  wordType: string;
  hanViet?: string;
  radical?: string;
  strokeCount?: number;
  exampleSentence: ExampleSentence;
  levelId: LevelId;
  lessonId: string;
  customAudioUrl?: string;
  audioDataUri?: string;
  isCustom?: boolean;
}

export interface ReadingSentence {
  id?: string;
  speaker?: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface ReadingText {
  id: string;
  title: string;
  titleZh?: string;
  titlePinyin?: string;
  levelId?: LevelId;
  lessonId?: string;
  summary?: string;
  audioUrl?: string;
  audioDataUri?: string;
  audioFileName?: string;
  // Audio riêng dành cho từ vựng của bài khóa này (hoàn toàn tách biệt với audio bài khóa)
  vocabAudioUrl?: string;
  vocabAudioDataUri?: string;
  vocabAudioFileName?: string;
  sentences: ReadingSentence[];
  isCustom?: boolean;
  createdAt?: number;
}

export interface GrammarNote {
  id?: string;
  title: string;
  explanation: string;
  structure?: string;
  examples: Array<{
    zh?: string;
    hanzi?: string;
    pinyin: string;
    vi?: string;
    meaning?: string;
  }>;
}

export interface LessonActionPill {
  label: string;
  action: 'vocab' | 'flashcard' | 'reading' | 'quiz' | 'grammar' | 'hanzi-writer';
  color: 'cyan' | 'pink' | 'green' | 'teal' | 'yellow' | 'purple';
}

export interface Lesson {
  id: string;
  levelId: LevelId;
  lessonNumber: number; // 1, 2, 3...
  buoiNumber: number; // Buổi 1, 2, 3...
  durationMinutes: number; // 30, 40, 45
  status: 'active' | 'locked' | 'completed';
  titleVi: string;
  titleZh: string;
  titlePinyin: string;
  shortDesc: string;
  pills: LessonActionPill[];
  flashcards: FlashCard[];
  readingTexts: ReadingText[];
  grammarNotes?: GrammarNote[];
  grammarPoints?: GrammarNote[];
  isCustom?: boolean;
}

export interface PinyinCardItem {
  id: string;
  letter: string;
  audioText: string;
  sticker: string;
  pronounceGuide: string;
  exampleZh: string;
  exampleVi: string;
  mouthTip: string;
}

export interface TeacherSession {
  isAuthenticated: boolean;
  teacherName: string;
  role: 'teacher';
  loginAt: number;
  rememberMe: boolean;
}


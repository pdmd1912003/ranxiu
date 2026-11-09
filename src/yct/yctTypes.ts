export type YctLevelId = 'yct1' | 'yct2' | 'yct3' | 'yct4' | 'yct5' | 'yct6';

export interface YctLevelInfo {
  id: YctLevelId;
  bookNumber: number; // Quyển 1..6
  yctExamLevel: string; // Cấp độ 1..4
  title: string;
  titleZh: string;
  vocabCount: number; // 80, 150, 300, 300, 600, 600
  hoursRange: string; // '35–45 giờ', '50–60 giờ', '60–70 giờ'
  lessonCount: number;
  badge: string;
  subtitle: string;
  themeColor: string; // Tailwind bg class
  accentColor: string;
  mascotEmoji: string;
  tags: string[];
  isReady: boolean;
}

export interface YctFlashcardItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  isBonus?: boolean; // Từ có dấu * trong sách YCT 1
  category?: string;
  illustrationKey?: string;
  emoji?: string;
  colorBg?: string;
  exampleHanzi?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  lessonId?: string;
  lessonNumber?: number;
}

export interface YctDialogueLine {
  id: string;
  speaker: string;
  speakerAvatar: string;
  speakerColor: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  illustrationKey?: string;
}

export interface YctDialogueSection {
  id: string;
  title: string;
  audioTrack: string; // e.g. '01-02'
  sceneDescription: string;
  sceneEmoji: string;
  questionHanzi?: string;
  questionPinyin?: string;
  questionMeaning?: string;
  lines: YctDialogueLine[];
}

export interface YctStoryPanel {
  id: string;
  panelNumber: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  speaker?: string;
  emoji: string;
  bgColor: string;
}

export interface YctStorySection {
  id: string;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  audioTrack?: string;
  instructionVi: string;
  panels: YctStoryPanel[];
}

export interface YctSongLine {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  emoji?: string;
}

export interface YctSongSection {
  id: string;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  audioTrack: string;
  tipVi: string;
  lines: YctSongLine[];
}

export interface YctActivityItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  emoji: string;
  group?: string;
  extraNote?: string;
}

export interface YctActivitySection {
  id: string;
  type: 'matching' | 'hand-numbers' | 'chinese-names' | 'celebrity-guess' | 'number-100' | 'zodiac-12' | 'calendar' | 'clock' | 'review-categorize';
  titleVi: string;
  instructionVi: string;
  matchingPairs?: Array<{
    id: string;
    leftHanzi: string;
    leftPinyin: string;
    leftMeaning: string;
    rightHanzi: string;
    rightPinyin: string;
    rightMeaning: string;
    rightLabel: string; // 'A' | 'B' | 'C'
  }>;
  items?: YctActivityItem[];
}

export interface YctMockQuestion {
  id: string;
  questionNumber: number;
  part: 'listening' | 'reading';
  questionType: 'choice-abc' | 'true-false' | 'match-abcd' | 'fill-abcd';
  promptHanzi: string;
  promptPinyin: string;
  promptMeaning: string;
  transcriptHanzi?: string; // Từ trang 67
  transcriptPinyin?: string;
  visualEmoji: string;
  visualDesc: string;
  options?: Array<{
    label: string;
    hanzi?: string;
    pinyin?: string;
    meaning?: string;
    emoji?: string;
  }>;
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D' | '✓' | '✕'
  explanationVi?: string;
}

export interface YctLesson {
  id: string;
  levelId: YctLevelId;
  lessonNumber: number;
  pageNumber: number;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  themeEmoji: string;
  themeColor: string;
  shortDesc: string;
  classroomGameTitle?: string;
  classroomGameDesc?: string;
  keySentences: YctFlashcardItem[];
  vocabItems: YctFlashcardItem[];
  dialogues: YctDialogueSection[];
  stories: YctStorySection[];
  songs: YctSongSection[];
  activities: YctActivitySection[];
  mockQuestions: YctMockQuestion[];
}

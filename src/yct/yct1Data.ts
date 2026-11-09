import { YctLevelInfo, YctLesson, YctFlashcardItem } from './yctTypes';
import { YCT1_LESSONS_1_TO_6 } from './yct1Lessons1to6';
import { YCT1_LESSONS_7_TO_12 } from './yct1Lessons7to12';

/**
 * 6 quyển Giáo trình chuẩn YCT (YCT 1 đến YCT 6) theo chuẩn Học viện Khổng Tử / CTI (Trang 2 PDF)
 */
export const YCT_LEVELS: YctLevelInfo[] = [
  {
    id: 'yct1',
    bookNumber: 1,
    yctExamLevel: 'YCT Cấp độ 1',
    title: 'YCT 1 · Quyển 1',
    titleZh: 'YCT标准教程 1',
    vocabCount: 80,
    hoursRange: '35–45 giờ học',
    lessonCount: 12,
    badge: 'Vỡ lòng · Đầy đủ 12 bài',
    subtitle:
      'Làm quen tiếng Trung thiếu nhi qua 12 bài học vui nhộn: Chào hỏi, đếm số, gia đình, tuổi tác, cơ thể, thú cưng, trường lớp, thời gian và đồ ăn.',
    themeColor: 'bg-[#DCFCE7]',
    accentColor: '#10B981',
    mascotEmoji: '🐼🎈',
    tags: ['80 Từ vựng', '12 Bài học', 'Flashcard Hình ảnh', 'Truyện & Bài hát', 'Đề thi mẫu YCT'],
    isReady: true,
  },
  {
    id: 'yct2',
    bookNumber: 2,
    yctExamLevel: 'YCT Cấp độ 2',
    title: 'YCT 2 · Quyển 2',
    titleZh: 'YCT标准教程 2',
    vocabCount: 150,
    hoursRange: '35–45 giờ học',
    lessonCount: 12,
    badge: 'Sơ cấp 1 · 150 từ',
    subtitle:
      'Mở rộng vốn từ lên 150 từ vựng về màu sắc, trang phục, thời tiết, phương tiện giao thông, sở thích thể thao và thói quen hằng ngày.',
    themeColor: 'bg-[#FCE7F3]',
    accentColor: '#EC4899',
    mascotEmoji: '🐰🎨',
    tags: ['150 Từ vựng', '12 Bài học', 'Hội thoại thiếu nhi', 'Trò chơi tương tác'],
    isReady: true,
  },
  {
    id: 'yct3',
    bookNumber: 3,
    yctExamLevel: 'YCT Cấp độ 3 (Phần 1)',
    title: 'YCT 3 · Quyển 3',
    titleZh: 'YCT标准教程 3',
    vocabCount: 300,
    hoursRange: '50–60 giờ học',
    lessonCount: 12,
    badge: 'Sơ - Trung cấp · 300 từ',
    subtitle:
      'Phát triển kỹ năng giao tiếp tự nhiên trong trường học và cuộc sống, miêu tả hoạt động, môn học, mùa trong năm và lễ hội.',
    themeColor: 'bg-[#FEF3C7]',
    accentColor: '#F59E0B',
    mascotEmoji: '🐯🌟',
    tags: ['300 Từ vựng', '12 Bài học', 'Kể chuyện tranh', 'Luyện thi YCT 3'],
    isReady: true,
  },
  {
    id: 'yct4',
    bookNumber: 4,
    yctExamLevel: 'YCT Cấp độ 3 (Phần 2)',
    title: 'YCT 4 · Quyển 4',
    titleZh: 'YCT标准教程 4',
    vocabCount: 300,
    hoursRange: '50–60 giờ học',
    lessonCount: 12,
    badge: 'Trung cấp 1 · 300 từ',
    subtitle:
      'Hoàn thiện toàn bộ 300 từ vựng và cấu trúc ngữ pháp của kỳ thi YCT Cấp độ 3 với các tình huống sinh động và bài đọc mở rộng.',
    themeColor: 'bg-[#DBEAFE]',
    accentColor: '#3B82F6',
    mascotEmoji: '🐬🌊',
    tags: ['300 Từ vựng', '12 Bài học', 'Giao tiếp mở rộng', 'Bài thi mẫu YCT 3'],
    isReady: true,
  },
  {
    id: 'yct5',
    bookNumber: 5,
    yctExamLevel: 'YCT Cấp độ 4 (Phần 1)',
    title: 'YCT 5 · Quyển 5',
    titleZh: 'YCT标准教程 5',
    vocabCount: 600,
    hoursRange: '60–70 giờ học',
    lessonCount: 12,
    badge: 'Trung - Cao cấp · 600 từ',
    subtitle:
      'Bắt đầu rèn luyện kỹ năng đọc hiểu đoạn văn và viết chữ Hán cơ bản, chinh phục 600 từ vựng của cấp độ YCT 4.',
    themeColor: 'bg-[#EDE9FE]',
    accentColor: '#8B5CF6',
    mascotEmoji: '🦁👑',
    tags: ['600 Từ vựng', '12 Bài học', 'Đọc & Viết chữ Hán', 'Văn hóa Trung Hoa'],
    isReady: true,
  },
  {
    id: 'yct6',
    bookNumber: 6,
    yctExamLevel: 'YCT Cấp độ 4 (Phần 2)',
    title: 'YCT 6 · Quyển 6',
    titleZh: 'YCT标准教程 6',
    vocabCount: 600,
    hoursRange: '60–70 giờ học',
    lessonCount: 12,
    badge: 'Cao cấp Thiếu nhi · 600 từ',
    subtitle:
      'Hoàn thành trọn bộ 6 quyển Giáo trình chuẩn YCT, sẵn sàng đạt điểm tối đa kỳ thi quốc tế YCT Cấp độ 4 và chuyển tiếp lên HSK.',
    themeColor: 'bg-[#FFE4E6]',
    accentColor: '#F43F5E',
    mascotEmoji: '🐲🏆',
    tags: ['600 Từ vựng', '12 Bài học', 'Tổng ôn YCT 4', 'Chứng chỉ Quốc tế'],
    isReady: true,
  },
];

/**
 * Các bài học khởi đầu mẫu cho YCT 2 - YCT 6 (sẵn sàng mở rộng khi bạn tải thêm PDF quyển 2-6)
 */
const YCT_HIGHER_SAMPLE_LESSONS: YctLesson[] = [
  {
    id: 'yct2-l1',
    levelId: 'yct2',
    lessonNumber: 1,
    pageNumber: 1,
    titleZh: '我喜欢红色。',
    titlePinyin: 'Wǒ xǐhuan hóngsè.',
    titleVi: 'Mình thích màu đỏ.',
    themeEmoji: '🎨🌈',
    themeColor: '#FCE7F3',
    shortDesc: 'Học tên các màu sắc rực rỡ bằng tiếng Trung (đỏ, vàng, xanh, trắng, đen) và nói về màu sắc yêu thích của em.',
    keySentences: [
      {
        id: 'yct2-l1-ks1',
        hanzi: '我喜欢红色。',
        pinyin: 'Wǒ xǐhuan hóngsè.',
        meaning: 'Mình thích màu đỏ.',
        emoji: '❤️🎨',
        colorBg: '#FFE4E6',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
      {
        id: 'yct2-l1-ks2',
        hanzi: '你喜欢什么颜色？',
        pinyin: 'Nǐ xǐhuan shénme yánsè?',
        meaning: 'Bạn thích màu gì?',
        emoji: '🌈❓',
        colorBg: '#FEF3C7',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
    ],
    vocabItems: [
      { id: 'yct2-v1', hanzi: '颜色', pinyin: 'yánsè', meaning: 'màu sắc', emoji: '🎨🌈', colorBg: '#FCE7F3', category: 'Màu sắc', lessonNumber: 1 },
      { id: 'yct2-v2', hanzi: '红色', pinyin: 'hóngsè', meaning: 'màu đỏ', emoji: '🔴🍎', colorBg: '#FFE4E6', category: 'Màu sắc', lessonNumber: 1 },
      { id: 'yct2-v3', hanzi: '黄色', pinyin: 'huángsè', meaning: 'màu vàng', emoji: '🟡🍌', colorBg: '#FEF9C3', category: 'Màu sắc', lessonNumber: 1 },
      { id: 'yct2-v4', hanzi: '蓝色', pinyin: 'lánsè', meaning: 'màu xanh dương', emoji: '🔵🌊', colorBg: '#DBEAFE', category: 'Màu sắc', lessonNumber: 1 },
      { id: 'yct2-v5', hanzi: '绿色', pinyin: 'lǜsè', meaning: 'màu xanh lá', emoji: '🟢🌿', colorBg: '#DCFCE7', category: 'Màu sắc', lessonNumber: 1 },
      { id: 'yct2-v6', hanzi: '白色', pinyin: 'báisè', meaning: 'màu trắng', emoji: '⚪☁️', colorBg: '#F4F4F5', category: 'Màu sắc', lessonNumber: 1 },
    ],
    dialogues: [],
    stories: [],
    songs: [],
    activities: [],
    mockQuestions: [],
  },
  {
    id: 'yct3-l1',
    levelId: 'yct3',
    lessonNumber: 1,
    pageNumber: 1,
    titleZh: '你会游泳吗？',
    titlePinyin: 'Nǐ huì yóuyǒng ma?',
    titleVi: 'Bạn có biết bơi không?',
    themeEmoji: '🏊‍♂️⚽',
    themeColor: '#FEF3C7',
    shortDesc: 'Học cách nói về các kỹ năng và môn thể thao yêu thích của em.',
    keySentences: [
      {
        id: 'yct3-l1-ks1',
        hanzi: '你会游泳吗？',
        pinyin: 'Nǐ huì yóuyǒng ma?',
        meaning: 'Bạn có biết bơi không?',
        emoji: '🏊‍♂️🌊',
        colorBg: '#DBEAFE',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
    ],
    vocabItems: [
      { id: 'yct3-v1', hanzi: '会', pinyin: 'huì', meaning: 'biết (kỹ năng học được)', emoji: '💡✨', colorBg: '#FEF3C7', category: 'Động từ', lessonNumber: 1 },
      { id: 'yct3-v2', hanzi: '游泳', pinyin: 'yóuyǒng', meaning: 'bơi lội', emoji: '🏊‍♂️🌊', colorBg: '#DBEAFE', category: 'Thể thao', lessonNumber: 1 },
      { id: 'yct3-v3', hanzi: '打篮球', pinyin: 'dǎ lánqiú', meaning: 'chơi bóng rổ', emoji: '🏀⛹️‍♂️', colorBg: '#FFEDD5', category: 'Thể thao', lessonNumber: 1 },
      { id: 'yct3-v4', hanzi: '踢足球', pinyin: 'tī zúqiú', meaning: 'đá bóng', emoji: '⚽🏃', colorBg: '#DCFCE7', category: 'Thể thao', lessonNumber: 1 },
    ],
    dialogues: [],
    stories: [],
    songs: [],
    activities: [],
    mockQuestions: [],
  },
  {
    id: 'yct4-l1',
    levelId: 'yct4',
    lessonNumber: 1,
    pageNumber: 1,
    titleZh: '今天天气怎么样？',
    titlePinyin: 'Jīntiān tiānqì zěnmeyàng?',
    titleVi: 'Hôm nay thời tiết thế nào?',
    themeEmoji: '☀️🌧️',
    themeColor: '#DBEAFE',
    shortDesc: 'Trò chuyện về thời tiết nắng, mưa, tuyết rơi và các mùa trong năm.',
    keySentences: [
      {
        id: 'yct4-l1-ks1',
        hanzi: '今天天气很好。',
        pinyin: 'Jīntiān tiānqì hěn hǎo.',
        meaning: 'Hôm nay thời tiết rất đẹp.',
        emoji: '☀️🌈',
        colorBg: '#FEF9C3',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
    ],
    vocabItems: [
      { id: 'yct4-v1', hanzi: '天气', pinyin: 'tiānqì', meaning: 'thời tiết', emoji: '🌤️🌈', colorBg: '#DBEAFE', category: 'Thời tiết', lessonNumber: 1 },
      { id: 'yct4-v2', hanzi: '下雨', pinyin: 'xiàyǔ', meaning: 'trời mưa', emoji: '🌧️☔', colorBg: '#E0F2FE', category: 'Thời tiết', lessonNumber: 1 },
      { id: 'yct4-v3', hanzi: '冷', pinyin: 'lěng', meaning: 'lạnh', emoji: '🥶❄️', colorBg: '#EDE9FE', category: 'Thời tiết', lessonNumber: 1 },
      { id: 'yct4-v4', hanzi: '热', pinyin: 'rè', meaning: 'nóng', emoji: '🥵☀️', colorBg: '#FFEDD5', category: 'Thời tiết', lessonNumber: 1 },
    ],
    dialogues: [],
    stories: [],
    songs: [],
    activities: [],
    mockQuestions: [],
  },
  {
    id: 'yct5-l1',
    levelId: 'yct5',
    lessonNumber: 1,
    pageNumber: 1,
    titleZh: '我的寒假生活。',
    titlePinyin: 'Wǒ de hánjià shēnghuó.',
    titleVi: 'Kỳ nghỉ đông của mình.',
    themeEmoji: '⛄✈️',
    themeColor: '#EDE9FE',
    shortDesc: 'Kể về kỳ nghỉ lễ, chuyến đi du lịch cùng gia đình và những trải nghiệm thú vị.',
    keySentences: [
      {
        id: 'yct5-l1-ks1',
        hanzi: '寒假我去北京旅游了。',
        pinyin: 'Hánjià wǒ qù Běijīng lǚyóu le.',
        meaning: 'Kỳ nghỉ đông mình đã đi du lịch Bắc Kinh.',
        emoji: '✈️🏯',
        colorBg: '#EDE9FE',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
    ],
    vocabItems: [
      { id: 'yct5-v1', hanzi: '旅游', pinyin: 'lǚyóu', meaning: 'du lịch', emoji: '✈️🧳', colorBg: '#DBEAFE', category: 'Hoạt động', lessonNumber: 1 },
      { id: 'yct5-v2', hanzi: '飞机', pinyin: 'fēijī', meaning: 'máy bay', emoji: '🛫☁️', colorBg: '#E0F2FE', category: 'Giao thông', lessonNumber: 1 },
      { id: 'yct5-v3', hanzi: '快乐', pinyin: 'kuàilè', meaning: 'vui vẻ, hạnh phúc', emoji: '🥳🎈', colorBg: '#FCE7F3', category: 'Cảm xúc', lessonNumber: 1 },
    ],
    dialogues: [],
    stories: [],
    songs: [],
    activities: [],
    mockQuestions: [],
  },
  {
    id: 'yct6-l1',
    levelId: 'yct6',
    lessonNumber: 1,
    pageNumber: 1,
    titleZh: '长大以后做什么？',
    titlePinyin: 'Zhǎngdà yǐhòu zuò shénme?',
    titleVi: 'Lớn lên em muốn làm nghề gì?',
    themeEmoji: '👩‍🚀👨‍⚕️',
    themeColor: '#FFE4E6',
    shortDesc: 'Chia sẻ ước mơ nghề nghiệp tương lai: bác sĩ, giáo viên, phi hành gia, họa sĩ.',
    keySentences: [
      {
        id: 'yct6-l1-ks1',
        hanzi: '我长大想当一名老师。',
        pinyin: 'Wǒ zhǎngdà xiǎng dāng yì míng lǎoshī.',
        meaning: 'Lớn lên em muốn làm một người giáo viên.',
        emoji: '👩‍🏫🌟',
        colorBg: '#FCE7F3',
        category: 'Câu quan trọng',
        lessonNumber: 1,
      },
    ],
    vocabItems: [
      { id: 'yct6-v1', hanzi: '医生', pinyin: 'yīshēng', meaning: 'bác sĩ', emoji: '👨‍⚕️🩺', colorBg: '#DCFCE7', category: 'Nghề nghiệp', lessonNumber: 1 },
      { id: 'yct6-v2', hanzi: '画家', pinyin: 'huàjiā', meaning: 'họa sĩ', emoji: '👩‍🎨🎨', colorBg: '#FEF3C7', category: 'Nghề nghiệp', lessonNumber: 1 },
      { id: 'yct6-v3', hanzi: '努力', pinyin: 'nǔlì', meaning: 'chăm chỉ, nỗ lực', emoji: '💪🌟', colorBg: '#FFE4E6', category: 'Phẩm chất', lessonNumber: 1 },
    ],
    dialogues: [],
    stories: [],
    songs: [],
    activities: [],
    mockQuestions: [],
  },
];

export const ALL_YCT_LESSONS: YctLesson[] = [
  ...YCT1_LESSONS_1_TO_6,
  ...YCT1_LESSONS_7_TO_12,
  ...YCT_HIGHER_SAMPLE_LESSONS,
];

/**
 * Danh sách toàn bộ từ vựng YCT 1 chuẩn (Bảng từ vựng A-Z trang 62–64 PDF)
 */
export const ALL_YCT1_VOCAB_ITEMS: YctFlashcardItem[] = (() => {
  const seen = new Set<string>();
  const list: YctFlashcardItem[] = [];
  for (const lesson of [...YCT1_LESSONS_1_TO_6, ...YCT1_LESSONS_7_TO_12]) {
    if (lesson.lessonNumber === 12) continue; // Bài 12 là bài ôn tập các từ bài 1-11
    for (const v of lesson.vocabItems) {
      if (!seen.has(v.hanzi)) {
        seen.add(v.hanzi);
        list.push(v);
      }
    }
  }
  return list;
})();

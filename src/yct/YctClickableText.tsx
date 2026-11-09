import React, { useMemo } from 'react';
import { YctFlashcardItem } from './yctTypes';
import { ALL_YCT1_VOCAB_ITEMS } from './yct1Data';

interface YctClickableTextProps {
  text: string;
  lessonVocab?: YctFlashcardItem[];
  fallbackItem?: YctFlashcardItem;
  onOpenFlashcard: (item: YctFlashcardItem, deck?: YctFlashcardItem[]) => void;
  className?: string;
}

/**
 * Tự động tách câu chữ Hán thành các từ vựng YCT có thể click vào trực tiếp.
 * Bấm vào bất kỳ từ hoặc chữ Hán nào sẽ mở ngay Flashcard có Hình ảnh + Hán tự + Pinyin + Nghĩa!
 */
export const YctClickableText: React.FC<YctClickableTextProps> = ({
  text,
  lessonVocab = [],
  fallbackItem,
  onOpenFlashcard,
  className = '',
}) => {
  // Tạo từ điển tra cứu từ dài nhất -> ngắn nhất để match cụm từ (VD: 中国人, 星期一, 太早了) trước
  const vocabLookup = useMemo(() => {
    const map = new Map<string, YctFlashcardItem>();
    for (const v of ALL_YCT1_VOCAB_ITEMS) {
      const clean = v.hanzi.replace(/[！!？?。，,\s]/g, '');
      if (clean) map.set(clean, v);
    }
    for (const v of lessonVocab) {
      const clean = v.hanzi.replace(/[！!？?。，,\s]/g, '');
      if (clean) map.set(clean, v);
    }
    // Bổ sung các tên riêng & từ hay gặp trong truyện/bài hát YCT 1
    const extraWords: YctFlashcardItem[] = [
      { id: 'ex-xingxing', hanzi: '星星', pinyin: 'Xīngxing', meaning: 'Tinh Tinh (Tên bạn nhỏ / Ngôi sao)', emoji: '👽⭐', category: 'Nhân vật YCT 1' },
      { id: 'ex-yueyue', hanzi: '月月', pinyin: 'Yuèyue', meaning: 'Nguyệt Nguyệt (Tên bạn nữ / Mặt trăng)', emoji: '👧🌙', category: 'Nhân vật YCT 1' },
      { id: 'ex-chenglong', hanzi: '成龙', pinyin: 'Chéng Lóng', meaning: 'Thành Long (Ngôi sao võ thuật)', emoji: '🥋🎬', category: 'Nhân vật YCT 1' },
      { id: 'ex-yaoming', hanzi: '姚明', pinyin: 'Yáo Míng', meaning: 'Diêu Minh (Cầu thủ bóng rổ)', emoji: '🏀🇨🇳', category: 'Nhân vật YCT 1' },
      { id: 'ex-xiongmao', hanzi: '熊猫', pinyin: 'xióngmāo', meaning: 'Gấu trúc', emoji: '🐼🎋', category: 'Động vật' },
      { id: 'ex-kedou', hanzi: '小蝌蚪', pinyin: 'xiǎo kēdǒu', meaning: 'Nòng nọc con', emoji: '🐸💧', category: 'Truyện đọc' },
      { id: 'ex-pengyou', hanzi: '朋友', pinyin: 'péngyou', meaning: 'Bạn bè, người bạn', emoji: '👫💖', category: 'Từ vựng' },
      { id: 'ex-yeye', hanzi: '爷爷', pinyin: 'yéye', meaning: 'Ông nội', emoji: '👴❤️', category: 'Gia đình' },
      { id: 'ex-nainai', hanzi: '奶奶', pinyin: 'nǎinai', meaning: 'Bà nội', emoji: '👵❤️', category: 'Gia đình' },
      { id: 'ex-yiyuan', hanzi: '医院', pinyin: 'yīyuàn', meaning: 'Bệnh viện', emoji: '🏥➕', category: 'Địa điểm' },
      { id: 'ex-shousi', hanzi: '寿司', pinyin: 'shòusī', meaning: 'Món Sushi Nhật Bản', emoji: '🍣🇯🇵', category: 'Đồ ăn' },
      { id: 'ex-bisa', hanzi: '比萨', pinyin: 'bǐsà', meaning: 'Bánh Pizza', emoji: '🍕🇮🇹', category: 'Đồ ăn' },
      { id: 'ex-bingshui', hanzi: '冰水', pinyin: 'bīngshuǐ', meaning: 'Nước đá lạnh', emoji: '🧊🥤', category: 'Đồ uống' },
      { id: 'ex-reshui', hanzi: '热水', pinyin: 'rèshuǐ', meaning: 'Nước ấm / nước nóng', emoji: '🍵💧', category: 'Đồ uống' },
      { id: 'ex-zhuzi', hanzi: '竹子', pinyin: 'zhúzi', meaning: 'Cây trúc, cây tre', emoji: '🎋🐼', category: 'Từ vựng' },
      { id: 'ex-xiangjiao', hanzi: '香蕉', pinyin: 'xiāngjiāo', meaning: 'Quả chuối', emoji: '🍌🐵', category: 'Đồ ăn' },
      { id: 'ex-houzi', hanzi: '猴子', pinyin: 'hóuzi', meaning: 'Con khỉ', emoji: '🐵🍌', category: 'Động vật' },
    ];
    for (const ex of extraWords) {
      if (!map.has(ex.hanzi)) map.set(ex.hanzi, ex);
    }
    return map;
  }, [lessonVocab]);

  const segments = useMemo(() => {
    const keys = Array.from(vocabLookup.keys()).sort((a, b) => b.length - a.length);
    const result: Array<{ text: string; matchedItem?: YctFlashcardItem }> = [];
    let i = 0;

    while (i < text.length) {
      let found: YctFlashcardItem | undefined;
      let foundKey = '';

      for (const k of keys) {
        if (k.length > 0 && text.startsWith(k, i)) {
          found = vocabLookup.get(k);
          foundKey = k;
          break;
        }
      }

      if (found && foundKey) {
        result.push({ text: foundKey, matchedItem: found });
        i += foundKey.length;
      } else {
        result.push({ text: text[i] });
        i += 1;
      }
    }

    return result;
  }, [text, vocabLookup]);

  return (
    <span className={`font-hanzi ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.matchedItem) {
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onOpenFlashcard(seg.matchedItem!, lessonVocab.length > 0 ? lessonVocab : ALL_YCT1_VOCAB_ITEMS);
              }}
              className="cursor-pointer rounded-lg px-0.5 hover:bg-[#FEF08A] hover:text-black hover:underline decoration-2 decoration-pink-500 transition-colors inline-block"
              title={`Bấm để mở Flashcard từ "${seg.matchedItem.hanzi}" (${seg.matchedItem.pinyin}: ${seg.matchedItem.meaning})`}
            >
              {seg.text}
            </span>
          );
        }

        const isCjk = /[\u4e00-\u9fff]/.test(seg.text);
        if (isCjk && fallbackItem) {
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onOpenFlashcard(fallbackItem);
              }}
              className="cursor-pointer rounded-lg hover:bg-[#FEF08A] transition-colors inline-block"
              title="Bấm để mở Flashcard câu này"
            >
              {seg.text}
            </span>
          );
        }

        return <span key={idx}>{seg.text}</span>;
      })}
    </span>
  );
};

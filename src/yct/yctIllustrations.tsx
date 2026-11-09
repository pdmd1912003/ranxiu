import React from 'react';
import { Camera } from 'lucide-react';
import { YctFlashcardItem } from './yctTypes';
import { useYctMediaStore } from './yctMediaStorage';

interface YctIllustrationProps {
  item: YctFlashcardItem;
  size?: 'sm' | 'md' | 'lg' | 'fill' | 'match';
  customSlotKey?: string;
  frameless?: boolean;
  className?: string;
  onRequestEditImage?: (slotKey: string, title: string, currentUrl?: string) => void;
}

/**
 * Bộ minh họa thiếu nhi dành riêng cho giáo trình chuẩn YCT 1-6.
 * Thiết kế 1 lớp khung duy nhất (không chồng 2 div), hình minh hoạ lớn, rõ nét.
 */
export const YctIllustration: React.FC<YctIllustrationProps> = ({
  item,
  size = 'lg',
  customSlotKey,
  frameless = false,
  className = '',
  onRequestEditImage,
}) => {
  const { getCustomImage } = useYctMediaStore();
  const h = item.hanzi.trim();
  const key = item.illustrationKey || h;

  const primarySlotKey = customSlotKey || `hanzi:${h}`;
  const secondarySlotKey = `card:${item.id}`;
  const customImgUrl = getCustomImage(primarySlotKey, secondarySlotKey);

  const sizeClass =
    size === 'sm'
      ? 'w-16 h-16 rounded-2xl'
      : size === 'md'
      ? 'w-28 h-28 rounded-2xl'
      : size === 'match'
      ? 'w-full h-full rounded-xl'
      : size === 'fill'
      ? 'w-full h-full min-h-[220px] rounded-3xl'
      : 'w-48 h-48 sm:w-56 sm:h-56 rounded-3xl';

  const frameClass = frameless
    ? 'border-0 shadow-none'
    : 'border-3 border-black shadow-[4px_4px_0px_#000]';

  const renderEditBadge = () => {
    if (!onRequestEditImage) return null;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRequestEditImage(
            primarySlotKey,
            `Hình minh hoạ cho "${item.hanzi}" (${item.meaning})`,
            customImgUrl
          );
        }}
        className="absolute bottom-2 right-2 z-20 px-2.5 py-1 rounded-xl bg-white/95 hover:bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] text-[11px] font-black text-black flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
        title="Tải hình lên hoặc nhập URL hình ảnh"
      >
        <Camera className="w-3.5 h-3.5 text-pink-600" />
        {size !== 'sm' && size !== 'match' && <span>Đổi hình</span>}
      </button>
    );
  };

  // Nếu giáo viên đã tải hình lên hoặc gắn URL hình ảnh riêng
  if (customImgUrl) {
    return (
      <div
        className={`${sizeClass} ${frameClass} ${className} relative flex items-center justify-center overflow-hidden select-none bg-white group`}
      >
        <img
          src={customImgUrl}
          alt={item.hanzi}
          className="w-full h-full object-contain p-2"
        />
        {renderEditBadge()}
      </div>
    );
  }

  // Bản đồ số đếm 1-10 với màu sắc kẹo ngọt & ký hiệu bàn tay Trung Hoa
  const numberMap: Record<
    string,
    { num: string; bg: string; accent: string; handEmoji: string; dots: number }
  > = {
    一: { num: '1', bg: '#FCE7F3', accent: '#EC4899', handEmoji: '☝️', dots: 1 },
    二: { num: '2', bg: '#DCFCE7', accent: '#10B981', handEmoji: '✌️', dots: 2 },
    三: { num: '3', bg: '#EDE9FE', accent: '#8B5CF6', handEmoji: '👌', dots: 3 },
    四: { num: '4', bg: '#FEF3C7', accent: '#F59E0B', handEmoji: '🖖', dots: 4 },
    五: { num: '5', bg: '#DBEAFE', accent: '#3B82F6', handEmoji: '🖐️', dots: 5 },
    六: { num: '6', bg: '#FFE4E6', accent: '#F43F5E', handEmoji: '🤙', dots: 6 },
    七: { num: '7', bg: '#F3E8FF', accent: '#9333EA', handEmoji: '🤌', dots: 7 },
    八: { num: '8', bg: '#FFEDD5', accent: '#EA580C', handEmoji: '👉', dots: 8 },
    九: { num: '9', bg: '#FEF9C3', accent: '#CA8A04', handEmoji: '☝️', dots: 9 },
    十: { num: '10', bg: '#CCFBF1', accent: '#0D9488', handEmoji: '✊', dots: 10 },
  };

  if (numberMap[h]) {
    const info = numberMap[h];
    return (
      <div
        className={`${sizeClass} ${frameClass} ${className} relative flex flex-col items-center justify-center overflow-hidden select-none p-2`}
        style={{ backgroundColor: info.bg }}
      >
        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/45 pointer-events-none" />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/45 pointer-events-none" />

        <div className="relative flex items-center justify-center gap-2">
          <span
            className={`${
              size === 'sm'
                ? 'text-3xl'
                : size === 'match'
                ? 'text-4xl sm:text-5xl'
                : size === 'md'
                ? 'text-6xl'
                : 'text-7xl sm:text-8xl'
            } font-black leading-none drop-shadow-[2px_2px_0px_#000]`}
            style={{ color: info.accent }}
          >
            {info.num}
          </span>
          {size === 'match' && (
            <span className="text-3xl sm:text-4xl">{info.handEmoji}</span>
          )}
        </div>

        {size !== 'sm' && size !== 'match' && (
          <div className="mt-2 flex items-center gap-1.5 bg-white/95 px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="text-xl">{info.handEmoji}</span>
            <span className="text-xs font-black text-black">
              Số {info.num}
            </span>
          </div>
        )}

        {(size === 'lg' || size === 'fill') && (
          <div className="flex flex-wrap items-center justify-center gap-1 mt-2 px-3 max-w-[180px]">
            {Array.from({ length: info.dots }).map((_, i) => (
              <span key={i} className="text-sm leading-none">
                ⭐
              </span>
            ))}
          </div>
        )}
        {renderEditBadge()}
      </div>
    );
  }

  // Các thứ trong tuần (Bài 9) — Tờ lịch dễ thương
  const weekdayMap: Record<string, { dayVi: string; num: string; color: string; icon: string }> = {
    星期一: { dayVi: 'Thứ Hai', num: 'MON · 一', color: '#FFEDD5', icon: '🩺🐼' },
    星期二: { dayVi: 'Thứ Ba', num: 'TUE · 二', color: '#FEF9C3', icon: '🎨🐼' },
    星期三: { dayVi: 'Thứ Tư', num: 'WED · 三', color: '#DCFCE7', icon: '🎋🐼' },
    星期四: { dayVi: 'Thứ Năm', num: 'THU · 四', color: '#DBEAFE', icon: '✍️🐼' },
    星期五: { dayVi: 'Thứ Sáu', num: 'FRI · 五', color: '#EDE9FE', icon: '💃🐼' },
    星期六: { dayVi: 'Thứ Bảy', num: 'SAT · 六', color: '#FCE7F3', icon: '🎈🐼' },
    星期天: { dayVi: 'Chủ Nhật', num: 'SUN · 日', color: '#FFE4E6', icon: '😴🐼' },
  };

  if (weekdayMap[h]) {
    const w = weekdayMap[h];
    return (
      <div
        className={`${sizeClass} ${frameClass} ${className} relative flex flex-col items-center justify-between p-3 overflow-hidden select-none bg-white`}
      >
        <div
          className="w-full py-1.5 px-2 rounded-xl border-2 border-black text-center font-black text-xs text-black flex items-center justify-around"
          style={{ backgroundColor: w.color }}
        >
          <span>📅</span>
          <span>{w.num}</span>
        </div>
        <div
          className={
            size === 'sm'
              ? 'text-2xl'
              : size === 'match'
              ? 'text-3xl'
              : 'text-5xl sm:text-6xl my-1'
          }
        >
          {w.icon}
        </div>
        {size !== 'sm' && (
          <div className="w-full text-center bg-amber-100 border border-black rounded-lg py-0.5 text-xs font-black text-black">
            {w.dayVi}
          </div>
        )}
        {renderEditBadge()}
      </div>
    );
  }

  // Bản đồ hình ảnh minh họa chi tiết cho tất cả từ vựng và mẫu câu YCT 1
  const sceneMap: Record<
    string,
    {
      mainEmoji: string;
      subEmojis?: string;
      bg: string;
      badgeText?: string;
    }
  > = {
    // Bài 1
    你: { mainEmoji: '🫵😊', subEmojis: '👦👧', bg: '#FEF9C3', badgeText: 'Bạn / Em' },
    好: { mainEmoji: '👍🌟', subEmojis: '😄💖', bg: '#DCFCE7', badgeText: 'Tốt / Khỏe' },
    老师: { mainEmoji: '👩‍🏫', subEmojis: '📚✏️', bg: '#FCE7F3', badgeText: 'Cô giáo / Thầy giáo' },
    再见: { mainEmoji: '👋😊', subEmojis: '🎒🏫', bg: '#DBEAFE', badgeText: 'Tạm biệt!' },
    '你好！': { mainEmoji: '🙋‍♂️🙋‍♀️', subEmojis: '👋✨', bg: '#DCFCE7', badgeText: 'Xin chào!' },
    '再见！': { mainEmoji: '👋🎒', subEmojis: '🌅✨', bg: '#DBEAFE', badgeText: 'Tạm biệt!' },
    '老师好！': { mainEmoji: '🙇‍♂️👩‍🏫', subEmojis: '🌸🏫', bg: '#FCE7F3', badgeText: 'Em chào cô ạ!' },

    // Bài 2
    我: { mainEmoji: '🙋‍♀️', subEmojis: '⭐💖', bg: '#FCE7F3', badgeText: 'Tôi / Mình' },
    叫: { mainEmoji: '🏷️🗣️', subEmojis: '👋😊', bg: '#FEF3C7', badgeText: 'Tên là / Gọi là' },
    什么: { mainEmoji: '🤔❓', subEmojis: '💭✨', bg: '#EDE9FE', badgeText: 'Cái gì?' },
    认识: { mainEmoji: '🤝😊', subEmojis: '👽👧', bg: '#DCFCE7', badgeText: 'Làm quen / Biết' },
    很: { mainEmoji: '🌟💯', subEmojis: '👍✨', bg: '#FEF9C3', badgeText: 'Rất' },
    高兴: { mainEmoji: '🥳🎉', subEmojis: '😄🌈', bg: '#DCFCE7', badgeText: 'Vui vẻ' },
    她: { mainEmoji: '👧🌸', subEmojis: '👗✨', bg: '#FCE7F3', badgeText: 'Cô ấy / Chị ấy' },
    吗: { mainEmoji: '🙋❓', subEmojis: '💬✨', bg: '#DBEAFE', badgeText: 'Không? (Hỏi)' },
    不: { mainEmoji: '🙅‍♂️❌', subEmojis: '🚫', bg: '#FFE4E6', badgeText: 'Không' },
    '你叫什么？': { mainEmoji: '👽👋', subEmojis: '👧❓', bg: '#EDE9FE', badgeText: 'Bạn tên gì?' },
    '你认识她吗？': { mainEmoji: '👦👉', subEmojis: '👽❓', bg: '#DBEAFE', badgeText: 'Bạn biết cô ấy không?' },

    // Bài 3
    他: { mainEmoji: '👦🧢', subEmojis: '👨✨', bg: '#DBEAFE', badgeText: 'Anh ấy / Ông ấy' },
    是: { mainEmoji: '✅🎯', subEmojis: '👉✨', bg: '#DCFCE7', badgeText: 'Là' },
    谁: { mainEmoji: '🕵️‍♂️❓', subEmojis: '👤✨', bg: '#FEF3C7', badgeText: 'Ai?' },
    哪: { mainEmoji: '🧭❓', subEmojis: '🌍✨', bg: '#EDE9FE', badgeText: 'Nào?' },
    国: { mainEmoji: '🌍🏳️', subEmojis: '🗺️✨', bg: '#DBEAFE', badgeText: 'Đất nước / Quốc gia' },
    人: { mainEmoji: '🧑🤝🧑', subEmojis: '👨‍👩‍👧‍👦', bg: '#FEF9C3', badgeText: 'Con người' },
    中国人: { mainEmoji: '🇨🇳🐉', subEmojis: '🏮🐼', bg: '#FFE4E6', badgeText: 'Người Trung Quốc' },
    '他是谁？': { mainEmoji: '🥋🎬', subEmojis: '👧❓', bg: '#FEF3C7', badgeText: 'Ông ấy là ai?' },
    '成龙是哪国人？': { mainEmoji: '🥋🇨🇳', subEmojis: '🐉🏮', bg: '#FFE4E6', badgeText: 'Thành Long nước nào?' },

    // Bài 4
    爸爸: { mainEmoji: '👨💼', subEmojis: '❤️🏠', bg: '#DBEAFE', badgeText: 'Bố / Ba' },
    妈妈: { mainEmoji: '👩🍳', subEmojis: '💖🌸', bg: '#FCE7F3', badgeText: 'Mẹ / Má' },
    哥哥: { mainEmoji: '👦⚽', subEmojis: '🛹🌟', bg: '#DCFCE7', badgeText: 'Anh trai' },
    姐姐: { mainEmoji: '👧🎀', subEmojis: '📚🌸', bg: '#F3E8FF', badgeText: 'Chị gái' },
    妹妹: { mainEmoji: '👶🍼', subEmojis: '🧸🎀', bg: '#FFE4E6', badgeText: 'Em gái' },
    弟弟: { mainEmoji: '👶🚗', subEmojis: '🧸🎈', bg: '#DBEAFE', badgeText: 'Em trai' },
    家: { mainEmoji: '🏡👨‍👩‍👧‍👦', subEmojis: '❤️🌳', bg: '#FEF3C7', badgeText: 'Nhà / Gia đình' },
    有: { mainEmoji: '🤲🎁', subEmojis: '✅✨', bg: '#DCFCE7', badgeText: 'Có' },
    几: { mainEmoji: '🔢❓', subEmojis: '1️⃣2️⃣3️⃣', bg: '#EDE9FE', badgeText: 'Mấy?' },
    口: { mainEmoji: '👨‍👩‍👧‍👦🏠', subEmojis: '4️⃣❤️', bg: '#FEF9C3', badgeText: 'Lượng từ người nhà' },
    和: { mainEmoji: '👨🤝👩', subEmojis: '➕❤️', bg: '#DCFCE7', badgeText: 'Và' },
    没有: { mainEmoji: '🤷‍♂️❌', subEmojis: '📭', bg: '#FFE4E6', badgeText: 'Không có' },
    个: { mainEmoji: '☝️👧', subEmojis: '📦✨', bg: '#DBEAFE', badgeText: 'Cái / Người / Con' },
    '你家有几口人？': { mainEmoji: '🏡👨‍👩‍👧‍👦', subEmojis: '🔢❓', bg: '#FEF3C7', badgeText: 'Nhà bạn mấy người?' },
    '你有姐姐吗？': { mainEmoji: '👧🎀', subEmojis: '🤔❓', bg: '#FCE7F3', badgeText: 'Bạn có chị không?' },

    // Bài 5
    岁: { mainEmoji: '🎂🕯️', subEmojis: '6️⃣🎉', bg: '#FCE7F3', badgeText: 'Tuổi' },
    多大: { mainEmoji: '🎂❓', subEmojis: '👦📏', bg: '#FEF3C7', badgeText: 'Bao nhiêu tuổi?' },
    也: { mainEmoji: '👧🤝👦', subEmojis: '6️⃣=6️⃣', bg: '#DCFCE7', badgeText: 'Cũng' },
    '你几岁？': { mainEmoji: '🎂6️⃣', subEmojis: '🎈🎉', bg: '#FCE7F3', badgeText: 'Bạn mấy tuổi?' },
    '你哥哥多大？': { mainEmoji: '👦🎂', subEmojis: '🎈❓', bg: '#DBEAFE', badgeText: 'Anh bạn mấy tuổi?' },

    // Bài 6
    头发: { mainEmoji: '💇‍♀️✨', subEmojis: '🎀👩', bg: '#FCE7F3', badgeText: 'Mái tóc' },
    鼻子: { mainEmoji: '👃🐘', subEmojis: '🌸✨', bg: '#FEF3C7', badgeText: 'Cái mũi' },
    眼睛: { mainEmoji: '👀✨', subEmojis: '🐸👧', bg: '#DBEAFE', badgeText: 'Đôi mắt' },
    手: { mainEmoji: '✋🖐️', subEmojis: '👏✨', bg: '#DCFCE7', badgeText: 'Bàn tay' },
    耳朵: { mainEmoji: '👂🐰', subEmojis: '🎵✨', bg: '#EDE9FE', badgeText: 'Đôi tai' },
    嘴巴: { mainEmoji: '👄😊', subEmojis: '🗣️✨', bg: '#FFE4E6', badgeText: 'Cái miệng' },
    脚: { mainEmoji: '🦶👟', subEmojis: '🏃✨', bg: '#FEF9C3', badgeText: 'Bàn chân' },
    的: { mainEmoji: '👧🔗👀', subEmojis: '💝✨', bg: '#FEF9C3', badgeText: 'Của (Sở hữu)' },
    小: { mainEmoji: '🐣🔍', subEmojis: '👶✨', bg: '#DCFCE7', badgeText: 'Nhỏ / Bé' },
    大: { mainEmoji: '🐘🌟', subEmojis: '🐳✨', bg: '#DBEAFE', badgeText: 'To / Lớn' },
    长: { mainEmoji: '🦒📏', subEmojis: '🐘👃', bg: '#FEF3C7', badgeText: 'Dài' },
    矮: { mainEmoji: '🐣⬇️', subEmojis: '📏✨', bg: '#FFE4E6', badgeText: 'Thấp' },
    个子: { mainEmoji: '🦒🧍', subEmojis: '📏⬆️', bg: '#DCFCE7', badgeText: 'Vóc dáng / Chiều cao' },
    真: { mainEmoji: '🤩💯', subEmojis: '✨🌟', bg: '#FCE7F3', badgeText: 'Thật là!' },
    高: { mainEmoji: '🦒⬆️', subEmojis: '🏀🌟', bg: '#FEF9C3', badgeText: 'Cao' },
    '妹妹的眼睛很小。': { mainEmoji: '👶👀', subEmojis: '🍼💖', bg: '#FCE7F3', badgeText: 'Mắt em gái rất nhỏ' },
    '你的个子真高！': { mainEmoji: '🐘🦒', subEmojis: '📏🤩', bg: '#DCFCE7', badgeText: 'Bạn cao thật đấy!' },

    // Bài 7
    猫: { mainEmoji: '🐱🐾', subEmojis: '🧶🐟', bg: '#FCE7F3', badgeText: 'Con mèo' },
    狗: { mainEmoji: '🐶🦴', subEmojis: '🐾🏠', bg: '#FEF3C7', badgeText: 'Con chó' },
    鱼: { mainEmoji: '🐠🌊', subEmojis: '🫧💧', bg: '#DBEAFE', badgeText: 'Con cá' },
    鸟: { mainEmoji: '🐦🌳', subEmojis: '🎵☁️', bg: '#DCFCE7', badgeText: 'Con chim' },
    这: { mainEmoji: '👇🐶', subEmojis: '📍✨', bg: '#FEF9C3', badgeText: 'Đây / Này' },
    那: { mainEmoji: '👉🐱', subEmojis: '🔭✨', bg: '#EDE9FE', badgeText: 'Đó / Kia' },
    看: { mainEmoji: '👀🔭', subEmojis: '👦👧', bg: '#DBEAFE', badgeText: 'Nhìn / Xem' },
    这儿: { mainEmoji: '📍🐟', subEmojis: '👇🌊', bg: '#DCFCE7', badgeText: 'Ở đây' },
    多: { mainEmoji: '🐠🐟🐡', subEmojis: '🐦🐤🐦', bg: '#FEF3C7', badgeText: 'Nhiều' },
    那儿: { mainEmoji: '👉🌳🐦', subEmojis: '🏞️✨', bg: '#F3E8FF', badgeText: 'Ở đó / Đằng kia' },
    '这是谁的狗？': { mainEmoji: '🐶❓', subEmojis: '👦👧', bg: '#FEF3C7', badgeText: 'Chó của ai đây?' },
    '这儿有很多小鱼。': { mainEmoji: '🐠🐟🌊', subEmojis: '👧👇', bg: '#DBEAFE', badgeText: 'Ở đây nhiều cá nhỏ' },

    // Bài 8
    学校: { mainEmoji: '🏫🎒', subEmojis: '📚🔔', bg: '#DBEAFE', badgeText: 'Trường học' },
    商店: { mainEmoji: '🏪🛒', subEmojis: '🛍️🍎', bg: '#FCE7F3', badgeText: 'Cửa hàng' },
    在: { mainEmoji: '📍🏠', subEmojis: '🏫✨', bg: '#DCFCE7', badgeText: 'Ở tại' },
    谢谢: { mainEmoji: '🙏💖', subEmojis: '😊🌸', bg: '#FEF3C7', badgeText: 'Cảm ơn!' },
    去: { mainEmoji: '🚶‍♀️➡️', subEmojis: '🏪🏫', bg: '#EDE9FE', badgeText: 'Đi đến' },
    书: { mainEmoji: '📖📚', subEmojis: '✏️✨', bg: '#DBEAFE', badgeText: 'Quyển sách' },
    买: { mainEmoji: '🛒🛍️', subEmojis: '🍎🏪', bg: '#DCFCE7', badgeText: 'Mua' },
    你们: { mainEmoji: '👦👧👋', subEmojis: '🫵✨', bg: '#FEF9C3', badgeText: 'Các bạn' },
    我们: { mainEmoji: '👨‍👦🏠', subEmojis: '🤝❤️', bg: '#DCFCE7', badgeText: 'Chúng tôi / Chúng mình' },
    哪儿: { mainEmoji: '🗺️❓', subEmojis: '🧭🚶', bg: '#FFE4E6', badgeText: 'Ở đâu / Chỗ nào?' },
    '你姐姐在家吗？': { mainEmoji: '🏠👧❓', subEmojis: '🏫📚', bg: '#DBEAFE', badgeText: 'Chị bạn có ở nhà không?' },
    '我去商店。': { mainEmoji: '👩🛍️🏪', subEmojis: '🛒✨', bg: '#FCE7F3', badgeText: 'Mẹ đi cửa hàng' },

    // Bài 9
    生日: { mainEmoji: '🎂👑', subEmojis: '🎈🎁', bg: '#FCE7F3', badgeText: 'Sinh nhật' },
    月: { mainEmoji: '🗓️🌙', subEmojis: '1️⃣月', bg: '#FEF3C7', badgeText: 'Tháng' },
    号: { mainEmoji: '📆1️⃣', subEmojis: '🎉✨', bg: '#DBEAFE', badgeText: 'Ngày (Mồng)' },
    今天: { mainEmoji: '☀️📅', subEmojis: '👇✨', bg: '#DCFCE7', badgeText: 'Hôm nay' },
    昨天: { mainEmoji: '⏪📅', subEmojis: '🌙✨', bg: '#EDE9FE', badgeText: 'Hôm qua' },
    星期: { mainEmoji: '🗓️7️⃣', subEmojis: '🌈✨', bg: '#EDE9FE', badgeText: 'Thứ / Tuần' },
    明天: { mainEmoji: '🌅➡️', subEmojis: '📅✨', bg: '#FEF9C3', badgeText: 'Ngày mai' },
    喜欢: { mainEmoji: '😍💖', subEmojis: '🥰🌟', bg: '#FFE4E6', badgeText: 'Thích / Yêu thích' },
    '你的生日是几月几号？': { mainEmoji: '🎂👑🎈', subEmojis: '🗓️1月1号', bg: '#FCE7F3', badgeText: 'Sinh nhật ngày mấy?' },
    '今天星期几？': { mainEmoji: '🗓️🤔', subEmojis: '☀️❓', bg: '#DCFCE7', badgeText: 'Hôm nay thứ mấy?' },

    // Bài 10
    现在: { mainEmoji: '⌚👇', subEmojis: '⏰✨', bg: '#DBEAFE', badgeText: 'Bây giờ' },
    点: { mainEmoji: '🕔5️⃣', subEmojis: '🕰️✨', bg: '#FEF3C7', badgeText: 'Giờ (5点)' },
    半: { mainEmoji: '🕡30', subEmojis: '⏱️✨', bg: '#DCFCE7', badgeText: 'Rưỡi (30 phút)' },
    分: { mainEmoji: '🕚🔟', subEmojis: '⏱️✨', bg: '#DCFCE7', badgeText: 'Phút (10分)' },
    起床: { mainEmoji: '🌅🙆‍♂️', subEmojis: '🛏️☀️', bg: '#FEF9C3', badgeText: 'Thức dậy' },
    睡觉: { mainEmoji: '😴🛌', subEmojis: '🌙💤', bg: '#EDE9FE', badgeText: 'Đi ngủ' },
    见: { mainEmoji: '👋🤝', subEmojis: '⚽👦', bg: '#FCE7F3', badgeText: 'Gặp nhau' },
    早上: { mainEmoji: '🌅🐓', subEmojis: '☀️5:00', bg: '#FEF9C3', badgeText: 'Buổi sáng' },
    晚上: { mainEmoji: '🌙⭐', subEmojis: '🏮💤', bg: '#DBEAFE', badgeText: 'Buổi tối' },
    '太早了！': { mainEmoji: '😱🌅', subEmojis: '😴🕔', bg: '#FFE4E6', badgeText: 'Sớm quá!' },
    '现在几点？': { mainEmoji: '⌚🤔', subEmojis: '🕚11:10', bg: '#DBEAFE', badgeText: 'Bây giờ mấy giờ?' },
    '明天5点见。': { mainEmoji: '🌅🕔⚽', subEmojis: '👦🤝👦', bg: '#FEF3C7', badgeText: 'Mai 5 giờ gặp nhé!' },

    // Bài 11
    米饭: { mainEmoji: '🍚🥢', subEmojis: '😋✨', bg: '#FEF9C3', badgeText: 'Cơm trắng' },
    面条: { mainEmoji: '🍜🥢', subEmojis: '🥚🥬', bg: '#FFEDD5', badgeText: 'Mì sợi' },
    包子: { mainEmoji: '🥟♨️', subEmojis: '😋✨', bg: '#FEF3C7', badgeText: 'Bánh bao' },
    饺子: { mainEmoji: '🥟🥢', subEmojis: '🏮✨', bg: '#FFE4E6', badgeText: 'Sủi cảo' },
    鸡蛋: { mainEmoji: '🥚🍳', subEmojis: '🐔✨', bg: '#FEF9C3', badgeText: 'Trứng gà' },
    苹果: { mainEmoji: '🍎🍃', subEmojis: '😋✨', bg: '#FFE4E6', badgeText: 'Quả táo đỏ' },
    香蕉: { mainEmoji: '🍌🐒', subEmojis: '😋✨', bg: '#FEF9C3', badgeText: 'Quả chuối' },
    西瓜: { mainEmoji: '🍉☀️', subEmojis: '😋✨', bg: '#DCFCE7', badgeText: 'Dưa hấu' },
    牛奶: { mainEmoji: '🥛🐄', subEmojis: '💪✨', bg: '#DBEAFE', badgeText: 'Sữa tươi' },
    水: { mainEmoji: '🥤💧', subEmojis: '🌊✨', bg: '#E0F2FE', badgeText: 'Nước uống' },
    茶: { mainEmoji: '🍵🍃', subEmojis: '🫖✨', bg: '#DCFCE7', badgeText: 'Trà' },
    吃: { mainEmoji: '😋🍴', subEmojis: '🍎🍚', bg: '#DCFCE7', badgeText: 'Ăn' },
    喝: { mainEmoji: '🥤😋', subEmojis: '🥛💧', bg: '#DBEAFE', badgeText: 'Uống' },
    爱: { mainEmoji: '❤️🥰', subEmojis: '💖🎂', bg: '#FCE7F3', badgeText: 'Yêu / Thích' },
    蛋糕: { mainEmoji: '🍰🍓', subEmojis: '🎂🕯️', bg: '#FCE7F3', badgeText: 'Bánh ga-tô' },
    '你吃什么？': { mainEmoji: '🍽️🤔', subEmojis: '🍎🍚🍜', bg: '#FEF3C7', badgeText: 'Con ăn gì?' },
    '我爱吃蛋糕。': { mainEmoji: '👧🍰💖', subEmojis: '🎂😋', bg: '#FCE7F3', badgeText: 'Con thích ăn bánh kem' },

    // Bài 12
    做: { mainEmoji: '👐🛠️', subEmojis: '🎨✨', bg: '#FEF3C7', badgeText: 'Làm' },
    呢: { mainEmoji: '🤔💬', subEmojis: '❓✨', bg: '#EDE9FE', badgeText: 'Thế / Nhỉ' },
    跑步: { mainEmoji: '🏃‍♂️💨', subEmojis: '👟🌟', bg: '#DCFCE7', badgeText: 'Chạy bộ' },
    游泳: { mainEmoji: '🏊‍♀️🌊', subEmojis: '🥽💧', bg: '#DBEAFE', badgeText: 'Bơi lội' },
    打篮球: { mainEmoji: '⛹️‍♂️🏀', subEmojis: '🏆✨', bg: '#FFEDD5', badgeText: 'Chơi bóng rổ' },
    踢足球: { mainEmoji: '⚽🏃', subEmojis: '🥅🌟', bg: '#DCFCE7', badgeText: 'Đá bóng' },
    唱歌: { mainEmoji: '🎤🎶', subEmojis: '🎵🌟', bg: '#FCE7F3', badgeText: 'Ca hát' },
    跳舞: { mainEmoji: '💃🕺', subEmojis: '🎶✨', bg: '#EDE9FE', badgeText: 'Nhảy múa' },
    画画儿: { mainEmoji: '🎨🖌️', subEmojis: '🌈🖼️', bg: '#FEF9C3', badgeText: 'Vẽ tranh' },
  };

  const scene = sceneMap[key] || sceneMap[h] || {
    mainEmoji: item.emoji || '🐼✨',
    subEmojis: '🌟🎈',
    bg: item.colorBg || '#FEF9C3',
    badgeText: item.category || 'YCT Kids',
  };

  return (
    <div
      className={`${sizeClass} ${frameClass} ${className} relative flex flex-col items-center justify-center p-3 overflow-hidden select-none`}
      style={{ backgroundColor: scene.bg }}
    >
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-white/45 pointer-events-none" />
      <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full bg-white/40 pointer-events-none" />

      {size !== 'sm' && size !== 'match' && scene.subEmojis && (
        <div className="absolute top-2.5 right-3 text-sm sm:text-base bg-white/85 px-2.5 py-0.5 rounded-full border border-black/30">
          {scene.subEmojis}
        </div>
      )}

      <div
        className={`${
          size === 'sm'
            ? 'text-3xl'
            : size === 'match'
            ? 'text-4xl sm:text-5xl'
            : size === 'md'
            ? 'text-5xl'
            : 'text-7xl sm:text-8xl'
        } leading-none my-1 drop-shadow-xs transition-transform duration-200 hover:scale-105`}
      >
        {scene.mainEmoji}
      </div>

      {(size === 'lg' || size === 'fill') && scene.badgeText && (
        <div className="mt-3 px-3.5 py-1 rounded-full bg-white/95 border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black text-center line-clamp-1">
          {scene.badgeText}
        </div>
      )}

      {renderEditBadge()}
    </div>
  );
};

/**
 * Khung hình ảnh linh hoạt cho Hội thoại, Truyện ngắn, Hoạt động và Bài thi mẫu.
 */
interface YctCustomSlotImageProps {
  slotKey: string;
  title: string;
  fallbackEmoji: string;
  bgColor?: string;
  sizeClass?: string;
  emojiClass?: string;
  badgeLabel?: string;
  onRequestEditImage?: (slotKey: string, title: string, currentUrl?: string) => void;
}

export const YctCustomSlotImage: React.FC<YctCustomSlotImageProps> = ({
  slotKey,
  title,
  fallbackEmoji,
  bgColor = '#FFFDF7',
  sizeClass = 'w-16 h-16 rounded-2xl',
  emojiClass = 'text-2xl',
  badgeLabel,
  onRequestEditImage,
}) => {
  const { getCustomImage } = useYctMediaStore();
  const customUrl = getCustomImage(slotKey);

  return (
    <div
      className={`${sizeClass} relative border-2 border-black shadow-[2px_2px_0px_#000] flex flex-col items-center justify-center overflow-hidden shrink-0 group select-none`}
      style={{ backgroundColor: customUrl ? '#FFFFFF' : bgColor }}
    >
      {customUrl ? (
        <img src={customUrl} alt={title} className="w-full h-full object-contain p-0.5" />
      ) : (
        <>
          <span className={`${emojiClass} leading-none`}>{fallbackEmoji}</span>
          {badgeLabel && (
            <span className="text-[9px] font-black text-black mt-0.5">{badgeLabel}</span>
          )}
        </>
      )}

      {onRequestEditImage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestEditImage(slotKey, title, customUrl);
          }}
          className="absolute bottom-0.5 right-0.5 z-10 p-1 rounded-lg bg-white/95 hover:bg-[#FEF08A] border border-black shadow-[1px_1px_0px_#000] text-[9px] font-black text-black flex items-center gap-0.5 cursor-pointer"
          title="Tải hình lên hoặc dán URL hình ảnh"
        >
          <Camera className="w-2.5 h-2.5 text-pink-600" />
        </button>
      )}
    </div>
  );
};

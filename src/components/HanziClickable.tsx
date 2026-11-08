import React from 'react';

interface HanziClickableProps {
  text: string;
  onShowStroke: (char: string) => void;
  className?: string;
  charClassName?: string;
}

/** Wraps each CJK character individually so it can be clicked to show stroke order */
export const HanziClickable: React.FC<HanziClickableProps> = ({
  text,
  onShowStroke,
  className = '',
  charClassName = '',
}) => {
  const isCJK = (ch: string) =>
    /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}]/u.test(ch);

  return (
    <span className={className}>
      {[...text].map((char, i) =>
        isCJK(char) ? (
          <span
            key={i}
            className={`cursor-pointer transition-colors hover:text-red-600 hover:bg-red-50 rounded-sm px-0.5 ${charClassName}`}
            onClick={(e) => {
              e.stopPropagation();
              onShowStroke(char);
            }}
            title={`Xem nét bút: ${char}`}
          >
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </span>
  );
};

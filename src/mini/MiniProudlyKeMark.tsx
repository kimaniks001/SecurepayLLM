import type { ReactElement } from 'react';

/**
 * A small, decorative Kenyan beaded-bangle tribute in the original
 * black / red / white / green shield arrangement.
 *
 * Deliberately only a footer signature: no navigation, auth, Money,
 * branding replacement or new interaction.
 */
export function MiniProudlyKeMark(): ReactElement {
  const rows = [
    { y: 3.5, color: '#272725' },
    { y: 7.7, color: '#272725' },
    { y: 11.9, color: '#f5f2e8' },
    { y: 16.1, color: '#c62837' },
    { y: 20.3, color: '#c62837' },
    { y: 24.5, color: '#f5f2e8' },
    { y: 28.7, color: '#198345' },
    { y: 32.9, color: '#198345' },
  ];
  return (
    <svg className="spm-proudly-beads" width="49" height="14"
      viewBox="0 0 148 37" focusable="false" aria-hidden="true">
      <g opacity="0.98">
        {rows.map(({ y, color }, row) =>
          Array.from({ length: 34 }, (_, i) => (
            <circle key={`${row}-${i}`} cx={3.5 + i * 4.25} cy={y}
              r={2.15} fill={color} />
          )))}
        <ellipse cx="74" cy="18" rx="12.9" ry="17.3"
          fill="#272725" stroke="#f6f3e8" strokeWidth="2"/>
        <ellipse cx="74" cy="18" rx="5.1" ry="16" fill="#c62837"/>
        {[5, 10, 15, 20, 25, 30].map(y => (
          <g key={y}>
            <circle cx="66.9" cy={y} r="2.2" fill="#f6f3e8"/>
            <circle cx="81.1" cy={y} r="2.2" fill="#f6f3e8"/>
            <circle cx="74" cy={y} r="2.15" fill="#e73941"/>
          </g>
        ))}
      </g>
    </svg>
  );
}

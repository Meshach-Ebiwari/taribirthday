'use client';

interface RebusElement {
  label: string;
  emoji: string | null;
}

interface RebusCardProps {
  elements: RebusElement[];
  size?: 'sm' | 'lg';
}

export default function RebusCard({ elements, size = 'sm' }: RebusCardProps) {
  const isLarge = size === 'lg';

  const pillBase = isLarge
    ? 'inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-3xl md:text-5xl'
    : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-lg md:text-2xl';

  const plusSize = isLarge ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl';

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
      <div className="flex flex-row flex-wrap items-center justify-center gap-3">
        {elements.map((el, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && (
              <span className={`${plusSize} font-bold text-gray-500 select-none`}>+</span>
            )}
            {el.emoji ? (
              <span className={`${pillBase} bg-purple-100 text-purple-900`}>
                {el.emoji}
              </span>
            ) : (
              <span className={`${pillBase} bg-gray-100 text-gray-800`}>
                {el.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

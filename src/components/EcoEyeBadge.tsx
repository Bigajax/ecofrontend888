import React from 'react';
import clsx from 'clsx';

type EcoEyeBadgeProps = {
  emotion?: string;
  className?: string;
};

const EcoEyeBadge: React.FC<EcoEyeBadgeProps> = ({ emotion, className }) => (
  <div
    role="img"
    aria-label={emotion ? `Emoção ${emotion}` : 'Memória Eco'}
    className={clsx(
      'relative grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-900 ring-1 ring-black/5 md:h-16 md:w-16 xl:h-[72px] xl:w-[72px]',
      className,
    )}
  >
    <svg
      viewBox="0 0 80 80"
      aria-hidden
      className="h-9 w-9 text-slate-900 md:h-10 md:w-10"
    >
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      <circle cx="40" cy="40" r="20" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" fill="none" />
      <circle cx="40" cy="40" r="12" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" fill="none" />
      <circle cx="40" cy="40" r="8" fill="currentColor" fillOpacity="0.12" />
      <circle cx="40" cy="40" r="4.5" fill="#0F172A" />
      <path
        d="M12 40c6.8-9.8 17.6-16 28-16s21.2 6.2 28 16c-6.8 9.8-17.6 16-28 16S18.8 49.8 12 40Z"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {emotion ? <span className="sr-only">{emotion}</span> : null}
  </div>
);

export default EcoEyeBadge;

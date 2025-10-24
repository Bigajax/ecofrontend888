import React from 'react';

type ExpandButtonProps = {
  open: boolean;
  onClick: () => void;
  controlsId: string;
};

const ExpandButton: React.FC<ExpandButtonProps> = ({ open, onClick, controlsId }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={open}
    aria-controls={controlsId}
    aria-label={open ? 'Recolher detalhes' : 'Ver detalhes'}
    className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm border border-black/[0.06] hover:bg-white hover:border-black/[0.08] active:scale-[0.96] transition-all duration-150 grid place-items-center"
  >
    <svg
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

export default ExpandButton;

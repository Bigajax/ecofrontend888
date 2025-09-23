import React from 'react';

const TypingDots: React.FC = () => (
  <div
    className="
      inline-flex items-center gap-1 px-3 py-2 rounded-2xl
      bg-white shadow-sm border border-black/5
      text-slate-500 text-sm leading-none
    "
    aria-label="Eco está digitando"
  >
    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]"></span>
    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]"></span>
    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]"></span>
  </div>
);

export default TypingDots;

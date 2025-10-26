import { ReactNode } from "react";

type SlideProps = {
  title: string;
  sub?: string;
  text: string;
  note?: string;
  chips?: string[];
  mini?: string;
  cta?: string;
  art?: ReactNode;
  onCtaClick?: () => void;
};

export default function Slide({
  title,
  sub,
  text,
  note,
  chips,
  mini,
  cta,
  art,
  onCtaClick,
}: SlideProps) {
  return (
    <section
      className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5
                 px-6 sm:px-10 lg:px-12 py-8 sm:py-12 pb-14
                 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12
                 text-slate-900"
    >
      <div className="order-1 lg:order-none flex flex-col">
        {sub && (
          <p className="text-slate-500 text-[clamp(13px,2.4vw,16px)] leading-relaxed mb-2">
            {sub}
          </p>
        )}
        <h2
          className="font-semibold tracking-tight text-balance
                     text-[clamp(28px,6vw,44px)] leading-tight mb-4"
        >
          {title}
        </h2>
        <p className="text-slate-600 text-[clamp(14px,2.8vw,18px)] leading-relaxed max-w-prose">
          {text}
        </p>
        {note && (
          <p className="mt-4 text-slate-500 text-[clamp(13px,2.4vw,16px)] leading-relaxed">
            {note}
          </p>
        )}
        {chips && chips.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200
                           bg-white px-3 py-1 text-sm sm:text-base text-slate-600 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {mini && (
          <p className="mt-6 text-slate-500 text-[clamp(13px,2.4vw,16px)] leading-relaxed">
            {mini}
          </p>
        )}
        {cta && (
          <button
            type="button"
            onClick={onCtaClick}
            className="mt-6 inline-flex items-center justify-center
                       rounded-full bg-[#007AFF] text-white
                       px-5 sm:px-6 py-3 sm:py-3.5 font-medium shadow-sm hover:brightness-95
                       active:brightness-90 transition text-[clamp(14px,2.8vw,17px)]"
          >
            {cta}
          </button>
        )}
      </div>

      <div className="order-2 lg:order-none">
        <div
          className="rounded-3xl ring-1 ring-slate-200/60 bg-gradient-to-br from-slate-50 to-white
                     p-6 sm:p-8 aspect-[4/3] lg:aspect-[1/1] grid place-items-center"
        >
          {art ?? (
            <div
              className="w-[clamp(120px,36vw,320px)] h-[clamp(120px,36vw,320px)]
                         rounded-full bg-gradient-to-br from-[#F5F9FF] to-white
                         ring-1 ring-[#A4C8FF]/40 shadow-[inset_0_0_0_1px_rgba(164,200,255,0.25)]
                         grid place-items-center"
            >
              <div
                className="w-[clamp(48px,10vw,96px)] h-[clamp(48px,10vw,96px)]
                           rounded-full ring-1 ring-[#A4C8FF]/50"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

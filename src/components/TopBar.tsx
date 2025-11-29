import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-black/5">
      {/* Left: Logo + Menu button on mobile */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        )}
        <div className="flex items-center">
          <span className="text-xl font-semibold text-gray-900">ECO</span>
        </div>
      </div>

      {/* Right: Empty space for balance (all actions moved to Sidebar) */}
      <div className="w-8" />
    </header>
  );
}

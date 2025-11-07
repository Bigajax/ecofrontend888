import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleMessageProps {
  children: React.ReactNode;
  maxHeightMobile?: number; // pixels
  initiallyCollapsed?: boolean;
}

/**
 * CollapsibleMessage: Wraps long Eco messages on mobile with a gradient mask + expand button
 *
 * Features:
 * - Detects mobile with matchMedia('(max-width: 640px)')
 * - Collapses to maxHeightMobile px with overflow:hidden + gradient mask
 * - Shows "Ler tudo" button to expand; "Mostrar menos" to collapse
 * - Preserves internal structure (lists, links, formatting intact)
 * - Full accessibility: role="region", aria-expanded, aria-controls
 */
export const CollapsibleMessage: React.FC<CollapsibleMessageProps> = ({
  children,
  maxHeightMobile = 360,
  initiallyCollapsed = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(!initiallyCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial state
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    } else {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Check if content exceeds max height
  useEffect(() => {
    const checkHeight = () => {
      if (!contentRef.current || !isMobile) {
        setShouldShowButton(false);
        return;
      }

      const contentHeight = contentRef.current.scrollHeight;
      setShouldShowButton(contentHeight > maxHeightMobile);
    };

    // Initial check
    checkHeight();

    // Recheck on content changes (images load, etc.)
    const resizeObserver = new ResizeObserver(checkHeight);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMobile, maxHeightMobile, children]);

  const isCollapsed = isMobile && !isExpanded && shouldShowButton;

  return (
    <div className="w-full">
      {/* Content container with gradient fade on collapse */}
      <div
        ref={contentRef}
        role="region"
        aria-expanded={isCollapsed ? false : true}
        aria-controls="collapse-button"
        className={`transition-all duration-300 ease-out ${
          isCollapsed ? 'overflow-hidden' : 'overflow-visible'
        } ${isCollapsed && isMobile ? 'collapsible-fade-bottom' : ''}`}
        style={{
          maxHeight: isCollapsed ? `${maxHeightMobile}px` : 'none',
        }}
      >
        {children}
      </div>

      {/* Expand/Collapse button */}
      {shouldShowButton && isMobile && (
        <button
          id="collapse-button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Mostrar menos' : 'Ler tudo'}
          className={`
            mt-3 inline-flex items-center gap-1.5 text-sm font-semibold
            text-[#A7846C] hover:text-[#A7846C]/80
            transition-colors duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7846C]/40 focus-visible:ring-offset-2
          `}
        >
          {isExpanded ? 'Mostrar menos' : 'Ler tudo'}
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
};

export default CollapsibleMessage;

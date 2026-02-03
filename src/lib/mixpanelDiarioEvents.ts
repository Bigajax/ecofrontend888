import mixpanel from './mixpanel';

// ========== PAGE LEVEL EVENTS ==========

interface DiarioPageViewProperties {
  source: 'direct' | 'hero_carousel' | 'explore_section' | 'post_meditation' | 'navigation';
  is_guest: boolean;
  user_id?: string;
  available_reflections: number;
  today_date: string;
  today_author: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
}

export function trackDiarioPageViewed(props: DiarioPageViewProperties) {
  mixpanel.track('Diario Estoico Viewed', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

interface DiarioPageExitProperties {
  time_spent_seconds: number;
  cards_expanded: number;
  reflections_viewed: string[];
  scrolled_to_bottom: boolean;
  exit_method: 'back_button' | 'navigation' | 'browser_close';
  is_guest: boolean;
  user_id?: string;
}

export function trackDiarioPageExited(props: DiarioPageExitProperties) {
  mixpanel.track('Diario Estoico Exited', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

// ========== CARD INTERACTION EVENTS ==========

interface DiarioCardViewedProperties {
  reflection_date: string;
  day_number: number;
  month: string;
  author: string;
  title: string;
  is_today: boolean;
  card_position: 'today' | 'yesterday' | '2_days_ago';
  is_guest: boolean;
  user_id?: string;
}

export function trackDiarioCardViewed(props: DiarioCardViewedProperties) {
  mixpanel.track('Diario Card Viewed', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

interface DiarioCardExpandedProperties {
  reflection_date: string;
  day_number: number;
  month: string;
  author: string;
  source?: string;
  has_comment: boolean;
  card_position: 'today' | 'yesterday' | '2_days_ago';
  time_to_expand_seconds: number;
  is_guest: boolean;
  user_id?: string;
}

export function trackDiarioCardExpanded(props: DiarioCardExpandedProperties) {
  mixpanel.track('Diario Card Expanded', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

interface DiarioCardCollapsedProperties {
  reflection_date: string;
  author: string;
  time_expanded_seconds: number;
  read_full_comment: boolean;
  is_guest: boolean;
  user_id?: string;
}

export function trackDiarioCardCollapsed(props: DiarioCardCollapsedProperties) {
  mixpanel.track('Diario Card Collapsed', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

// ========== NAVIGATION EVENTS ==========

export function trackDiarioEnteredFromCarousel(props: {
  carousel_video: string;
  today_title: string;
  is_guest: boolean;
  user_id?: string;
}) {
  mixpanel.track('Diario Entered from Carousel', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

export function trackDiarioEnteredFromExplore(props: {
  explore_position: number;
  is_guest: boolean;
  user_id?: string;
}) {
  mixpanel.track('Diario Entered from Explore', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

export function trackDiarioViewedPostMeditation(props: {
  meditation_id: string;
  meditation_completion: number;
  reflection_date: string;
  author: string;
  user_id: string;
}) {
  mixpanel.track('Diario Viewed Post Meditation', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

// ========== HELPER FUNCTIONS ==========

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function getCardPosition(dayNumber: number, todayNumber: number): 'today' | 'yesterday' | '2_days_ago' {
  const diff = todayNumber - dayNumber;
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return '2_days_ago';
}

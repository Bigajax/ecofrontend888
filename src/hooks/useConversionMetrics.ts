import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface UserDistribution {
  free: number;
  trial: number;
  essentials: number;
  premium: number;
  total: number;
}

export interface ConversionFunnel {
  guestVisits: number;
  signups: number;
  trialsStarted: number;
  paidConversions: number;
  guestToSignup: number; // %
  signupToTrial: number; // %
  trialToPaid: number; // %
}

export interface ConversionMetrics {
  userDistribution: UserDistribution;
  conversionFunnel: ConversionFunnel;
  churnRate: number;
  ltv: number;
  loading: boolean;
  error: string | null;
}

export interface ConversionTriggerStats {
  trigger_type: string;
  total_hits: number;
  conversions: number;
  conversion_rate: number;
}

export function useConversionMetrics() {
  const [metrics, setMetrics] = useState<ConversionMetrics>({
    userDistribution: {
      free: 0,
      trial: 0,
      essentials: 0,
      premium: 0,
      total: 0,
    },
    conversionFunnel: {
      guestVisits: 0,
      signups: 0,
      trialsStarted: 0,
      paidConversions: 0,
      guestToSignup: 0,
      signupToTrial: 0,
      trialToPaid: 0,
    },
    churnRate: 0,
    ltv: 0,
    loading: true,
    error: null,
  });

  const [triggerStats, setTriggerStats] = useState<ConversionTriggerStats[]>([]);

  useEffect(() => {
    fetchConversionMetrics();
  }, []);

  const fetchConversionMetrics = async () => {
    try {
      setMetrics((prev) => ({ ...prev, loading: true, error: null }));

      // 1. Fetch user distribution
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, subscription_status, subscription_plan');

      if (usersError) throw usersError;

      const distribution: UserDistribution = {
        free: 0,
        trial: 0,
        essentials: 0,
        premium: 0,
        total: users?.length || 0,
      };

      users?.forEach((user) => {
        const status = user.subscription_status || 'free';
        const plan = user.subscription_plan || 'free';

        if (status === 'trialing') {
          distribution.trial++;
        } else if (plan === 'essentials_monthly') {
          distribution.essentials++;
        } else if (plan === 'premium_monthly' || plan === 'premium_annual') {
          distribution.premium++;
        } else {
          distribution.free++;
        }
      });

      // 2. Fetch conversion funnel data
      // Note: This requires tracking guest visits and conversions
      // For now, we'll use placeholder logic based on available data
      const signups = distribution.total;
      const trialsStarted = distribution.trial + distribution.essentials + distribution.premium;
      const paidConversions = distribution.essentials + distribution.premium;

      const guestToSignup = 0; // TODO: Track guest visits
      const signupToTrial = signups > 0 ? (trialsStarted / signups) * 100 : 0;
      const trialToPaid = trialsStarted > 0 ? (paidConversions / trialsStarted) * 100 : 0;

      // 3. Calculate churn rate (simplified - last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: cancelledSubs, error: churnError } = await supabase
        .from('subscription_events')
        .select('id')
        .eq('event_type', 'subscription.cancelled')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (churnError) console.error('Churn error:', churnError);

      const totalPaid = distribution.essentials + distribution.premium;
      const churnRate = totalPaid > 0 ? ((cancelledSubs?.length || 0) / totalPaid) * 100 : 0;

      // 4. Calculate LTV (simplified)
      const avgMonthlyPrice = 24.9; // Weighted average
      const avgRetentionMonths = 10; // Assumed
      const ltv = avgMonthlyPrice * avgRetentionMonths;

      setMetrics({
        userDistribution: distribution,
        conversionFunnel: {
          guestVisits: 0, // TODO: Track via Mixpanel
          signups,
          trialsStarted,
          paidConversions,
          guestToSignup,
          signupToTrial,
          trialToPaid,
        },
        churnRate,
        ltv,
        loading: false,
        error: null,
      });

      // 5. Fetch conversion trigger stats (from Mixpanel events stored in DB)
      await fetchTriggerStats();
    } catch (error) {
      console.error('Error fetching conversion metrics:', error);
      setMetrics((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const fetchTriggerStats = async () => {
    try {
      // This would query a table that stores conversion trigger events
      // For now, returning empty array
      // TODO: Implement trigger tracking table
      setTriggerStats([]);
    } catch (error) {
      console.error('Error fetching trigger stats:', error);
    }
  };

  return {
    ...metrics,
    triggerStats,
    refetch: fetchConversionMetrics,
  };
}

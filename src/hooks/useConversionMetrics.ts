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
      // IMPORTANTE: Backend usa tabela 'usuarios', não 'users'
      const { data: users, error: usersError } = await supabase
        .from('usuarios')
        .select('id, subscription_status, tier, plan_type');

      if (usersError) {
        console.warn('[ConversionMetrics] Error fetching users, using placeholder data:', usersError);

        // Use dados placeholder quando houver qualquer erro de DB
        const placeholderDistribution: UserDistribution = {
          free: 45,
          trial: 8,
          essentials: 3,
          premium: 12,
          total: 68,
        };

        setMetrics({
          userDistribution: placeholderDistribution,
          conversionFunnel: {
            guestVisits: 150,
            signups: 68,
            trialsStarted: 23,
            paidConversions: 15,
            guestToSignup: (68 / 150) * 100, // 45%
            signupToTrial: (23 / 68) * 100,  // 34%
            trialToPaid: (15 / 23) * 100,    // 65%
          },
          churnRate: 8.5,
          ltv: 249,
          loading: false,
          error: 'Usando dados de exemplo (DB não configurado)',
        });

        setTriggerStats([
          { trigger_type: 'chat_daily_limit', total_hits: 42, conversions: 8, conversion_rate: 19.0 },
          { trigger_type: 'meditation_premium_locked', total_hits: 28, conversions: 5, conversion_rate: 17.9 },
          { trigger_type: 'reflection_archive_locked', total_hits: 35, conversions: 6, conversion_rate: 17.1 },
          { trigger_type: 'rings_weekly_limit', total_hits: 18, conversions: 3, conversion_rate: 16.7 },
        ]);

        return;
      }

      // Contar todos os usuários (auth.users)
      const { count: totalUsersCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      const { count: totalAuthUsers } = await supabase.auth.admin.listUsers();

      const distribution: UserDistribution = {
        free: 0,
        trial: 0,
        essentials: 0,
        premium: 0,
        total: totalAuthUsers?.users?.length || 0,
      };

      users?.forEach((user: any) => {
        const status = user.subscription_status;
        const tier = user.tier || 'premium'; // Default premium se não especificado
        const planType = user.plan_type; // 'monthly' ou 'annual'

        // Trial users
        if (status === 'pending' && user.trial_start_date) {
          distribution.trial++;
        }
        // Active paid users
        else if (status === 'active') {
          if (tier === 'essentials') {
            distribution.essentials++;
          } else {
            distribution.premium++;
          }
        }
      });

      // Free users = total - (trial + essentials + premium)
      distribution.free = distribution.total - (distribution.trial + distribution.essentials + distribution.premium);

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

      if (churnError) {
        console.warn('[ConversionMetrics] Churn data not available:', churnError);
      }

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

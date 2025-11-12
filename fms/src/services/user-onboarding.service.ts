import { supabase } from '../lib/supabase';

type StartOnboardingReason = 'user_created' | 'manual_retry' | 'admin_override';

interface StartOnboardingResponse {
  status: 'queued' | 'already_completed';
  correlation_id?: string;
}

export const userOnboardingService = {
  async startOnboarding(userId: string, reason: StartOnboardingReason = 'user_created'): Promise<StartOnboardingResponse> {
    try {
      const { data, error } = await supabase.functions.invoke<StartOnboardingResponse>('user-onboarding-request', {
        body: {
          user_id: userId,
          reason,
        },
      });

      if (error) {
        const message =
          (error as any)?.message ||
          (error as any)?.error ||
          'Failed to trigger onboarding webhook';
        throw new Error(message);
      }

      return data || { status: 'queued' };
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to trigger onboarding webhook');
    }
  },
};


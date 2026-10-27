import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { PlanType, ReferralState } from '../types/api';
import { generatePlan, qk } from './endpoints';

// Ortak "plan oluştur" akışı (anket sonu, ana sayfa, planlarım):
//   referral → /yonlendirme (state: ReferralState) · created → /planlar/:id (onay ekranı)
// Hata (422 uygun egzersiz yok, 502/504 öneri hatası) mutation.error'da kalır; çağıran gösterir.
export function useGeneratePlan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: PlanType) => generatePlan(type),
    onSuccess: (result) => {
      if (result.outcome === 'referral') {
        const state: ReferralState = { riskLevel: result.riskLevel, reasons: result.reasons };
        navigate('/yonlendirme', { state });
        return;
      }
      queryClient.invalidateQueries({ queryKey: qk.plans });
      navigate(`/planlar/${result.plan.id}`);
    },
  });
}

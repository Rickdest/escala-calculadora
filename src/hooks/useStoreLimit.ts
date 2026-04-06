import { useSubscription } from '@/contexts/SubscriptionContext';
import { useStore } from '@/contexts/StoreContext';
import { PLAN_STORE_LIMITS } from '@/constants/pricing';

export function useStoreLimit() {
  const { plan, isActive } = useSubscription();
  const { stores } = useStore();

  const effectivePlan = isActive ? plan : 'free';
  const limit = PLAN_STORE_LIMITS[effectivePlan] ?? 0;
  const canAddStore = stores.length < limit;
  const isAtLimit = stores.length >= limit;

  return { limit, canAddStore, isAtLimit, storeCount: stores.length };
}

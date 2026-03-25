import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { ShopeeTab } from '@/components/calculators/ShopeeTab';
import { TikTokTab } from '@/components/calculators/TikTokTab';
import { SheinTab } from '@/components/calculators/SheinTab';
import { AmazonTab } from '@/components/calculators/AmazonTab';
import { MLTab } from '@/components/calculators/MLTab';

type TabKey = 'shopee' | 'tiktok' | 'shein' | 'amazon' | 'ml';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'shopee', label: 'Shopee' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'shein', label: 'Shein' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'ml', label: 'Mercado Livre' },
];

const TAB_COMPONENTS: Record<TabKey, () => JSX.Element> = {
  shopee: ShopeeTab,
  tiktok: TikTokTab,
  shein: SheinTab,
  amazon: AmazonTab,
  ml: MLTab,
};

export default function Calculators() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = rawTab && TAB_COMPONENTS[rawTab] ? rawTab : 'shopee';

  const setTab = useCallback((tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <AppLayout>
      <PageHeader title="Calculadoras" subtitle="Compare custos entre marketplaces" showStoreSelector={false} />

      <div className="py-4 space-y-5 max-w-4xl mx-auto">
        {/* Tab bar */}
        <div className="flex gap-1 rounded-[10px] bg-surface-2 border border-border p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 px-2 py-2 text-[12px] font-semibold rounded-lg transition-all text-center',
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-2 hover:text-foreground hover:bg-background/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <ActiveComponent />
      </div>
    </AppLayout>
  );
}

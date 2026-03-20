import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoasAnalysis } from '@/components/charts/RoasAnalysis';

export default function Roas() {
  return (
    <AppLayout>
      <PageHeader title="Ads" subtitle="Análise de anúncios e ROAS" />
      <div className="px-4 py-4 md:px-0 md:py-6">
        <RoasAnalysis />
      </div>
    </AppLayout>
  );
}

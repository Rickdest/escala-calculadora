import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoasAnalysis } from '@/components/charts/RoasAnalysis';

export default function Roas() {
  return (
    <AppLayout>
      <PageHeader title="Ads" subtitle="Análise de anúncios e ROAS" />
      <div className="py-4 md:py-8">
        <RoasAnalysis />
      </div>
    </AppLayout>
  );
}

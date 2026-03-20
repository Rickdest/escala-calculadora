import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoasAnalysis } from '@/components/charts/RoasAnalysis';

export default function Roas() {
  return (
    <AppLayout>
      <PageHeader title="ROAS" subtitle="Análise de retorno sobre Ads" />
      <div className="px-4 py-4 md:px-6 md:py-6">
        <RoasAnalysis />
      </div>
    </AppLayout>
  );
}

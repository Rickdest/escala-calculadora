import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoasAnalysis } from '@/components/charts/RoasAnalysis';
import { toast } from 'sonner';

export default function Roas() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('shopee_connected') === 'true') {
      toast.success('Loja Shopee conectada com sucesso!');
      searchParams.delete('shopee_connected');
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get('shopee_error')) {
      toast.error('Erro ao conectar com a Shopee. Tente novamente.');
      searchParams.delete('shopee_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <AppLayout>
      <PageHeader title="Ads" subtitle="Análise de anúncios e ROAS" />
      <div className="py-1 md:py-8">
        <RoasAnalysis />
      </div>
    </AppLayout>
  );
}

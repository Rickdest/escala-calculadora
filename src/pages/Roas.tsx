import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoasAnalysis } from '@/components/charts/RoasAnalysis';
import { toast } from 'sonner';

const SHOPEE_ERROR_MESSAGES: Record<string, string> = {
  token_failed: 'Falha ao obter token da Shopee. Tente novamente.',
  no_admin: 'Nenhum administrador encontrado para vincular a loja.',
  missing_params: 'Parâmetros de callback incompletos da Shopee.',
  wrong_sign: 'Assinatura inválida. Verifique as credenciais da Shopee.',
  unknown: 'Erro desconhecido ao conectar com a Shopee.',
};

export default function Roas() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('shopee_connected') === 'true') {
      toast.success('Loja Shopee conectada com sucesso!');
      searchParams.delete('shopee_connected');
      setSearchParams(searchParams, { replace: true });
    }
    const shopeeError = searchParams.get('shopee_error');
    if (shopeeError) {
      const msg =
        SHOPEE_ERROR_MESSAGES[shopeeError] ||
        `Erro ao conectar com a Shopee: ${shopeeError}`;
      toast.error(msg);
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

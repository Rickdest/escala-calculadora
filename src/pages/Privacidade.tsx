import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/auth" className="p-2 -ml-2 rounded-lg hover:bg-surface-2 transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold">Política de Privacidade</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-text-2">
        <p className="text-xs text-text-3">Última atualização: 20 de abril de 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Dados que coletamos</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Cadastro:</strong> nome, email, senha (armazenada com hash).</li>
            <li><strong className="text-foreground">Negócio:</strong> dados de produtos, lojas, custos, vendas e anúncios que você adiciona ou importa.</li>
            <li><strong className="text-foreground">Integrações:</strong> tokens de acesso da Shopee (criptografados em repouso) e dados de leitura das suas lojas conectadas.</li>
            <li><strong className="text-foreground">Pagamento:</strong> email da assinatura (recebido via Cakto). Não armazenamos cartões.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Como usamos</h2>
          <p>Os dados são usados exclusivamente para operar a Skalify: calcular margens, gerar análises, controlar acesso por assinatura e dar suporte. Não vendemos dados. Não compartilhamos com terceiros para fins de marketing.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Onde ficam guardados</h2>
          <p>Os dados ficam armazenados em infraestrutura na nuvem (Supabase) com Row Level Security ativa: cada usuário só acessa os próprios registros. Conexões usam HTTPS. Tokens da Shopee são protegidos com regras de acesso restritas a admin no banco.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Seus direitos (LGPD)</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Acessar e exportar seus dados.</li>
            <li>Corrigir informações cadastrais.</li>
            <li>Excluir sua conta - todos os dados pessoais e de negócio são removidos.</li>
            <li>Desconectar integrações - os dados sincronizados da integração são removidos imediatamente.</li>
          </ul>
          <p>Para exercer qualquer direito: <span className="text-foreground">privacidade@skalify.com.br</span>.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Cookies e armazenamento local</h2>
          <p>Usamos localStorage do navegador para manter sessão e preferências de UI. Não usamos cookies de rastreamento de terceiros.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Retenção</h2>
          <p>Mantemos os dados enquanto a conta estiver ativa. Após exclusão da conta, os dados são removidos em até 30 dias dos sistemas de produção.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Contato do encarregado (DPO)</h2>
          <p>privacidade@skalify.com.br</p>
        </section>
      </main>
    </div>
  );
}

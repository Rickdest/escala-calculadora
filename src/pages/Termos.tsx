import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Termos() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/auth" className="p-2 -ml-2 rounded-lg hover:bg-surface-2 transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold">Termos de Uso</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-text-2">
        <p className="text-xs text-text-3">Última atualização: 20 de abril de 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Aceitação</h2>
          <p>Ao criar uma conta na Skalify você aceita estes Termos de Uso e a nossa Política de Privacidade. Se não concordar, não utilize o serviço.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. O serviço</h2>
          <p>A Skalify é uma ferramenta de cálculo de margem, ROAS e análise de produtos para sellers de marketplaces (Shopee, Mercado Livre, Amazon, TikTok Shop, Shein). Os cálculos são baseados nos dados informados pelo usuário e nos dados importados das integrações conectadas.</p>
          <p>A integração com a Shopee é estritamente <strong className="text-foreground">somente leitura</strong>: nunca alteramos preços, estoques ou anúncios na sua conta.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Conta e responsabilidades</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Você é responsável pelas credenciais da sua conta e por toda atividade realizada por ela.</li>
            <li>Você se compromete a fornecer dados verdadeiros no cadastro.</li>
            <li>É proibido usar a Skalify para fins ilegais, automações abusivas ou tentativas de violar a segurança da plataforma.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Assinatura e pagamentos</h2>
          <p>O acesso aos recursos pagos depende de assinatura ativa. Pagamentos são processados pela Cakto. O cancelamento pode ser feito a qualquer momento e o acesso permanece ativo até o fim do período pago.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Limitações</h2>
          <p>Os cálculos e análises são fornecidos "como estão" e servem como apoio à decisão. A Skalify não se responsabiliza por decisões de precificação ou investimento em mídia tomadas com base nos relatórios.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Encerramento</h2>
          <p>Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar sua conta a qualquer momento entrando em contato pelo suporte.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Contato</h2>
          <p>Dúvidas: suporte@skalify.com.br</p>
        </section>
      </main>
    </div>
  );
}

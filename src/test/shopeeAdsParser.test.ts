import { describe, expect, it } from 'vitest';
import { parseShopeeAdsCSV } from '@/lib/shopeeAdsParser';

const generalCsv = `Relatório de Todos os Anúncios CPC - Shopee Brasil
Nome de Usuário,rbs.bras
Nome da loja,RBS BRAS
ID da Loja,885263049
Data de Criação do Relatório,23/03/2026 20:24
Período,23/02/2026 - 23/03/2026

#,Nome do Anúncio,Status,Tipos de Anúncios,ID do produto,Criativo,Método de Lance,Posicionamento,Palavra-chave/Localização,Tipo de combinação,Data de Início,Data de Encerramento,Impressões,Cliques,CTR,Conversões,Conversões Diretas,Taxa de Conversão,Taxa de Conversão Direta,Custo por Conversão,Custo por Conversão Direta,Itens Vendidos,Itens Vendidos Diretos,GMV,Receita direta,Despesas,ROAS,ROAS Direto,ACOS,ACOS Direto,Impressões do Produto,Cliques de Produtos,CTR do Produto
1,Cropped Corset,Em Andamento,Anúncio de Produto Automático,23698878923,-,GMV Max - Meta de ROAS,Todos,Selecionado Automaticamente,-,10/03/2026 00:00:00,Ilimitado,191888,9374,4.89%,122,121,1.30%,1.29%,4.70,4.74,125,124,6213.50,6185.60,573.15,10.84,10.79,9.22%,9.27%,-,-,-
2,Vestido Zoe,Em Andamento,Anúncio de Produto Automático,22594887260,-,GMV Max - Meta de ROAS,Todos,Selecionado Automaticamente,-,10/03/2026 00:00:00,Ilimitado,78745,1795,2.28%,22,22,1.23%,1.23%,4.84,4.84,24,24,908.84,908.84,106.49,8.53,8.53,11.72%,11.72%,-,-,-`;

const productCsv = `Relatório de Anúncios de Produto - Shopee Brasil
Nome de Usuário,rbs.bras
Nome da loja,RBS BRAS
ID da Loja,885263049
Nome do Produto / Anúncio,Vestido Zoe
ID do Produto,22594887260
,
Data de Criação do Relatório,23/03/2026 20:25
Período,23/02/2026 - 23/03/2026

Lance Automático
#,Palavra-chave/Localização,Tipo de combinação,Consulta de pesquisa,Método de Lance,Posicionamento,Impressões,Cliques,CTR,Conversões,Conversões Diretas,Taxa de Conversão,Taxa de Conversão Direta,Custo por Conversão,Custo por Conversão Direta,Itens Vendidos,Itens Vendidos Diretos,GMV,Receita direta,Despesas,Posicionamento Médio,ROAS,ROAS Direto,ACOS,ACOS Direto
1,Selecionado Automaticamente,-,-,GMV Max - Meta de ROAS,Todos,78745,1795,2.28%,22,22,1.23%,1.23%,4.84,4.84,24,24,908.84,908.84,106.49,28,8.53,8.53,11.72%,11.72%`;

describe('parseShopeeAdsCSV', () => {
  it('classifica CSV geral corretamente e retorna todos os produtos', () => {
    const parsed = parseShopeeAdsCSV(generalCsv);

    expect(parsed?.format).toBe('general');
    expect(parsed?.metrics).toHaveLength(2);
    expect(parsed?.metrics[0].shopeeProductId).toBe('23698878923');
    expect(parsed?.metrics[1].shopeeProductId).toBe('22594887260');
  });

  it('classifica CSV por produto corretamente e extrai a posição média', () => {
    const parsed = parseShopeeAdsCSV(productCsv);

    expect(parsed?.format).toBe('product');
    expect(parsed?.metrics).toHaveLength(1);
    expect(parsed?.metrics[0].avgPosition).toBe(28);
  });
});

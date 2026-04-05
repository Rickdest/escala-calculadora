export function calcOrganicoVsAds(vendas_pago: number, ads_gmv: number | null | undefined) {
  if (!ads_gmv) {
    return {
      total_receita: vendas_pago,
      organico_receita: vendas_pago,
      ads_receita: 0,
      pct_organico: 100,
      pct_ads: 0,
    };
  }

  const ads_receita = Math.min(ads_gmv, vendas_pago);
  const organico_receita = Math.max(0, vendas_pago - ads_receita);

  return {
    total_receita: vendas_pago,
    organico_receita,
    ads_receita,
    pct_organico: vendas_pago > 0 ? (organico_receita / vendas_pago) * 100 : 0,
    pct_ads: vendas_pago > 0 ? (ads_receita / vendas_pago) * 100 : 0,
  };
}

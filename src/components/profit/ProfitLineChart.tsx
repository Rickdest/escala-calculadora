import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { ProfitLine } from '@/lib/profitAnalysis';

interface Props {
  lines: ProfitLine[];
  mode: 'timeline' | 'per-sku';
}

function fmtBRLShort(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return `R$ ${v.toFixed(0)}`;
}
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProfitLineChart({ lines, mode }: Props) {
  const data = useMemo(() => {
    const arr = lines.map((l) => ({
      label: l.label,
      Vendas: Number(l.revenue.toFixed(2)),
      Lucro: Number(l.profit.toFixed(2)),
      Custo: l.cost,
      Taxa: l.fees,
      Impostos: l.taxes,
      Margem: l.margin,
    }));
    if (mode === 'per-sku') {
      return arr.sort((a, b) => b.Vendas - a.Vendas).slice(0, 15);
    }
    return arr;
  }, [lines, mode]);

  if (data.length === 0) return null;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: string) => (v && v.length > 12 ? v.slice(0, 12) + '…' : v)}
          />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtBRLShort} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: string) => {
              if (name === 'Margem') return [`${Number(value).toFixed(1)}%`, name];
              return [fmtBRL(Number(value)), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Vendas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Lucro" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

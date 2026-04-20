import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "lucide-react";
import type { SeasonalMonth } from "@/hooks/useProductTrend";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface SeasonalCycleChartProps {
  cycle: SeasonalMonth[];
}

export function SeasonalCycleChart({ cycle }: SeasonalCycleChartProps) {
  if (cycle.length < 6) return null;

  // Normaliza pra ter os 12 meses
  const fullCycle = Array.from({ length: 12 }, (_, i) => {
    const found = cycle.find((c) => c.month === i + 1);
    return {
      month: MONTH_NAMES[i],
      monthNum: i + 1,
      avg: found?.avg ?? 0,
      samples: found?.samples ?? 0,
    };
  });

  const peak = Math.max(...fullCycle.map((c) => c.avg));
  const currentMonth = new Date().getMonth() + 1;

  const peakMonths = fullCycle
    .filter((c) => c.avg >= peak * 0.85 && c.avg > 0)
    .map((c) => c.month);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <p className="section-label">Ciclo sazonal — média por mês</p>
        </div>
        <span className="text-micro text-muted-foreground">Histórico 5 anos</span>
      </div>
      <p className="text-micro text-muted-foreground mb-3">
        {peakMonths.length > 0 ? (
          <>Picos em <span className="text-foreground font-semibold">{peakMonths.join(", ")}</span></>
        ) : (
          "Sem padrão sazonal claro"
        )}
      </p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={fullCycle} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: number, _: string, item: { payload?: { samples?: number } }) => [
                `${v} (média de ${item?.payload?.samples ?? 0} anos)`,
                "Interesse",
              ]}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {fullCycle.map((c) => (
                <Cell
                  key={c.monthNum}
                  fill={
                    c.monthNum === currentMonth
                      ? "hsl(var(--primary))"
                      : c.avg >= peak * 0.85
                        ? "hsl(var(--primary) / 0.6)"
                        : "hsl(var(--primary) / 0.25)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-2 text-micro text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span>Mês atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
          <span>Pico</span>
        </div>
      </div>
    </div>
  );
}

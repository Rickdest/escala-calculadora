import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';

export function MarginDistributionChart() {
  const { currentStore, getStoreStats } = useStore();
  
  const stats = currentStore ? getStoreStats(currentStore) : null;
  
  if (!stats || stats.totalProducts === 0) return null;

  const data = [
    { name: 'Acima da Meta', value: stats.productsAboveTarget, color: 'hsl(152, 70%, 42%)' },
    { name: 'Abaixo da Meta', value: stats.productsBelowTarget, color: 'hsl(0, 85%, 60%)' },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="font-bold text-sm mb-4">Distribuição de Margem</h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopProductsChart() {
  const { currentStore, calculateProduct } = useStore();
  
  const data = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    
    return currentStore.products
      .map(p => ({
        name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
        margem: parseFloat(calculateProduct(p, currentStore.config).realMargin.toFixed(1)),
        isAbove: calculateProduct(p, currentStore.config).isAboveTarget,
      }))
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 5);
  }, [currentStore, calculateProduct]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <h3 className="font-bold text-sm mb-4">Top 5 Margens</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={80} 
              tick={{ fontSize: 11 }} 
            />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, 'Margem']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="margem" 
              radius={[0, 6, 6, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfitSummaryChart() {
  const { currentStore, calculateProduct } = useStore();
  
  const data = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    
    return currentStore.products
      .map(p => {
        const calc = calculateProduct(p, currentStore.config);
        return {
          name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
          lucro: parseFloat(calc.netProfit.toFixed(2)),
          isPositive: calc.netProfit >= 0,
        };
      })
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 6);
  }, [currentStore, calculateProduct]);

  if (data.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="glass-card p-5">
      <h3 className="font-bold text-sm mb-4">Lucro por Produto</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }} 
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(v) => formatCurrency(v)}
              width={60}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Lucro']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="lucro" 
              radius={[6, 6, 0, 0]}
              fill="hsl(var(--success))"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

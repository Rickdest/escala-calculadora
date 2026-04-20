import { MapPin } from "lucide-react";
import type { RegionEntry } from "@/hooks/useProductTrend";

interface RegionsBreakdownProps {
  regions: RegionEntry[];
}

export function RegionsBreakdown({ regions }: RegionsBreakdownProps) {
  if (regions.length === 0) return null;
  const top = regions.slice(0, 8);
  const max = Math.max(...top.map((r) => r.value), 1);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-primary" />
        <p className="section-label">Onde mais procuram</p>
      </div>
      <p className="text-micro text-muted-foreground mb-3">
        Top estados por interesse de busca
      </p>
      <div className="space-y-2">
        {top.map((r, i) => {
          const pct = (r.value / max) * 100;
          return (
            <div key={`${r.region}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground truncate">
                  <span className="text-micro text-muted-foreground/60 font-mono mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {r.region}
                </span>
                <span className="font-mono text-micro text-muted-foreground shrink-0">
                  {r.value}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

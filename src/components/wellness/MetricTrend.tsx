type Point = { date: string; value: number | null | undefined };

export function MetricTrend({ points, color = "#13c8cb", target, unit, compact = false }: { points: Point[]; color?: string; target?: number; unit?: string; compact?: boolean }) {
  const readings = points.filter((point): point is { date: string; value: number } => typeof point.value === "number");
  if (!readings.length) return <div className={`flex items-center justify-center rounded-2xl bg-steel/5 text-sm text-muted ${compact ? "h-16" : "h-40"}`}>No readings yet</div>;

  const values = readings.map((point) => point.value);
  const min = Math.min(...values, ...(target === undefined ? [] : [target]));
  const max = Math.max(...values, ...(target === undefined ? [] : [target]));
  const span = Math.max(max - min, 1);
  const height = compact ? 58 : 150;
  const width = 320;
  const padding = compact ? 5 : 14;
  const coords = readings.map((point, index) => ({
    x: readings.length === 1 ? width / 2 : padding + (index / (readings.length - 1)) * (width - padding * 2),
    y: padding + ((max - point.value) / span) * (height - padding * 2),
  }));
  const path = coords.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const targetY = target === undefined ? null : padding + ((max - target) / span) * (height - padding * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Trend${unit ? ` in ${unit}` : ""}`}>
        {!compact && <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="currentColor" className="text-steel/15" />}
        {targetY !== null && <line x1={padding} x2={width - padding} y1={targetY} y2={targetY} stroke={color} strokeDasharray="5 5" opacity=".42" />}
        <path d={path} fill="none" stroke={color} strokeWidth={compact ? 3 : 4} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={compact ? 2.5 : 4} fill="var(--color-panel)" stroke={color} strokeWidth="2.5" />)}
      </svg>
      {!compact && <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted"><span>{readings[0].date.slice(5).replace("-", "/")}</span><span>{target === undefined ? `${readings.length} readings` : `Target ${target}${unit ? ` ${unit}` : ""}`}</span><span>{readings.at(-1)?.date.slice(5).replace("-", "/")}</span></div>}
    </div>
  );
}

/**
 * Trend Calculator Utility for Coal Hauling KPI Charts
 * Calculates simple linear regression (least squares method) to plot trend lines
 * and determines whether the operational performance is trending UP (↗), DOWN (↘), or STABLE (↔).
 */

export interface TrendResult {
  trendValues: (number | null)[];
  slope: number;
  intercept: number;
  direction: "up" | "down" | "flat";
  slopeFormatted: string;
  label: string; // e.g. "Tren Naik ↗ (+12.2k T/mgg)" or "Tren Turun ↘ (-0.40 Jam/mgg)"
}

export function calculateLinearTrend(
  data: number[],
  options?: {
    excludeZeros?: boolean;
    unit?: string;
    subNote?: string; // e.g. "Efisien" or "Makin Hemat"
  }
): TrendResult {
  const excludeZeros = options?.excludeZeros ?? true;

  // Filter valid data points (x = index in array, y = metric value)
  const points: { x: number; y: number }[] = [];
  data.forEach((val, idx) => {
    if (val !== null && val !== undefined && (!excludeZeros || val > 0)) {
      points.push({ x: idx, y: val });
    }
  });

  const n = points.length;
  if (n < 2) {
    return {
      trendValues: data.map(() => null),
      slope: 0,
      intercept: 0,
      direction: "flat",
      slopeFormatted: "0",
      label: "Tren: Stabil ↔",
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const { x, y } = points[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return {
      trendValues: data.map(() => null),
      slope: 0,
      intercept: 0,
      direction: "flat",
      slopeFormatted: "0",
      label: "Tren: Stabil ↔",
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const minValidIdx = points[0].x;
  const maxValidIdx = points[n - 1].x;

  // Generate trend line points spanning the active range
  const trendValues = data.map((_, idx) => {
    if (idx < minValidIdx || idx > maxValidIdx) {
      return null;
    }
    const yVal = slope * idx + intercept;
    return Number(Math.max(0, yVal).toFixed(2));
  });

  const absSlope = Math.abs(slope);
  let direction: "up" | "down" | "flat" = "flat";
  // Slope threshold: 0.005
  if (slope > 0.005) {
    direction = "up";
  } else if (slope < -0.005) {
    direction = "down";
  }

  const slopeFormatted =
    absSlope >= 1000 ? `${(absSlope / 1000).toFixed(1)}k` : absSlope.toFixed(2);
  const arrow = direction === "up" ? "↗" : direction === "down" ? "↘" : "↔";
  const dirText = direction === "up" ? "Tren Naik" : direction === "down" ? "Tren Turun" : "Tren Stabil";
  const sign = direction === "up" ? "+" : direction === "down" ? "-" : "";
  const unit = options?.unit ? ` ${options.unit}` : "";
  const subNote = options?.subNote ? ` • ${options.subNote}` : "";

  const label =
    direction === "flat"
      ? `Tren: Stabil ↔${subNote}`
      : `${dirText} ${arrow} (${sign}${slopeFormatted}${unit}/mgg)${subNote}`;

  return {
    trendValues,
    slope,
    intercept,
    direction,
    slopeFormatted,
    label,
  };
}

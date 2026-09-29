"use client";

import { scoreTone } from "@/lib/utils";

export function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const tone = scoreTone(score);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const strokeColor =
    score >= 85 ? "#34d399" : score >= 70 ? "#38bdf8" : score >= 50 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={12}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${tone.text}`}>{score}</span>
        <span className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          {tone.label}
        </span>
      </div>
    </div>
  );
}

import React, { useMemo, useState, useRef } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "motion/react";
import { Vote } from "lucide-react";

interface DonutData {
  id: string;
  name: string;
  votes: number;
  percentage: number;
}

interface CandidateDonutChartProps {
  data: DonutData[];
  totalVotes: number;
}

export default function CandidateDonutChart({ data, totalVotes }: CandidateDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback if no votes are cast yet
  const chartData = useMemo(() => {
    if (totalVotes === 0) {
      return [{ id: "placeholder", name: "No Votes Cast", votes: 0, percentage: 100 }];
    }
    return data;
  }, [data, totalVotes]);

  // Academic / Classic Editorial Palette
  const colors = [
    "#7c6c4c", // Brand Gold/Bronze
    "#2e5b82", // Classic Deep Blue
    "#a38d72", // Muted Brass
    "#4e6852", // Vintage Sage
    "#94524a", // Terracotta Rust
    "#554e68", // Deep Violet Slate
    "#78909c", // Muted Steel Blue
    "#8c6f5e", // Soft Walnut
  ];

  const getColor = (index: number, id: string) => {
    if (id === "placeholder") return "var(--border)";
    return colors[index % colors.length];
  };

  const width = 220;
  const height = 220;
  const radius = Math.min(width, height) / 2;
  const thickness = 32;

  const pieGenerator = useMemo(() => {
    return d3
      .pie<DonutData | { id: string; name: string; votes: number; percentage: number }>()
      .value((d) => (d.id === "placeholder" ? 1 : d.votes))
      .sort(null);
  }, []);

  const arcs = useMemo(() => {
    return pieGenerator(chartData);
  }, [chartData, pieGenerator]);

  const arcGenerator = d3
    .arc<d3.PieArcDatum<any>>()
    .innerRadius(radius - thickness)
    .outerRadius(radius)
    .cornerRadius(0) // Sharp brutalist corners
    .padAngle(totalVotes > 0 ? 0.03 : 0);

  const hoveredArcGenerator = d3
    .arc<d3.PieArcDatum<any>>()
    .innerRadius(radius - thickness - 4)
    .outerRadius(radius + 4)
    .cornerRadius(0)
    .padAngle(totalVotes > 0 ? 0.03 : 0);

  const activeDetail = useMemo(() => {
    if (hoveredIndex !== null) {
      return chartData[hoveredIndex];
    }
    if (totalVotes > 0 && data.length > 0) {
      return data[0];
    }
    return null;
  }, [hoveredIndex, chartData, data, totalVotes]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col sm:flex-row items-center justify-center gap-8 bg-[var(--surface)] border border-[var(--border)] p-6 font-mono text-[var(--ink)]"
      id="candidate-donut-container"
    >
      {/* Chart Section */}
      <div className="relative w-[220px] h-[220px]" id="donut-svg-wrapper">
        <svg width={width} height={height} className="overflow-visible">
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {arcs.map((arc, idx) => {
              const isHovered = hoveredIndex === idx;
              const pathGenerator = isHovered ? hoveredArcGenerator : arcGenerator;
              const dPath = pathGenerator(arc);
              const segmentColor = getColor(idx, arc.data.id);

              return (
                <path
                  key={arc.data.id}
                  d={dPath || ""}
                  fill={segmentColor}
                  className="transition-all duration-300 ease-out cursor-pointer outline-none"
                  onMouseEnter={() => arc.data.id !== "placeholder" && setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    filter: isHovered
                      ? `drop-shadow(0 0 12px ${segmentColor}44)`
                      : "none",
                    opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Dynamic Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          <AnimatePresence mode="wait">
            {activeDetail && activeDetail.id !== "placeholder" ? (
              <motion.div
                key={activeDetail.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-0.5 max-w-[130px]"
              >
                <span className="text-[9px] font-bold text-[rgba(26,26,24,0.45)] uppercase tracking-wider block">
                  {hoveredIndex !== null ? "SELECTED" : "LEADING"}
                </span>
                <p className="text-xs font-bold text-[var(--ink)] truncate uppercase">
                  {activeDetail.name.split(" ")[0]}
                </p>
                <p className="text-lg font-mono font-bold text-[var(--accent)] leading-none pt-0.5">
                  {activeDetail.percentage}%
                </p>
                <p className="text-[10px] text-[rgba(26,26,24,0.45)] font-bold">
                  {activeDetail.votes} {activeDetail.votes === 1 ? "VOTE" : "VOTES"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-1"
              >
                <div className="mx-auto text-[rgba(26,26,24,0.4)] flex justify-center">
                  <Vote size={18} />
                </div>
                <span className="text-[9px] font-bold text-[rgba(26,26,24,0.45)] uppercase tracking-wider block">
                  TOTAL VOTES
                </span>
                <p className="text-lg font-mono font-bold text-[var(--ink)] leading-none">
                  {totalVotes}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend Section */}
      <div className="flex-1 w-full space-y-3" id="donut-chart-legend">
        <h4 className="text-[9px] font-bold text-[rgba(26,26,24,0.45)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">
          BALLOT DISTRIBUTION
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {chartData.map((item, idx) => {
            if (item.id === "placeholder") {
              return (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <div className="h-2 w-2 bg-[var(--border)] shrink-0" />
                  <span className="text-[10px] text-[rgba(26,26,24,0.4)] italic font-bold">NO RECORDED VOTES</span>
                </div>
              );
            }

            const color = getColor(idx, item.id);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 text-[10px] py-0.5 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
                  transform: isHovered ? "translateX(4px)" : "none",
                }}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <div
                    className="h-2 w-2 shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: color,
                      boxShadow: isHovered ? `0 0 8px ${color}` : "none",
                      transform: isHovered ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                  <span className="text-[rgba(26,26,24,0.85)] font-bold truncate uppercase">{item.name}</span>
                </div>
                <span className="font-mono text-[var(--ink)] shrink-0 font-bold pl-1">
                  {item.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

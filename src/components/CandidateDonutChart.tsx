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
      // Return a single grey placeholder slice
      return [{ id: "placeholder", name: "No Votes Cast", votes: 0, percentage: 100 }];
    }
    return data;
  }, [data, totalVotes]);

  // Color Palette - Tailored modern premium colors matching the theme
  const colors = [
    "#8b5cf6", // Violet
    "#ec4899", // Pink/Fuchsia
    "#10b981", // Emerald
    "#f59e0b", // Amber/Gold
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#3b82f6", // Blue
    "#a855f7", // Purple
  ];

  const getColor = (index: number, id: string) => {
    if (id === "placeholder") return "rgba(255, 255, 255, 0.08)";
    return colors[index % colors.length];
  };

  const width = 220;
  const height = 220;
  const radius = Math.min(width, height) / 2;
  const thickness = 32;

  // Set up D3 Pie generator
  const pieGenerator = useMemo(() => {
    return d3
      .pie<DonutData | { id: string; name: string; votes: number; percentage: number }>()
      .value((d) => (d.id === "placeholder" ? 1 : d.votes))
      .sort(null);
  }, []);

  const arcs = useMemo(() => {
    return pieGenerator(chartData);
  }, [chartData, pieGenerator]);

  // Arc generators
  const arcGenerator = d3
    .arc<d3.PieArcDatum<any>>()
    .innerRadius(radius - thickness)
    .outerRadius(radius)
    .cornerRadius(6)
    .padAngle(totalVotes > 0 ? 0.03 : 0);

  const hoveredArcGenerator = d3
    .arc<d3.PieArcDatum<any>>()
    .innerRadius(radius - thickness - 4)
    .outerRadius(radius + 4)
    .cornerRadius(8)
    .padAngle(totalVotes > 0 ? 0.03 : 0);

  // Active detail info (either hovered slice or highest voted)
  const activeDetail = useMemo(() => {
    if (hoveredIndex !== null) {
      return chartData[hoveredIndex];
    }
    // Default to the first one (highest vote) if votes exist
    if (totalVotes > 0 && data.length > 0) {
      return data[0];
    }
    return null;
  }, [hoveredIndex, chartData, data, totalVotes]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col sm:flex-row items-center justify-center gap-8 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-inner"
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
                      ? `drop-shadow(0 0 12px ${segmentColor}66)`
                      : "none",
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-0.5 max-w-[130px]"
              >
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {hoveredIndex !== null ? "Selected" : "Leading"}
                </span>
                <p className="text-xs font-bold text-zinc-900 truncate">
                  {activeDetail.name.split(" ")[0]}
                </p>
                <p className="text-lg font-mono font-bold text-zinc-900 leading-none pt-0.5">
                  {activeDetail.percentage}%
                </p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  {activeDetail.votes} {activeDetail.votes === 1 ? "vote" : "votes"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-1"
              >
                <div className="mx-auto text-zinc-600 flex justify-center">
                  <Vote size={18} />
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Total Votes
                </p>
                <p className="text-lg font-mono font-bold text-zinc-700 leading-none">
                  {totalVotes}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend Section */}
      <div className="flex-1 w-full space-y-3" id="donut-chart-legend">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1.5">
          Ballot Distribution
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {chartData.map((item, idx) => {
            if (item.id === "placeholder") {
              return (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-100" />
                  <span className="text-xs text-zinc-500 font-medium italic">No recorded votes</span>
                </div>
              );
            }

            const color = getColor(idx, item.id);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 text-xs py-0.5 transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
                  transform: isHovered ? "translateX(4px)" : "none",
                }}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: color,
                      boxShadow: isHovered ? `0 0 8px ${color}` : "none",
                      transform: isHovered ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                  <span className="text-zinc-700 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-mono text-zinc-500 shrink-0 font-semibold pl-1">
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

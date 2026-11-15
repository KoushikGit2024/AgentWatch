/**
 * Pure SVG DAG Visualizer for Git Lanes and Continuous Connectors.
 * Faithfully implements Git Keizu's exact SVG path rendering algorithm:
 * - Straight line segments (L x2, y2)
 * - Cubic Bézier curves: C x1, y1 + C, x2, y2 - C, x2, y2 (where C = ROW_HEIGHT * 0.8)
 * - Distinct double-circle / hollow dot for Git Stashes (matching Keizu setStash)
 * Strictly adheres to AGENTS.md (< 500 LOC, no third-party engines).
 */
import React from 'react';

// Crisp, high-contrast Git Keizu branch colors
const LANE_COLORS = [
  '#0085d9', // Blue (main / primary)
  '#d9008f', // Magenta (branch 1)
  '#00d90a', // Green (branch 2)
  '#d98500', // Amber (branch 3)
  '#a300d9', // Purple (branch 4)
  '#ff0000', // Red (branch 5)
  '#00d9cc', // Cyan (branch 6)
  '#e138e8', // Pink (branch 7)
];

const LANE_WIDTH = 16;
const ROW_HEIGHT = 36;
const NODE_RADIUS = 4;
// Keizu curve control factor: rowHeight * 0.8
const CURVE_OFFSET = ROW_HEIGHT * 0.8;

export function GitGraphSvg({ commits, lines = [], selectedSha }) {
  if (!commits || commits.length === 0) return null;

  // Calculate max column (lane) across all commits and line points
  let maxLane = 0;
  commits.forEach(c => {
    if (c.lane > maxLane) maxLane = c.lane;
  });
  lines.forEach(l => {
    if (l.p1.x > maxLane) maxLane = l.p1.x;
    if (l.p2.x > maxLane) maxLane = l.p2.x;
  });

  const svgWidth = Math.max((maxLane + 1) * LANE_WIDTH + 14, 48);
  const svgHeight = commits.length * ROW_HEIGHT;

  return (
    <div
      className="relative flex-none select-none bg-[#141619]"
      style={{ width: `${svgWidth}px`, height: `${svgHeight}px` }}
    >
      <svg width={svgWidth} height={svgHeight} className="absolute inset-0 pointer-events-none">
        {/* Draw Continuous Keizu Line Paths */}
        {lines.map((seg, idx) => {
          const x1 = seg.p1.x * LANE_WIDTH + 12;
          const y1 = seg.p1.y * ROW_HEIGHT + ROW_HEIGHT / 2;
          const x2 = seg.p2.x * LANE_WIDTH + 12;
          const y2 = seg.p2.y * ROW_HEIGHT + ROW_HEIGHT / 2;
          const color = LANE_COLORS[seg.color % LANE_COLORS.length];

          // 1. Straight vertical line segment
          if (x1 === x2) {
            return (
              <line
                key={`line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.9"
              />
            );
          }

          // 2. Exact Git Keizu Bézier curve calculation:
          // C x1, y1 + C, x2, y2 - C, x2, y2 (with C = ROW_HEIGHT * 0.8)
          // When lockedFirst is true (branching out), the curve maintains the origin x lane longer
          const cY1 = y1 + CURVE_OFFSET;
          const cY2 = y2 - CURVE_OFFSET;
          const pathData = seg.lockedFirst
            ? `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x1.toFixed(1)} ${cY1.toFixed(1)} C ${x1.toFixed(1)} ${cY1.toFixed(1)} ${x2.toFixed(1)} ${cY2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
            : `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${cY1.toFixed(1)} ${x2.toFixed(1)} ${cY2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;

          return (
            <path
              key={`curve-${idx}`}
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />
          );
        })}

        {/* Draw Commit Nodes (Circles) */}
        {commits.map((commit, rowIdx) => {
          const cx = commit.lane * LANE_WIDTH + 12;
          const cy = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const isSelected = commit.sha === selectedSha;
          const color = LANE_COLORS[(commit.color ?? commit.lane) % LANE_COLORS.length];

          return (
            <g key={`node-${commit.sha}`}>
              {/* Outer halo when selected */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 3}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}

              {/* Commit Dot vs Stash Hollow Node */}
              {commit.is_stash ? (
                <g>
                  {/* Outer circle matching branch color */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={NODE_RADIUS}
                    fill={color}
                    stroke="#141619"
                    strokeWidth="1"
                  />
                  {/* Inner hollow cutout circle matching background */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={NODE_RADIUS - 1.5}
                    fill="#141619"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                </g>
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={commit.is_head ? NODE_RADIUS + 1 : NODE_RADIUS}
                  fill={commit.is_head ? '#FFFFFF' : color}
                  stroke="#141619"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

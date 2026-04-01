import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PHASES = [
  { label: "Submitting to network...", duration: 15000 },
  { label: "Validators evaluating...", duration: 25000 },
  { label: "Comparing assessments (Equivalence Principle)...", duration: 20000 },
  { label: "Reaching consensus...", duration: 20000 },
  { label: "Consensus achieved!", duration: 0 },
];

const VALIDATOR_LABELS = [
  "Validator 1",
  "Validator 2",
  "Validator 3",
  "Validator 4",
  "Validator 5",
];

// Pentagon positions (center at 150,140, radius 100)
const NODE_POSITIONS = [
  { x: 150, y: 40 },   // top
  { x: 245, y: 108 },  // top-right
  { x: 209, y: 220 },  // bottom-right
  { x: 91, y: 220 },   // bottom-left
  { x: 55, y: 108 },   // top-left
];

export default function ConsensusAnimation() {
  const [phase, setPhase] = useState(0);
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [activeEdges, setActiveEdges] = useState<[number, number][]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Phase transitions
  useEffect(() => {
    if (elapsed < 15) {
      setPhase(0);
      setActiveNodes([0]);
    } else if (elapsed < 40) {
      setPhase(1);
      const nodeCount = Math.min(5, Math.floor((elapsed - 15) / 5) + 1);
      setActiveNodes(Array.from({ length: nodeCount }, (_, i) => i));
    } else if (elapsed < 60) {
      setPhase(2);
      setActiveNodes([0, 1, 2, 3, 4]);
      const progress = (elapsed - 40) / 20;
      const allEdges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
        [0, 2], [1, 3], [2, 4], [3, 0], [4, 1],
      ];
      setActiveEdges(allEdges.slice(0, Math.ceil(progress * allEdges.length)));
    } else if (elapsed < 80) {
      setPhase(3);
      setActiveNodes([0, 1, 2, 3, 4]);
      setActiveEdges([
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
        [0, 2], [1, 3], [2, 4], [3, 0], [4, 1],
      ]);
    } else {
      setPhase(4);
      setActiveNodes([0, 1, 2, 3, 4]);
    }
  }, [elapsed]);

  const isConsensusPhase = phase >= 3;
  const isDone = phase === 4;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <p className={`text-lg font-medium ${isDone ? "text-green-400" : "text-gray-300"}`}>
            {PHASES[phase].label}
          </p>
          <p className="text-xs text-gray-600 font-mono mt-1">{elapsed}s elapsed</p>
        </motion.div>
      </AnimatePresence>

      {/* Pentagon visualization */}
      <div className="relative w-[300px] h-[280px]">
        <svg viewBox="0 0 300 280" className="w-full h-full">
          {/* Edges */}
          {activeEdges.map(([a, b], i) => (
            <motion.line
              key={`edge-${a}-${b}`}
              x1={NODE_POSITIONS[a].x}
              y1={NODE_POSITIONS[a].y}
              x2={NODE_POSITIONS[b].x}
              y2={NODE_POSITIONS[b].y}
              stroke={isDone ? "#4ade80" : "#818cf8"}
              strokeWidth="1.5"
              strokeOpacity={0.4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
          ))}

          {/* Center pulse */}
          {isConsensusPhase && (
            <motion.circle
              cx={150}
              cy={140}
              r={isDone ? 30 : 20}
              fill="none"
              stroke={isDone ? "#4ade80" : "#818cf8"}
              strokeWidth="2"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {isDone && (
            <motion.text
              x={150}
              y={145}
              textAnchor="middle"
              fill="#4ade80"
              fontSize="24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              &#10003;
            </motion.text>
          )}

          {/* Validator nodes */}
          {NODE_POSITIONS.map((pos, i) => {
            const isActive = activeNodes.includes(i);
            const nodeColor = isDone
              ? "#4ade80"
              : isActive
              ? "#818cf8"
              : "#374151";
            return (
              <g key={i}>
                {/* Pulse ring for active nodes */}
                {isActive && !isDone && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={22}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="1"
                    animate={{
                      scale: [1, 1.5],
                      opacity: [0.5, 0],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                )}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={16}
                  fill={isActive ? nodeColor : "#0a0a12"}
                  stroke={nodeColor}
                  strokeWidth="2"
                  initial={false}
                  animate={{
                    fill: isActive ? nodeColor : "#0a0a12",
                    scale: isActive ? [1, 1.05, 1] : 1,
                  }}
                  transition={{ duration: 0.4 }}
                />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill={isActive ? "white" : "#6b7280"}
                >
                  V{i + 1}
                </text>
                {/* Label below node */}
                <text
                  x={pos.x}
                  y={pos.y + 32}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                  fontFamily="sans-serif"
                >
                  {VALIDATOR_LABELS[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Status details */}
      <div className="grid grid-cols-5 gap-2 text-center max-w-sm">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="text-xs">
            <div
              className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                activeNodes.includes(i)
                  ? isDone
                    ? "bg-green-400"
                    : "bg-accent"
                  : "bg-gray-700"
              }`}
            />
            <span className="text-gray-500 font-mono">
              {activeNodes.includes(i) ? (isDone ? "Done" : "Active") : "Idle"}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${isDone ? "bg-green-400" : "bg-accent"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (elapsed / 80) * 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

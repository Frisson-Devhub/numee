export function NetworkGraph({ gradientId = "auth-node" }: { gradientId?: string }) {
  const nodes = [
    { cx: 80, cy: 120, r: 8 },
    { cx: 200, cy: 80, r: 12 },
    { cx: 320, cy: 140, r: 6 },
    { cx: 150, cy: 220, r: 10 },
    { cx: 280, cy: 200, r: 8 },
    { cx: 100, cy: 300, r: 6 },
    { cx: 250, cy: 320, r: 10 },
    { cx: 380, cy: 100, r: 8 },
    { cx: 400, cy: 260, r: 6 },
  ];
  const lines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [1, 3], [0, 3], [3, 5], [5, 6], [4, 6], [2, 4], [1, 7], [7, 2], [4, 8], [7, 8],
  ];
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-40"
      viewBox="0 0 420 360"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {lines.map(([i, j], k) => (
        <line
          key={k}
          x1={nodes[i].cx}
          y1={nodes[i].cy}
          x2={nodes[j].cx}
          y2={nodes[j].cy}
          stroke="#7dd3fc"
          strokeWidth="1"
          opacity="0.6"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill={i === 1 || i === 3 ? `url(#${gradientId})` : "#7dd3fc"}
          opacity={i === 1 || i === 3 ? 0.95 : 0.7}
        />
      ))}
    </svg>
  );
}

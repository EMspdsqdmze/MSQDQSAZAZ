import { useEffect } from "react";

const PIECES = [
  ["#22c55e", 12, 18],
  ["#67e8f9", -18, 12],
  ["#86efac", 22, -16],
  ["#e5e7eb", -24, -18],
  ["#5ee0a0", 30, 20],
  ["#14b8a6", -32, 26],
  ["#a7f3d0", 18, -30],
  ["#38bdf8", -12, -34],
  ["#bbf7d0", 36, -8],
  ["#10b981", -38, 4],
  ["#06b6d4", 4, 36],
  ["#4ade80", -4, -42]
];

export default function CursorConfetti() {
  useEffect(() => {
    function moveConfetti(event) {
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    }

    window.addEventListener("pointermove", moveConfetti);
    return () => window.removeEventListener("pointermove", moveConfetti);
  }, []);

  return (
    <div className="cursorConfetti" aria-hidden="true">
      {PIECES.map(([color, x, y], index) => (
        <span
          key={`${color}-${index}`}
          className="confettiPiece"
          style={{
            "--piece-color": color,
            "--piece-x": `${x}px`,
            "--piece-y": `${y}px`,
            "--piece-rotate": `${index * 23}deg`
          }}
        />
      ))}
    </div>
  );
}

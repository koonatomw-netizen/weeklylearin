import { useEffect, useRef } from "react";
import { HALLOWEEN_ICONS, ICON_PALETTE, SITUATION_ICONS } from "../shared/pixelIcons";

const GRID = 12;

/** A situation's pixel-art icon, drawn from its 12x12 grid with crisp edges at any size. */
export function PixelIcon({ situationId, size = 72 }: { situationId: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rows = SITUATION_ICONS[situationId] ?? HALLOWEEN_ICONS[situationId];
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !rows) return;
    context.clearRect(0, 0, GRID, GRID);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const colour = ICON_PALETTE[ch];
      if (!colour) return;
      context.fillStyle = colour;
      context.fillRect(x, y, 1, 1);
    }));
  }, [rows]);
  if (!rows) return null;
  return <canvas ref={canvas} width={GRID} height={GRID} className="pixel-icon" style={{ width: size, height: size }} aria-hidden="true" />;
}

import { PixelIcon } from "./case/PixelIcon";

/** Pixel bats, a ghost and pumpkins around the edges of the join and participant screens. Purely decorative. */
export default function HalloweenDecor() {
  return <div className="hw-decor" aria-hidden="true">
    <span className="hw-bat hw-bat--1"><PixelIcon situationId="bat" size={44} /></span>
    <span className="hw-bat hw-bat--2"><PixelIcon situationId="bat" size={32} /></span>
    <span className="hw-bat hw-bat--3"><PixelIcon situationId="bat" size={38} /></span>
    <span className="hw-ghost"><PixelIcon situationId="ghost" size={64} /></span>
    <span className="hw-pumpkin hw-pumpkin--1"><PixelIcon situationId="pumpkin" size={64} /></span>
    <span className="hw-pumpkin hw-pumpkin--2"><PixelIcon situationId="pumpkin" size={44} /></span>
    <span className="hw-candy"><PixelIcon situationId="candy" size={40} /></span>
  </div>;
}

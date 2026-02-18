import { motion } from 'framer-motion'
import type { Song } from '../types'

interface TimelineProps {
  cards: Song[];
  faceUp?: boolean;
  onDropZoneClick?: (position: number) => void;
  showDropZones?: boolean;
  highlightPosition?: number | null;
  highlightCorrect?: boolean | null;
}

export default function Timeline({
  cards,
  faceUp = true,
  onDropZoneClick,
  showDropZones = false,
  highlightPosition,
  highlightCorrect,
}: TimelineProps) {
  const sorted = [...cards].sort((a, b) => a.year - b.year);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4 px-2 min-h-[120px] scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
      {sorted.length === 0 && showDropZones && (
        <DropZone
          position={0}
          onClick={onDropZoneClick}
          highlight={highlightPosition === 0}
          correct={highlightPosition === 0 ? highlightCorrect : null}
        />
      )}

      {sorted.map((card, i) => (
        <div key={card.id} className="flex items-center">
          {showDropZones && (
            <DropZone
              position={i}
              onClick={onDropZoneClick}
              highlight={highlightPosition === i}
              correct={highlightPosition === i ? highlightCorrect : null}
            />
          )}
          <SongCard card={card} faceUp={faceUp} />
        </div>
      ))}

      {sorted.length > 0 && showDropZones && (
        <DropZone
          position={sorted.length}
          onClick={onDropZoneClick}
          highlight={highlightPosition === sorted.length}
          correct={highlightPosition === sorted.length ? highlightCorrect : null}
        />
      )}
    </div>
  );
}

function SongCard({ card, faceUp }: { card: Song; faceUp: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-28 h-20 sm:w-36 sm:h-24 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-2 shrink-0"
    >
      {faceUp ? (
        <>
          <p className="text-xs sm:text-sm font-medium text-center leading-tight line-clamp-2">
            {card.title}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 text-center line-clamp-1">
            {card.artist}
          </p>
          <p className="text-[10px] sm:text-xs text-purple-400 mt-0.5">{card.year}</p>
        </>
      ) : (
        <p className="text-2xl">🎵</p>
      )}
    </motion.div>
  );
}

function DropZone({
  position,
  onClick,
  highlight,
  correct,
}: {
  position: number;
  onClick?: (position: number) => void;
  highlight?: boolean;
  correct?: boolean | null;
}) {
  let borderColor = 'border-dashed border-gray-600 hover:border-purple-400';
  if (highlight && correct === true) borderColor = 'border-solid border-green-500 bg-green-500/10';
  if (highlight && correct === false) borderColor = 'border-solid border-red-500 bg-red-500/10';

  return (
    <button
      onClick={() => onClick?.(position)}
      className={`w-11 h-20 sm:w-12 sm:h-24 border-2 rounded-lg shrink-0 transition-colors cursor-pointer touch-manipulation ${borderColor}`}
      aria-label={`Place card at position ${position}`}
    />
  );
}

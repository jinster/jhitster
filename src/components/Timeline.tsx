import { motion } from 'framer-motion'
import type { Song } from '../types'

interface TimelineProps {
  cards: Song[];
  faceUp?: boolean;
  onDropZoneClick?: (position: number) => void;
  showDropZones?: boolean;
  highlightPosition?: number | null;
  highlightCorrect?: boolean | null;
  pendingPosition?: number | null;
  tokenPositions?: Map<number, string>;
}

export default function Timeline({
  cards,
  faceUp = true,
  onDropZoneClick,
  showDropZones = false,
  highlightPosition,
  highlightCorrect,
  pendingPosition,
  tokenPositions,
}: TimelineProps) {
  const sorted = [...cards].sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:overflow-x-auto py-2 sm:py-4 px-2 min-h-[80px] sm:min-h-[120px] scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
      {sorted.length === 0 && showDropZones && (
        <DropZone
          position={0}
          onClick={onDropZoneClick}
          highlight={highlightPosition === 0}
          correct={highlightPosition === 0 ? highlightCorrect : null}
          pending={pendingPosition === 0}
          tokenPlayer={tokenPositions?.get(0)}
        />
      )}

      {sorted.map((card, i) => (
        <div key={card.id} className="flex flex-col sm:flex-row sm:items-center">
          {showDropZones && (
            <DropZone
              position={i}
              onClick={onDropZoneClick}
              highlight={highlightPosition === i}
              correct={highlightPosition === i ? highlightCorrect : null}
              pending={pendingPosition === i}
              tokenPlayer={tokenPositions?.get(i)}
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
          pending={pendingPosition === sorted.length}
          tokenPlayer={tokenPositions?.get(sorted.length)}
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
      className="w-full sm:w-36 h-16 sm:h-24 bg-gray-800 border border-gray-600 rounded-lg flex flex-row sm:flex-col items-center justify-between sm:justify-center p-2 sm:p-2 shrink-0"
    >
      {faceUp ? (
        <>
          <div className="flex-1 sm:flex-none min-w-0">
            <p className="text-sm sm:text-sm font-medium leading-tight line-clamp-1 sm:line-clamp-2 sm:text-center">
              {card.title}
            </p>
            <p className="text-xs text-gray-400 sm:mt-1 line-clamp-1 sm:text-center">
              {card.artist}
            </p>
          </div>
          <p className="text-sm sm:text-xs text-purple-400 sm:mt-0.5 font-semibold ml-2 sm:ml-0">{card.year}</p>
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
  pending,
  tokenPlayer,
}: {
  position: number;
  onClick?: (position: number) => void;
  highlight?: boolean;
  correct?: boolean | null;
  pending?: boolean;
  tokenPlayer?: string;
}) {
  let borderColor = 'border-dashed border-gray-600 hover:border-purple-400';
  if (tokenPlayer) borderColor = 'border-solid border-yellow-500 bg-yellow-500/10';
  if (pending) borderColor = 'border-solid border-purple-500 bg-purple-500/20';
  if (highlight && correct === true) borderColor = 'border-solid border-green-500 bg-green-500/10';
  if (highlight && correct === false) borderColor = 'border-solid border-red-500 bg-red-500/10';

  const isLocked = !!tokenPlayer;

  return (
    <button
      onClick={() => !isLocked && onClick?.(position)}
      className={`w-full h-12 sm:w-12 sm:h-24 border-2 rounded-lg shrink-0 transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} touch-manipulation flex items-center justify-center ${borderColor}`}
      aria-label={tokenPlayer ? `Position ${position} claimed by ${tokenPlayer}` : `Place card at position ${position}`}
      disabled={isLocked}
    >
      {tokenPlayer ? (
        <span className="text-xs font-bold text-yellow-400">{tokenPlayer[0]}</span>
      ) : (
        <span className="text-xs text-gray-500 sm:hidden">
          {pending ? 'Selected' : 'Tap to place here'}
        </span>
      )}
    </button>
  );
}

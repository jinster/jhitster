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
  remotePendingPosition?: number | null;
  lockedPosition?: number | null;
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
  remotePendingPosition,
  lockedPosition,
}: TimelineProps) {
  const sorted = [...cards].sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-0 gap-1 sm:overflow-x-auto py-2 sm:py-4 px-2 min-h-[80px] sm:min-h-[120px] scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
      {sorted.length === 0 && showDropZones && (
        <DropZone
          position={0}
          onClick={onDropZoneClick}
          highlight={highlightPosition === 0}
          correct={highlightPosition === 0 ? highlightCorrect : null}
          pending={pendingPosition === 0}
          tokenPlayer={tokenPositions?.get(0)}
          remotePending={remotePendingPosition === 0}
          locked={lockedPosition === 0}
        />
      )}

      {sorted.map((card, i) => {
        const sameYearAsPrev = i > 0 && sorted[i - 1].year === card.year;
        return (
          <div key={card.id} className="flex flex-col items-center sm:flex-row sm:items-center">
            {showDropZones && !sameYearAsPrev && (
              <DropZone
                position={i}
                onClick={onDropZoneClick}
                highlight={highlightPosition === i}
                correct={highlightPosition === i ? highlightCorrect : null}
                pending={pendingPosition === i}
                tokenPlayer={tokenPositions?.get(i)}
                remotePending={remotePendingPosition === i}
                locked={lockedPosition === i}
              />
            )}
            <SongCard card={card} faceUp={faceUp} />
          </div>
        );
      })}

      {sorted.length > 0 && showDropZones && (
        <DropZone
          position={sorted.length}
          onClick={onDropZoneClick}
          highlight={highlightPosition === sorted.length}
          correct={highlightPosition === sorted.length ? highlightCorrect : null}
          pending={pendingPosition === sorted.length}
          tokenPlayer={tokenPositions?.get(sorted.length)}
          remotePending={remotePendingPosition === sorted.length}
          locked={lockedPosition === sorted.length}
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
      className="w-full sm:w-44 h-24 sm:h-32 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-3 shrink-0"
    >
      {faceUp ? (
        <>
          <p className="text-2xl font-bold text-purple-400">{card.year}</p>
          <p className="text-xs font-medium leading-tight line-clamp-1 text-center mt-1">
            {card.title}
          </p>
          <p className="text-xs text-gray-400 line-clamp-1 text-center">
            {card.artist}
          </p>
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
  remotePending,
  locked,
}: {
  position: number;
  onClick?: (position: number) => void;
  highlight?: boolean;
  correct?: boolean | null;
  pending?: boolean;
  tokenPlayer?: string;
  remotePending?: boolean;
  locked?: boolean;
}) {
  let borderColor = 'border-dashed border-gray-600 hover:border-purple-400';
  if (locked) borderColor = 'border-solid border-red-800 bg-red-900/20 opacity-50';
  if (remotePending) borderColor = 'border-solid border-purple-400 animate-pulse bg-purple-400/10';
  if (tokenPlayer) borderColor = 'border-solid border-yellow-500 bg-yellow-500/10';
  if (pending) borderColor = 'border-solid border-purple-500 bg-purple-500/20';
  if (highlight && correct === true) borderColor = 'border-solid border-green-500 bg-green-500/10';
  if (highlight && correct === false) borderColor = 'border-solid border-red-500 bg-red-500/10';

  const isLocked = !!tokenPlayer || !!locked;

  return (
    <button
      onClick={() => !isLocked && onClick?.(position)}
      className={`w-full h-12 sm:w-14 sm:h-32 border-2 rounded-lg shrink-0 transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} touch-manipulation flex items-center justify-center ${borderColor}`}
      aria-label={locked ? `Position ${position} locked (active player's choice)` : tokenPlayer ? `Position ${position} claimed by ${tokenPlayer}` : `Place card at position ${position}`}
      disabled={isLocked}
    >
      {locked ? (
        <span className="text-xs font-bold text-red-500">X</span>
      ) : tokenPlayer ? (
        <span className="text-xs font-bold text-yellow-400">{tokenPlayer[0]}</span>
      ) : (
        <span className="text-xs text-gray-500 sm:hidden">
          {pending ? 'Selected' : 'Tap to place here'}
        </span>
      )}
    </button>
  );
}

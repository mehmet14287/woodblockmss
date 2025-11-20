import React from 'react';
import { BlockPiece as BlockPieceType } from '../types';

interface Props {
  piece: BlockPieceType;
  size?: 'sm' | 'md' | 'lg';
  customCellSize?: number;
  className?: string;
  onInteract?: (e: React.PointerEvent) => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
}

const BlockPiece: React.FC<Props> = ({ 
  piece, 
  size = 'md', 
  customCellSize,
  className = '', 
  onInteract, 
  isSelected,
  style
}) => {
  const cellSize = customCellSize || (size === 'sm' ? 12 : size === 'md' ? 20 : 32);
  const gap = 1;
  
  const rows = piece.shape.length;
  const cols = piece.shape[0].length;

  return (
    <div 
      className={`relative inline-block select-none touch-none transition-transform duration-75 ${isSelected ? 'brightness-110 drop-shadow-2xl z-50' : ''} ${className}`}
      style={{ 
        width: cols * cellSize + (cols - 1) * gap, 
        height: rows * cellSize + (rows - 1) * gap,
        ...style
      }}
      onPointerDown={onInteract}
    >
      {piece.shape.map((row, rowIndex) => (
        row.map((cell, colIndex) => {
          if (cell === 0) return null;
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`absolute rounded-sm border-white/20 border-t border-l shadow-sm ${piece.color}`}
              style={{
                width: cellSize,
                height: cellSize,
                top: rowIndex * (cellSize + gap),
                left: colIndex * (cellSize + gap),
                boxShadow: 'inset -2px -2px 2px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.3)'
              }}
            />
          );
        })
      ))}
    </div>
  );
};

export default BlockPiece;
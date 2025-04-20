import React, { useState, useEffect } from 'react';
import { Coordinate, CellState } from '../utils/probabilityCalculator';

interface Cell {
  state: CellState;
  shipId?: number;
}

interface Ship {
  id: number;
  length: number;
  positions: Coordinate[];
  hits: number;
  isSunk: boolean;
}

interface ShipPlacementProps {
  rows: number;
  cols: number;
  shipLengths: number[];
  onPlacementComplete: (ships: Ship[], board: Cell[][]) => void;
}

const ShipPlacement: React.FC<ShipPlacementProps> = ({
  rows,
  cols,
  shipLengths,
  onPlacementComplete,
}) => {
  // Initialize an empty board
  const createEmptyBoard = (): Cell[][] => {
    return Array(rows)
      .fill(null)
      .map(() => 
        Array(cols)
          .fill(null)
          .map(() => ({ state: 'empty' as CellState }))
      );
  };

  // Game state
  const [board, setBoard] = useState<Cell[][]>(createEmptyBoard());
  const [ships, setShips] = useState<Ship[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState<number>(0);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoveredCell, setHoveredCell] = useState<Coordinate | null>(null);

  // Initialize ships based on provided lengths
  useEffect(() => {
    const initialShips: Ship[] = shipLengths.map((length, index) => ({
      id: index + 1,
      length,
      positions: [],
      hits: 0,
      isSunk: false,
    }));
    
    setShips(initialShips);
  }, [shipLengths]);

  // Check if placement is valid
  const isValidPlacement = (
    shipLength: number, 
    startRow: number, 
    startCol: number, 
    isHorizontal: boolean
  ): boolean => {
    // Check if ship fits on the board
    if (isHorizontal) {
      if (startCol + shipLength > cols) return false;
    } else {
      if (startRow + shipLength > rows) return false;
    }
    
    // Check if placement overlaps with other ships
    for (let i = 0; i < shipLength; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;
      
      if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
      
      if (board[row][col].state !== 'empty') return false;
    }
    
    return true;
  };

  // Validate cell for current ship placement
  const validateCell = (row: number, col: number): boolean => {
    if (currentShipIndex >= ships.length) return false;
    
    const ship = ships[currentShipIndex];
    return isValidPlacement(ship.length, row, col, orientation === 'horizontal');
  };

  // Place ship on the board
  const placeShip = (row: number, col: number) => {
    if (currentShipIndex >= ships.length) return;
    
    const ship = ships[currentShipIndex];
    if (!isValidPlacement(ship.length, row, col, orientation === 'horizontal')) {
      return;
    }
    
    // Create ship positions
    const positions: Coordinate[] = [];
    for (let i = 0; i < ship.length; i++) {
      const shipRow = orientation === 'horizontal' ? row : row + i;
      const shipCol = orientation === 'horizontal' ? col + i : col;
      positions.push([shipRow, shipCol]);
    }
    
    // Update ship
    const updatedShip = {
      ...ship,
      positions,
    };
    
    const updatedShips = [...ships];
    updatedShips[currentShipIndex] = updatedShip;
    
    // Update board
    const newBoard = [...board];
    positions.forEach(([r, c]) => {
      newBoard[r][c] = {
        state: 'ship',
        shipId: ship.id,
      };
    });
    
    // Update state
    setShips(updatedShips);
    setBoard(newBoard);
    setCurrentShipIndex(currentShipIndex + 1);
  };

  // Toggle ship orientation
  const toggleOrientation = () => {
    setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };

  // Reset placement
  const resetPlacement = () => {
    setBoard(createEmptyBoard());
    setCurrentShipIndex(0);
    
    // Reset ships positions
    const resetShips = ships.map(ship => ({
      ...ship,
      positions: [],
    }));
    
    setShips(resetShips);
  };

  // Complete placement
  const completePlacement = () => {
    // Ensure all ships are placed
    if (currentShipIndex < ships.length) {
      alert(`Please place all ships before continuing. ${ships.length - currentShipIndex} ships left.`);
      return;
    }
    
    onPlacementComplete(ships, board);
  };

  // Handle cell hover for placement preview
  const handleCellHover = (row: number, col: number) => {
    setHoveredCell([row, col]);
  };

  // Get cell class name based on state
  const getCellClassName = (row: number, col: number): string => {
    const cell = board[row][col];
    let className = 'cell';
    
    if (cell.state === 'ship') {
      className += ' ship';
    }
    
    // Preview ship placement on hover
    if (hoveredCell && 
        currentShipIndex < ships.length && 
        row === hoveredCell[0] && 
        col === hoveredCell[1]) {
      const isValid = validateCell(row, col);
      className += isValid ? ' valid-placement' : ' invalid-placement';
      
      // Show ghost ship
      if (isValid) {
        const shipLength = ships[currentShipIndex].length;
        for (let i = 0; i < shipLength; i++) {
          const ghostRow = orientation === 'horizontal' ? row : row + i;
          const ghostCol = orientation === 'horizontal' ? col + i : col;
          
          if (ghostRow === row && ghostCol === col) continue; // Skip current cell
          
          if (ghostRow >= 0 && ghostRow < rows && ghostCol >= 0 && ghostCol < cols) {
            const ghostCell = document.querySelector(`.cell[data-row="${ghostRow}"][data-col="${ghostCol}"]`);
            if (ghostCell) {
              ghostCell.classList.add('ghost-ship');
            }
          }
        }
      }
    }
    
    return className;
  };

  return (
    <div className="ship-placement">
      <div className="placement-controls">
        <button onClick={toggleOrientation}>
          Rotate Ship ({orientation === 'horizontal' ? 'Horizontal' : 'Vertical'})
        </button>
        <button onClick={resetPlacement}>Reset</button>
      </div>
      
      <div className="placement-info">
        {currentShipIndex < ships.length ? (
          <div>
            <h3>Place your {ships[currentShipIndex].length}-cell ship</h3>
            <p>Ship {currentShipIndex + 1} of {ships.length}</p>
          </div>
        ) : (
          <div>
            <h3>All ships placed!</h3>
            <p>Click "Complete" to continue</p>
          </div>
        )}
      </div>
      
      <div className="board-container">
        <div className="board-header">
          <div className="corner-cell"></div>
          {Array(cols).fill(0).map((_, colIndex) => (
            <div key={colIndex} className="header-cell">
              {colIndex}
            </div>
          ))}
        </div>
        
        <div className="board-grid" style={{ gridTemplateColumns: `auto repeat(${cols}, 1fr)` }}>
          {Array(rows).fill(0).map((_, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {/* Row header with row index */}
              <div className="row-header">{rowIndex}</div>
              
              {/* Board cells */}
              {Array(cols).fill(0).map((_, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClassName(rowIndex, colIndex)}
                  data-row={rowIndex}
                  data-col={colIndex}
                  onClick={() => placeShip(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                  onMouseLeave={() => setHoveredCell(null)}
                ></div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="ships-preview">
        <h3>Your Fleet</h3>
        <div className="ships-list">
          {ships.map((ship, index) => (
            <div 
              key={ship.id} 
              className={`ship-item ${index === currentShipIndex ? 'current' : ''} ${ship.positions.length > 0 ? 'placed' : ''}`}
            >
              <div className="ship-visual">
                {Array(ship.length).fill(0).map((_, i) => (
                  <div key={i} className="ship-segment"></div>
                ))}
              </div>
              <div className="ship-info">
                Length: {ship.length}
                {ship.positions.length > 0 ? ' (Placed)' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button 
        className="complete-button"
        disabled={currentShipIndex < ships.length}
        onClick={completePlacement}
      >
        Complete
      </button>
    </div>
  );
};

export default ShipPlacement; 
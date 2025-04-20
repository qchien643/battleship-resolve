import React, { useState } from 'react';

interface GameSetupProps {
  onStartGame: (config: {
    gridSize: { rows: number; cols: number };
    shipLengths: number[];
    developerMode: boolean;
    difficulty: 'normal' | 'hard' | 'optimized';
  }) => void;
}

const DEFAULT_SHIP_CONFIGS = [
  [2, 3, 3, 4, 5], // Classic Battleship
  [2, 2, 3, 4, 5], // Variant 1
  [3, 3, 3, 3],    // Variant 2
  [2, 4, 5],       // Variant 3
];

const GameSetup: React.FC<GameSetupProps> = ({ 
  onStartGame 
}) => {
  const [rows, setRows] = useState<number>(10);
  const [cols, setCols] = useState<number>(10);
  const [shipConfig, setShipConfig] = useState<number[]>(DEFAULT_SHIP_CONFIGS[0]);
  const [customShips, setCustomShips] = useState<string>('');
  const [useCustomShips, setUseCustomShips] = useState<boolean>(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'normal' | 'hard' | 'optimized'>('optimized');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 5 && value <= 20) {
      setRows(value);
    }
  };

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 5 && value <= 20) {
      setCols(value);
    }
  };

  const handleConfigSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value);
    if (index >= 0 && index < DEFAULT_SHIP_CONFIGS.length) {
      setShipConfig(DEFAULT_SHIP_CONFIGS[index]);
      setUseCustomShips(false);
    } else if (index === DEFAULT_SHIP_CONFIGS.length) {
      setUseCustomShips(true);
    }
  };

  const handleCustomShipsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomShips(e.target.value);
  };

  const validateCustomShips = (): number[] | null => {
    // Parse the custom ships input into an array of numbers
    const ships = customShips
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseInt(s));

    // Validate all entries are numbers between 1 and 6
    if (ships.some(s => isNaN(s) || s < 1 || s > 6)) {
      alert('Ship lengths must be numbers between 1 and 6');
      return null;
    }

    // Check if we have at least one ship
    if (ships.length === 0) {
      alert('You must specify at least one ship');
      return null;
    }

    // Check if total ship length doesn't exceed grid size
    const totalShipLength = ships.reduce((sum, length) => sum + length, 0);
    if (totalShipLength > rows * cols * 0.5) { // Limit ships to 50% of grid
      alert(`Total ship length (${totalShipLength}) is too large for this grid size`);
      return null;
    }

    return ships;
  };

  const handleStartGame = () => {
    let isValid = true;
    
    // Parse custom ships if using them
    let finalShips = shipConfig;
    if (useCustomShips) {
      const parsedShips = validateCustomShips();
      if (!parsedShips) {
        isValid = false;
      } else {
        finalShips = parsedShips;
      }
    }
    
    // Check if grid size is valid
    if (rows < 5 || cols < 5) {
      setValidationError('Grid size must be at least 5x5');
      isValid = false;
    }
    
    // Clear validation error if valid
    if (isValid) {
      setValidationError(null);
      
      onStartGame({
        gridSize: {
          rows,
          cols
        },
        shipLengths: finalShips,
        developerMode,
        difficulty
      });
    }
  };

  return (
    <div className="game-setup">
      <h2>Battleship Predictor Setup</h2>
      
      <div className="setup-section">
        <h3>Grid Size</h3>
        <div className="input-group">
          <label>
            Rows (5-20):
            <input
              type="number"
              min="5"
              max="20"
              value={rows}
              onChange={handleRowsChange}
            />
          </label>
        </div>
        <div className="input-group">
          <label>
            Columns (5-20):
            <input
              type="number"
              min="5"
              max="20"
              value={cols}
              onChange={handleColsChange}
            />
          </label>
        </div>
      </div>

      <div className="setup-section">
        <h3>Ship Configuration</h3>
        <div className="input-group">
          <label>
            Select Ship Configuration:
            <select onChange={handleConfigSelect}>
              <option value="0">Classic: [2, 3, 3, 4, 5]</option>
              <option value="1">Variant 1: [2, 2, 3, 4, 5]</option>
              <option value="2">Variant 2: [3, 3, 3, 3]</option>
              <option value="3">Variant 3: [2, 4, 5]</option>
              <option value="4">Custom</option>
            </select>
          </label>
        </div>

        {useCustomShips && (
          <div className="input-group">
            <label>
              Custom Ship Lengths (comma-separated, e.g., "2,3,4,5"):
              <input
                type="text"
                value={customShips}
                onChange={handleCustomShipsChange}
                placeholder="e.g., 2,3,4,5"
              />
            </label>
            <div className="help-text">
              Each number represents the length of a ship. Valid lengths are 1-6.
            </div>
          </div>
        )}

        <div className="ship-preview">
          <h4>Current Ship Configuration:</h4>
          <div className="ships-display">
            {(useCustomShips 
              ? customShips.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s)) 
              : shipConfig
            ).map((length, index) => (
              <div key={index} className="ship-preview-item">
                <div className="ship-visual" style={{ width: `${length * 20}px` }}>
                  {Array(length).fill(0).map((_, i) => (
                    <div key={i} className="ship-segment"></div>
                  ))}
                </div>
                <div className="ship-length">Length: {length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="setup-section">
        <h3>Mode</h3>
        <div className="input-group">
          <label>
            <input 
              type="checkbox" 
              checked={developerMode} 
              onChange={() => setDeveloperMode(!developerMode)} 
            />
            Developer Mode (AI opponent with visible ships for testing)
          </label>
          <div className="help-text">
            In developer mode, the system will place ships randomly to test the algorithm.
            In normal mode, you'll play against a real opponent and provide hit/miss feedback.
          </div>
        </div>
      </div>

      {developerMode && (
        <div className="setup-section">
          <h3>AI Difficulty</h3>
          <div className="input-group">
            <label>
              Difficulty Level:
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'normal' | 'hard' | 'optimized')}
              >
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
                <option value="optimized">Optimized (Fewest Steps)</option>
              </select>
            </label>
            <div className="help-text">
              Optimized uses advanced prediction to find ships in the minimum number of guesses.
            </div>
          </div>
        </div>
      )}

      {validationError && (
        <div className="validation-error">
          Error: {validationError}
        </div>
      )}

      <button 
        className="start-game-button"
        onClick={handleStartGame}
      >
        Start Game
      </button>
    </div>
  );
};

export default GameSetup; 
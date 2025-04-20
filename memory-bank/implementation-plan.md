# Implementation Plan: Two-Player Battleship with Probability Mapping

## Phase 1: Project Setup and Core Components

### 1.1 Project Initialization
- Set up React + TypeScript project with Vite
- Configure ESLint and Prettier
- Set up project directory structure
- Install necessary dependencies

### 1.2 Data Models
- Create TypeScript interfaces for:
  - `Cell`: Represents a single cell on the board
  - `Board`: 2D array of cells
  - `Ship`: Ship properties and placement
  - `GameState`: Overall game state
  - `Player`: Player information
  - `ProbabilityMap`: Probability values for each cell

### 1.3 Core Game Logic
- Implement board generation with customizable dimensions
- Create ship factory with configurable lengths
- Develop ship placement validation
- Implement attack logic (hit/miss/sink detection)
- Create game state management

## Phase 2: Probability Calculation Algorithm

### 2.1 Ship Placement Generation
- Implement algorithm to generate all possible valid ship placements
- Account for board boundaries and existing hits/misses
- Filter placements based on known hit information

### 2.2 Probability Calculation
- For each cell, calculate:
  - Number of possible ship placements that include the cell
  - Total number of valid ship placements
  - Probability = placements_including_cell / total_valid_placements
- Optimize calculation for performance

### 2.3 Testing
- Create unit tests for probability calculations
- Verify accuracy with known test cases
- Benchmark performance and optimize if needed

## Phase 3: Game Flow and UI

### 3.1 Game Setup Component
- Create UI for specifying grid dimensions
- Implement ship length configuration
- Design player role selection

### 3.2 Ship Placement Interface
- Develop drag-and-drop or click-based ship placement
- Add rotation capability (horizontal/vertical)
- Implement placement validation visualization

### 3.3 Gameplay UI
- Create game boards display (player and opponent)
- Implement attack input mechanism
- Design feedback system for hits/misses/sinks
- Develop turn indicator

### 3.4 Probability Map Visualization
- Create heat map visualization for probability values
- Implement color gradient based on probability values
- Add legends and tooltips for clarity

## Phase 4: Game Management

### 4.1 Turn Sequence
- Implement turn-based gameplay
- Handle transitions between players
- Manage game state updates after each action

### 4.2 Victory Detection
- Track ship status for each player
- Implement win condition detection
- Create game over screen with restart option

### 4.3 State Persistence
- Add save/load functionality for in-progress games
- Implement local storage for game state

## Phase 5: Refinement and Polish

### 5.1 UI Enhancements
- Add animations for attacks and hits
- Implement responsive design for different screen sizes
- Create loading states and transitions

### 5.2 Accessibility
- Add keyboard navigation
- Implement screen reader support
- Add high contrast mode

### 5.3 Testing and Bug Fixes
- Conduct comprehensive testing
- Fix identified issues
- Optimize performance

## Pseudocode for Key Algorithms

### Ship Placement Validator
```typescript
function isValidPlacement(board, ship, startRow, startCol, isHorizontal):
  // Check if ship fits within board boundaries
  if (isHorizontal) {
    if (startCol + ship.length > boardWidth) return false
  } else {
    if (startRow + ship.length > boardHeight) return false
  }
  
  // Check if placement overlaps with other ships
  for (i from 0 to ship.length - 1) {
    let row = isHorizontal ? startRow : startRow + i
    let col = isHorizontal ? startCol + i : startCol
    
    if (board[row][col].state !== 'empty') return false
  }
  
  return true
```

### Probability Calculator
```typescript
function calculateProbabilities(board, remainingShips, hits, misses):
  let allPossiblePlacements = []
  let cellPlacementCount = initialize2DArray(boardHeight, boardWidth, 0)
  
  // Generate all possible placements for each remaining ship
  for (each ship in remainingShips) {
    let shipPlacements = generateValidPlacements(board, ship, hits, misses)
    allPossiblePlacements.push(shipPlacements)
  }
  
  // Count how many placements include each cell
  for (each shipPlacements in allPossiblePlacements) {
    for (each placement in shipPlacements) {
      for (each [row, col] in placement) {
        cellPlacementCount[row][col]++
      }
    }
  }
  
  // Calculate probability for each cell
  let totalPlacements = allPossiblePlacements.reduce((sum, placements) => sum + placements.length, 0)
  let probabilityMap = initialize2DArray(boardHeight, boardWidth, 0)
  
  for (row from 0 to boardHeight - 1) {
    for (col from 0 to boardWidth - 1) {
      probabilityMap[row][col] = cellPlacementCount[row][col] / totalPlacements
    }
  }
  
  return probabilityMap
```

### Generate Valid Placements
```typescript
function generateValidPlacements(board, ship, hits, misses):
  let validPlacements = []
  
  // Try all possible positions and orientations
  for (row from 0 to boardHeight - 1) {
    for (col from 0 to boardWidth - 1) {
      // Try horizontal placement
      if (isValidPlacement(board, ship, row, col, true)) {
        let placement = []
        for (i from 0 to ship.length - 1) {
          placement.push([row, col + i])
        }
        
        // Verify placement is consistent with known hits and misses
        if (isConsistentWithHitsMisses(placement, hits, misses)) {
          validPlacements.push(placement)
        }
      }
      
      // Try vertical placement
      if (isValidPlacement(board, ship, row, col, false)) {
        let placement = []
        for (i from 0 to ship.length - 1) {
          placement.push([row + i, col])
        }
        
        // Verify placement is consistent with known hits and misses
        if (isConsistentWithHitsMisses(placement, hits, misses)) {
          validPlacements.push(placement)
        }
      }
    }
  }
  
  return validPlacements
```

### Consistency Check
```typescript
function isConsistentWithHitsMisses(placement, hits, misses):
  // Check that all known hits are included in the placement
  for (each hit in hits) {
    if (!placement.some(pos => pos[0] === hit[0] && pos[1] === hit[1])) {
      return false
    }
  }
  
  // Check that no known misses are included in the placement
  for (each miss in misses) {
    if (placement.some(pos => pos[0] === miss[0] && pos[1] === miss[1])) {
      return false
    }
  }
  
  return true
```

## Timeline Estimation

- **Phase 1**: 1-2 weeks
- **Phase 2**: 2-3 weeks
- **Phase 3**: 2-3 weeks
- **Phase 4**: 1-2 weeks
- **Phase 5**: 1-2 weeks

Total estimated time: 7-12 weeks (depends on development resources and complexity) 
# Active Context

## Current Focus
The project is now focused on developing a two-player web-based Battleship game with probability mapping functionality. The key features include customizable grid size, configurable ship lengths, and turn-by-turn probability calculations.

## Recent Changes
- Created project repository
- Initialized memory bank documentation
- Defined project requirements and architecture
- Received detailed specifications for a two-player version with probability mapping

## Next Steps
1. Set up the basic project structure with React and TypeScript
2. Implement the game board component with customizable dimensions
3. Create the ship placement functionality
4. Develop the basic game state management
5. Implement the probability calculation algorithm for hit prediction
6. Create the turn-based gameplay mechanics
7. Design and implement the user interface

## Active Decisions

### Game Board Representation
- Grid size will be customizable (m×n)
- Should use a 2D array to represent the game board state
- Each cell will contain information about occupation, hits, and misses
- Visual representation will be separate from logical state

### Ship Configuration
- Ship lengths will be configurable (e.g., [2, 2, 3, 4, 5], [3, 3, 3, 3], [2, 4, 5])
- Ships may be placed horizontally or vertically
- Ships cannot overlap and must be placed within the board boundaries

### Probability Calculation
- After each shot, calculate and display a probability map for all remaining cells
- Base calculations on:
  - Current state of known hits and misses
  - Remaining ships and their possible placements
  - Algorithm as described in the GeeksforGeeks article on Battleship AI

### Game Flow
- Players take turns firing at opponent's grid by specifying coordinates
- After each shot, display hit/miss feedback and update probability map
- Game ends when one player sinks all opponent's ships

## Current Challenges
- Implementing an efficient probability calculation algorithm
- Designing a clear visual representation of the probability map
- Creating an intuitive interface for ship placement
- Managing game state between two players

## Development Priorities
1. Core game mechanics and state management
2. Probability calculation algorithm
3. Ship placement interface
4. Turn-based gameplay with feedback
5. Probability map visualization
6. Victory detection and game reset 
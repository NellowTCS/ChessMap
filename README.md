# ChessMap

> This is a progressively loaded map of every chess possibility, ever.

ChessMap is a small interactive web app that visualizes chess move trees. It combines a playable chessboard with a pan/zoomable move tree sidebar so you can explore legal continuations from any position, expand variations, and copy the current game's PGN. 

## Features
- Interactive chessboard (read-only by default) showing the current position.
- Move tree sidebar that lists legal moves from the current position as expandable nodes.
- Pan and zoom the move tree viewport (drag to pan, scroll to zoom, buttons for zoom).
- Expand/collapse individual nodes, expand all/collapse all.
- Reset board, undo last move, copy current game history as PGN (with fallbacks).
- Game status and metadata (turn, moves played, tree depth).
- Simple sorting of move lists to bring more interesting moves (captures, checks, mates) first.

## Dependencies
- chess.js (imported from CDN in main.js)
- chessboard2 (CSS and JS imported from CDN in index.html)

## How to use
- Click a move node in the move tree to play that line on the board.
- If a node is expandable, click it to load its child moves (variations).
- Use the pan hint: "Drag to pan • Scroll to zoom". Drag the tree area to pan, scroll to zoom, or use the + and - zoom buttons at the bottom-right.
- Controls:
  - Reset: reset the board and move the tree to the start position.
  - Undo: undo the last played move (works with the current replayed game line).
  - Copy PGN: copy the current game moves as a PGN string. If copying to the clipboard fails, a fallback attempt is used.
- Keyboard shortcuts (Cmd on Mac or Ctrl on other OSes):
  - `Ctrl/Cmd + Z`: Undo
  - `Ctrl/Cmd + R`: Reset
  - `Ctrl/Cmd + C`: Copy PGN (only when moves have been played)

## Contributing
- Contributions are welcome. Open issues or pull requests for bug reports, improvements, or features.

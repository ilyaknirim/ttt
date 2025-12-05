# TODO: Automate Tic-Tac-Toe Turns and Update Documentation

## Information Gathered
- Tic-Tac-Toe game as Telegram Mini App, saves state in URL for sharing.
- Currently requires manual page refresh after each move to see opponent's turn.
- Need to implement real-time updates using Firebase Realtime Database for seamless multiplayer experience.
- Documentation needs rewriting to remove refresh step and clarify automated play.
- Additional analysis: Partial Firebase integration exists, but issues with hardcoded 3x3 win patterns, sharing via board/player params instead of gameId, no push to Firebase on moves, loadGameFromURL not synced with Firebase.

## Plan
- Integrate Firebase Realtime Database for real-time game state synchronization.
- Generate unique game IDs for each session to enable shared state.
- Update game logic to listen for and push changes to Firebase.
- Modify sharing mechanism to include game ID in URL.
- Rewrite README "How to play" section to reflect automated turns.
- **app.js updates:**
  - Declare global gameId and gameRef variables.
  - Make checkWinner() generate dynamic winPatterns for any boardWidth/height (3-in-a-row).
  - Update loadGameFromURL() to load gameId from URL, set myPlayer, setup Firebase listener if gameId present.
  - Update startGameBtn to generate gameId only if not loaded, set myPlayer='X', push initial state to Firebase.
  - Update shareBtn to include gameId and opponent player in URL.
  - Add push to Firebase in handleCellClick() after move.
  - Update newGameBtn to reset state and push to Firebase.
  - Update renderBoard() to set grid styles dynamically.
- **README.md updates:**
  - Rewrite "How to play" section to describe real-time play without refresh.

## Dependent Files to be Edited
- `index.html`: Add Firebase SDK script tag. (Already done)
- `app.js`: Initialize Firebase, add game ID generation, sync board/currentPlayer/gameActive to Firebase, listen for updates.
- `README.md`: Update "How to play" section to remove refresh step and describe real-time play.

## Followup Steps
- Test real-time updates between two browser instances.
- Verify functionality within Telegram Mini App.
- Ensure game ID sharing works correctly.
- Update any additional documentation if needed.

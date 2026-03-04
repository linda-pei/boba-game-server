- Try to keep styling and more general components more consistent between the games. Use the themed variables where possible.
- Build shared components for more global navigation (Back to Lobby, etc.) and make them reused between games
- Ensure pages support dark mode.
- For larger changes, plan things out before making it
- When adding new games, also add it to the README

## Button classes
- Default (no class): Primary actions (Start Game, Guess, Confirm). Blue (`--accent-primary`).
- `btn-secondary`: Supporting/neutral actions (Join, Scout, abilities). Green (`--accent-secondary`).
- `btn-danger`: Destructive/negative actions (Leave, End Game, Cancel, "I don't have it"). Red outline (`--accent-danger`).
- Destructive actions should have confirmation (two-step click or modal) when they can't be undone.

## Card selection from hand
- Use `game-card` class (div, not button) with a `.selected` class for visual feedback.
- Toggle behavior: click to select, click again to deselect.
- The `.game-card` class provides hover lift + border highlight; `.selected` adds accent background tint + glow.
- See Things in Rings `PlayerTurn.tsx` and Order Overload `PlayingPhase.tsx` for reference.

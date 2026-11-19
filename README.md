# ⚽ MAYHEM CUP — Funny Football

A chaotic, arcade-style football game for 1–6 players, playable in the browser. Teams are 4 players plus a goalkeeper. It has exaggerated captains, rubber-chicken missiles, electrified fences, cows wandering onto the pitch and screen-shaking super strikes.

Everything is drawn and synthesized in code. There are no image or audio assets and no build step.

## Play

Open `index.html` in a modern browser. Double-clicking the file works; serving the folder works too (for example `python3 -m http.server`).

Click the page or press any key to enable sound.

## Controls

|              | Move         | Pass / Switch | Shoot (hold to charge) | Tackle / Juke | Item          |
|--------------|--------------|---------------|------------------------|---------------|---------------|
| Keyboard 1   | `W A S D`    | `F` or `J`    | `G`, `K` or `Space`    | `H` or `L`    | `R` or `I`    |
| Keyboard 2   | Arrows       | `,` / Num1    | `.` / Num2             | `/` / Num3    | `'` / Num0    |
| Gamepad      | Stick / D-pad| A             | B (or RT)              | X (or LT)     | Y / RB        |
| Touch        | Drag left side | PASS        | SHOOT                  | TACKLE        | ITEM          |

`Esc` / `P` / Start pauses the game, `N` mutes and `M` toggles the music.

Up to 4 gamepads and 2 keyboard players can play at once. On the **Who's Playing?** screen, each player moves their controller left or right to join a team. That covers versus, co-op against the CPU, and CPU-vs-CPU.

## How it plays

- **Shooting:** shots always aim at the goal. Hold the stick up or down to pick a corner. A longer charge gives a harder shot.
- **Super Strikes:** fully charge with your **captain** near the opponent's goal. A ring then shrinks toward a green circle. Release when they line up to trigger a cinematic, near-unstoppable special:
  - Brick's **Meteor Mash** boulder flattens everyone in its path.
  - Zara's **Zig-Zag Zapper** zig-zags on lightning.
  - Nana's **Knitting Needle Nightmare** splits into three balls of yarn.
  - El Chunko's **Piledriver Punt** drops from the sky.
  - Professor Fizz's **Quantum Kick** teleports.
  - Sir Reggie's **Tea-Time Torpedo** bends in a huge curve.
  - Disco Dan's **Boogie Blaster** makes the keeper dance.
  - Cap'n Barnacle's **Cannonball Catastrophe** fires from a cannon.
- **One-timers:** press Shoot while a pass is coming to you for an instant **PERFECT** volley.
- **Tackles:** slide into the ball carrier to win the ball. If you flatten someone who doesn't have the ball, it's a **CHEAP SHOT** and their team gets a free power-up.
- **Juke:** press Tackle while you have the ball to spin away from defenders.
- **Power-ups:** grab the `?` crates. Your team can hold two:
  - 🍌 **Banana:** dropped behind you; whoever steps on it spins out.
  - 🐔 **Rubber Chicken:** a homing missile.
  - 💣 **Bomb:** thrown ahead; the blast hits both teams.
  - 🌶️ **Turbo Chili:** fire feet that knock opponents over.
  - 🥤 **Mega Milkshake:** you grow huge and flatten whoever you touch.
  - ❄️ **Freeze Ray:** turns nearby rivals to ice.
  - 🔬 **Shrink Ray:** makes the whole rival team tiny.
  - 🐝 **Angry Bees:** chase down the ball carrier.
- **Catch-up:** the team that concedes a goal gets an item.

## Stadiums

| Stadium | Walls | Hazard |
|---|---|---|
| The Thunderdome | Electric fence (players tackled into it are shown as skeletons) | Lightning strikes |
| Mount Kaboom | Lava rock (burnt to a crisp) | Meteor showers |
| Frostbite Fjord | Snowbanks, on an ice pitch | Sliding penguin stampedes |
| Moo Meadow | Bouncy hay bales | Cows that wander on and refuse to move |
| Cosmo Station 9 | Force field, with low gravity | Alien abductions |

## Code layout

| File | What it holds |
|---|---|
| `js/data.js` | Captains, stadiums, items and commentary lines |
| `js/audio.js` | WebAudio sound effects and the music sequencer |
| `js/input.js` | Keyboard, gamepad and touch input combined per device |
| `js/draw.js` | Drawing helpers and the procedural characters and ball |
| `js/game.js` | Match simulation: physics, AI, keepers, items, hazards, super strikes |
| `js/render.js` | Stadium, crowd, pitch, entities, effects and HUD |
| `js/main.js` | Menus, pause, results screen and the main loop |

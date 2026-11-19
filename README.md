# 🍛⚽ JOLLOF CUP: Africa's Most Ridiculous Football Tournament

A chaotic, arcade-style football game for 1–6 players, playable in the browser. Teams are 4 players plus a goalkeeper, led by larger-than-life captains from across Africa.

Everything is drawn and synthesized in code, including the Afrobeats / amapiano soundtrack and the vuvuzelas. There are no image or audio assets and no build step.

**Play online:** https://dgtechbuilder.github.io/funnyfootballgame/

## Play locally

Open `index.html` in a modern browser. Double-clicking the file works; serving the folder works too (for example `python3 -m http.server`).

Click the page once to enable sound.

## Controls

### Mouse

Every menu is fully clickable: buttons, captains, stadiums and option arrows. Click a captain or stadium once to select it, then click it again (or press **NEXT**) to confirm. Every screen also has **BACK** / **NEXT** buttons. During a match, a pause button appears in the top-left corner.

### Keyboard and controllers

|              | Move           | Pass / Switch | Shoot (hold to charge) | Tackle / Juke | Item        |
|--------------|----------------|---------------|------------------------|---------------|-------------|
| Keyboard 1   | `W A S D`      | `F` or `J`    | `G`, `K` or `Space`    | `H` or `L`    | `R` or `I`  |
| Keyboard 2   | Arrows         | `,` / Num1    | `.` / Num2             | `/` / Num3    | `'` / Num0  |
| Xbox         | Stick / D-pad  | A             | B / RT                 | X / LT        | Y / RB      |
| PlayStation  | Stick / D-pad  | ✕             | ○ / R2                 | □ / L2        | △ / R1      |
| Switch / 8BitDo | Stick / D-pad | B           | A / ZR                 | Y / ZL        | X / R       |
| Touch        | Drag left side | PASS          | SHOOT                  | TACKLE        | ITEM        |

`Esc` / `P` / Start pauses the game, `N` mutes and `M` toggles the music.

### Supported controllers

Up to 4 controllers plus 2 keyboard players can play at once. The game detects the controller family and shows that controller's own button labels:

- **Xbox:** 360, One and Series
- **PlayStation:** DualShock 3/4 and DualSense
- **Nintendo:** Switch Pro and Joy-Con
- **8BitDo**
- **Logitech:** F310/F710, in both XInput and DirectInput mode
- **Steam Controller / Steam Deck**
- **Phone controllers:** Backbone, Razer Kishi, GameSir
- **Retro USB / SNES-style pads:** DragonRise and similar
- **Any other generic USB or Bluetooth gamepad**

Browsers that report the standard layout work immediately. For browsers and drivers that don't (Firefox, Safari, DirectInput), built-in profiles handle the common pads, including D-pads that report as a single "hat" axis.

If a controller's buttons are still wrong, open **🎮 CONTROLLERS** from the title screen or the Who's Playing? screen. There you can:

- test every button live;
- run a 9-step **REMAP** wizard (or hold any button on the pad for 2 seconds to start it);
- test **RUMBLE**.

Custom mappings are saved in your browser for that controller. Rumble feedback on tackles, shots, goals and super strikes can be switched off under Match Rules.

## The captains

| Captain | From | Super Strike |
|---|---|---|
| Oga Dayo Danfo | 🇳🇬 Nigeria | **Danfo Dash:** the ball becomes a yellow Lagos bus |
| Kip "The Wind" Kiprotich | 🇰🇪 Kenya | **Rift Valley Lightning:** zig-zag lightning |
| Auntie Ama Jollof | 🇬🇭 Ghana | **Jollof Triple Threat:** splits into three balls of jollof |
| Uncle Hamada | 🇪🇬 Egypt | **Pyramid Punt:** drops from the sky |
| Doctor Wahala | 🇨🇲 Cameroon | **Wahala Warp:** teleports |
| Madame Fatou Ataya | 🇸🇳 Senegal | **Ataya Twister:** a huge curve with a teapot |
| Sipho Vuvuzela | 🇿🇦 South Africa | **Amapiano Blast:** the keeper can't stop dancing |
| Ranger Juma | 🇹🇿 Tanzania | **Kilimanjaro Cannon:** fired from a cannon |

## Stadiums

| Stadium | Walls | Hazard |
|---|---|---|
| Lagos Power Arena | Electric fence (players tackled into it are shown as skeletons) | Lightning, and NEPA power cuts that black out the pitch |
| Nyiragongo Bowl | Lava rock | Meteor showers |
| Kilimanjaro Summit | Snowbanks, on an ice pitch | Penguins from Cape Town who took a wrong turn |
| Maasai Mara Savannah | Thorn bushes that bounce you back | Elephants, giraffes and zebras |
| Sahara Oasis | Sand dunes, on a slow sandy pitch | Camel caravans |
| Afronaut Launchpad | Force field, with low gravity | Alien abductions |

## How it plays

- **Shooting:** shots always aim at the goal. Hold the stick up or down to pick a corner. A longer charge gives a harder shot.
- **Super Strikes:** fully charge with your **captain** near the opponent's goal, then release when the shrinking ring lines up with the green circle.
- **One-timers:** press Shoot while a pass is coming to you for an instant **PERFECT** volley.
- **Tackles:** slide into the ball carrier to win the ball. If you flatten someone who doesn't have the ball, it's a **CHEAP SHOT** and their team gets a free power-up.
- **Juke:** press Tackle while you have the ball to spin away from defenders.
- **Power-ups:** grab the `?` crates:
  - 🍌 **Plantain Peel:** dropped behind you; whoever steps on it spins out.
  - 🐔 **Market Chicken:** a homing chicken.
  - 🥥 **Coconut Bomb:** thrown ahead; the blast hits both teams.
  - 🌶️ **Scotch Bonnet:** fire feet that knock opponents over.
  - 🍩 **Puff-Puff Power:** you grow huge and flatten whoever you touch.
  - ❄️ **Harmattan Freeze:** turns nearby rivals to ice.
  - 🧪 **Tiny Tonic:** makes the whole rival team tiny.
  - 🐝 **Killer Bees:** chase down the ball carrier.

## Code layout

| File | What it holds |
|---|---|
| `js/data.js` | Captains, stadiums, items, names and commentary |
| `js/audio.js` | WebAudio sound effects, vuvuzelas and the Afrobeats sequencer |
| `js/input.js` | Keyboard, mouse, touch and gamepads: family detection, raw profiles, hat D-pads, custom remaps, rumble |
| `js/draw.js` | Drawing helpers and the procedural characters and ball |
| `js/game.js` | Match simulation: physics, AI, keepers, items, hazards, super strikes |
| `js/render.js` | Stadiums, crowd, pitch, entities, effects and HUD |
| `js/main.js` | Clickable menus, controller setup and remap wizard, pause, results, and the main loop |

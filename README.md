# ⚽🏆 MONATE CUP: Africa's Most Ridiculous Football Tournament

*"Monate" means fun (also nice, enjoyable) in Sesotho, Setswana and Sepedi.*

A chaotic, arcade-style football game, seen from a low, side-on broadcast camera, for 1–6 players, playable in the browser. Teams are 4 players plus a goalkeeper, led by larger-than-life captains from across Africa. The characters are chunky, rounded-block figures in the spirit of Roblox avatars, but softer and less boxy.

Everything is drawn and synthesized in code, including the Afrobeats / amapiano soundtrack and the vuvuzelas. There are no image or audio assets and no build step.

**Play online:** https://dgtechbuilder.github.io/funnyfootballgame/

## Play locally

Open `index.html` in a modern browser. Double-clicking the file works; serving the folder works too (for example `python3 -m http.server`).

Click the page once to enable sound.

## Controls

### Mouse

Every menu is fully clickable: buttons, captains, stadiums and option arrows. Click a captain or stadium once to select it, then click it again (or press **NEXT**) to confirm. Every screen also has **BACK** / **NEXT** buttons. During a match, a pause button appears in the top-left corner.

### Keyboard and controllers

|              | Move           | Pass / Switch | Shoot (hold to charge) | Tackle / Juke | Item        | Power      |
|--------------|----------------|---------------|------------------------|---------------|-------------|------------|
| Keyboard 1   | `W A S D`      | `F` or `J`    | `G`, `K` or `Space`    | `H` or `L`    | `R` or `I`  | `Q` or `U` |
| Keyboard 2   | Arrows         | `,` / Num1    | `.` / Num2             | `/` / Num3    | `'` / Num0  | `;` / Num4 |
| Xbox         | Stick / D-pad  | A             | B / RT                 | X / LT        | Y / RB      | LB         |
| PlayStation  | Stick / D-pad  | ✕             | ○ / R2                 | □ / L2        | △ / R1      | L1         |
| Switch / 8BitDo | Stick / D-pad | B           | A / ZR                 | Y / ZL        | X / R       | L          |
| Touch        | Drag left side | PASS          | SHOOT                  | TACKLE        | ITEM        | POWER      |

`Esc` / `P` / Start pauses the game, `N` mutes and `M` toggles the music.

### Controllers in the browser

Yes, controllers work in web games, through the browser's Gamepad API. A few things to know:

- **Press a button first.** Browsers hide controllers until you press a button on them, for privacy reasons. After that the game picks the controller up and **automatically puts it on a team**. A second controller joins the other team, and a controller woken up mid-match joins straight away.
- **Use Chrome or Edge for the best support.** Firefox and Safari also work, using the game's built-in layouts for non-standard controllers.
- **Open the game in its own tab** (https:// or a local file). Embedded frames can block controllers.
- **Windows:** fake "virtual controllers" (Steam Input, vJoy, some RGB keyboards and headsets) are ignored, and real controllers always get a player slot.
- **Still not working?** Open **🎮 CONTROLLERS**. It shows each controller's raw buttons and sticks exactly as the browser reports them. If nothing appears there, the browser can't see the controller. If buttons show up but do the wrong thing, use **REMAP**.

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
| Auntie Ama Makola | 🇬🇭 Ghana | **Market Day Madness:** splits into three balls, and only one is real |
| Uncle Hamada | 🇪🇬 Egypt | **Pyramid Punt:** drops from the sky |
| Doctor Wahala | 🇨🇲 Cameroon | **Wahala Warp:** teleports |
| Madame Fatou Ataya | 🇸🇳 Senegal | **Ataya Twister:** a huge curve with a teapot |
| Sipho Vuvuzela | 🇿🇦 South Africa | **Amapiano Blast:** the keeper can't stop dancing |
| Ranger Juma | 🇹🇿 Tanzania | **Kilimanjaro Cannon:** fired from a cannon |

## Special powers

Every player has a silly power on the **POWER** button. Captains have a signature power that recharges in 13 seconds. Every teammate has a squad power that recharges in 9 seconds. The orange meter beside your items fills up when it's ready, and a little icon pops up next to your player tag.

| Team | Captain's signature power | Squad power (all teammates) |
|---|---|---|
| Danfo Demolition FC | 📯 **HONK HONK!** The danfo horn blows everyone in front away | 💨 **OSHOFREE!** A speed burst and a shoulder barge |
| Rift Valley Rockets | 🌪️ **SECOND WIND:** huge speed, and nobody can tackle you | 👟 **SPRINT:** a burst of Kenyan pace |
| Black Star Bandits | 🥄 **WOODEN SPOON:** a spin that whacks everyone nearby and steals the ball | 💰 **LAST PRICE!** A haggle shield; tackles bounce off |
| Nile Crocodiles | 🎳 **BELLY BOWLING:** inflates and rolls through defenders | 🫃 **BELLY BUMP:** knocks over anyone close |
| Wahala Labs United | 🌀 **PORTAL GUN:** teleports far ahead, ball and all | 💨 **SMOKE BOMB:** poof, reappears to the side |
| Teranga Tea Party | 🫖 **TEA BREAK:** nearby rivals must stop for tea | ☕ **TEA SPLASH:** hot tea makes a rival slip and spin |
| Soweto Groove Machine | 📢 **VUVUZELA BLAST:** rivals in front, keepers included, cover their ears | 🕺 **GWARA GWARA:** a dance-spin dodge; anyone close starts dancing |
| Serengeti Stampede | 🦓 **STAMPEDE!** A herd of zebras and wildebeest charges across the pitch | 🦁 **LION ROAR:** nearby rivals panic and flee |

**Goalkeepers are no exception.** When the ball is far away they get distracted:

- 📱 phone calls
- 🍢 suya snacks
- 🤳 selfies
- 💤 naps

That makes them slow to react when the ball comes back. Sometimes they also grow **STRETCHY ARMS** to reach a shot they couldn't otherwise get to.

CPU teams use their powers too.

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

- **Shooting:** shots fly at the goal at high speed after a very short wind-up, with a kicking-leg animation. Tap Shoot for a quick shot, or hold it for a fraction of a second for a full-power one. Hold the stick up or down to pick a corner.
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

# ⚽🏆 MONATE CUP: Africa's Most Ridiculous Football Tournament

*"Monate" means fun (also nice, enjoyable) in Sesotho, Setswana and Sepedi.*

Monate Cup is a chaotic, arcade-style football game for 1–6 players that runs in the browser.

- **Teams:** 4 outfield players plus a goalkeeper, led by larger-than-life captains from across Africa.
- **View:** a low, side-on broadcast camera.
- **Characters:** chunky, rounded-block figures in the spirit of Roblox avatars, but softer and less boxy.
- **No assets:** everything is drawn and synthesized in code, including the Afrobeats / amapiano soundtrack and the vuvuzelas.
- **No build step:** just open the page.

**Play online:** https://dgtechbuilder.github.io/funnyfootballgame/

---

## Quick start

1. Open the game, either online or locally (see below).
2. Click the page once to enable sound.
3. Press **▶ PLAY**, or Enter, or A on a controller.
4. **Who's Playing?** Each keyboard or controller picks a team: move it left or right, or click the arrows. A controller joins a team automatically the first time you press one of its buttons.
5. Pick each team's **captain**, then a **stadium**, then set the **Match Rules** and press **KICK OFF!**

Everything can be done with the mouse, keyboard, controller or touch.

### Play locally

Open `index.html` in a modern browser. Double-clicking the file works, and so does serving the folder (for example `python3 -m http.server`).

### Deployment

The game is a static site. Every push to `main` redeploys it to GitHub Pages automatically. If the live site still shows an old version, do a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on a Mac).

---

## Controls

### Keyboard and controllers

|                 | Move           | Pass / Switch | Shoot (hold) | Tackle (hold) / Juke | Item       | Power      | Dodge      |
|-----------------|----------------|---------------|--------------|----------------------|------------|------------|------------|
| Keyboard 1      | `W A S D`      | `F` / `J`     | `G` / `K` / `Space` | `H` / `L`     | `R` / `I`  | `Q` / `U`  | `E` / `O`  |
| Keyboard 2      | Arrows         | `,` / Num1    | `.` / Num2   | `/` / Num3           | `'` / Num0 | `;` / Num4 | `]` / Num5 |
| Xbox            | Stick / D-pad  | A             | B / RT       | X / LT               | Y          | LB         | RB         |
| PlayStation     | Stick / D-pad  | ✕             | ○ / R2       | □ / L2               | △          | L1         | R1         |
| Switch / 8BitDo | Stick / D-pad  | B             | A / ZR       | Y / ZL               | X          | L          | R          |
| Touch           | Drag left side | PASS          | SHOOT        | TACKLE               | ITEM       | POWER      | DODGE      |

Other keys:

- `Esc`, `P` or Start: pause.
- `N`: mute.
- `M`: music on or off.

### Mouse

You can click everything in the menus: buttons, captains, stadiums and option arrows.

- Click a captain or stadium once to select it, then click it again (or press **NEXT**) to confirm.
- Every screen has **BACK** / **NEXT** buttons.
- During a match, a **❚❚ PAUSE** button appears in the top-left corner.

### Controllers in the browser

Controllers work through the browser's Gamepad API. Up to **4 controllers plus 2 keyboard players** can play at once.

- **Press a button first.** Browsers hide a controller until you press one of its buttons, for privacy reasons. After that, the game puts the controller on a team automatically:
  - a second controller joins the other team;
  - a controller woken up mid-match joins straight away.
- **Use Chrome or Edge for the best support.** Firefox and Safari also work, using built-in layouts for non-standard controllers.
- **Open the game in its own tab** (https:// or a local file). Embedded frames can block controllers.
- **Windows:** fake "virtual controllers" (Steam Input, vJoy, some RGB keyboards and headsets) are ignored, and real controllers always get a player slot.

The game recognises each controller family and shows its own button labels:

- Xbox (360, One, Series)
- PlayStation (DualShock 3/4, DualSense)
- Nintendo Switch Pro and Joy-Con
- 8BitDo
- Logitech F310/F710
- Steam Controller / Deck
- phone controllers (Backbone, Razer Kishi, GameSir)
- retro USB / SNES-style pads
- any generic gamepad

**🎮 CONTROLLERS screen** (on the title screen, the Who's Playing? screen and the pause menu):

- **Live test:** every button, the stick, and the raw button and axis numbers exactly as the browser reports them. If nothing appears there, the browser can't see the controller.
- **REMAP:** an 11-step wizard that works for any controller. You can also hold any button on the controller for 2 seconds to start it. Remaps are saved in your browser for that controller.
- **RUMBLE:** test vibration. Rumble on tackles, shots, goals and super strikes can be switched off in Match Rules.

---

## How it plays

### Shooting

- Shots always fly at the goal. Hold the stick up or down to pick a corner.
- The wind-up is very short: **tap** Shoot for a quick shot, or **hold** it briefly for full power.
- **Perfect shot:** hold Shoot and release while the needle is in the **green** part of the meter under your player. A perfect shot is faster and *goalie-breaking*: the keeper is much less likely to save it, and gets knocked over if they do.
- **One-timer:** press Shoot while a pass is on its way to you for an instant **PERFECT** volley.

### Super strikes (captains)

With your **captain** near the opponent's goal, hold Shoot to full charge. A ring then shrinks towards a green circle: release when they line up.

| Captain | From | Super strike |
|---|---|---|
| Oga Dayo Danfo | 🇳🇬 Nigeria | **Danfo Dash:** the ball becomes a yellow Lagos bus |
| Kip "The Wind" Kiprotich | 🇰🇪 Kenya | **Rift Valley Lightning:** zig-zag lightning |
| Auntie Ama Makola | 🇬🇭 Ghana | **Market Day Madness:** splits into three balls, and only one is real |
| Uncle Hamada | 🇪🇬 Egypt | **Pyramid Punt:** drops from the sky |
| Doctor Wahala | 🇨🇲 Cameroon | **Wahala Warp:** teleports |
| Madame Fatou Ataya | 🇸🇳 Senegal | **Ataya Twister:** a huge curve with a teapot |
| Sipho Vuvuzela | 🇿🇦 South Africa | **Amapiano Blast:** the keeper can't stop dancing |
| Ranger Juma | 🇹🇿 Tanzania | **Kilimanjaro Cannon:** fired from a cannon |

### Tackles, jukes and dodges

- **Tackle:** slide into a player to knock them down. A tackled player **stays down for 2.5 s**.
- **Perfect tackle:** hold Tackle and release in the green part of the meter. It slides further and hits harder. A quick tap gives a normal tackle.
- **Off-ball foul:** tackling someone who is more than **5 m from the ball**, and isn't the player a pass is heading to, gives the victim's team a **free item**. If their item slots are already full, it's used straight away. A red **OFF-BALL FOUL!** banner shows who did it and what was given.
- **Juke:** press Tackle while you have the ball to spin away from defenders.
- **Dodge:** press DODGE to sidestep (2 s cooldown). Dodge just as an enemy tackle arrives for a **PERFECT DODGE**: +30% speed for 1.5 s. A mistimed dodge still sidesteps but gives no boost.

### Special powers

Every player has a silly power on the **POWER** button:

- **Captains** have a signature power that recharges in 13 s.
- **Teammates** have a squad power that recharges in 9 s.

The orange meter beside your items shows when your power is ready, and an icon pops up next to your player tag.

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

### Hyper strike (ultimate)

A glowing 🔮 **hyper orb** drops onto the pitch every 35 s. Run over it to grab it, then:

1. Get the **ball** and move within range of the goal.
2. Make sure no defenders are in the **zone in front of the goal**. While you hold the orb, the zone is outlined in **green** when it's clear and **red** when it's blocked.
3. **Hold POWER** to charge it up.
4. Press the **3 button prompts** in time.

Success plays a cutscene and an arcing power kick into the net worth **2 goals**. Failure loses the orb and gives the ball to the other team. While you hold both the orb and the ball, POWER triggers the hyper strike instead of your normal power.

### Goalkeepers

- When the ball is far away, keepers get distracted by 📱 phone calls, 🍢 suya, 🤳 selfies and 💤 naps, so they react late when it comes back.
- Now and then they grow **STRETCHY ARMS** to reach a shot they otherwise couldn't.

### Power-ups

Grab the `?` crates. Each team can hold two items.

- 🍌 **Plantain Peel:** dropped behind you; whoever steps on it spins out.
- 🐔 **Market Chicken:** a homing chicken.
- 🥥 **Coconut Bomb:** thrown ahead; the blast hits both teams.
- 🌶️ **Scotch Bonnet:** fire feet that knock opponents over.
- 🍩 **Puff-Puff Power:** you grow huge and flatten whoever you touch.
- ❄️ **Harmattan Freeze:** turns nearby rivals to ice.
- 🧪 **Tiny Tonic:** makes the whole rival team tiny.
- 🐝 **Killer Bees:** chase down the ball carrier.

The team that concedes a goal gets an item to help it catch up.

The CPU uses everything above: powers, items, dodges, super strikes and hyper strikes.

---

## Stadiums

| Stadium | Walls | Hazard |
|---|---|---|
| Lagos Power Arena | Electric fence (players tackled into it are shown as skeletons) | Lightning, and NEPA power cuts that black out the pitch |
| Nyiragongo Bowl | Lava rock | Meteor showers |
| Kilimanjaro Summit | Snowbanks, on an ice pitch | Penguins from Cape Town who took a wrong turn |
| Maasai Mara Savannah | Thorn bushes that bounce you back | Elephants, giraffes and zebras |
| Sahara Oasis | Sand dunes, on a slow sandy pitch | Camel caravans |
| Afronaut Launchpad | Force field, with low gravity | Alien abductions |

## Match Rules

| Option | Choices |
|---|---|
| Match length | 1, 2, 3 or 5 minutes |
| CPU difficulty | Gentle, Pepper, Scotch Bonnet |
| Power-ups | On / off |
| Stadium hazards | On / off |
| Golden goal on a draw | On / off |
| Commentator voice | Off / on (uses the browser's text-to-speech) |
| Controller rumble | On / off |
| Left / right team gear | No Gear, Heavy Boots, Feather Sandals, Shin Armour, Lucky Socks |

**Gear** raises some stats and lowers others for a team's outfield players (not the keeper):

| Gear | Speed | Power | Tackle |
|---|---|---|---|
| Heavy Boots | −12% | +20% | +10% |
| Feather Sandals | +15% | −15% | −10% |
| Shin Armour | −8% | −5% | +30% |
| Lucky Socks | +5% | +10% | −20% |

---

## Tuning and testing the mechanics

Six mechanics can each be switched off. All their numbers and on/off flags live in **`js/config.js`**:

- timed dodge
- charged tackles and shots
- tackle immobilize
- off-ball foul
- hyper strike
- gear

To test one mechanic on its own without editing code, add it to the URL:

| URL | Effect |
|---|---|
| `index.html?mech=dodge` | only the dodge is on |
| `index.html?mech=dodge,hyper` | only dodge and hyper strike are on |
| `index.html?mech=-hyper,-gear` | everything except hyper strike and gear is on |

Names: `dodge`, `charge`, `immobilize`, `offBall`, `hyper`, `gear`.

**Balance note:** with every mechanic on, matches are high-scoring, around 16–23 goals. The biggest levers in `js/config.js` are:

- `immobilize.duration`: how long a tackled player stays down (default 2.5 s).
- `hyper.points`: goals per hyper strike (default 2).
- `hyper.spawnEvery`: seconds between orbs (default 35).

**Adding a character's own hyper strike:** add an entry to `HYPER_STRIKES` in `js/game.js` (the existing `powerKick` is the template), then set `hyper: '<key>'` on that captain in `js/data.js`. Captains without one use the power kick.

---

## Code layout

| File | What it holds |
|---|---|
| `index.html` | Page shell; loads the scripts in order |
| `js/config.js` | Tunable numbers and on/off flags for the add-on mechanics, gear definitions, `?mech=` URL toggles |
| `js/data.js` | Captains, signature and squad powers, stadiums, items, names, keeper antics and commentary |
| `js/audio.js` | WebAudio sound effects, vuvuzelas and the Afrobeats / amapiano sequencer |
| `js/input.js` | Keyboard, mouse, touch and gamepads: controller-family detection, player slots, raw button layouts, D-pads that report as one "hat" axis, custom remaps, rumble |
| `js/draw.js` | Drawing helpers, and the procedural characters and ball |
| `js/game.js` | Match simulation: physics, AI, keepers, tackles, dodges, shots, super and hyper strikes, powers, items, hazards, gear |
| `js/render.js` | Perspective camera, stadiums, crowd, pitch, entities, effects, meters and HUD |
| `js/main.js` | Clickable menus, controller setup and remap wizard, pause, results, and the main loop |

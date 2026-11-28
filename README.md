# ⚽🏆 MONATE CUP: Africa's Most Ridiculous Football Tournament

*"Monate" means fun (also nice, enjoyable) in Sesotho, Setswana and Sepedi.*

Monate Cup is a chaotic, arcade-style football game for 1–6 players that runs in the browser.

- **Teams:** 4 outfield players plus a goalkeeper, led by larger-than-life captains from across Africa.
- **View:** a low, side-on broadcast camera.
- **Characters:** chunky Roblox-style avatars built from shaded 3D blocks that turn to face where they run.
- **Almost no assets:** everything in play is drawn and synthesized in code, including the amapiano soundtrack (log drums, shakers and jazzy piano chords), the vuvuzelas and the players' voices. The only images are two small menu portraits (Amara and Tendai, in `art/`), fetched the first time their menu is shown.
- **Players talk back:** they yelp "EISH!", "CHAI!" and "HAIBO!" when flattened, shout "E DON ENTER!" and ululate after goals, and sulk "WAHALA..." when they lose. Tackles thump, the net swishes and rattles, keeper gloves smack and the crowd goes "OOOH" at the woodwork.
- **No build step to play:** just open the page. The published site is bundled and minified automatically.
- **Built for slow connections and old phones:** about 175 KB on the first visit, then it **plays fully offline** and adjusts its graphics to the device. See [Slow connections and slow devices](#slow-connections-and-slow-devices).

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

The game is a static site. Every push to `main` builds it (`npm ci && npm run build`, output in `dist/`) and redeploys it to GitHub Pages automatically. Pull requests run the same build as a check.

Players get new versions on their own: the game downloads an update in the background and uses it the next time it is opened (a toast says when one is ready). A running match is never interrupted.

---

## Slow connections and slow devices

Monate Cup is meant to work for players with a weak or patchy connection and a modest phone, for example in remote areas.

### Loading and offline play

- **One trip for the code:** the build joins the 13 game scripts into one minified file (448 KB of source becomes about 108 KB gzipped). The first visit is about 175 KB in 7 requests, all from the game's own site, with no third-party domains to look up.
- **Fonts are self-hosted:** no Google Fonts round trips. If they are slow, the game starts with a system font and swaps them in when they arrive.
- **A loading screen straight away:** it is plain HTML in the page, so it shows before the game script arrives. After 4 seconds it explains the wait, and if the download fails it says so and offers **Try again**.
- **Plays offline after the first visit:** a service worker (`sw.js`) stores everything the game needs on the device. Later launches start from the device without touching the network, including in airplane mode. The game can also be installed to the home screen (it has a web app manifest).
- **Safe updates:** each build gets its own version and cache, and an update is only used once every file of it has downloaded. A half-finished download on a dropped connection is never used.
- **Nothing in play needs the internet:** matches, music and voices are generated on the device. The only online action is sending a character suggestion. When offline, the suggestion is saved, and the game reminds you to send it when the connection is back.

### Adaptive graphics

Almost all of the frame cost is filling pixels, so the game adjusts its resolution first and its decoration second:

| Level | Canvas resolution | What changes |
|---|---|---|
| HIGH | up to 2× (sharp on high-DPI screens) | everything |
| MEDIUM | 1× | everything |
| LOW | 0.8× | half the crowd (drawn in a few batched fills), no soft grass patches, fewer particles, no glow |
| LOWEST | 0.6× | a third of the crowd, plain grass, fewest particles |

- **AUTO (the default)** measures the real frame rate. It steps down when the game runs below about 45 fps and steps back up after a stretch of smooth play. If a step down does not help (for example a 30 Hz screen or battery saver), it undoes it and keeps the nicer picture. The level that worked is remembered for the next launch.
- **Choose it yourself** with the **🖥** button on the title screen and the pause menu (AUTO → HIGH → LOW), or from the URL: `index.html?gfx=low`, `?gfx=high`, `?gfx=auto`.
- **The game keeps real speed on slow devices:** the simulation runs in fixed steps of at most 50 ms. A device that only draws 12 to 20 frames a second runs two or three steps per frame, so matches don't turn into slow motion and the physics behaves the same as on a fast machine.

### Developing

- `index.html` in the source folder loads the separate scripts, so edits show on reload. When served from `localhost`, the service worker runs in a network-first mode that never serves stale files. Add `?nosw` to the URL to skip it entirely.
- `npm ci && npm run build` produces `dist/`. Serve that folder (for example `cd dist && python3 -m http.server`) to test the real offline behaviour.
- A new script file must be added to the scripts block in `index.html`. The build reads the list from there.

---

## Controls

### Keyboard and controllers

|                 | Move           | Pass / Switch | Shoot (hold) | Tackle (hold) / Juke | Item       | Power      | Dodge      |
|-----------------|----------------|---------------|--------------|----------------------|------------|------------|------------|
| Keyboard 1      | `W A S D`      | `F` / `J`     | `G` / `K` / `Space` | `H` / `L`     | `R` / `I`  | `Q` / `U`  | `E` / `O`  |
| Keyboard 2      | Arrows         | `,` / Num1    | `.` / Num2   | `/` / Num3           | `'` / Num0 | `;` / Num4 | `]` / Num5 |
| Xbox            | Stick / D-pad  | A             | B / RT       | X / LT               | Y          | LB         | Right stick flick / RB |
| PlayStation     | Stick / D-pad  | ✕             | ○ / R2       | □ / L2               | △          | L1         | Right stick flick / R1 |
| Switch / 8BitDo | Stick / D-pad  | B             | A / ZR       | Y / ZL               | X          | L          | Right stick flick / R |
| Touch           | Drag left side | PASS          | SHOOT        | TACKLE               | USE (only while carrying an item) | POWER | DODGE (tap or swipe) |

**Touch screens:** drag anywhere on the left half to run; the buttons sit in the bottom-right corner. The item button only appears while your team is carrying an item, and shows which one (for example 🍌 PEEL). The POWER button fills up like a clock and glows when your power is ready. The camera frames the action slightly left of centre, so the goal you're attacking isn't hidden behind the buttons. Phones in landscape get a compact menu layout with bigger buttons. For a full-screen game on iPhone, use Share → Add to Home Screen.

Other keys:

- `Esc`, `P` or Start: pause.
- `N`: mute.
- `M`: music on or off.

**Pause menu → 🎮 CONTROLS:** shows the controls for every keyboard and controller in the game, with a tab per device. Pick an action and press the new key or button to change it. If that key was already in use, the two actions swap. Each tab has **Reset to default**. Keyboard layouts are saved in the browser; controller layouts are saved per controller, and the stick and D-pad keep working after a button change. `Esc`, `P`, `N`, `M`, `Tab`, `Backspace` and `Enter` stay reserved for menus.

**Pause menu → ❓ HOW TO PLAY:** every special move (perfect shots, super strikes, one-timers, power tackles, jukes, dodges, powers, items, the hyper strike) written with *your* buttons, plus your captain's signature and squad powers.

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
| Little Amara Afropuff | 🇺🇬 Uganda | **Puff Puff Parachute:** floats down from the sky |
| Tendai "Turbo" Moyo | 🇿🇼 Zimbabwe | **Home Time Hurricane:** zig-zags like a boy late for dinner |

### Tackles, jukes and dodges

- **Tackle:** slide into a player to knock them down. A tackled player **stays down for 1.5 s**.
- **Perfect tackle:** hold Tackle and release in the green part of the meter. It slides further and hits harder. A quick tap gives a normal tackle.
- **Off-ball foul:** tackling someone who is more than **5 m from the ball**, and isn't the player a pass is heading to, gives the victim's team a **free item**. If their item slots are already full, it's used straight away. A red **OFF-BALL FOUL!** banner shows who did it and what was given.
- **Juke:** press Tackle while you have the ball to spin away from defenders.
- **Dodge:** dodge in any direction (2 s cooldown).
  - **Controller:** flick the **right stick** the way you want to go (works on controllers the browser reads with the standard layout, which covers Xbox, PlayStation and most modern pads). RB / R1 + the left stick also works.
  - **Keyboard:** press DODGE and a direction, in either order. Holding a direction while you press DODGE goes that way at once; pressing DODGE first waits 0.15 s for a direction.
  - **Touch:** tap DODGE while steering with your left thumb to dodge that way, or swipe across the DODGE button to dodge the way you swipe.
  - With no direction at all you sidestep.
  - Dodge just as an enemy tackle arrives for a **PERFECT DODGE**: +30% speed for 1.5 s. A mistimed dodge still moves you but gives no boost.

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

Success plays a cutscene and an arcing power kick into the net worth **1 goal**. Failure loses the orb and gives the ball to the other team. While you hold both the orb and the ball, POWER triggers the hyper strike instead of your normal power.

### Goalkeepers

- **Distribution:** after a catch, the keeper doesn't just hoof it. A teammate makes a run to an open spot in midfield, marked **GET OPEN!** on the pitch for human teams. If you're playing, control switches to that teammate. The keeper passes to their feet as soon as they're open, or after about 2 seconds at the latest.
- When the ball is far away, keepers get distracted by 📱 phone calls, 🍢 suya, 🤳 selfies and 💤 naps, so they react late when it comes back.
- Now and then they grow **STRETCHY ARMS** to reach a shot they otherwise couldn't.

### Power-ups

Grab the `?` crates. Each team can hold two items. They show under the scoreboard, and a card pops up for a few seconds saying what you picked up, what it does and which button uses it.

- 🍌 **Plantain Peel:** dropped behind you; whoever steps on it spins out.
- 🐔 **Market Chicken:** a homing chicken.
- 🥥 **Coconut Bomb:** thrown ahead; the blast hits both teams.
- 🌶️ **Scotch Bonnet:** fire feet that knock opponents over.
- 🍩 **Puff-Puff Power:** you grow huge and flatten whoever you touch.
- ❄️ **Harmattan Freeze:** turns nearby rivals to ice.
- 🧪 **Tiny Tonic:** makes the whole rival team tiny.
- 🐝 **Killer Bees:** chase down the ball carrier.
- 🥁 **Talking Drum Shockwave:** a BOOM that throws every nearby rival back and knocks them over, then a glowing force field around you for **3 seconds** that nobody can step into. Rivals can't tackle you or steal the ball while it's up, so you get time to line up a shot, scope a pass or run at goal. The tuning numbers (blast radius, push, field size and time) live in `SHOCKWAVE` in `js/config.js`.

The team that concedes a goal gets an item to help it catch up.

The CPU uses everything above: powers, items, dodges, super strikes and hyper strikes.

### Pitch chaos: animals, obstacles and helpers

With **Stadium Hazards** on, the pitch gets busier as the match goes on.

**Walking animals.** These are blocky Roblox-style animals with proper walk cycles. They're solid, so players bump into them and the ball bounces off. Each one does something to the game:

| Animal | Where | What it does |
|---|---|---|
| 🐘 Elephant | Maasai Mara | Sprays water from its trunk. Players in front slip, and the ball gets blasted away. |
| 🦒 Giraffe | Maasai Mara | Heads any ball that comes within reach, including high lobs. |
| 🦓 Zebra | Maasai Mara | Chases loose balls and hoofs them anywhere. It barges ball carriers too. |
| 🐪 Camel | Sahara | Sits down in the way, and spits at the nearest player, who spins out. |
| 🐐 Goat | Every stadium | Charges and headbutts the nearest player. |
| 🐧 Penguins | Kilimanjaro | Belly-slide across the pitch in a group, scattering players. |

A hard shot that hits an animal can knock a **? crate** loose. Juma's Stampede power uses the same blocky zebras and wildebeest.

**Random events.** One pops up every 11–17 seconds.

| Event | Type | What happens |
|---|---|---|
| 🍢 Snack vendor | Helper | The first player to reach her gets a **free power-up**, or a speed boost if their item slots are already full. |
| 🛩️ Supply drop | Helper | A plane drops three **? crates** across the pitch. |
| ☀️ Sunshine zone | Helper | Stand in it for a speed boost. |
| 🔴 Springboard | Helper | Launches the ball high, and bounces players with a speed boost. |
| 🏃 Pitch invader | Obstacle | A fan runs on, **steals the ball** and runs off with it. Tackle him to win it back and earn a **free power-up**. |
| 🌪️ Dust devil | Obstacle | Spins players around, and swirls the ball up before flinging it out. |
| 🌧️ Mud puddle | Obstacle | A rain cloud leaves mud that slows players down and stops the ball. |

These all sit on top of each stadium's own hazards: lightning, power cuts, meteors and UFOs.

---

## Stadiums

| Stadium | Walls | Hazard |
|---|---|---|
| Lagos Power Arena | Electric fence (players tackled into it are shown as skeletons) | Lightning, and NEPA power cuts that black out the pitch |
| Nyiragongo Bowl | Lava rock | Meteor showers |
| Kilimanjaro Summit | Snowbanks, on an ice pitch | Penguin belly-slides (Cape Town penguins who took a wrong turn) |
| Maasai Mara Savannah | Thorn bushes that bounce you back | Elephants, giraffes and zebras walking the pitch |
| Sahara Oasis | Sand dunes, on a slow sandy pitch | Camels and goats |
| Afronaut Launchpad | Force field, with low gravity | Alien abductions |

## Characters

**👥 CHARACTERS** on the title screen shows every captain: country, team, backstory, stats, super strike, signature and squad powers, squad names and catchphrases.

**💡 Suggest a character:** a form for a new captain (name and country, plus nickname, team, backstory, power idea, super strike name, catchphrase, look, kit colour and skin tone). Saved suggestions appear in the gallery with their own blocky portrait. **Send** opens a pre-filled GitHub issue on this repository (needs a free GitHub account); **Copy** puts the text on the clipboard instead.

---

## Match Rules

| Option | Choices |
|---|---|
| Match length | 1, 2, 3 or 5 minutes |
| CPU difficulty | Five levels: **1 Plain Pap** (training: the CPU is slow, almost never tackles, rarely steals and its keeper lets plenty in), **2 Gentle** (the default), **3 Pepper**, **4 Scotch Bonnet**, **5 Peri-Peri** (no mercy). A card beside the list shows the CPU's speed, shooting, tackling, keeper, pressing and brains for the chosen level |
| Power-ups | On / off |
| Stadium hazards | On / off |
| Golden goal on a draw | On / off |
| Commentator voice | Off / on (uses the browser's text-to-speech, preferring a Nigerian, South African, Kenyan, Ghanaian or Tanzanian English voice when the device has one) |
| Player voices | On (built-in synth voices with tonal, sing-song African intonation) / Accent (the device's African-English text-to-speech voices, e.g. in Edge on Windows; falls back to the synth) / Off |
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

**CPU difficulty** lives in the `DIFF` table at the top of `js/game.js`. Every factor steps up at every level:

| Factor | 1 Plain Pap | 2 Gentle | 3 Pepper | 4 Scotch Bonnet | 5 Peri-Peri |
|---|---|---|---|---|---|
| Run speed | 0.74 | 0.86 | 1.0 | 1.06 | 1.12 |
| Shot accuracy | 0.3 | 0.5 | 0.75 | 0.9 | 1.0 |
| Shot power | 0.62 | 0.78 | 0.92 | 1.0 | 1.08 |
| Shooting range | 0.62 | 0.76 | 0.9 | 1.0 | 1.12 |
| Corner aim | 0.35 | 0.55 | 0.75 | 0.9 | 1.0 |
| Keeper reaction (s) | 0.6 | 0.38 | 0.2 | 0.11 | 0.06 |
| Keeper saves | 0.38 | 0.6 | 0.9 | 1.05 | 1.18 |
| Tackle rate | 0.07 | 0.22 | 0.32 | 0.52 | 0.8 |
| Steal rate | 0.08 | 0.3 | 0.6 | 0.9 | 1.2 |
| Your knockdown time | 0.5 | 0.65 | 0.8 | 0.9 | 1.0 |
| Players pressing you | 1.0 | 1.4 | 1.8 | 2.2 | 2.6 |
| Decision time | 1.8 | 1.4 | 1.0 | 0.85 | 0.7 |
| Passing under pressure | 0.2 | 0.35 | 0.5 | 0.65 | 0.8 |
| Dodge rate | 0.04 | 0.12 | 0.24 | 0.34 | 0.45 |
| Super-strike timing | 0.2 | 0.38 | 0.6 | 0.8 | 0.95 |
| Item and power use | 0.15 | 0.4 | 0.85 | 1.25 | 1.7 |
| Marking radius | 120 | 200 | 300 | 380 | 460 |

Eight systems can each be switched off. All their numbers and on/off flags live in **`js/config.js`**:

- timed dodge
- charged tackles and shots
- tackle immobilize
- off-ball foul
- hyper strike
- gear
- pitch chaos (animals and events)
- keeper distribution

To test one mechanic on its own without editing code, add it to the URL:

| URL | Effect |
|---|---|
| `index.html?mech=dodge` | only the dodge is on |
| `index.html?mech=dodge,hyper` | only dodge and hyper strike are on |
| `index.html?mech=-hyper,-gear` | everything except hyper strike and gear is on |

Names: `dodge`, `charge`, `immobilize`, `offBall`, `hyper`, `gear`, `chaos`, `keeperPass`.

**Balance note:** with everything on, a 3-minute match has around 15–19 goals. The main things to change in `js/config.js`:

- `immobilize.duration`: how long a tackled player stays down (default 1.5 s).
- `hyper.points`: goals per hyper strike (default 1).
- `hyper.spawnEvery`: seconds between orbs (default 35).
- `chaos.interval` and `chaos.weights`: how often each animal and event appears. Set a weight to 0 to remove that event.

**Adding a character's own hyper strike:** add an entry to `HYPER_STRIKES` in `js/game.js` (the existing `powerKick` is the template), then set `hyper: '<key>'` on that captain in `js/data.js`. Captains without one use the power kick.

---

## Code layout

| File | What it holds |
|---|---|
| `index.html` | Page shell, loading screen, self-hosted fonts and service-worker registration; loads the scripts in order |
| `sw.js` | Service worker: stores the game for offline play and handles updates |
| `tools/build.mjs` | Build for the published site: one minified, content-hashed script, plus the service worker's file list |
| `js/perf.js` | Adaptive graphics quality (resolution, crowd, grass, particles), driven by the measured frame rate |
| `js/config.js` | Tunable numbers and on/off flags for the add-on mechanics, gear definitions, `?mech=` URL toggles |
| `js/data.js` | Captains, signature and squad powers, stadiums, items, names, keeper antics and commentary |
| `js/audio.js` | WebAudio sound effects (body hits, net, glove catches, post clangs, crowd), vuvuzelas and the amapiano music sequencer (log-drum bass, swung shakers, Rhodes chords, pad, flute lead) |
| `js/voice.js` | Player voices: a formant speech synth that sings the speech-bubble words with tonal melodies, rolled R's and ululation, plus optional African-English text-to-speech |
| `js/input.js` | Keyboard, mouse, touch and gamepads: controller-family detection, player slots, raw button layouts, D-pads that report as one "hat" axis, custom remaps, per-action key and button remapping, rumble |
| `js/creatures.js` | Blocky Roblox-style animals (elephant, giraffe, zebra, camel, goat, penguin, wildebeest) and pitch NPCs, built from the same 3D blocks as the players |
| `js/draw.js` | Drawing helpers, the ball, and the blocky Roblox-style characters (flat-shaded 3D boxes that turn with the player) |
| `js/game.js` | Match simulation: physics, AI, keepers, tackles, dodges, shots, super and hyper strikes, powers, items, hazards, gear |
| `js/chaos.js` | Animal behaviours and the random obstacle and helper events, tied into power-ups |
| `js/render.js` | Perspective camera, stadiums, crowd, pitch, entities, effects, meters and HUD |
| `js/main.js` | Clickable menus, controller setup and remap wizard, pause (controls remapping and How to Play), results, and the main loop |
| `js/characters.js` | The Characters gallery and the suggest-a-character form |

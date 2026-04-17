# Remote Config Reference

The app fetches a JSON config from a remote URL. Every field is optional — defaults are applied automatically.

Default URL: `https://gist.githubusercontent.com/BanariVlad/62abaf43930727f8477191d26289a83b/raw/jigx.json`

Override with: `CONFIG_URL="https://your-url.com/config.json" npm start`

---

## Global Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | number | `1` | Config version (for your tracking) |
| `pollIntervalMs` | number | `60000` | How often to fetch new config (ms). Min 5000, max 3600000 |
| `globalEnabled` | boolean | `true` | Master kill switch. `false` = all pranks off |
| `globalSchedule` | Schedule | — | Only run pranks during these hours |
| `killCombo` | string | `"CommandOrControl+Shift+Alt+Q"` | Keyboard shortcut to quit the app |
| `dismissable` | boolean | `true` | Allow dismissing active pranks with a key combo |
| `dismissCombo` | string | `"Shift+Escape"` | Key combo to dismiss active pranks |
| `dismissDelay` | number | `2000` | Must wait this many ms after prank starts before dismiss works |

### Schedule Object

| Field | Type | Description |
|-------|------|-------------|
| `startHour` | number (0-23) | Hour to start (inclusive) |
| `endHour` | number (0-23) | Hour to stop (exclusive). Wraps midnight if start > end |

Example: `{ "startHour": 9, "endHour": 17 }` = 9 AM to 5 PM only.

---

## Base Prank Config

Every prank under `pranks.*` has these fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Turn this prank on/off |
| `trigger` | string | `"click"` | When to fire: `"click"`, `"keypress"`, `"idle"`, `"interval"`, `"random"` |
| `chance` | number | `0.5` | Probability (0-1) of firing when triggered. `1.0` = always |
| `duration` | number | `5000` | How long the prank runs (ms). Min 100, max 300000 |
| `cooldown` | number | `10000` | Minimum wait between activations (ms). Min 0, max 3600000 |
| `schedule` | Schedule | — | Per-prank hour restriction (same format as globalSchedule) |
| `intensity` | number | `5` | General intensity (1-10). Effect varies per prank |
| `chainPranks` | string[] | `[]` | Prank IDs to fire when this prank starts |
| `chainDelay` | number | `0` | Delay (ms) before firing chained pranks |

### Trigger Types

| Trigger | Fires when |
|---------|-----------|
| `click` | User clicks mouse (needs accessibility permission on macOS) |
| `keypress` | User presses any key (needs accessibility permission on macOS) |
| `idle` | System idle for 30+ seconds |
| `interval` | Repeats every `duration + cooldown` ms |
| `random` | Random delay between `cooldown` and `cooldown * 3` |

---

## Pranks

### `pranks.cursorText` — One word at a time on click

Shows ONE word on screen per click. Each word can have its own animation variant, color, font, duration, etc.

**3 animation variants:**

| Variant | Behavior |
|---------|----------|
| `bounce` | Word spawns at click position, bounces between screen edges like DVD logo |
| `follow` | Word follows cursor with smooth lerp (offset configurable) |
| `fall` | Word falls from top of screen with optional rotation |
| `random` | Randomly picks one of the above each time |

**Global defaults** (apply to words that don't override):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultColor` | string | `"#ff0000"` | Default word color |
| `defaultFontSize` | number | `48` | Default font size (px). Range 8-200 |
| `defaultFontFamily` | string | `"Impact, sans-serif"` | Default CSS font-family |
| `defaultFontWeight` | string | `"bold"` | Default CSS font-weight |
| `defaultDuration` | number | `3000` | Default word display time (ms). Range 500-60000 |
| `defaultVariant` | string | `"random"` | Default animation: `"bounce"`, `"follow"`, `"fall"`, `"random"` |
| `defaultOpacity` | number | `1` | Default opacity (0.1-1) |
| `defaultTextShadow` | string | `"2px 2px 4px rgba(0,0,0,0.5)"` | Default CSS text-shadow |
| `defaultBounceSpeed` | number | `5` | Default bounce speed (1-30) |
| `defaultFollowOffsetX` | number | `20` | Default follow X offset from cursor (px) |
| `defaultFollowOffsetY` | number | `-30` | Default follow Y offset from cursor (px) |
| `defaultFallSpeed` | number | `3` | Default fall speed (1-20) |
| `defaultFallRotation` | boolean | `true` | Default: rotate while falling? |

**Per-word config** (`words` array — each entry overrides globals):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | *required* | The word to display |
| `color` | string | uses default | CSS color |
| `fontSize` | number | uses default | Font size (px) |
| `fontFamily` | string | uses default | CSS font-family |
| `fontWeight` | string | uses default | CSS font-weight |
| `duration` | number | uses default | How long this word stays on screen (ms) |
| `chance` | number | `1` | Probability (0-1) this word appears when selected |
| `variant` | string | uses default | `"bounce"`, `"follow"`, `"fall"`, `"random"` |
| `opacity` | number | uses default | Opacity (0.1-1) |
| `textShadow` | string | uses default | CSS text-shadow |
| `bounceSpeed` | number | uses default | Bounce variant speed |
| `followOffsetX` | number | uses default | Follow variant X offset |
| `followOffsetY` | number | uses default | Follow variant Y offset |
| `fallSpeed` | number | uses default | Fall variant speed |
| `fallRotation` | boolean | uses default | Fall variant rotation |

**Example:**

```json
"cursorText": {
  "enabled": true,
  "trigger": "click",
  "chance": 0.5,
  "duration": 60000,
  "cooldown": 1000,
  "defaultFontSize": 48,
  "defaultVariant": "random",
  "words": [
    {
      "text": "LOL",
      "color": "#ff0000",
      "fontSize": 56,
      "variant": "bounce",
      "bounceSpeed": 6,
      "duration": 4000
    },
    {
      "text": "HACKED",
      "color": "#00ff00",
      "fontSize": 64,
      "fontFamily": "Courier New, monospace",
      "variant": "follow",
      "duration": 5000
    },
    {
      "text": "RIP",
      "color": "#00ffff",
      "fontSize": 72,
      "variant": "fall",
      "fallSpeed": 2,
      "duration": 5000,
      "chance": 0.5
    }
  ]
}
```

---

### `pranks.unclosable` — Fullscreen overlay with fake buttons

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | string | `"Your system has been compromised..."` | Main text (supports `\n`) |
| `backgroundColor` | string | `"#000000"` | Background CSS color |
| `textColor` | string | `"#ff0000"` | Text CSS color |
| `showFakeButtons` | boolean | `true` | Show fake OK/Cancel buttons |
| `fakeButtonTexts` | string[] | `["OK","Cancel","Close","Help"]` | Button labels (clicking spawns more messages) |

Blocks all input for `duration` ms.

---

### `pranks.screenFlip` — Rotates screen

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `angle` | number | `180` | Rotation degrees (90, 180, 270) |
| `animationDuration` | number | `2000` | Flip animation time (ms) |

Takes a screenshot, displays it rotated. Requires screen recording permission on macOS.

---

### `pranks.cursorTrail` — Particles follow cursor

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `colors` | string[] | `["#ff0000","#ff7700","#ffff00","#00ff00","#0000ff","#8b00ff"]` | Rainbow default |
| `particleCount` | number | `30` | Max particles on screen. Range 5-200 |
| `particleSize` | number | `8` | Particle radius (px). Range 1-50 |
| `fadeSpeed` | number | `0.05` | How fast particles fade. Range 0.01-0.5 |
| `trailType` | string | `"circles"` | `"circles"`, `"stars"`, `"emoji"`, `"sparkles"` |
| `emojis` | string[] | `["✨","💫","⭐","🔥","💀"]` | Used when trailType is `"emoji"` |

---

### `pranks.screenTilt` — Screen slowly rocks

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxAngle` | number | `15` | Maximum tilt degrees. Range 1-45 |
| `speed` | number | `0.5` | Degrees per second. Range 0.1-5 |

Takes screenshot, oscillates rotation. Requires screen recording permission on macOS.

---

### `pranks.fakeBsod` — Windows Blue Screen of Death

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `errorCode` | string | `"CRITICAL_PROCESS_DIED"` | Stop code shown at bottom |
| `percentage` | number | `0` | Starting percentage (0-100) |
| `collectingInfo` | boolean | `true` | Animate the % counter (never reaches 100) |

Blocks all input. Looks like real Win10/11 BSOD with `:( ` face.

---

### `pranks.screenShake` — Earthquake effect

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `magnitude` | number | `10` | Shake distance (px). Range 1-50 |
| `frequency` | number | `30` | Shakes per second (Hz). Range 10-100 |

---

### `pranks.colorInversion` — Inverts all screen colors

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `animateTransition` | boolean | `true` | Fade in the inversion |
| `transitionDuration` | number | `500` | Fade duration (ms) |

Uses `backdrop-filter: invert(1)`.

---

### `pranks.matrixRain` — Falling green text

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `color` | string | `"#00ff00"` | Text color |
| `fontSize` | number | `14` | Character size. Range 8-32 |
| `speed` | number | `5` | Fall speed. Range 1-20 |
| `density` | number | `0.5` | Column density (0.1-1.0). Higher = more columns active |
| `characters` | string | `"abcdefghijklm..."` | Character set to pick from |

---

### `pranks.jumpscare` — Sudden fullscreen image + sound

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `imageUrl` | string | — | URL to image. Falls back to big red 💀 |
| `soundUrl` | string | — | URL to audio file |
| `volume` | number | `0.8` | Audio volume (0-1) |
| `flashDuration` | number | `500` | White flash at start (ms). Range 50-5000 |

**Disabled by default** in sample config.

---

### `pranks.mouseMagnet` — Fake cursor drifts toward magnet zones

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `zones` | array | `[]` | Manual magnet zones (see below) |
| `randomZones` | boolean | `true` | Auto-generate random zones |
| `zoneCount` | number | `3` | Number of random zones. Range 1-10 |

Each zone object:

| Field | Type | Description |
|-------|------|-------------|
| `x` | number (0-100) | X position as % of screen width |
| `y` | number (0-100) | Y position as % of screen height |
| `radius` | number | Attraction radius (px) |
| `strength` | number (0.1-1) | Pull strength |

Hides real cursor, draws a fake one that drifts. Real clicks still work at real cursor position.

---

### `pranks.pixelDecay` — Screen melts

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `speed` | number | `5` | Chunks detached per frame. Range 1-20 |
| `chunkSize` | number | `8` | Pixel block size. Range 2-20 |
| `direction` | string | `"down"` | `"down"`, `"random"`, `"dissolve"` |

Takes screenshot, breaks into blocks that fall. Requires screen recording permission on macOS.

---

### `pranks.staticGlitch` — TV static + glitch

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `opacity` | number | `0.3` | Overlay opacity (0.1-1.0). Lower = more subtle |
| `glitchFrequency` | number | `10` | Updates per second. Range 1-60 |
| `colorShift` | boolean | `true` | RGB color shift on noise |
| `scanlines` | boolean | `true` | Horizontal darkened scanlines |

---

## Keystroke Reactions

A separate system from pranks. Monitors typed keystrokes globally and triggers visual reactions when patterns are matched.

**Top-level config** (`keystrokeReactions`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable keystroke monitoring |
| `bufferSize` | number | `100` | How many characters to keep in buffer. Range 10-500 |
| `schedule` | Schedule | — | Hour restriction |
| `reactions` | array | `[]` | Array of reaction rules |

**Each reaction** (`reactions[n]`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `pattern` | string | *required* | Text to match (matched at end of keystroke buffer) |
| `caseSensitive` | boolean | `false` | Case-sensitive matching |
| `chance` | number | `1` | Probability of firing (0-1) |
| `cooldown` | number | `5000` | Minimum ms between fires for this pattern |
| `response` | object | | What to show visually (see below). Optional if only triggering pranks |
| `triggerPranks` | string[] | `[]` | Prank IDs to fire when pattern matches (e.g. `["screenFlip", "matrixRain"]`) |
| `triggerDelay` | number | `0` | Delay (ms) before firing triggered pranks |

**Response object** (`reactions[n].response`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `"emoji"` | `"emoji"`, `"text"`, or `"image"` |
| `content` | string | `"👋"` | Text/emoji to display (ignored for `"image"`) |
| `fontSize` | number | `100` | Font size (px). Range 8-500 |
| `fontFamily` | string | `"sans-serif"` | CSS font-family |
| `fontWeight` | string | `"bold"` | CSS font-weight |
| `color` | string | `"#ffffff"` | CSS color |
| `textShadow` | string | `"2px 2px 8px rgba(0,0,0,0.7)"` | CSS text-shadow |
| `duration` | number | `2000` | How long reaction stays on screen (ms). Range 200-30000 |
| `position` | string | `"center"` | `"center"`, `"cursor"`, `"random"`, `"top"`, `"bottom"`, `"left"`, `"right"` |
| `animation` | string | `"pop"` | Entry/exit animation (see below) |
| `animationSpeed` | number | `1` | Speed multiplier (0.1-5). Higher = faster |
| `backgroundColor` | string | — | Optional background (e.g. `"rgba(0,0,0,0.8)"`) |
| `borderRadius` | string | `"10px"` | CSS border-radius (when background set) |
| `padding` | string | `"20px"` | CSS padding (when background set) |
| `opacity` | number | `1` | Max opacity (0.1-1) |
| `imageUrl` | string | — | Image URL (for `type: "image"`) |
| `imageWidth` | number | `200` | Image width px |
| `imageHeight` | number | `200` | Image height px |
| `soundUrl` | string | — | Audio URL to play on trigger |
| `soundVolume` | number | `0.5` | Audio volume (0-1) |

**Animations:**

| Animation | In | Out |
|-----------|-----|-----|
| `pop` | Scale from 0 with overshoot | Scale to 0 |
| `fade` | Fade in | Fade out |
| `slideUp` | Slide from below | Slide up and out |
| `slideDown` | Slide from above | Slide down and out |
| `slideLeft` | Slide from right | Slide out left |
| `slideRight` | Slide from left | Slide out right |
| `bounce` | Scale with heavy overshoot | Scale to 0 |
| `grow` | Scale from tiny slowly | Scale up and fade |
| `spin` | Spin in from 720deg | Spin out |
| `shake` | Appear with shaking | Scale up and fade |
| `explode` | Scale down from huge | Scale up and fade |

**Example:**

```json
"keystrokeReactions": {
  "enabled": true,
  "bufferSize": 100,
  "reactions": [
    {
      "pattern": "hello",
      "caseSensitive": false,
      "chance": 1,
      "cooldown": 5000,
      "response": {
        "type": "emoji",
        "content": "👋",
        "fontSize": 150,
        "duration": 2500,
        "position": "center",
        "animation": "pop"
      }
    },
    {
      "pattern": "password",
      "response": {
        "type": "text",
        "content": "👀 I can see that",
        "fontSize": 64,
        "color": "#ffff00",
        "duration": 3000,
        "position": "cursor",
        "animation": "bounce"
      }
    },
    {
      "pattern": "shit",
      "response": {
        "type": "emoji",
        "content": "💩",
        "fontSize": 180,
        "duration": 3000,
        "position": "random",
        "animation": "explode"
      }
    }
  ]
}
```

---

## Mercy System

The victim can type a secret phrase to pause all pranks for a configurable duration. Limited uses per day. Resets at midnight.

**Flow:**
1. Victim types the phrase (e.g. "vlad please stop") anywhere — any app, any text field
2. If uses remain: all pranks stop, cinematic confirmation message appears, pause timer starts
3. When pause expires: "I'm back" message appears, pranks resume
4. If no uses left: denial message appears, pranks continue

**Config** (`mercy`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable mercy system |
| `phrase` | string | `"vlad please stop"` | Secret phrase to type |
| `caseSensitive` | boolean | `false` | Case-sensitive matching |
| `pauseDurationMs` | number | `3600000` | How long pranks pause (ms). Default 1 hour. Range 60000-86400000 |
| `maxUsesPerDay` | number | `2` | Maximum mercy uses per day. Resets at midnight |
| `confirmationText` | string | `"Fine. You're free... for now."` | Text shown when mercy granted |
| `confirmationEmoji` | string | `"😮‍💨"` | Emoji shown above confirmation text |
| `confirmationDuration` | number | `4000` | How long confirmation shows (ms) |
| `confirmationColor` | string | `"#00ff00"` | Confirmation text color |
| `confirmationFontSize` | number | `48` | Confirmation text font size |
| `exhaustedText` | string | `"No mercy left today. Good luck."` | Text shown when no uses left |
| `exhaustedEmoji` | string | `"😈"` | Emoji shown when denied |
| `exhaustedColor` | string | `"#ff0000"` | Denial text color |
| `resumeText` | string | `"Time's up. I'm back."` | Text shown when pause expires |
| `resumeEmoji` | string | `"👹"` | Emoji shown on resume |
| `resumeColor` | string | `"#ff0000"` | Resume text color |
| `resumeDuration` | number | `3000` | How long resume message shows (ms) |

**Example:**

```json
"mercy": {
  "enabled": true,
  "phrase": "vlad please stop",
  "pauseDurationMs": 3600000,
  "maxUsesPerDay": 2,
  "confirmationText": "Fine. You're free... for now.",
  "confirmationEmoji": "😮‍💨",
  "exhaustedText": "No mercy left today. Good luck.",
  "exhaustedEmoji": "😈",
  "resumeText": "Time's up. I'm back.",
  "resumeEmoji": "👹"
}
```

---

## Chaining & Cross-Triggering

Any action can trigger any other action. Two mechanisms:

### 1. Keystroke → Prank (`triggerPranks`)

Type a word, fire a prank:

```json
{
  "pattern": "screen",
  "triggerPranks": ["screenFlip"],
  "triggerDelay": 500,
  "response": {
    "content": "🔄 Flipping...",
    "animation": "spin",
    "duration": 1500
  }
}
```

Type "screen" → shows "Flipping..." → 500ms later → screen flips. Response is optional — you can trigger pranks without any visual reaction.

```json
{
  "pattern": "matrix",
  "triggerPranks": ["matrixRain", "colorInversion"],
  "triggerDelay": 0
}
```

Type "matrix" → immediately fires both matrixRain AND colorInversion simultaneously.

### 2. Prank → Prank (`chainPranks`)

One prank firing triggers another:

```json
"screenShake": {
  "enabled": true,
  "trigger": "click",
  "chance": 0.1,
  "duration": 3000,
  "chainPranks": ["staticGlitch"],
  "chainDelay": 1000
}
```

screenShake fires → 1s later → staticGlitch fires automatically. The chained prank uses its own `duration` from its config.

**Valid prank IDs for chaining:** `cursorText`, `unclosable`, `screenFlip`, `cursorTrail`, `screenTilt`, `fakeBsod`, `screenShake`, `colorInversion`, `matrixRain`, `jumpscare`, `mouseMagnet`, `pixelDecay`, `staticGlitch`

---

## Full Example Config

```json
{
  "version": 1,
  "pollIntervalMs": 180000,
  "globalEnabled": true,
  "globalSchedule": { "startHour": 9, "endHour": 17 },
  "killCombo": "CommandOrControl+Shift+Alt+Q",
  "pranks": {
    "matrixRain": {
      "enabled": true,
      "trigger": "random",
      "chance": 0.1,
      "duration": 15000,
      "cooldown": 120000
    },
    "fakeBsod": {
      "enabled": true,
      "trigger": "random",
      "chance": 0.03,
      "duration": 12000,
      "cooldown": 900000,
      "errorCode": "DRIVER_IRQL_NOT_LESS_OR_EQUAL"
    }
  },
  "keystrokeReactions": {
    "enabled": true,
    "reactions": [
      {
        "pattern": "hello",
        "response": { "content": "👋", "fontSize": 150, "animation": "pop" }
      }
    ]
  }
}
```

Omitted pranks use defaults (all disabled).

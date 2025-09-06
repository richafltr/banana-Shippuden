# Banana Shippuden - Battle Flow

## 🚀 Fully Concurrent Battle Generation

When ANY banana is clicked (slider or center), the system generates **ALL battle assets concurrently**:

### 1. **Banana Slider Click** (on player cards)
- Triggers `/api/battle` with `prepare-battle-sequence` action
- Uses **ORIGINAL uploaded images** from DigitalOcean Spaces for ALL operations
- **TRANSFORMS TO NARUTO CHARACTERS** in ALL 4 operations simultaneously:
  - **Player 1 Battle Stance**: 
    - Input: Original P1 image
    - Prompt: "Reimagine as Naruto shinobi with weapons, ninja accessories, outfit, headband + Remove background, turn right, facing right, fighting pose"
  - **Player 2 Battle Stance**: 
    - Input: Original P2 image
    - Prompt: "Reimagine as Naruto shinobi with weapons, ninja accessories, outfit, headband + Remove background, turn left, facing left, fighting pose"
  - **Versus Screen**: 
    - Input: Both original images
    - Prompt: "Reimagine both as Naruto shinobi characters + Lightning bolt VS screen"
  - **Battle Arena**: 
    - Input: Both original images
    - Prompt: "Reimagine both as Naruto shinobi characters + Move to opposite sides of arena with FIGHT text"
- All include: "Realistic 3D graphics rendered in Unreal Engine"
- Updates UI with Naruto-transformed battle stances
- Stores all URLs in state and localStorage
- Exports as JSON for future use

### 2. **Center Banana Click** (battle trigger)
- If battle data already exists: Uses pre-generated assets
- If not: Generates all assets (same as slider click)
- Shows video player with pre-loaded data
- No additional API calls needed!

## 📊 Performance Metrics

**Sequential Processing (OLD):**
- Step 1: Generate stances (~15 seconds)
- Step 2: Generate versus/arena (~15 seconds)
- **Total: ~30+ seconds**

**Concurrent Processing (NEW):**
- All 4 operations run in parallel
- **Total: ~15 seconds** (50% faster!)

## 🗄️ Data Storage

Battle data is stored in multiple locations:

1. **React State** (`battleSequenceData`)
   - Immediate access during session
   
2. **LocalStorage** 
   - Persists across page refreshes
   - Key: `battleSequenceData`

3. **JSON Export Format**
```json
{
  "battleSequence": {
    "player1": {
      "stance": "https://banana-edit.sfo3.digitaloceanspaces.com/...",
      "cdn_url": "..."
    },
    "player2": {
      "stance": "https://banana-edit.sfo3.digitaloceanspaces.com/...",
      "cdn_url": "..."
    },
    "versus": {
      "screen": "https://banana-edit.sfo3.digitaloceanspaces.com/...",
      "cdn_url": "..."
    },
    "arena": {
      "scene": "https://banana-edit.sfo3.digitaloceanspaces.com/...",
      "cdn_url": "...",
      "video_input_url": "..." // For future video generation
    },
    "metadata": {
      "timestamp": 1234567890,
      "created": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 🎮 User Experience

1. **Upload Images** → Drag & drop player photos
2. **Click Banana Slider** → ALL battle assets generate concurrently (15s)
3. **Click Center Banana** → Instant playback (no wait!)
4. **Watch Battle Sequence**:
   - Versus screen (3s)
   - Battle arena (shows immediately)
   - Video generation starts automatically (2-3 minutes in background)
   - Epic Naruto battle video plays when ready!

## 🛠️ Technical Implementation

### API Endpoint: `/api/battle`
- **CRITICAL**: All 4 FAL AI operations use the ORIGINAL uploaded images as input
  - NOT the transformed/stance images
  - All operations receive the same CDN URLs from DigitalOcean Spaces
- **NARUTO TRANSFORMATION** included in ALL prompts (as per `prompts.md`):
  - **Player 1 Stance**: 
    ```
    "Reimagine the person to cosplay as a Naruto shinobi character with weapons, 
    ninja accessories, outfit, and headband. Remove the background, turn right, 
    facing right, fighting pose. Realistic 3D graphics rendered in Unreal Engine."
    ```
  - **Player 2 Stance**: 
    ```
    "Reimagine the person to cosplay as a Naruto shinobi character with weapons, 
    ninja accessories, outfit, and headband. Remove the background, turn left, 
    facing left, fighting pose. Realistic 3D graphics rendered in Unreal Engine."
    ```
  - **Versus Screen**: 
    ```
    "Reimagine both persons as Naruto shinobi characters with weapons, ninja 
    accessories, outfits, and headbands. Show the characters posing with a 
    lightning bolt splitting the screen in 2 saying VS, as they prepare to fight. 
    Realistic 3D graphics rendered in Unreal Engine."
    ```
  - **Battle Arena**: 
    ```
    "Reimagine both persons as Naruto shinobi characters with weapons, ninja 
    accessories, outfits, and headbands. Move the characters to far end opposite 
    sides of the arena preparing to fight each other. FIGHT in the middle on top 
    of screen. Realistic 3D graphics rendered in Unreal Engine."
    ```
- Uses `Promise.allSettled` for robust concurrent processing
- Handles partial failures gracefully
- Returns all URLs in single response

### API Endpoint: `/api/generate-video`
- Uses FAL AI's **Veo3 Fast** model for video generation
- Prompt: "The warriors charge at each other with incredible speed, energy crackling Health meters showing. Lots of acrobatic ninjutsu spells. Remove \"Fight\" from the top."
- Video specs: 8 seconds, 720p, with audio
- Queue-based processing with polling (checks every 5 seconds)
- Takes 2-3 minutes to generate

### Components:
- **`app/page.tsx`**: Manages battle data state
- **`components/BattleVideoPlayer.tsx`**: 
  - Uses pre-generated data
  - Automatically triggers video generation when battle arena is ready
  - Polls for video status and displays when complete
- **`lib/battleStorage.ts`**: Handles local storage and JSON export

### DigitalOcean Spaces:
- **`banana-profiles`**: Original uploaded images
- **`banana-edit`**: Processed battle images (stances, versus, arena)

## 🚦 Console Logs

Watch for these in the browser console:
```
🚀 Generating complete battle sequence...
✨ Battle sequence complete! All assets ready.
Battle sequence JSON: { ... } // Full JSON export
```

And in the server console:
```
🚀 Starting FULLY CONCURRENT battle sequence preparation...
⚡ Processing 4 operations simultaneously: Stances (x2), VS Screen, Battle Arena
P1 Stance: [processing...]
P2 Stance: [processing...]
VS Screen: [processing...]
Arena: [processing...]
✅ Battle sequence complete in 14.3 seconds!
📊 Results: { stances: 2, versusScreen: true, battleArena: true }
```

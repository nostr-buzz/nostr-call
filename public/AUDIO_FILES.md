# Audio Files Required

## phone-call.mp3
A ringtone audio file is required for the calling functionality. This file should be placed at `/public/phone-call.mp3`.

### Requirements:
- **Format**: MP3 (for broad browser compatibility)
- **Duration**: 2-5 seconds (will loop automatically)
- **Volume**: Moderate level, not jarring
- **Content**: Pleasant ringtone or dial tone sound

### Suggested Sources:
1. **Freesound.org**: https://freesound.org/search/?q=phone+ring
2. **Pixabay**: https://pixabay.com/sound-effects/search/phone/
3. **System sounds**: Convert from your OS sounds folder
4. **Generate**: Create a simple tone using Audacity or similar

### Quick Setup:
1. Download any ringtone MP3 file
2. Rename it to `phone-call.mp3`
3. Place it in the `/public/` directory
4. The app will automatically use it for outgoing call ringtones

### Fallback:
If the file is missing, the calling functionality will work but without audio feedback. A warning will appear in the browser console.
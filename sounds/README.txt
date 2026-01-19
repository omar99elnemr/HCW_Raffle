Prize Sound Files
=================

Place your audio files in this folder with the following names:

1. prize_5000.mp3    - Sound to play when winner wins 5,000 prize
2. prize_10000.mp3   - Sound to play when winner wins 10,000 prize  
3. prize_20000.mp3   - Sound to play when winner wins 20,000 prize
4. prize_default.mp3 - (Optional) Sound to play for any other prize amount

Supported Formats:
- MP3 (recommended for best browser compatibility)
- WAV
- OGG

Notes:
- Keep sound files under 5 seconds for best experience
- The system extracts numeric values from prize strings
  (e.g., "5000", "$5,000", "5000 AED" all trigger prize_5000.mp3)
- If a prize doesn't match 5000, 10000, or 20000, the default sound plays
- Use the "Sound On/Off" button in the app to toggle audio

To add more prize tiers, edit script_auto.js and add entries to the 
PRIZE_SOUNDS object, then add corresponding audio files.

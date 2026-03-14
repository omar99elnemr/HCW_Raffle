# 🎰 Hyatt Annual Staff Party Raffle 2026

A beautiful, interactive raffle web application for the Hyatt Regency & Hyatt Centric annual staff celebration.

![Raffle App](https://img.shields.io/badge/Event-Staff%20Party%202026-gold)
![Tech](https://img.shields.io/badge/Tech-HTML%20CSS%20JS-blue)

## ✨ Features

- **Excel File Support**: Upload staff list and prizes from Excel (.xlsx, .xls) or CSV files
- **Configurable Party Year**: Update the event year directly from the UI
- **Draw Pace Mode**: Choose `Cinematic` or `Fast` draw pacing
- **Auto Draw Mode**: Continuous automated drawing with configurable countdown between draws
- **Animated Draw**: Exciting slot-machine style animation when drawing winners
- **Validation Summary**: Blocks start when data has duplicate IDs, missing required fields, or invalid headers
- **Winner Display**: Shows winner's photo, name, position, department, prize name, and prize photo
- **Fallback Photo Indicators**: Shows when default image is used for missing/failed photos
- **Confetti Effects**: Celebratory confetti animation on each win
- **Prize Sound Effects**: Audio cues triggered by prize value
- **Status Chips**: Live chips for parsing, settings-pause, and recovered sessions
- **Winners List**: Live-updating split-screen list of all winners with prize photos
- **Virtualized Winners List**: Keeps long winner histories responsive on large events
- **Category Rounds**: Optional category-based prize rounds (e.g., Cash, Appliance)
- **Export Function**: Download winners list as Excel file (auto-exports on completion)
- **Session Persistence + Recovery Banner**: Saved raffle can be resumed or cleared from a visible banner
- **Big-Screen Presentation Mode**: One-click projector-friendly display mode
- **Styled Dialogs**: In-app styled confirmations/alerts instead of browser popups
- **Settings Modal**: Adjust timing, export filename, and reset (PIN-protected) mid-raffle
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Keyboard Support**: SPACE = Pause/Resume, ENTER = Draw Now, `P` = Presentation mode, `?` = Shortcut help, ESC = Close modal

## 📁 Project Structure

```
HCW_Raffle/
├── index.html              # Main HTML file (auto-draw raffle)
├── styles.css              # Styles and animations
├── script.js               # Raffle logic
├── README.md               # This file
├── regency.jpg             # Hyatt Regency logo
├── centric.jpg             # Hyatt Centric logo
├── sample_staff.csv        # Sample staff data
├── sample_prizes.csv       # Sample prizes data (Prize, Photo, Category columns)
├── staff/
│   └── staff_photos/       # Staff photos folder (named by staff ID)
│       └── default.svg     # Fallback photo
├── prizes/
│   └── prizes_photos/      # Prize photos folder
│       └── default.svg     # Fallback photo
└── sounds/                 # Prize sound effects
    ├── prize_5000.mp3
    ├── prize_10000.mp3
    └── prize_20000.mp3
```

## 📊 Excel File Formats

### Staff List (staff.xlsx)
| id   | name    | department | position              | photo    |
|------|---------|------------|-----------------------|----------|
| 2164 | Taha 1  | IT         | Assistant IT Manager  | 2164.jpg |
| 2165 | Ahmed   | HR         | HR Manager            | 2165.jpg |
| 2166 | Sara    | F&B        | Restaurant Manager    | 2166.jpg |

### Prizes List (prizes.xlsx / prizes.csv)
| Prize       | Photo         | Category  |
|-------------|---------------|-----------|
| 20000 AED   | prize1.jpg    | Cash      |
| 10000 AED   |               | Cash      |
| Air Fryer   | prize3.jpg    | Appliance |

The **Photo** and **Category** columns are optional. When provided, photo filenames must exist under `prizes/prizes_photos/`.

## 🚀 How to Use

1. **Add Hotel Logos**: Place `regency.jpg` and `centric.jpg` in the root folder

2. **Add Staff Photos**: Place staff photos in `staff/staff_photos/` named by employee ID (e.g., `2164.jpg`)

3. **Add Prize Photos** *(optional)*: Place prize images in `prizes/prizes_photos/` and reference filenames in the prizes Excel sheet

4. **Open the App**: Double-click `index.html` or serve it with a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve

   # Using VS Code Live Server extension
   # Right-click index.html → "Open with Live Server"
   ```

5. **Configure Settings** (before starting):
   - Set **Party Year**
   - Set **Draw Pace Mode** (`Cinematic` or `Fast`)
   - Set **Shuffle Duration** (slot-machine animation length, seconds)
   - Set **Time Between Draws** (countdown between automatic draws, seconds)
   - Optional: enable **Prize Rounds by Category**
   - Set a **PIN** to protect the mid-raffle reset function

6. **Upload Files**:
   - Click "Choose File" under Staff List and select your Excel/CSV file
   - Click "Choose File" under Prizes List and select your Excel/CSV file

7. **Start Raffle**: Click the **Start Auto Raffle** button — draws begin automatically

8. **During the Raffle**:
   - **⏸️ Pause / ▶️ Resume** — pause/resume automatic draws
   - **⏭️ Draw Now** — skip the countdown and draw immediately
   - **🔊 Sound** — toggle prize sound effects
   - **⚙️ Settings** — adjust timings, export filename, or reset (PIN required)

9. **Export Results**: Winners are auto-exported on completion, or click **📥 Export Winners** at any time

## 🎨 Customization

### Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-gold: #D4AF37;
    --primary-dark: #1a1a2e;
    --accent-purple: #6c5ce7;
    --accent-pink: #fd79a8;
}
```

### Timing
Adjust defaults in `script.js`:
```javascript
let drawIntervalTime = 3000;  // ms between draws
let shuffleDuration  = 2000;  // ms for slot-machine animation
```
These can also be changed live via the **⚙️ Settings** modal during the raffle.

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## 🔧 Dependencies

- [SheetJS (xlsx)](https://sheetjs.com/) - Excel file parsing (loaded via CDN)
- [Google Fonts](https://fonts.google.com/) - Playfair Display & Montserrat fonts

## 📄 License

Created for Hyatt Hotels Annual Staff Party 2026.

---

Made with ❤️ for the Hyatt Team

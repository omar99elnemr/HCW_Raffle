# 🎰 Hyatt Annual Staff Party Raffle 2026

A beautiful, interactive raffle web application for the Hyatt Regency & Hyatt Centric annual staff celebration.

![Raffle App](https://img.shields.io/badge/Event-Staff%20Party%202026-gold)
![Tech](https://img.shields.io/badge/Tech-HTML%20CSS%20JS-blue)

## ✨ Features

- **Excel File Support**: Upload staff list and prizes from Excel (.xlsx, .xls) or CSV files
- **Animated Draw**: Exciting slot-machine style animation when drawing winners
- **Winner Display**: Shows winner's photo, name, position, department, and prize
- **Confetti Effects**: Celebratory confetti animation on each win
- **Winners List**: Live-updating grid of all winners
- **Export Function**: Download winners list as Excel file
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Keyboard Support**: Press SPACE to draw a winner

## 📁 Project Structure

```
HCW_Raffle/
├── index.html          # Main HTML file
├── styles.css          # Styles and animations
├── script.js           # Raffle logic
├── README.md           # This file
├── regency.jpg         # Hyatt Regency logo
├── centric.jpg         # Hyatt Centric logo
└── photos/             # Staff photos folder
    ├── 2164.jpg
    ├── 2165.jpg
    └── default.jpg     # Fallback photo
```

## 📊 Excel File Formats

### Staff List (staff.xlsx)
| id   | name    | department | position              | photo    |
|------|---------|------------|-----------------------|----------|
| 2164 | Taha 1  | IT         | Assistant IT Manager  | 2164.jpg |
| 2165 | Ahmed   | HR         | HR Manager            | 2165.jpg |
| 2166 | Sara    | F&B        | Restaurant Manager    | 2166.jpg |

### Prizes List (prizes.xlsx)
| Prize                    |
|--------------------------|
| iPhone 15 Pro            |
| iPad Air                 |
| AirPods Pro              |
| Gift Card $500           |
| Weekend Stay - Suite     |

## 🚀 How to Use

1. **Add Hotel Logos**: Place `regency.jpg` and `centric.jpg` in the root folder

2. **Add Staff Photos**: Create a `photos/` subfolder and add staff photos named by their ID (e.g., `2164.jpg`)

3. **Open the App**: Double-click `index.html` or serve it with a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   
   # Using VS Code Live Server extension
   # Right-click index.html → "Open with Live Server"
   ```

4. **Upload Files**:
   - Click "Choose File" under Staff List and select your Excel file
   - Click "Choose File" under Prizes List and select your Excel file

5. **Start Raffle**: Click the "Start Raffle" button

6. **Draw Winners**: 
   - Click the "Draw Winner" button, or
   - Press the SPACEBAR

7. **Export Results**: Click "Export Winners List" to download an Excel file with all winners

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

### Animation Speed
In `script.js`, adjust the draw animation duration:
```javascript
const duration = 3000; // milliseconds
```

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

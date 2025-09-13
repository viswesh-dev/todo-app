# Todo App - Minimal Task Manager

A production-quality, offline-capable to-do list web application built with vanilla HTML, CSS, and JavaScript. Features a clean, minimal "Warp-like" aesthetic with advanced functionality and modern web standards.

## Features

### Core Functionality
- ✅ **Task Management**: Add, edit, delete, and complete tasks
- 🏷️ **Tags & Organization**: Organize tasks with comma-separated tags
- 🎯 **Priorities**: Set High, Medium, Low, or No priority
- 📅 **Due Dates**: Set due dates with natural language support (e.g., "today", "tomorrow", "next monday")
- 🔍 **Search & Filter**: Real-time search and filter by status or tags
- 📊 **Sorting**: Sort by created date, due date, priority, or title
- 🖱️ **Drag & Drop**: Reorder tasks with intuitive drag-and-drop interface

### Advanced Features
- ↩️ **Undo/Redo**: Full undo/redo support for the last 10 actions
- 🗂️ **Bulk Operations**: Select multiple tasks for batch operations
- 📤 **Import/Export**: Export tasks to JSON or import from backup files
- ⌨️ **Keyboard Shortcuts**: Full keyboard navigation and shortcuts
- 🌓 **Theme Support**: Light, dark, and auto themes with system preference detection
- 📱 **Responsive Design**: Mobile-first design that works on all screen sizes

### PWA & Offline Features
- 🔌 **Offline Support**: Full functionality without internet connection
- 📱 **Installable**: Install as native app on desktop and mobile
- 💾 **Local Storage**: Data persists using IndexedDB with localStorage fallback
- 🔄 **Service Worker**: Advanced caching strategies for optimal performance
- 🚀 **Fast Loading**: Optimized for speed with minimal resource usage

### Accessibility & UX
- ♿ **Fully Accessible**: WCAG compliant with screen reader support
- ⌨️ **Keyboard Navigation**: Complete keyboard control
- 🎨 **Clean Design**: Minimal, distraction-free interface
- ⚡ **Smooth Animations**: Respectful motion with reduced motion support
- 📢 **Live Feedback**: Toast notifications and live region updates

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB (primary) with localStorage fallback
- **PWA**: Service Worker, Web App Manifest
- **Build**: None required - zero build tools
- **Dependencies**: Zero external dependencies or CDNs

## Quick Start

### Option 1: Simple File Opening
1. Download or clone this repository
2. Open `index.html` directly in your browser
3. Start managing your tasks!

### Option 2: Local Server (Recommended for PWA features)
For full PWA functionality including service worker and installability:

#### Using Python:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Using Node.js:
```bash
# Install a simple server globally
npm install -g http-server

# Run server
http-server -p 8000
```

#### Using PHP:
```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Focus add task input |
| `/` | Focus search |
| `Esc` | Cancel current action |
| `E` | Edit selected task |
| `X` | Toggle complete selected task |
| `Del` | Delete selected task |
| `Ctrl+A` / `Cmd+A` | Select all visible tasks |
| `Ctrl+U` / `Cmd+U` | Undo last action |
| `Ctrl+R` / `Cmd+R` | Redo action |

## Natural Language Due Dates

The app supports natural language parsing for due dates:
- "today" → Sets due date to today at 11:59 PM
- "tomorrow" → Sets due date to tomorrow at 11:59 PM  
- "monday", "tuesday", etc. → Sets due date to next occurrence of that weekday
- Standard date formats also work

## Data Storage

- **Primary**: IndexedDB for structured data with advanced querying
- **Fallback**: localStorage for browsers without IndexedDB support
- **Export/Import**: JSON format for backup and migration
- **Privacy**: All data stored locally, no server communication

## Browser Compatibility

### Minimum Requirements
- Chrome 50+ / Safari 10+ / Firefox 45+ / Edge 15+
- JavaScript enabled
- 5MB+ available storage space

### Full PWA Support
- Chrome 70+ / Safari 11.1+ / Firefox 65+ / Edge 79+
- Service Worker support
- Web App Manifest support

## File Structure


```
vanilla-todo-app/
├── index.html         # Main HTML file
├── styles.css         # All CSS styles and themes
├── app.js             # Main JavaScript application
├── sw.js              # Service Worker for offline support
├── manifest.json      # PWA manifest
├── background.png     # Background image (used for pixel art or theming)
├── README.md          # This file
└── .git/              # Git repository (if cloned)
```

## Development

### Adding Features
The app is architected with clear separation of concerns:

- **HTML**: Semantic structure in `index.html`
- **CSS**: Modular styles with CSS custom properties
- **JavaScript**: Organized into modules within `app.js`
  - `Utils`: Helper functions
  - `Storage`: Data persistence layer
  - `StateManager`: State management and actions
  - `UI`: User interface and rendering

### Code Quality
- **No Build Tools**: Pure web standards, no compilation required
- **Modern JavaScript**: ES6+ features with broad browser support
- **Modular CSS**: Organized with CSS custom properties and logical sections
- **Accessible**: ARIA labels, semantic HTML, keyboard navigation
- **Well Commented**: JSDoc-style comments throughout

### Performance
- **Optimized for 1,000+ tasks**: Efficient rendering and filtering
- **Debounced Operations**: Search and save operations are optimized
- **Minimal Reflows**: Careful DOM manipulation to avoid layout thrashing
- **Service Worker**: Intelligent caching for instant loading

## License

This project is open source. Feel free to use, modify, and distribute as needed.

## Contributing

Since this is a vanilla JavaScript project with no build process:

1. Fork the repository
2. Make your changes directly to the HTML, CSS, or JS files
3. Test in multiple browsers
4. Submit a pull request

## Troubleshooting

### Service Worker Issues
If you encounter service worker problems:
1. Open DevTools → Application → Service Workers
2. Click "Unregister" to remove the service worker
3. Hard refresh (Ctrl+Shift+R) to reload

### Storage Issues
If tasks aren't saving:
1. Check DevTools → Application → Storage
2. Ensure you have sufficient storage quota
3. Try clearing storage and reimporting your data

### PWA Installation
For PWA installation:
1. Serve over HTTPS (or localhost)
2. Ensure service worker registers successfully
3. Look for install prompt in browser address bar

## Performance Tips

- **Regular Cleanup**: Export and clear completed tasks periodically
- **Browser Storage**: Monitor storage usage in DevTools
- **Offline Usage**: Install as PWA for best offline experience
- **Keyboard Navigation**: Use shortcuts for faster task management

---

**Built with ❤️ for web**

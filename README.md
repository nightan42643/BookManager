# 📚 Bookmark Manager Chrome Extension

English | [简体中文](README_zh-CN.md)

A clean, efficient, and beautiful Chrome bookmark management tool displayed as a full-screen new tab page, keeping your bookmarks organized.

## ✨ Features

- 🎯 **New Tab Override** - Beautiful bookmark manager interface on every new tab
- 🔍 **Real-time Search** - Quickly search bookmarks by title and URL
- 📁 **Folder Management** - Full support for Chrome native bookmark folder structure
- ✏️ **Bookmark Editing** - Add, edit, and delete bookmarks and folders
- 🌍 **Bilingual Interface** - Switch between Chinese and English
- 🎨 **Elegant UI** - Modern gradient design with smooth animations
- 🖼️ **Website Icons** - Automatic favicon fetching and caching
- 🕐 **Smart Greetings** - Time-based greeting messages
- 🐛 **Debug Mode** - Built-in developer options and logging system

## 🚀 Installation

### Developer Mode Installation

1. **Load Extension**
   - Open Chrome and visit `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked"
   - Select the project folder
   - Done!

2. **Start Using**
   - Open a new tab (`Cmd+T` / `Ctrl+T`)
   - Your bookmark manager interface will appear

## 📖 User Guide

### Basic Operations

**Browse Bookmarks**
- Folder list displayed on the left, including "Bookmarks Bar", "Other Bookmarks", etc.
- Click a folder to view its bookmarks
- Bookmarks displayed as cards showing website icon, title, and domain

**Search Bookmarks**
- Enter keywords in the top search box
- Real-time filtering of matching bookmarks

**Add Bookmarks**
- Click "Add Bookmark" button
- Fill in title, URL, and select target folder
- Click "Save"

**Create Folders**
- Click "New Folder" button
- Enter folder name
- New folder will be created under the currently selected folder

**Edit and Delete**
- Enter "Edit Mode" to display all action buttons
- Or hover over bookmark cards to show action buttons
- Click edit button to modify bookmark information
- Click delete button to remove bookmarks

**Switch Language**
- Click the language toggle button (🌍) in the top right corner
- Or select language in Settings

**Settings Options**
- Click "Settings" button to open settings panel
- Switch interface language
- Enable debug mode to view detailed logs
- Clear favicon cache

## 🛠️ Tech Stack

- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No framework dependencies, lightweight and efficient
- **Modern CSS** - Flexbox layout, CSS variables, animations
- **Chrome Bookmarks API** - Manage bookmark data
- **Chrome Storage API** - Local data storage
- **Internationalization** - Complete bilingual system

## 📁 Project Structure

```
bookmark-manager/
├── manifest.json          # Extension configuration
├── newtab.html           # New tab HTML
├── newtab.css            # Stylesheet
├── newtab.js             # Main functionality script
├── background.js         # Background service (favicon cache)
├── default-favicon.svg   # Default icon
├── package.json          # Node.js configuration
├── generate-icons.js     # Icon generation script
├── icons/                # Extension icons
└── README.md             # Documentation
```

## 🔧 Development

### Refresh Extension After Code Changes

1. Find the extension on `chrome://extensions/` page
2. Click the refresh icon
3. Open a new tab to see the changes
4. Press `F12` to open DevTools for debugging

### Customize Styles

Edit `newtab.css` to customize the interface:
- CSS variables defined in `:root`
- Modify gradients, fonts, spacing, etc.
- Adjust card layout and sizes

### Add New Translations

Add new key-value pairs in the `i18n` object in `newtab.js`:
```javascript
const i18n = {
  'zh-CN': { key: '中文文本' },
  'en-US': { key: 'English text' }
};
```

## 📝 Version Information

**Current Version:** 1.0.0  
**Release Date:** 2026-02-27

### Version Features

- ✅ Complete bookmark management functionality
- ✅ Bilingual interface support (中文/English)
- ✅ Automatic website icon fetching and caching
- ✅ Search and filtering functionality
- ✅ Folder hierarchy browsing
- ✅ Edit mode
- ✅ Debug and logging system
- ✅ Responsive layout

## 📄 License

MIT License

## 🤝 Contributing

Feel free to submit Issues and Pull Requests!

---

**Enjoy efficient bookmark management!** 📚✨

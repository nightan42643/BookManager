// ==================== 全局变量 ====================
let bookmarkTree = null; // 完整的书签树
let topLevelFolders = []; // 三个顶级文件夹
let currentFolderId = null; // 当前选中的文件夹 ID
let currentFolderData = null; // 当前文件夹的数据
let editMode = false;
let editingBookmarkId = null;

// ==================== 多语言系统 ====================
let currentLang = localStorage.getItem('bookmarkManagerLang') || 'zh-CN';

const i18n = {
  'zh-CN': {
    title: '书签管理器',
    searchPlaceholder: '🔍 搜索书签...',
    newFolder: '新建文件夹',
    settings: '设置',
    myGroups: '我的分组',
    morning: '早上好',
    afternoon: '下午好',
    evening: '晚上好',
    night: '深夜了',
    language: '语言',
    languageTitle: '界面语言',
    languageDesc: '选择你喜欢的语言',
    developer: '开发者选项',
    debugMode: 'Debug 模式',
    debugModeDesc: '显示详细的调试日志信息',
    cacheManagement: '缓存管理',
    faviconCache: 'Favicon 缓存',
    clearCache: '清空缓存',
    about: '关于',
    version: '版本信息',
    versionInfo: '书签管理器 v1.0.0',
    close: '关闭',
    loading: '加载中...',
    cacheCount: '已缓存 {count} 个图标',
    clearCacheConfirm: '确定要清空缓存吗？',
    cacheClearedSuccess: '缓存已清空',
    cacheClearedError: '清空缓存失败',
    debugEnabled: 'Debug 模式已开启',
    debugDisabled: 'Debug 模式已关闭',
    bookmarksBar: '书签栏',
    otherBookmarks: '其他书签',
    mobileBookmarks: '移动书签',
    bookmarkFolders: '书签文件夹',
    bookmarksCount: '{count} 个书签',
    itemsCount: '{count} 项',
    addBookmark: '添加书签',
    editMode: '编辑模式',
    editBookmark: '编辑书签',
    createFolder: '创建文件夹',
    finishEditing: '完成编辑',
    moveBookmarkSuccess: '书签移动成功',
    moveBookmarkError: '移动书签失败',
    bookmarkTitle: '标题',
    bookmarkUrl: '网址',
    bookmarkGroup: '分组',
    folderName: '文件夹名称',
    titlePlaceholder: '输入书签标题',
    urlPlaceholder: 'https://example.com',
    folderNamePlaceholder: '输入文件夹名称',
    selectFolder: '选择文件夹...',
    cancel: '取消',
    save: '保存',
    deleteConfirm: '确定要删除这个书签吗？',
    validationError: '请填写标题和网址',
    saveError: '保存失败，请重试',
    deleteError: '删除失败，请重试',
    createFolderError: '创建失败，请重试',
    folderNameRequired: '请输入文件夹名称',
    emptyFolder: '这个文件夹是空的',
    noBookmarks: '还没有书签',
    clickToAdd: '点击“添加书签”开始创建你的第一个书签',
    noMatchingBookmarks: '没有找到匹配的书签',
    loadBookmarksError: '加载书签失败',
    folder: '文件夹',
    untitledFolder: '未命名文件夹',
    edit: '编辑',
    delete: '删除',
    topLevelFolders: '顶级文件夹',
    currentFolderSubfolders: '当前文件夹的子文件夹',
    dragDataIncomplete: '拖拽数据不完整',
  },
  'en-US': {
    title: 'Bookmark Manager',
    searchPlaceholder: '🔍 Search bookmarks...',
    newFolder: 'New Folder',
    settings: 'Settings',
    myGroups: 'My Groups',
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening',
    night: 'Late Night',
    language: 'Language',
    languageTitle: 'Interface Language',
    languageDesc: 'Choose your preferred language',
    developer: 'Developer Options',
    debugMode: 'Debug Mode',
    debugModeDesc: 'Show detailed debug logging',
    cacheManagement: 'Cache Management',
    faviconCache: 'Favicon Cache',
    clearCache: 'Clear Cache',
    about: 'About',
    version: 'Version',
    versionInfo: 'Bookmark Manager v1.0.0',
    close: 'Close',
    loading: 'Loading...',
    cacheCount: '{count} icons cached',
    clearCacheConfirm: 'Are you sure you want to clear the cache?',
    cacheClearedSuccess: 'Cache cleared',
    cacheClearedError: 'Failed to clear cache',
    debugEnabled: 'Debug mode enabled',
    debugDisabled: 'Debug mode disabled',
    bookmarksBar: 'Bookmarks Bar',
    otherBookmarks: 'Other Bookmarks',
    mobileBookmarks: 'Mobile Bookmarks',
    bookmarkFolders: 'Bookmark Folders',
    bookmarksCount: '{count} bookmarks',
    itemsCount: '{count} items',
    addBookmark: 'Add Bookmark',
    editMode: 'Edit Mode',
    editBookmark: 'Edit Bookmark',
    createFolder: 'Create Folder',
    finishEditing: 'Finish Editing',
    moveBookmarkSuccess: 'Bookmark moved successfully',
    moveBookmarkError: 'Failed to move bookmark',
    bookmarkTitle: 'Title',
    bookmarkUrl: 'URL',
    bookmarkGroup: 'Folder',
    folderName: 'Folder Name',
    titlePlaceholder: 'Enter bookmark title',
    urlPlaceholder: 'https://example.com',
    folderNamePlaceholder: 'Enter folder name',
    selectFolder: 'Select folder...',
    cancel: 'Cancel',
    save: 'Save',
    deleteConfirm: 'Are you sure you want to delete this bookmark?',
    validationError: 'Please enter title and URL',
    saveError: 'Save failed, please try again',
    deleteError: 'Delete failed, please try again',
    createFolderError: 'Create failed, please try again',
    folderNameRequired: 'Please enter folder name',
    emptyFolder: 'This folder is empty',
    noBookmarks: 'No bookmarks yet',
    clickToAdd: 'Click "Add Bookmark" to create your first bookmark',
    noMatchingBookmarks: 'No matching bookmarks found',
    loadBookmarksError: 'Failed to load bookmarks',
    folder: 'Folder',
    untitledFolder: 'Untitled Folder',
    edit: 'Edit',
    delete: 'Delete',
    topLevelFolders: 'Top Level Folders',
    currentFolderSubfolders: 'Subfolders of Current Folder',
    dragDataIncomplete: 'Drag data incomplete',
  }
};

function t(key, params = {}) {
  let text = i18n[currentLang]?.[key] || i18n['zh-CN'][key] || key;
  // 替换参数
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  return text;
}

function applyTranslations() {
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // 更新 placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  // 更新语言切换按钮文本
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.innerHTML = `🌍 ${currentLang === 'zh-CN' ? '中文' : 'English'}`;
  }
  
  // 更新语言选择器
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.value = currentLang;
  }
  
  // 更新问候语
  updateGreeting();
  
  // 更新缓存信息
  updateCacheInfo();
}

function switchLanguage(lang) {
  if (i18n[lang]) {
    currentLang = lang;
    localStorage.setItem('bookmarkManagerLang', lang);
    applyTranslations();
    // 重新渲染文件夹以更新书签栏/其他书签的名称
    renderFolders();
    // 重新渲染内容以更新书签数量文本
    if (currentFolderId) {
      renderContent();
    }
    logger.info(`Language switched to ${lang}`);
  }
}

// ==================== Debug 模式和日志系统 ====================
let debugMode = localStorage.getItem('bookmarkManagerDebug') === 'true';

const logger = {
  // Info 级别：重要信息，始终显示
  info: (message, ...args) => {
    console.log(`%c[INFO]%c ${message}`, 'color: #2196F3; font-weight: bold', 'color: inherit', ...args);
  },
  
  // Debug 级别：详细信息，仅在 debug 模式显示
  debug: (message, ...args) => {
    if (debugMode) {
      console.log(`%c[DEBUG]%c ${message}`, 'color: #9E9E9E; font-weight: bold', 'color: #666', ...args);
    }
  },
  
  // Error 级别：错误信息，始终显示
  error: (message, ...args) => {
    console.error(`%c[ERROR]%c ${message}`, 'color: #F44336; font-weight: bold', 'color: inherit', ...args);
  }
};

function toggleDebugMode() {
  debugMode = !debugMode;
  localStorage.setItem('bookmarkManagerDebug', debugMode.toString());
  
  // 同步到 background.js
  chrome.runtime.sendMessage({ action: 'setDebugMode', enabled: debugMode });
  
  logger.info(t(debugMode ? 'debugEnabled' : 'debugDisabled'));
  
  // 更新设置界面中的 toggle 状态
  const toggle = document.getElementById('debugModeToggle');
  if (toggle) {
    toggle.checked = debugMode;
  }
}

// ====================设置模态框 ====================
function openSettingsModal() {
  // 设置 debug toggle 的初始状态
  document.getElementById('debugModeToggle').checked = debugMode;
  
  // 更新缓存信息
  updateCacheInfo();
  
  document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

async function updateCacheInfo() {
  chrome.storage.local.get(['faviconCache'], (result) => {
    const cacheInfoEl = document.getElementById('cacheInfo');
    if (result.faviconCache) {
      const cacheSize = Object.keys(result.faviconCache).length;
      cacheInfoEl.textContent = t('cacheCount', { count: cacheSize });
    } else {
      cacheInfoEl.textContent = t('cacheCount', { count: 0 });
    }
  });
}

async function clearFaviconCache() {
  if (confirm(t('clearCacheConfirm'))) {
    try {
      await chrome.storage.local.remove('faviconCache');
      logger.info(t('cacheClearedSuccess'));
      updateCacheInfo();
      // 刷新页面以重新加载图标
      if (currentFolderId) {
        renderContent();
      }
    } catch (error) {
      logger.error(t('cacheClearedError'), error);
    }
  }
}

// ====================时间和问候语 ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadBookmarks();
  updateTime();
  updateGreeting();
  applyTranslations(); // 应用翻译
  setupEventListeners();
  renderFolders();
  
  // 从 URL hash 恢复状态，或默认选中第一个文件夹
  const hash = window.location.hash.substring(1); // 移除 '#'
  if (hash && getFolderById(hash)) {
    selectFolder(hash, false); // false = 不更新 hash（已经在 URL 中）
  } else if (topLevelFolders.length > 0) {
    selectFolder(topLevelFolders[0].id);
  }
  
  // 监听 URL hash 变化（支持浏览器前进/后退）
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.substring(1);
    if (newHash && newHash !== currentFolderId && getFolderById(newHash)) {
      selectFolder(newHash, false); // false = 不更新 hash
    }
  });
  
  // 显示当前缓存统计
  chrome.storage.local.get(['faviconCache'], (result) => {
    if (result.faviconCache) {
      const cacheSize = Object.keys(result.faviconCache).length;
      logger.info(`当前 storage 中有 ${cacheSize} 条 favicon 缓存`);
    }
  });
  
  // 触发扫描所有标签页获取 favicon
  triggerFaviconScan();
  
  // 每分钟更新一次时间
  setInterval(updateTime, 60000);
});

// ==================== 时间和问候语 ====================
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  document.getElementById('currentTime').textContent = timeString;
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greetingKey = 'morning';
  
  if (hour >= 5 && hour < 12) {
    greetingKey = 'morning';
  } else if (hour >= 12 && hour < 18) {
    greetingKey = 'afternoon';
  } else if (hour >= 18 && hour < 22) {
    greetingKey = 'evening';
  } else {
    greetingKey = 'night';
  }
  
  document.getElementById('greeting').textContent = t(greetingKey);
}

// ==================== 事件监听 ====================
function setupEventListeners() {
  // 语言切换 - 右上角按钮
  document.getElementById('langToggle').addEventListener('click', () => {
    const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
    switchLanguage(newLang);
  });
  
  // 语言切换 - 设置中的下拉框
  document.getElementById('languageSelect').addEventListener('change', (e) => {
    switchLanguage(e.target.value);
  });
  
  // 设置
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
  
  // 搜索
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  
  // 添加书签
  document.getElementById('addBookmarkBtn').addEventListener('click', openAddBookmarkModal);
  
  // 编辑模式
  document.getElementById('editModeBtn').addEventListener('click', toggleEditMode);
  
  // 添加分组按钮改为添加文件夹
  document.getElementById('addGroupBtn').addEventListener('click', openAddFolderModal);
  
  // 模态框关闭
  document.getElementById('closeModal').addEventListener('click', closeBookmarkModal);
  document.getElementById('cancelBtn').addEventListener('click', closeBookmarkModal);
  document.getElementById('closeGroupModal').addEventListener('click', closeFolderModal);
  document.getElementById('cancelGroupBtn').addEventListener('click', closeFolderModal);
  document.getElementById('closeSettingsModal').addEventListener('click', closeSettingsModal);
  document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);
  
  // 保存书签
  document.getElementById('saveBookmarkBtn').addEventListener('click', saveBookmark);
  
  // 保存文件夹
  document.getElementById('saveGroupBtn').addEventListener('click', saveFolder);
  
  // 图标选择
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.getElementById('groupIcon').value = e.target.textContent;
    });
  });
  
  // 设置 - Debug 模式切换
  document.getElementById('debugModeToggle').addEventListener('change', (e) => {
    debugMode = e.target.checked;
    localStorage.setItem('bookmarkManagerDebug', debugMode.toString());
    chrome.runtime.sendMessage({ action: 'setDebugMode', enabled: debugMode });
    logger.info(t(debugMode ? 'debugEnabled' : 'debugDisabled'));
  });
  
  // 设置 - 清空缓存
  document.getElementById('clearCacheBtn').addEventListener('click', clearFaviconCache);
  
  // 点击模态框外部关闭
  document.getElementById('bookmarkModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookmarkModal') {
      closeBookmarkModal();
    }
  });
  
  document.getElementById('groupModal').addEventListener('click', (e) => {
    if (e.target.id === 'groupModal') {
      closeFolderModal();
    }
  });
}

// ==================== 加载书签 ====================
async function loadBookmarks() {
  try {
    const tree = await chrome.bookmarks.getTree();
    bookmarkTree = tree[0];
    
    // 提取三个顶级文件夹
    topLevelFolders = [];
    
    if (bookmarkTree.children) {
      bookmarkTree.children.forEach(folder => {
        if (folder.children) {
          // 根据 ID 或标题识别三个主要文件夹
          const folderInfo = {
            id: folder.id,
            title: folder.title,
            children: folder.children,
            dateAdded: folder.dateAdded
          };
          
          // 设置友好的显示名称和图标
          if (folder.title === 'Bookmarks bar' || folder.id === '1') {
            folderInfo.displayNameKey = 'bookmarksBar';
            folderInfo.icon = '⭐';
          } else if (folder.title === 'Other bookmarks' || folder.id === '2') {
            folderInfo.displayNameKey = 'otherBookmarks';
            folderInfo.icon = '📚';
          } else if (folder.title === 'Mobile bookmarks') {
            folderInfo.displayNameKey = 'mobileBookmarks';
            folderInfo.icon = '📱';
          } else {
            folderInfo.displayNameKey = null;
            folderInfo.icon = '📁';
          }
          
          topLevelFolders.push(folderInfo);
        }
      });
    }
  } catch (error) {
    logger.error(t('loadBookmarksError'), error);
  }
}

// 根据文件夹 ID 获取文件夹数据
function getFolderById(folderId, node = bookmarkTree) {
  if (!node) return null;
  
  if (node.id === folderId) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const result = getFolderById(folderId, child);
      if (result) return result;
    }
  }
  
  return null;
}

// 统计文件夹中的书签数量（包括子文件夹）
function countBookmarksInFolder(folder) {
  if (!folder || !folder.children) return 0;
  
  let count = 0;
  folder.children.forEach(child => {
    if (child.url) {
      count++;
    } else if (child.children) {
      count += countBookmarksInFolder(child);
    }
  });
  
  return count;
}

// ==================== 渲染左侧文件夹列表 ====================
function renderFolders() {
  const groupsList = document.getElementById('groupsList');
  const groupCount = document.getElementById('groupCount');
  
  groupCount.textContent = topLevelFolders.length;
  
  let html = `<div class="group-section-title">${t('bookmarkFolders')}</div>`;
  
  html += topLevelFolders.map(folder => {
    const count = countBookmarksInFolder(folder);
    const isActive = currentFolderId === folder.id ? 'active' : '';
    const displayName = folder.displayNameKey ? t(folder.displayNameKey) : folder.title;
    
    return `
      <div class="group-item ${isActive}" 
           data-folder-id="${folder.id}"
           data-droppable="true">
        <span class="group-icon">${folder.icon}</span>
        <div class="group-info">
          <div class="group-name">${escapeHtml(displayName)}</div>
          <div class="group-count">${t('bookmarksCount', { count })}</div>
        </div>
      </div>
    `;
  }).join('');
  
  groupsList.innerHTML = html;
  
  // 绑定文件夹点击事件
  document.querySelectorAll('.group-item').forEach(item => {
    item.addEventListener('click', () => {
      const folderId = item.dataset.folderId;
      selectFolder(folderId);
    });
    // 绑定拖放事件
    setupDropZone(item);
  });
}

function selectFolder(folderId, updateHash = true) {
  currentFolderId = folderId;
  currentFolderData = getFolderById(folderId);
  
  if (currentFolderData) {
    const folder = topLevelFolders.find(f => f.id === folderId);
    if (folder) {
      const displayName = folder.displayNameKey ? t(folder.displayNameKey) : folder.title;
      document.getElementById('currentGroupTitle').textContent = displayName;
    } else {
      document.getElementById('currentGroupTitle').textContent = currentFolderData.title || t('folder');
    }
  }
  
  // 更新 URL hash（支持书签/刷新/前进后退）
  if (updateHash) {
    window.location.hash = folderId;
  }
  
  renderFolders();
  renderContent();
}

// ==================== 渲染右侧内容区域 ====================
function renderContent() {
  const bookmarksGrid = document.getElementById('bookmarksGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (!currentFolderData || !currentFolderData.children) {
    bookmarksGrid.innerHTML = '';
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = t('emptyFolder');
    emptyState.querySelector('p').textContent = t('clickToAdd');
    return;
  }
  
  const items = currentFolderData.children;
  
  if (items.length === 0) {
    bookmarksGrid.innerHTML = '';
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = t('emptyFolder');
    emptyState.querySelector('p').textContent = t('clickToAdd');
    return;
  }
  
  emptyState.style.display = 'none';
  
  // 分离文件夹和书签
  const folders = items.filter(item => item.children);
  const bookmarks = items.filter(item => item.url);
  
  let html = '';
  
  // 先渲染子文件夹
  folders.forEach(folder => {
    html += createFolderCard(folder);
  });
  
  // 再渲染书签
  bookmarks.forEach(bookmark => {
    html += createBookmarkCard(bookmark);
  });
  
  bookmarksGrid.innerHTML = html;
  
  logger.debug(`当前页面显示 ${folders.length} 个文件夹，${bookmarks.length} 个书签`);
  
  // 先绑定图标错误处理（简单降级到 emoji）
  document.querySelectorAll('.bookmark-card img').forEach(img => {
    img.addEventListener('error', () => {
      const url = img.dataset.bookmarkUrl;
      if (url) {
        handleFaviconError(img, url);
      }
    });
  });
  
  // 使用 Intersection Observer 实现懒加载：只加载可见书签的 favicon
  setupLazyLoadFavicons();
  
  // 绑定文件夹卡片点击事件
  document.querySelectorAll('.folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folderId = card.dataset.folderId;
      selectFolder(folderId);
    });
    // 绑定拖放事件
    setupDropZone(card);
  });
  
  // 绑定书签卡片拖拽事件
  document.querySelectorAll('.bookmark-card[draggable="true"]').forEach(card => {
    setupDraggable(card);
  });
  
  // 绑定书签卡片点击事件
  document.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!editMode && !e.target.closest('.bookmark-actions')) {
        const url = card.dataset.url;
        window.open(url, '_blank');
      }
    });
  });
  
  // 绑定书签操作按钮
  document.querySelectorAll('.edit-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookmarkId = btn.closest('.bookmark-card').dataset.bookmarkId;
      openEditBookmarkModal(bookmarkId);
    });
  });
  
  document.querySelectorAll('.delete-bookmark').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const bookmarkId = btn.closest('.bookmark-card').dataset.bookmarkId;
      await deleteBookmark(bookmarkId);
    });
  });
}

// 创建文件夹卡片
function createFolderCard(folder) {
  const count = countBookmarksInFolder(folder);
  const editModeClass = editMode ? 'edit-mode' : '';
  
  return `
    <div class="folder-card ${editModeClass}" 
         data-folder-id="${folder.id}"
         data-droppable="true">
      <div class="folder-card-icon">📁</div>
      <div class="folder-card-title">${escapeHtml(folder.title || t('untitledFolder'))}</div>
      <div class="folder-card-count">${t('itemsCount', { count })}</div>
    </div>
  `;
}

// 创建书签卡片
function createBookmarkCard(bookmark) {
  const editModeClass = editMode ? 'edit-mode' : '';
  // 使用本地默认图标作为占位符
  const placeholderIcon = 'default-favicon.svg';
  
  return `
    <div class="bookmark-card ${editModeClass}" 
         data-bookmark-id="${bookmark.id}" 
         data-url="${escapeHtml(bookmark.url)}"
         draggable="true">
      <img class="bookmark-favicon-large" 
           src="${placeholderIcon}" 
           data-bookmark-url="${escapeHtml(bookmark.url)}"
           alt="">
      <div class="bookmark-card-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
      <div class="bookmark-card-url">${escapeHtml(getDisplayUrl(bookmark.url))}</div>
      <div class="bookmark-actions">
        <button class="bookmark-action-btn edit-bookmark" title="${t('edit')}">
          ✏️
        </button>
        <button class="bookmark-action-btn delete-bookmark" title="${t('delete')}">
          🗑️
        </button>
      </div>
    </div>
  `;
}

function getFavicon(url) {
  try {
    const urlObj = new URL(url);
    // 返回网站自己的 favicon.ico 作为初始值
    return `${urlObj.origin}/favicon.ico`;
  } catch {
    return 'default-favicon.svg';
  }
}

// 懒加载：只加载可视区域书签的 favicon
function setupLazyLoadFavicons() {
  const bookmarkImages = document.querySelectorAll('.bookmark-card img');
  if (bookmarkImages.length === 0) {
    return;
  }
  
  logger.debug(`设置懒加载：监听 ${bookmarkImages.length} 个书签图标`);
  
  // 用于批量请求的 URL 队列
  let pendingUrls = [];
  let batchTimeout = null;
  
  // 批量请求 favicon（避免频繁请求）
  const processBatch = async () => {
    if (pendingUrls.length === 0) return;
    
    const urls = [...pendingUrls];
    pendingUrls = [];
    
    // 按 hostname 去重（避免同一域名重复请求）
    const hostnameToUrls = new Map();
    for (const url of urls) {
      try {
        const hostname = new URL(url).hostname;
        if (!hostnameToUrls.has(hostname)) {
          hostnameToUrls.set(hostname, []);
        }
        hostnameToUrls.get(hostname).push(url);
      } catch (e) {
        // 忽略无效 URL
      }
    }
    
    logger.debug(`批量请求 ${urls.length} 个可见书签（${hostnameToUrls.size} 个不同域名）的 favicon`);
    
    // 先从后台获取已缓存的
    for (const url of urls) {
      const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
      if (!img) continue;
      
      const cachedFavicon = await getCachedFavicon(url);
      if (cachedFavicon) {
        img.src = cachedFavicon;
        img.style.opacity = '0';
        setTimeout(() => { img.style.opacity = '1'; }, 50);
      }
    }
    
    // 收集没有缓存的 URL
    const uncachedUrls = [];
    for (const url of urls) {
      const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
      if (img && img.src.includes('default-favicon.svg')) {
        uncachedUrls.push(url);
      }
    }
    
    // 批量获取未缓存的 favicon
    if (uncachedUrls.length > 0) {
      logger.debug(`发现 ${uncachedUrls.length} 个未缓存的书签，请求获取 favicon`);
      await fetchVisibleFavicons(uncachedUrls);
      
      // 获取完成后更新显示（为所有相关 URL 更新图标）
      setTimeout(async () => {
        // 为所有 hostname 的 URL 更新显示
        for (const [hostname, urlList] of hostnameToUrls) {
          // 用任意一个 URL 查询该 hostname 的缓存
          const cachedFavicon = await getCachedFavicon(urlList[0]);
          if (cachedFavicon) {
            // 为该 hostname 的所有 URL 更新图标
            for (const url of urlList) {
              const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
              if (img) {
                img.src = cachedFavicon;
                img.style.opacity = '0';
                setTimeout(() => { img.style.opacity = '1'; }, 50);
              }
            }
          } else {
            // 没有获取到，使用默认 favicon.ico
            for (const url of urlList) {
              const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
              if (img && img.src.includes('default-favicon.svg')) {
                img.src = getFavicon(url);
              }
            }
          }
        }
      }, 300);
    }
  };
  
  // 创建 Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const url = img.dataset.bookmarkUrl;
        
        if (url && !img.dataset.loaded) {
          img.dataset.loaded = 'true';
          pendingUrls.push(url);
          
          // 延迟批量处理（避免快速滚动时频繁请求）
          if (batchTimeout) {
            clearTimeout(batchTimeout);
          }
          batchTimeout = setTimeout(processBatch, 100);
        }
        
        // 停止观察已加载的图标
        observer.unobserve(img);
      }
    });
  }, {
    root: null, // 相对于视口
    rootMargin: '50px', // 提前 50px 开始加载
    threshold: 0.01 // 1% 可见即触发
  });
  
  // 观察所有书签图标
  bookmarkImages.forEach(img => {
    observer.observe(img);
  });
}

// 从后台服务获取缓存的 favicon
async function getCachedFavicon(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getFavicon', url: url },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        if (response && response.favicon) {
          resolve(response.favicon);
        } else {
          resolve(null);
        }
      }
    );
  });
}

// Trigger background scan for all tabs to get favicons
function triggerFaviconScan() {
  logger.debug('Triggering background scan for all open tabs to update favicons...');
  chrome.runtime.sendMessage(
    { action: 'scanAllTabs' },
    (response) => {
      if (chrome.runtime.lastError) {
        logger.error('scanAllTabs error:', chrome.runtime.lastError);
        return;
      }
      if (response && response.success) {
        logger.info(`Background scan completed: updated ${response.count} favicons from open tabs`);
        // Wait a bit after scan completes before refreshing display
        setTimeout(() => {
          if (currentFolderId) {
            logger.debug('Refreshing bookmark display to load latest favicons');
            renderContent();
          }
        }, 500);
      }
    }
  );
}

// 按需获取当前显示的书签的 favicon
async function fetchVisibleFavicons(bookmarkUrls) {
  if (!bookmarkUrls || bookmarkUrls.length === 0) {
    return;
  }
  
  logger.debug(`请求获取 ${bookmarkUrls.length} 个书签的 favicon...`);
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'fetchFaviconsForUrls', urls: bookmarkUrls },
      (response) => {
        if (chrome.runtime.lastError) {
          logger.error('fetchFaviconsForUrls 错误:', chrome.runtime.lastError);
          resolve();
          return;
        }
        if (response && response.success) {
          logger.debug(`获取完成：${response.count} 个成功，${response.skipped} 个跳过（已缓存），${response.failed} 个失败`);
        }
        resolve();
      }
    );
  });
}

// 图标加载失败时的备选方案
function handleFaviconError(img, url) {
  // 如果是 Chrome 缓存的图标失败了，直接显示默认图标
  // 如果是网站 favicon.ico 失败了，也直接显示默认图标
  // 不使用任何第三方服务
  img.src = 'default-favicon.svg';
  img.onerror = null; // 防止无限循环
}

function getDisplayUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// ==================== 搜索功能 ====================
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderContent();
    return;
  }
  
  // 在整个书签树中搜索
  const results = searchInTree(bookmarkTree, query);
  renderSearchResults(results);
}

function searchInTree(node, query) {
  const results = [];
  
  if (!node) return results;
  
  if (node.url) {
    // 这是一个书签
    if ((node.title && node.title.toLowerCase().includes(query)) ||
        node.url.toLowerCase().includes(query)) {
      results.push(node);
    }
  }
  
  if (node.children) {
    node.children.forEach(child => {
      results.push(...searchInTree(child, query));
    });
  }
  
  return results;
}

function renderSearchResults(bookmarks) {
  const bookmarksGrid = document.getElementById('bookmarksGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (bookmarks.length === 0) {
    bookmarksGrid.innerHTML = '';
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = t('noMatchingBookmarks');
    return;
  }
  
  emptyState.style.display = 'none';
  
  const html = bookmarks.map(bookmark => createBookmarkCard(bookmark)).join('');
  bookmarksGrid.innerHTML = html;
  
  // 先绑定图标错误处理（简单降级到 emoji）
  document.querySelectorAll('.bookmark-card img').forEach(img => {
    img.addEventListener('error', () => {
      const url = img.dataset.bookmarkUrl;
      if (url) {
        handleFaviconError(img, url);
      }
    });
  });
  
  // 异步加载 favicon：优先使用 Chrome 缓存，否则降级到 favicon.ico
  document.querySelectorAll('.bookmark-card img').forEach(async (img) => {
    const url = img.dataset.bookmarkUrl;
    if (url) {
      const cachedFavicon = await getCachedFavicon(url);
      if (cachedFavicon) {
        img.src = cachedFavicon;
      } else {
        // 没有缓存，降级到网站的 favicon.ico
        img.src = getFavicon(url);
      }
      img.style.opacity = '0';
      setTimeout(() => {
        img.style.opacity = '1';
      }, 50);
    }
  });
  
  // 绑定事件
  document.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!editMode && !e.target.closest('.bookmark-actions')) {
        const url = card.dataset.url;
        window.open(url, '_blank');
      }
    });
  });
  
  document.querySelectorAll('.edit-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookmarkId = btn.closest('.bookmark-card').dataset.bookmarkId;
      openEditBookmarkModal(bookmarkId);
    });
  });
  
  document.querySelectorAll('.delete-bookmark').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const bookmarkId = btn.closest('.bookmark-card').dataset.bookmarkId;
      await deleteBookmark(bookmarkId);
    });
  });
}

// ==================== 编辑模式 ====================
function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById('editModeBtn');
  const span = btn.querySelector('span');
  if (span) {
    span.textContent = editMode ? t('finishEditing') : t('editMode');
  } else {
    btn.innerHTML = editMode ? `✓ ${t('finishEditing')}` : `✏️ ${t('editMode')}`;
  }
  btn.classList.toggle('btn-primary', editMode);
  btn.classList.toggle('btn-secondary', !editMode);
  renderContent();
}

// ==================== 书签操作 ====================
function openAddBookmarkModal() {
  editingBookmarkId = null;
  document.getElementById('modalTitle').textContent = t('addBookmark');
  document.getElementById('bookmarkTitle').value = '';
  document.getElementById('bookmarkUrl').value = '';
  updateFolderSelect();
  document.getElementById('bookmarkModal').style.display = 'flex';
}

function openEditBookmarkModal(bookmarkId) {
  editingBookmarkId = bookmarkId;
  const bookmark = findBookmarkById(bookmarkId);
  
  if (!bookmark) return;
  
  document.getElementById('modalTitle').textContent = t('editBookmark');
  document.getElementById('bookmarkTitle').value = bookmark.title || '';
  document.getElementById('bookmarkUrl').value = bookmark.url;
  updateFolderSelect();
  document.getElementById('bookmarkModal').style.display = 'flex';
}

function findBookmarkById(bookmarkId, node = bookmarkTree) {
  if (!node) return null;
  
  if (node.id === bookmarkId && node.url) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const result = findBookmarkById(bookmarkId, child);
      if (result) return result;
    }
  }
  
  return null;
}

function closeBookmarkModal() {
  document.getElementById('bookmarkModal').style.display = 'none';
  editingBookmarkId = null;
}

function updateFolderSelect() {
  const select = document.getElementById('bookmarkGroup');
  
  let html = `<option value="">${t('selectFolder')}</option>`;
  
  // 添加顶级文件夹
  html += `<optgroup label="${t('topLevelFolders')}">`;
  html += topLevelFolders
    .map(f => {
      const displayName = f.displayNameKey ? t(f.displayNameKey) : f.title;
      return `<option value="${f.id}">${escapeHtml(displayName)}</option>`;
    })
    .join('');
  html += '</optgroup>';
  
  // 添加当前文件夹的子文件夹
  if (currentFolderData && currentFolderData.children) {
    const subfolders = currentFolderData.children.filter(item => item.children);
    if (subfolders.length > 0) {
      html += `<optgroup label="${t('currentFolderSubfolders')}">`;
      html += subfolders
        .map(f => `<option value="${f.id}">${escapeHtml(f.title || t('untitledFolder'))}</option>`)
        .join('');
      html += '</optgroup>';
    }
  }
  
  select.innerHTML = html;
}

async function saveBookmark() {
  const title = document.getElementById('bookmarkTitle').value.trim();
  const url = document.getElementById('bookmarkUrl').value.trim();
  const folderId = document.getElementById('bookmarkGroup').value;
  
  if (!title || !url) {
    alert(t('validationError'));
    return;
  }
  
  try {
    if (editingBookmarkId) {
      // 编辑现有书签
      await chrome.bookmarks.update(editingBookmarkId, { title, url });
    } else {
      // 确定书签的父文件夹
      let parentId = currentFolderId || '1'; // 默认为当前文件夹或书签栏
      
      if (folderId) {
        parentId = folderId;
      }
      
      // 创建新书签
      await chrome.bookmarks.create({
        title,
        url,
        parentId
      });
    }
    
    await loadBookmarks();
    selectFolder(currentFolderId);
    closeBookmarkModal();
  } catch (error) {
    logger.error(t('saveError'), error);
    alert(t('saveError'));
  }
}

async function deleteBookmark(bookmarkId) {
  if (!confirm(t('deleteConfirm'))) return;
  
  try {
    await chrome.bookmarks.remove(bookmarkId);
    await loadBookmarks();
    selectFolder(currentFolderId);
  } catch (error) {
    logger.error(t('deleteError'), error);
    alert(t('deleteError'));
  }
}

// ==================== 拖拽功能 ====================
function setupDraggable(element) {
  element.addEventListener('dragstart', (e) => {
    const bookmarkId = element.dataset.bookmarkId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookmarkId);
    element.classList.add('dragging');
    logger.debug(`开始拖拽书签: ${bookmarkId}`);
  });
  
  element.addEventListener('dragend', (e) => {
    element.classList.remove('dragging');
  });
}

function setupDropZone(element) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    element.classList.add('drag-over');
  });
  
  element.addEventListener('dragleave', (e) => {
    element.classList.remove('drag-over');
  });
  
  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
    
    const bookmarkId = e.dataTransfer.getData('text/plain');
    const targetFolderId = element.dataset.folderId;
    
    if (!bookmarkId || !targetFolderId) {
      logger.error(t('dragDataIncomplete'));
      return;
    }
    
    logger.debug(`尝试移动书签 ${bookmarkId} 到文件夹 ${targetFolderId}`);
    
    try {
      // 使用 Chrome Bookmarks API 移动书签
      await chrome.bookmarks.move(bookmarkId, { parentId: targetFolderId });
      logger.info(t('moveBookmarkSuccess'));
      
      // 重新加载书签树并刷新显示
      await loadBookmarks();
      selectFolder(currentFolderId, false);
      renderFolders();
    } catch (error) {
      logger.error(t('moveBookmarkError'), error);
      alert(t('moveBookmarkError'));
    }
  });
}

// ==================== 文件夹操作 ====================
function openAddFolderModal() {
  document.getElementById('groupModalTitle').textContent = t('createFolder');
  document.getElementById('groupName').value = '';
  document.getElementById('groupIcon').value = '📁';
  document.getElementById('groupModal').style.display = 'flex';
}

function closeFolderModal() {
  document.getElementById('groupModal').style.display = 'none';
}

async function saveFolder() {
  const name = document.getElementById('groupName').value.trim();
  
  if (!name) {
    alert(t('folderNameRequired'));
    return;
  }
  
  try {
    const parentId = currentFolderId || '1';
    await chrome.bookmarks.create({
      title: name,
      parentId
    });
    
    await loadBookmarks();
    selectFolder(currentFolderId);
    closeFolderModal();
  } catch (error) {
    logger.error(t('createFolderError'), error);
    alert(t('createFolderError'));
  }
}

// ==================== 工具函数 ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

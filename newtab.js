// ==================== 全局变量 ====================
let bookmarkTree = null; // 完整的书签树
let topLevelFolders = []; // 三个顶级文件夹
let currentFolderId = null; // 当前选中的文件夹 ID
let currentFolderData = null; // 当前文件夹的数据
let editMode = false;
let editingBookmarkId = null;
let expandedFolders = new Set(); // 记录展开的文件夹ID
let failedFaviconHosts = new Set(); // 记录加载失败的 favicon 域名，避免重复请求
let currentDragInfo = null; // 记录当前拖拽项的信息（用于判断拖拽限制）

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
    bookmarkSubfolder: '子文件夹',
    folderName: '文件夹名称',
    titlePlaceholder: '输入书签标题',
    urlPlaceholder: 'https://example.com',
    folderNamePlaceholder: '输入文件夹名称',
    selectFolder: '选择文件夹...',
    currentFolderOption: '（当前文件夹）',
    noSubfolderOption: '（不选择子文件夹）',
    cancel: '取消',
    save: '保存',
    deleteConfirm: '确定要删除这个书签吗？',
    deleteFolderConfirm: '确定要删除这个文件夹吗？所有内容将被永久删除。',
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
    deleteFolder: '删除文件夹',
    renameFolder: '重命名',
    renameFolderTitle: '重命名文件夹',
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
    bookmarkSubfolder: 'Subfolder',
    folderName: 'Folder Name',
    titlePlaceholder: 'Enter bookmark title',
    urlPlaceholder: 'https://example.com',
    folderNamePlaceholder: 'Enter folder name',
    selectFolder: 'Select folder...',
    currentFolderOption: '(Current Folder)',
    noSubfolderOption: '(No Subfolder)',
    cancel: 'Cancel',
    save: 'Save',
    deleteConfirm: 'Are you sure you want to delete this bookmark?',
    deleteFolderConfirm: 'Are you sure you want to delete this folder? All contents will be permanently deleted.',
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
    deleteFolder: 'Delete Folder',
    renameFolder: 'Rename',
    renameFolderTitle: 'Rename Folder',
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
    // 更新文件夹标题
    updateFolderTitle();
    // 重新渲染内容以更新书签数量文本
    if (currentFolderId) {
      // 检查是否有搜索查询，如果有则保持搜索结果
      const searchInput = document.getElementById('searchInput');
      const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
      if (query) {
        const results = searchInTree(bookmarkTree, query);
        renderSearchResults(results);
      } else {
        renderContent();
      }
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
  chrome.runtime.sendMessage({ action: 'setDebugMode', enabled: debugMode }, (response) => {
    if (chrome.runtime.lastError) {
      // 静默处理扩展重载时的连接错误
      logger.debug('Background service worker not available:', chrome.runtime.lastError.message);
    }
  });
  
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
    if (!cacheInfoEl) return;
    
    if (chrome.runtime.lastError || !result) {
      cacheInfoEl.textContent = t('cacheCount', { count: 0 });
      return;
    }
    
    if (result.faviconCache) {
      const cacheSize = Object.keys(result.faviconCache).length;
      cacheInfoEl.textContent = t('cacheCount', { count: cacheSize });
    } else {
      cacheInfoEl.textContent = t('cacheCount', { count: 0 });
    }
  });
}

async function clearFaviconCache() {
  const confirmed = await showConfirm(t('clearCacheConfirm'), t('confirm'));
  if (confirmed) {
    try {
      await chrome.storage.local.remove('faviconCache');
      // 通知 background 清除内存中的缓存和失败记录
      chrome.runtime.sendMessage({ action: 'clearFaviconCache' });
      // 也清除前端的失败记录
      failedFaviconHosts.clear();
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
  initTooltip(); // 初始化自定义 tooltip
  initContextMenu(); // 初始化右键菜单
  initSidebarResize(); // 初始化侧边栏宽度调整
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
    if (chrome.runtime.lastError || !result) {
      logger.debug('无法读取缓存信息');
      return;
    }
    
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
  
  // 搜索 - 使用 debounce 优化性能
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  
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
    chrome.runtime.sendMessage({ action: 'setDebugMode', enabled: debugMode }, (response) => {
      if (chrome.runtime.lastError) {
        // 静默处理扩展重载时的连接错误
        logger.debug('Background service worker not available:', chrome.runtime.lastError.message);
      }
    });
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
  
  let html = '';
  
  // 递归渲染文件夹树
  function renderFolderTree(folder, level = 0) {
    const count = countBookmarksInFolder(folder);
    const isActive = currentFolderId === folder.id ? 'active' : '';
    const displayName = folder.displayNameKey ? t(folder.displayNameKey) : (folder.title || t('untitledFolder'));
    const hasChildren = folder.children && folder.children.some(child => child.children);
    const isExpanded = expandedFolders.has(folder.id);
    
    // 限制最大显示深度为3级（level 0, 1, 2）
    const canExpand = level < 2 && hasChildren;
    
    // 子文件夹默认使用文件夹图标
    const folderIcon = folder.icon || '📁';
    
    // 展开/折叠图标
    let expandIcon = '';
    if (canExpand) {
      expandIcon = `<span class="folder-expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▶'}</span>`;
    } else {
      expandIcon = `<span class="folder-expand-icon empty"></span>`;
    }
    
    // 判断是否有展开的子文件夹
    const hasExpandedChildren = isExpanded && canExpand;
    
    let result = `
      <div class="group-item ${isActive} ${hasExpandedChildren ? 'has-expanded-children' : ''}" 
           data-folder-id="${folder.id}"
           data-droppable="true"
           data-level="${level}">
        ${expandIcon}
        <span class="group-icon">${folderIcon}</span>
        <div class="group-info">
          <div class="group-name">${escapeHtml(displayName)}</div>
          <div class="group-count">${t('bookmarksCount', { count })}</div>
        </div>
      </div>
    `;
    
    // 如果展开且有子文件夹，递归渲染（包裹在子区域容器中）
    if (isExpanded && canExpand) {
      const subfolders = folder.children.filter(child => child.children);
      if (subfolders.length > 0) {
        result += `<div class="subfolder-container">`;
        subfolders.forEach(subfolder => {
          result += renderFolderTree(subfolder, level + 1);
        });
        result += `</div>`;
      }
    }
    
    return result;
  }
  
  html += topLevelFolders.map(folder => renderFolderTree(folder)).join('');
  
  groupsList.innerHTML = html;
  
  // 绑定文件夹点击事件
  document.querySelectorAll('.group-item').forEach(item => {
    const folderId = item.dataset.folderId;
    
    // 展开/折叠图标点击事件
    const expandIcon = item.querySelector('.folder-expand-icon');
    if (expandIcon && !expandIcon.classList.contains('empty')) {
      expandIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFolderExpand(folderId);
      });
    }
    
    // 文件夹名称点击事件
    item.addEventListener('click', (e) => {
      // 如果点击的是展开图标，不触发文件夹选择
      if (e.target.closest('.folder-expand-icon')) return;
      selectFolder(folderId);
    });
    
    // 右键菜单
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, folderId);
    });
    
    // 设置 tooltip 功能
    const nameElement = item.querySelector('.group-name');
    if (nameElement) {
      // 检查文本是否被截断
      const isTruncated = nameElement.scrollWidth > nameElement.clientWidth;
      
      if (isTruncated) {
        item.addEventListener('mouseenter', () => {
          const rect = item.getBoundingClientRect();
          showTooltip(nameElement.textContent, rect);
        });
        
        item.addEventListener('mouseleave', () => {
          hideTooltip();
        });
      }
    }
    
    // 绑定拖放事件（支持拖入和拖拽排序）
    setupDropZone(item);
    
    // 添加 draggable 属性以支持拖拽
    item.setAttribute('draggable', 'true');
    setupDraggable(item);
  });
}

// 切换文件夹展开/折叠状态
function toggleFolderExpand(folderId) {
  if (expandedFolders.has(folderId)) {
    expandedFolders.delete(folderId);
  } else {
    expandedFolders.add(folderId);
  }
  renderFolders();
}

// 查找文件夹的所有父文件夹ID
function findParentFolders(folderId, folder = null) {
  const parents = [];
  
  function searchInFolder(currentFolder, targetId, path = []) {
    if (!currentFolder.children) return null;
    
    for (const child of currentFolder.children) {
      if (child.id === targetId) {
        return path;
      }
      if (child.children) {
        const result = searchInFolder(child, targetId, [...path, child.id]);
        if (result) return result;
      }
    }
    return null;
  }
  
  // 在所有顶级文件夹中搜索
  for (const topFolder of topLevelFolders) {
    if (topFolder.id === folderId) {
      return [];
    }
    const result = searchInFolder(topFolder, folderId, [topFolder.id]);
    if (result) return result;
  }
  
  return [];
}

// 自动展开所有父文件夹
function expandParentFolders(folderId) {
  const parents = findParentFolders(folderId);
  parents.forEach(parentId => {
    expandedFolders.add(parentId);
  });
}

// 更新文件夹标题显示
function updateFolderTitle() {
  if (currentFolderData) {
    const folder = topLevelFolders.find(f => f.id === currentFolderId);
    if (folder) {
      const displayName = folder.displayNameKey ? t(folder.displayNameKey) : folder.title;
      document.getElementById('currentGroupTitle').textContent = displayName;
    } else {
      document.getElementById('currentGroupTitle').textContent = currentFolderData.title || t('folder');
    }
  }
}

function selectFolder(folderId, updateHash = true) {
  currentFolderId = folderId;
  currentFolderData = getFolderById(folderId);
  
  // 自动展开所有父文件夹
  expandParentFolders(folderId);
  
  // 更新标题显示
  updateFolderTitle();
  
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
  
  // 只获取书签，不包括子文件夹
  const bookmarks = items.filter(item => item.url);
  
  // 递归获取所有子文件夹中的书签
  function getAllBookmarksRecursively(folder) {
    let allBookmarks = [];
    if (folder.children) {
      folder.children.forEach(item => {
        if (item.url) {
          // 是书签
          allBookmarks.push(item);
        } else if (item.children) {
          // 是子文件夹，递归获取
          allBookmarks = allBookmarks.concat(getAllBookmarksRecursively(item));
        }
      });
    }
    return allBookmarks;
  }
  
  // 获取当前文件夹及其所有子文件夹中的书签
  const allBookmarks = getAllBookmarksRecursively(currentFolderData);
  
  let html = '';
  
  // 只渲染书签（包括子文件夹中的书签）
  allBookmarks.forEach(bookmark => {
    html += createBookmarkCard(bookmark);
  });
  
  bookmarksGrid.innerHTML = html;
  
  logger.debug(`当前页面显示 ${allBookmarks.length} 个书签`);
  
  // 先绑定图标错误处理（简单降级到 emoji）
  document.querySelectorAll('.bookmark-card img').forEach(img => {
    img.addEventListener('error', (e) => {
      // 防止重复处理（重定向循环等情况）
      if (img.dataset.errorHandled) return;
      img.dataset.errorHandled = 'true';
      
      const url = img.dataset.bookmarkUrl;
      if (url) {
        handleFaviconError(img, url);
      }
    }, { once: true }); // 使用 once 选项确保只触发一次
  });
  
  // 使用 Intersection Observer 实现懒加载：只加载可见书签的 favicon
  setupLazyLoadFavicons();
  
  // 绑定书签卡片拖拽和排序事件
  document.querySelectorAll('.bookmark-card[draggable="true"]').forEach(card => {
    setupDraggable(card);
    setupDropZone(card); // 添加放置区域支持排序
    setupTooltip(card);
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
         data-droppable="true"
         draggable="true">
      <div class="folder-card-icon">📁</div>
      <div class="folder-card-title">${escapeHtml(folder.title || t('untitledFolder'))}</div>
      <div class="folder-card-count">${t('itemsCount', { count })}</div>
      <div class="folder-actions">
        <button class="folder-action-btn delete-folder" title="${t('delete')}">
          🗑️
        </button>
      </div>
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
    const hostname = urlObj.hostname;
    
    // 如果该域名已经失败过，直接返回默认图标
    if (failedFaviconHosts.has(hostname)) {
      return 'default-favicon.svg';
    }
    
    // 返回网站自己的 favicon.ico 作为初始值
    return `${urlObj.origin}/favicon.ico`;
  } catch {
    return 'default-favicon.svg';
  }
}

// 懒加载：只加载可视区域书签的 favicon
// 懒加载辅助函数：更新单个 favicon 图片
function updateFaviconImage(img, faviconUrl) {
  img.src = faviconUrl;
  img.style.opacity = '0';
  setTimeout(() => { img.style.opacity = '1'; }, 50);
}

// 懒加载辅助函数：按 hostname 对 URLs 分组
function groupUrlsByHostname(urls) {
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
  return hostnameToUrls;
}

// 懒加载辅助函数：加载已缓存的 favicons
async function loadCachedFavicons(urls) {
  for (const url of urls) {
    const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
    if (!img) continue;
    
    const cachedFavicon = await getCachedFavicon(url);
    if (cachedFavicon) {
      // 获取成功，从失败列表中移除
      try {
        const hostname = new URL(url).hostname;
        if (failedFaviconHosts.has(hostname)) {
          failedFaviconHosts.delete(hostname);
          logger.debug(`${hostname} 获取成功，从失败列表中移除`);
        }
      } catch (e) {
        // 忽略 URL 解析错误
      }
      
      updateFaviconImage(img, cachedFavicon);
    }
  }
}

// 懒加载辅助函数：获取并更新未缓存的 favicons
async function fetchAndUpdateUncachedFavicons(urls, hostnameToUrls) {
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
    
    // 获取完成后更新显示
    setTimeout(async () => {
      for (const [hostname, urlList] of hostnameToUrls) {
        const cachedFavicon = await getCachedFavicon(urlList[0]);
        if (cachedFavicon) {
          // 获取成功，从失败列表中移除
          if (failedFaviconHosts.has(hostname)) {
            failedFaviconHosts.delete(hostname);
            logger.debug(`${hostname} 获取成功，从失败列表中移除`);
          }
          
          // 为该 hostname 的所有 URL 更新图标
          for (const url of urlList) {
            const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
            if (img) {
              updateFaviconImage(img, cachedFavicon);
            }
          }
        } else {
          // 没有获取到缓存，记录为失败状态
          failedFaviconHosts.add(hostname);
          logger.debug(`${hostname} 获取失败，标记为失败状态，保持默认图标`);
        }
      }
    }, 300);
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
    
    // 按 hostname 去重
    const hostnameToUrls = groupUrlsByHostname(urls);
    logger.debug(`批量请求 ${urls.length} 个可见书签（${hostnameToUrls.size} 个不同域名）的 favicon`);
    
    // 先加载已缓存的
    await loadCachedFavicons(urls);
    
    // 然后获取并更新未缓存的
    await fetchAndUpdateUncachedFavicons(urls, hostnameToUrls);
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
        // 扩展重新加载时会出现连接错误，这是正常的，使用 debug 级别记录
        const errorMsg = chrome.runtime.lastError.message || '';
        if (errorMsg.includes('Could not establish connection') || 
            errorMsg.includes('Extension context invalidated') ||
            errorMsg.includes('message port closed') ||
            errorMsg.includes('message channel closed') ||
            errorMsg.includes('Receiving end does not exist')) {
          logger.debug('Background service worker not available (extension may be reloading):', errorMsg);
        } else {
          logger.error('scanAllTabs error:', errorMsg);
        }
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
          // 扩展重新加载时会出现连接错误，这是正常的，静默处理
          const errorMsg = chrome.runtime.lastError.message || '';
          if (errorMsg.includes('Could not establish connection') || 
              errorMsg.includes('Extension context invalidated') ||
              errorMsg.includes('message port closed') ||
              errorMsg.includes('message channel closed') ||
              errorMsg.includes('Receiving end does not exist')) {
            logger.debug('Background service worker not available (extension may be reloading):', errorMsg);
          } else {
            logger.error('fetchFaviconsForUrls 错误:', errorMsg);
          }
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
  // 记录失败的域名，避免下次再请求
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    failedFaviconHosts.add(hostname);
    logger.debug(`记录 favicon 加载失败: ${hostname}`);
  } catch (e) {
    // 忽略 URL 解析错误
  }
  
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
    img.addEventListener('error', (e) => {
      // 防止重复处理（重定向循环等情况）
      if (img.dataset.errorHandled) return;
      img.dataset.errorHandled = 'true';
      
      const url = img.dataset.bookmarkUrl;
      if (url) {
        handleFaviconError(img, url);
      }
    }, { once: true }); // 使用 once 选项确保只触发一次
  });
  
  // 异步加载 favicon：优先使用 Chrome 缓存，否则降级到 favicon.ico
  const imgElements = document.querySelectorAll('.bookmark-card img');
  
  // 使用 Promise.all 并发处理所有图片，而不是 forEach(async)
  const promises = Array.from(imgElements).map(async (img) => {
    const url = img.dataset.bookmarkUrl;
    if (!url) return;
    
    try {
      const cachedFavicon = await getCachedFavicon(url);
      if (cachedFavicon) {
        // 获取成功，从失败列表中移除
        try {
          const hostname = new URL(url).hostname;
          if (failedFaviconHosts.has(hostname)) {
            failedFaviconHosts.delete(hostname);
            logger.debug(`${hostname} 获取成功，从失败列表中移除`);
          }
        } catch (e) {
          // 忽略 URL 解析错误
        }
        
        img.src = cachedFavicon;
        img.style.opacity = '0';
        setTimeout(() => {
          img.style.opacity = '1';
        }, 50);
      } else {
        // 没有缓存，检查是否已知失败
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          if (!failedFaviconHosts.has(hostname)) {
            // 尝试降级到网站的 favicon.ico
            img.src = getFavicon(url);
            img.style.opacity = '0';
            setTimeout(() => {
              img.style.opacity = '1';
            }, 50);
          }
          // 如果已知失败，保持默认图标
        } catch (e) {
          // URL 解析失败，保持默认图标
        }
      }
    } catch (error) {
      logger.debug(`加载 favicon 失败: ${url}`, error);
    }
  });
  
  // 等待所有 favicon 加载完成（可选，如果不需要等待可以移除）
  // await Promise.all(promises);
  
  // 绑定事件
  document.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!editMode && !e.target.closest('.bookmark-actions')) {
        const url = card.dataset.url;
        window.open(url, '_blank');
      }
    });
    setupTooltip(card);
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
  
  let html = '';
  
  // 只显示顶级文件夹
  topLevelFolders.forEach(folder => {
    const displayName = folder.displayNameKey ? t(folder.displayNameKey) : folder.title || t('untitledFolder');
    html += `<option value="${folder.id}">${escapeHtml(displayName)}</option>`;
  });
  
  select.innerHTML = html;
  
  // 默认选中当前文件夹（如果是顶级文件夹），否则选中第一个顶级文件夹
  if (currentFolderId && topLevelFolders.find(f => f.id === currentFolderId)) {
    select.value = currentFolderId;
  } else if (topLevelFolders.length > 0) {
    select.value = topLevelFolders[0].id;
  }
  
  // 绑定选择事件
  select.onchange = updateSubfolderSelect;
  
  // 初始化子文件夹选择器（因为设置value不会触发change事件）
  updateSubfolderSelect();
}

function updateSubfolderSelect() {
  const parentFolderId = document.getElementById('bookmarkGroup').value;
  const subfolderGroup = document.getElementById('subfolderSelectGroup');
  const subfolderSelect = document.getElementById('bookmarkSubfolder');
  
  if (!parentFolderId) {
    // 没有选择父文件夹，隐藏子文件夹选择器
    subfolderGroup.style.display = 'none';
    subfolderSelect.value = '';
    return;
  }
  
  // 查找选中的文件夹
  const parentFolder = findFolderById(parentFolderId);
  
  if (!parentFolder || !parentFolder.children) {
    subfolderGroup.style.display = 'none';
    subfolderSelect.value = '';
    return;
  }
  
  // 获取子文件夹
  const subfolders = parentFolder.children.filter(item => item.children);
  
  if (subfolders.length === 0) {
    subfolderGroup.style.display = 'none';
    subfolderSelect.value = '';
    return;
  }
  
  // 递归构建子文件夹选项
  function buildSubfolderOptions(folders, indent = '') {
    let options = '';
    folders.forEach(folder => {
      const displayName = folder.title || t('untitledFolder');
      options += `<option value="${folder.id}">${indent}${escapeHtml(displayName)}</option>`;
      
      // 如果有子文件夹，递归添加
      if (folder.children) {
        const nestedSubfolders = folder.children.filter(item => item.children);
        if (nestedSubfolders.length > 0) {
          options += buildSubfolderOptions(nestedSubfolders, indent + '　');
        }
      }
    });
    return options;
  }
  
  let html = '';
  html += buildSubfolderOptions(subfolders);
  
  subfolderSelect.innerHTML = html;
  subfolderSelect.innerHTML = html;
  subfolderGroup.style.display = 'block';
}

// 已移除滚轮事件处理函数（使用列表框模式不再需要）

function findFolderById(folderId, node = bookmarkTree) {
  if (!node) return null;
  
  if (node.id === folderId) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const result = findFolderById(folderId, child);
      if (result) return result;
    }
  }
  
  return null;
}

async function saveBookmark() {
  const title = document.getElementById('bookmarkTitle').value.trim();
  const url = document.getElementById('bookmarkUrl').value.trim();
  const topFolderId = document.getElementById('bookmarkGroup').value;
  const subfolderId = document.getElementById('bookmarkSubfolder').value;
  
  if (!title || !url) {
    await showAlert(t('validationError'), t('error'));
    return;
  }
  
  try {
    if (editingBookmarkId) {
      // 编辑现有书签
      await chrome.bookmarks.update(editingBookmarkId, { title, url });
    } else {
      // 确定书签的父文件夹：优先使用子文件夹，否则使用顶级文件夹（总是有值）
      const parentId = subfolderId || topFolderId;
      
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
    await showAlert(t('saveError'), t('error'));
  }
}

async function deleteBookmark(bookmarkId) {
  const confirmed = await showConfirm(t('deleteConfirm'), t('deleteBookmark'));
  if (!confirmed) return;
  
  try {
    await chrome.bookmarks.remove(bookmarkId);
    await loadBookmarks();
    selectFolder(currentFolderId);
  } catch (error) {
    logger.error(t('deleteError'), error);
    await showAlert(t('deleteError'), t('error'));
  }
}

async function deleteFolder(folderId) {
  const confirmed = await showConfirm(t('deleteFolderConfirm'), t('deleteFolder'));
  if (!confirmed) return;
  
  try {
    // 使用 removeTree 删除文件夹及其所有内容
    await chrome.bookmarks.removeTree(folderId);
    await loadBookmarks();
    // 删除后保持在当前文件夹
    if (currentFolderId) {
      selectFolder(currentFolderId);
    } else if (topLevelFolders.length > 0) {
      selectFolder(topLevelFolders[0].id);
    }
  } catch (error) {
    logger.error(t('deleteError'), error);
    await showAlert(t('deleteError'), t('error'));
  }
}

// ==================== 右键菜单 ====================
let contextMenuTargetId = null; // 记录右键菜单目标文件夹 ID

function initContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', () => {
    hideContextMenu();
  });
  
  // 阻止菜单自身的点击事件冒泡
  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // 绑定菜单项点击事件
  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (contextMenuTargetId) {
        await handleContextMenuAction(action, contextMenuTargetId);
      }
      hideContextMenu();
    });
  });
}

function showContextMenu(x, y, folderId) {
  const contextMenu = document.getElementById('contextMenu');
  contextMenuTargetId = folderId;
  
  // 检查是否是系统文件夹（书签栏、其他书签）
  const folder = topLevelFolders.find(f => f.id === folderId);
  const isSystemFolder = folder && folder.displayNameKey;
  
  // 如果是系统文件夹，禁用删除选项
  const deleteItem = contextMenu.querySelector('[data-action="delete"]');
  if (deleteItem) {
    if (isSystemFolder) {
      deleteItem.classList.add('disabled');
    } else {
      deleteItem.classList.remove('disabled');
    }
  }
  
  // 更新位置
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.style.display = 'block';
  
  // 确保菜单不超出屏幕
  const menuRect = contextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    contextMenu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
  }
  if (menuRect.bottom > window.innerHeight) {
    contextMenu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
  }
}

function hideContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  contextMenu.style.display = 'none';
  contextMenuTargetId = null;
}

async function handleContextMenuAction(action, folderId) {
  switch (action) {
    case 'delete':
      await deleteFolder(folderId);
      break;
    case 'rename':
      // TODO: 实现重命名功能
      await showAlert('重命名功能即将推出', '提示');
      break;
  }
}

// ==================== 自定义 Tooltip ====================
let tooltipElement = null;

function initTooltip() {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'custom-tooltip';
    document.body.appendChild(tooltipElement);
  }
}

function showTooltip(text, cardRect) {
  if (!tooltipElement) return;
  
  tooltipElement.textContent = text;
  
  // 计算屏幕可用宽度（留出左右 20px 边距）
  const padding = 20;
  const screenWidth = window.innerWidth;
  const availableWidth = screenWidth - padding * 2;
  
  // 动态设置 max-width，确保 tooltip 不会超出屏幕
  tooltipElement.style.maxWidth = availableWidth + 'px';
  
  // 先设置初始位置以便获取实际尺寸
  tooltipElement.style.left = '0px';
  tooltipElement.style.top = '0px';
  tooltipElement.classList.add('show');
  
  // 获取 tooltip 实际宽度
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;
  
  // 计算理想的居中位置（在卡片上方）
  const cardCenterX = cardRect.left + cardRect.width / 2;
  let tooltipX = cardCenterX - tooltipWidth / 2;
  let tooltipY = cardRect.top - tooltipHeight - 12; // 12px 间距
  let showBelow = false;
  
  // 如果上方空间不足，改为显示在下方
  if (tooltipY < 10) {
    tooltipY = cardRect.bottom + 12;
    showBelow = true;
  }
  
  // 边界检测和调整（水平方向）
  const maxX = screenWidth - tooltipWidth - padding;
  const minX = padding;
  
  // 限制在屏幕范围内
  if (tooltipX < minX) {
    tooltipX = minX;
  } else if (tooltipX > maxX) {
    tooltipX = maxX;
  }
  
  // 计算三角箭头的偏移量（使其始终指向卡片中心）
  const arrowOffset = cardCenterX - (tooltipX + tooltipWidth / 2);
  
  // 限制箭头在 tooltip 范围内（留出 12px 边距）
  const maxArrowOffset = tooltipWidth / 2 - 12;
  const minArrowOffset = -tooltipWidth / 2 + 12;
  const clampedArrowOffset = Math.max(minArrowOffset, Math.min(maxArrowOffset, arrowOffset));
  
  // 设置最终位置和方向
  tooltipElement.style.left = tooltipX + 'px';
  tooltipElement.style.top = tooltipY + 'px';
  tooltipElement.style.setProperty('--arrow-offset', clampedArrowOffset + 'px');
  
  // 根据显示方向调整样式类
  if (showBelow) {
    tooltipElement.classList.add('tooltip-below');
  } else {
    tooltipElement.classList.remove('tooltip-below');
  }
}

function hideTooltip() {
  if (!tooltipElement) return;
  tooltipElement.classList.remove('show');
}

function setupTooltip(card) {
  // 获取卡片中的标题元素
  const titleElement = card.querySelector('.bookmark-card-title, .folder-card-title');
  if (!titleElement) return;
  
  let isTooltipShown = false;
  
  card.addEventListener('mouseenter', () => {
    // 检查标题是否被截断
    const isTruncated = titleElement.scrollWidth > titleElement.clientWidth;
    
    if (isTruncated) {
      isTooltipShown = true;
      const text = titleElement.textContent;
      const rect = card.getBoundingClientRect();
      showTooltip(text, rect);
    }
  });
  
  card.addEventListener('mouseleave', () => {
    if (isTooltipShown) {
      hideTooltip();
      isTooltipShown = false;
    }
  });
}

// ==================== 侧边栏宽度调整 ====================
function initSidebarResize() {
  const sidebar = document.querySelector('.sidebar');
  const resizeHandle = document.querySelector('.sidebar-resize-handle');
  
  if (!sidebar || !resizeHandle) return;
  
  // 从 localStorage 恢复保存的宽度
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    sidebar.style.width = savedWidth + 'px';
  }
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    resizeHandle.classList.add('resizing');
    
    // 防止文本选择
    e.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const delta = e.clientX - startX;
    const newWidth = startWidth + delta;
    
    // 限制最小和最大宽度
    const minWidth = 280;
    const maxWidth = 600;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    sidebar.style.width = clampedWidth + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('resizing');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // 保存当前宽度到 localStorage
      const currentWidth = sidebar.offsetWidth;
      localStorage.setItem('sidebarWidth', currentWidth);
    }
  });
}

// ==================== 拖拽功能 ====================
function setupDraggable(element) {
  element.addEventListener('dragstart', async (e) => {
    const bookmarkId = element.dataset.bookmarkId;
    const folderId = element.dataset.folderId;
    
    e.dataTransfer.effectAllowed = 'move';
    
    // 记录拖拽信息（包括 parentId 用于判断是否允许拖拽）
    if (bookmarkId) {
      e.dataTransfer.setData('bookmarkId', bookmarkId);
      logger.debug(`开始拖拽书签: ${bookmarkId}`);
      try {
        const [item] = await chrome.bookmarks.get(bookmarkId);
        currentDragInfo = { type: 'bookmark', id: bookmarkId, parentId: item.parentId };
      } catch (error) {
        logger.error('获取书签信息失败', error);
        currentDragInfo = { type: 'bookmark', id: bookmarkId };
      }
    } else if (folderId) {
      e.dataTransfer.setData('folderId', folderId);
      logger.debug(`开始拖拽文件夹: ${folderId}`);
      try {
        const [item] = await chrome.bookmarks.get(folderId);
        currentDragInfo = { type: 'folder', id: folderId, parentId: item.parentId };
      } catch (error) {
        logger.error('获取文件夹信息失败', error);
        currentDragInfo = { type: 'folder', id: folderId };
      }
    }
    
    element.classList.add('dragging');
  });
  
  element.addEventListener('dragend', (e) => {
    element.classList.remove('dragging');
    currentDragInfo = null; // 清除拖拽信息
  });
}

function setupDropZone(element) {
  const isFolder = element.classList.contains('folder-card');
  const isBookmark = element.classList.contains('bookmark-card');
  const isSidebarItem = element.classList.contains('group-item');
  
  logger.debug(`设置 drop zone: ${isFolder ? '文件夹' : isBookmark ? '书签' : isSidebarItem ? '侧边栏项' : '未知'}`);
  
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    
    // 标记正在 dragover
    element.dataset.isDraggingOver = 'true';
    
    let newMode = '';
    let canDrop = true; // 标记是否允许放置
    
    // 侧边栏项目支持排序和拖入
    if (isSidebarItem) {
      const rect = element.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const height = rect.height;
      const threshold = Math.min(height * 0.3, 15); // 使用高度的30%或15px作为阈值
      
      // 根据鼠标在垂直方向的位置决定模式
      if (mouseY < threshold) {
        newMode = 'before';
      } else if (mouseY > height - threshold) {
        newMode = 'after';
      } else {
        newMode = 'into';
      }
      
      // 检查是否试图将子文件夹拖到顶级位置
      if ((newMode === 'before' || newMode === 'after') && currentDragInfo) {
        const targetLevel = parseInt(element.dataset.level || '0');
        const isDraggingFolder = currentDragInfo.type === 'folder';
        const isDraggingTopLevel = currentDragInfo.parentId === '0';
        
        // 如果目标是顶级（level=0），且拖动的是非顶级文件夹，则不允许
        if (targetLevel === 0 && isDraggingFolder && !isDraggingTopLevel) {
          canDrop = false;
          newMode = ''; // 不显示任何拖放指示器
        }
      }
    } else if (isFolder) {
      // 对于文件夹：根据鼠标位置决定是"进入文件夹"还是"排序"
      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const width = rect.width;
      const threshold = 50; // 固定像素阈值，左右 50px 区域用于排序
      
      const currentMode = element.dataset.dropMode;
      
      // 使用严格的边界判断，避免抖动
      if (mouseX < threshold) {
        newMode = 'before';
      } else if (mouseX > width - threshold) {
        newMode = 'after';
      } else {
        newMode = 'into';
      }
    } else if (isBookmark) {
      // 对于书签：根据鼠标位置决定插入到左边还是右边
      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const width = rect.width;
      const center = width / 2;
      
      const currentMode = element.dataset.dropMode;
      
      // 使用滞后（hysteresis）逻辑，需要移动更远距离才能切换
      if (currentMode === 'before') {
        // 当前是 before，需要移动到右侧 30% 才切换到 after
        newMode = mouseX > center + width * 0.1 ? 'after' : 'before';
      } else if (currentMode === 'after') {
        // 当前是 after，需要移动到左侧 30% 才切换到 before
        newMode = mouseX < center - width * 0.1 ? 'before' : 'after';
      } else {
        // 首次进入，根据位置决定
        newMode = mouseX < center ? 'before' : 'after';
      }
    }
    
    // 只在模式改变时更新类名，避免频繁重绘
    if (element.dataset.dropMode !== newMode) {
      element.classList.remove('drag-over', 'drag-before', 'drag-after');
      element.dataset.dropMode = newMode;
      
      if (newMode === 'before') {
        element.classList.add('drag-before');
      } else if (newMode === 'after') {
        element.classList.add('drag-after');
      } else if (newMode === 'into') {
        element.classList.add('drag-over');
      }
    }
    
    // 设置拖放效果
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
  });
  
  element.addEventListener('dragleave', (e) => {
    // 只有当鼠标真正离开元素（而不是进入子元素）时才移除样式
    // 使用 relatedTarget 判断鼠标去向
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !element.contains(relatedTarget)) {
      // 清除 dragover 标记
      delete element.dataset.isDraggingOver;
      
      // 延迟移除样式，避免快速进出导致的闪烁
      setTimeout(() => {
        // 双重检查：如果在延迟期间又触发了 dragover，就不清除样式
        if (!element.dataset.isDraggingOver) {
          element.classList.remove('drag-over', 'drag-before', 'drag-after');
          delete element.dataset.dropMode;
        }
      }, 20);
    }
  });
  
  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over', 'drag-before', 'drag-after');
    
    const dropMode = element.dataset.dropMode;
    delete element.dataset.dropMode;
    delete element.dataset.isDraggingOver;
    
    logger.debug(`Drop 事件触发, dropMode: ${dropMode}`);
    
    const bookmarkId = e.dataTransfer.getData('bookmarkId');
    const draggedFolderId = e.dataTransfer.getData('folderId');
    const draggedId = bookmarkId || draggedFolderId;
    
    if (!draggedId) {
      logger.error(t('dragDataIncomplete'));
      return;
    }
    
    const targetFolderId = element.dataset.folderId;
    const targetBookmarkId = element.dataset.bookmarkId;
    const targetId = targetFolderId || targetBookmarkId;
    
    // 防止将文件夹拖到自己里面或自己的位置
    if (draggedFolderId === targetFolderId) {
      logger.debug('不能将文件夹移动到自己里面');
      return;
    }
    
    try {
      if (dropMode === 'into' && targetFolderId) {
        // 移动到文件夹内
        logger.debug(`尝试移动 ${draggedId} 到文件夹 ${targetFolderId}`);
        await chrome.bookmarks.move(draggedId, { parentId: targetFolderId });
        logger.info(bookmarkId ? t('moveBookmarkSuccess') : '文件夹移动成功');
      } else if (dropMode === 'before' || dropMode === 'after') {
        // 排序：插入到目标位置
        logger.debug(`排序模式: ${dropMode}, 目标ID: ${targetId}`);
        
        // 获取目标项的信息
        const [targetItem] = await chrome.bookmarks.get(targetId);
        if (!targetItem) {
          logger.error('无法获取目标项信息');
          return;
        }
        
        logger.debug(`目标项: ${targetItem.title}, 父文件夹: ${targetItem.parentId}`);
        
        // 获取拖动项的信息
        const [draggedItem] = await chrome.bookmarks.get(draggedId);
        
        // 检查是否试图将非顶级文件夹移动到顶级位置
        // 顶级文件夹的 parentId 是 '0'
        const isTargetTopLevel = targetItem.parentId === '0';
        const isDraggedFolder = draggedFolderId && !draggedItem.url; // 是文件夹且不是书签
        const isDraggedTopLevel = draggedItem.parentId === '0';
        
        if (isTargetTopLevel && isDraggedFolder && !isDraggedTopLevel) {
          // 不允许将子文件夹移动到顶级位置
          logger.warn('不允许将子文件夹移动到顶级文件夹位置');
          await showAlert('Chrome 不支持将子文件夹移动到顶级位置', '无法移动');
          return;
        }
        
        // 获取父文件夹的所有子项
        const [parentFolder] = await chrome.bookmarks.getSubTree(targetItem.parentId);
        if (!parentFolder || !parentFolder.children) {
          logger.error('无法获取父文件夹信息');
          return;
        }
        
        // 找到目标项的索引
        let targetIndex = parentFolder.children.findIndex(item => item.id === targetId);
        if (targetIndex === -1) {
          logger.error('无法找到目标项的索引');
          return;
        }
        
        // 如果是插入到后面，索引+1
        if (dropMode === 'after') {
          targetIndex++;
        }
        
        // 如果在同一父文件夹内移动，需要调整索引
        if (draggedItem.parentId === targetItem.parentId) {
          const currentIndex = parentFolder.children.findIndex(item => item.id === draggedId);
          if (currentIndex < targetIndex) {
            targetIndex--;
          }
        }
        
        logger.debug(`移动 ${draggedId} 到位置 ${targetIndex} (父文件夹: ${targetItem.parentId})`);
        await chrome.bookmarks.move(draggedId, {
          parentId: targetItem.parentId,
          index: targetIndex
        });
        logger.info('排序成功');
      }
      
      // 重新加载书签树并刷新显示
      await loadBookmarks();
      selectFolder(currentFolderId, false);
      renderFolders();
    } catch (error) {
      logger.error(t('moveBookmarkError'), error);
      await showAlert(t('moveBookmarkError'), t('error'));
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
    await showAlert(t('folderNameRequired'), t('error'));
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
    await showAlert(t('createFolderError'), t('error'));
  }
}

// ==================== 工具函数 ====================
// 自定义对话框 - 替代原生 alert
function showAlert(message, title = '提示') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('customDialog');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const confirmBtn = document.getElementById('dialogConfirmBtn');
    const cancelBtn = document.getElementById('dialogCancelBtn');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = t('confirm') || '确定';
    cancelBtn.style.display = 'none';
    
    overlay.style.display = 'flex';
    
    const handleConfirm = () => {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      resolve();
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
  });
}

// 自定义对话框 - 替代原生 confirm
function showConfirm(message, title = '确认') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('customDialog');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const confirmBtn = document.getElementById('dialogConfirmBtn');
    const cancelBtn = document.getElementById('dialogCancelBtn');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = t('confirm') || '确定';
    cancelBtn.textContent = t('cancel') || '取消';
    cancelBtn.style.display = 'inline-block';
    
    overlay.style.display = 'flex';
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 提取的错误处理函数
function handleStorageError(operation, error) {
  logger.error(`${operation} 失败:`, error);
  showAlert(t(`${operation}Error`) || `${operation}失败，请重试`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

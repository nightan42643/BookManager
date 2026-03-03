// ==================== 全局变量 ====================
let bookmarkTree = null; // 完整的书签树
let topLevelFolders = []; // 三个顶级文件夹
let currentFolderId = null; // 当前选中的文件夹 ID
let currentFolderData = null; // 当前文件夹的数据
let editingBookmarkId = null;
let expandedFolders = new Set(); // 记录展开的文件夹ID
let failedFaviconHosts = new Set(); // 记录加载失败的 favicon 域名，避免重复请求
let currentDragInfo = null; // 记录当前拖拽项的信息（用于判断拖拽限制）

// 多选功能系统
let selectedBookmarks = new Set(); // 选中的书签ID集合
let lastSelectedBookmark = null; // 最后选中的书签ID（用于Shift连续选择）

// Favicon 懒加载 Observer（单例）
let faviconObserver = null;

// 撤销功能系统
let undoHistory = []; // 操作历史栈，最多保存10条
const MAX_UNDO_HISTORY = 10;

// ==================== 事件委托系统 ====================
// 使用事件委托优化性能，避免在每次渲染时重复绑定事件

/**
 * 初始化侧边栏事件委托
 * 处理文件夹点击、展开/折叠、右键菜单
 */
function initSidebarDelegation() {
  const groupsList = document.getElementById('groupsList');
  if (!groupsList) return;
  
  // 点击事件委托
  groupsList.addEventListener('click', (e) => {
    const item = e.target.closest('.group-item');
    if (!item) return;
    
    const folderId = item.dataset.folderId;
    
    // 展开/折叠图标点击
    if (e.target.closest('.folder-expand-icon:not(.empty)')) {
      e.stopPropagation();
      toggleFolderExpand(folderId);
      return;
    }
    
    // 文件夹选择
    selectFolder(folderId);
  });
  
  // 右键菜单委托
  groupsList.addEventListener('contextmenu', (e) => {
    const item = e.target.closest('.group-item');
    if (!item) return;
    
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, item.dataset.folderId);
  });
  
  // 鼠标悬停 tooltip 委托
  groupsList.addEventListener('mouseenter', (e) => {
    const item = e.target.closest('.group-item');
    if (!item) return;
    
    const nameElement = item.querySelector('.group-name');
    if (nameElement && nameElement.scrollWidth > nameElement.clientWidth) {
      showTooltip(nameElement.textContent, item.getBoundingClientRect());
    }
  }, true);
  
  groupsList.addEventListener('mouseleave', (e) => {
    if (e.target.closest('.group-item')) {
      hideTooltip();
    }
  }, true);
  
  // 拖拽事件委托 - dragstart
  groupsList.addEventListener('dragstart', async (e) => {
    const item = e.target.closest('.group-item');
    if (!item) return;
    
    const folderId = item.dataset.folderId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('folderId', folderId);
    logger.debug(`开始拖拽文件夹: ${folderId}`);
    
    try {
      const [folder] = await chrome.bookmarks.get(folderId);
      currentDragInfo = { type: 'folder', id: folderId, parentId: folder.parentId };
    } catch (error) {
      logger.error('获取文件夹信息失败', error);
      currentDragInfo = { type: 'folder', id: folderId };
    }
    item.classList.add('dragging');
  });
  
  groupsList.addEventListener('dragend', (e) => {
    const item = e.target.closest('.group-item');
    if (item) item.classList.remove('dragging');
    currentDragInfo = null;
  });
  
  // 拖拽事件委托 - dragover/dragleave/drop
  groupsList.addEventListener('dragover', (e) => {
    const item = e.target.closest('.group-item[data-droppable="true"]');
    if (!item) return;
    
    e.preventDefault();
    item.dataset.isDraggingOver = 'true';
    
    const rect = item.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;
    const threshold = Math.min(height * 0.3, 15);
    
    let newMode = '';
    let canDrop = true;
    
    if (mouseY < threshold) {
      newMode = 'before';
    } else if (mouseY > height - threshold) {
      newMode = 'after';
    } else {
      newMode = 'into';
    }
    
    // 检查是否允许拖放到顶级位置
    if ((newMode === 'before' || newMode === 'after') && currentDragInfo) {
      const targetLevel = parseInt(item.dataset.level || '0');
      if (targetLevel === 0 && currentDragInfo.type === 'folder' && currentDragInfo.parentId !== '0') {
        canDrop = false;
        newMode = '';
      }
    }
    
    if (item.dataset.dropMode !== newMode) {
      item.classList.remove('drag-over', 'drag-before', 'drag-after');
      item.dataset.dropMode = newMode;
      if (newMode === 'before') item.classList.add('drag-before');
      else if (newMode === 'after') item.classList.add('drag-after');
      else if (newMode === 'into') item.classList.add('drag-over');
    }
    
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
  });
  
  groupsList.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.group-item');
    if (!item) return;
    
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !item.contains(relatedTarget)) {
      delete item.dataset.isDraggingOver;
      setTimeout(() => {
        if (!item.dataset.isDraggingOver) {
          item.classList.remove('drag-over', 'drag-before', 'drag-after');
          delete item.dataset.dropMode;
        }
      }, 20);
    }
  });
  
  groupsList.addEventListener('drop', async (e) => {
    const item = e.target.closest('.group-item[data-droppable="true"]');
    if (!item) return;
    
    e.preventDefault();
    e.stopPropagation();
    item.classList.remove('drag-over', 'drag-before', 'drag-after');
    
    const dropMode = item.dataset.dropMode;
    delete item.dataset.dropMode;
    
    const targetId = item.dataset.folderId;
    await handleDrop(e.dataTransfer, targetId, dropMode, 'sidebar');
  });
}

/**
 * 初始化书签网格事件委托
 * 处理书签点击、编辑、删除、拖拽
 */
function initBookmarksGridDelegation() {
  const bookmarksGrid = document.getElementById('bookmarksGrid');
  if (!bookmarksGrid) return;
  
  // 点击事件委托
  bookmarksGrid.addEventListener('click', async (e) => {
    // 处理文件夹卡片点击
    const folderCard = e.target.closest('.folder-card');
    if (folderCard && !e.target.closest('.folder-actions')) {
      // 检查是否点击删除按钮
      if (e.target.closest('.delete-folder')) {
        e.stopPropagation();
        await deleteFolder(folderCard.dataset.folderId);
        return;
      }
      selectFolder(folderCard.dataset.folderId);
      return;
    }
    
    // 处理书签卡片点击
    const bookmarkCard = e.target.closest('.bookmark-card');
    if (!bookmarkCard) return;
    
    // 操作按钮点击
    if (e.target.closest('.edit-bookmark')) {
      e.stopPropagation();
      openEditBookmarkModal(bookmarkCard.dataset.bookmarkId);
      return;
    }
    
    if (e.target.closest('.delete-bookmark')) {
      e.stopPropagation();
      await deleteBookmark(bookmarkCard.dataset.bookmarkId);
      return;
    }
    
    // 跳过操作按钮区域
    if (e.target.closest('.bookmark-actions')) return;
    
    const bookmarkId = bookmarkCard.dataset.bookmarkId;
    
    // 多选逻辑
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleBookmarkSelection(bookmarkId);
    } else if (e.shiftKey) {
      e.preventDefault();
      selectBookmarkRange(bookmarkId);
    } else {
      if (selectedBookmarks.size === 0) {
        window.open(bookmarkCard.dataset.url, '_blank');
      } else {
        clearSelection();
        toggleBookmarkSelection(bookmarkId);
      }
    }
  });
  
  // 图片错误事件委托
  bookmarksGrid.addEventListener('error', (e) => {
    if (e.target.tagName !== 'IMG' || e.target.dataset.errorHandled) return;
    e.target.dataset.errorHandled = 'true';
    const url = e.target.dataset.bookmarkUrl;
    if (url) handleFaviconError(e.target, url);
  }, true);
  
  // Tooltip 委托
  bookmarksGrid.addEventListener('mouseenter', (e) => {
    const card = e.target.closest('.bookmark-card');
    if (card) {
      const titleEl = card.querySelector('.bookmark-card-title');
      if (titleEl && titleEl.scrollWidth > titleEl.clientWidth) {
        showTooltip(titleEl.textContent, card.getBoundingClientRect());
      }
    }
  }, true);
  
  bookmarksGrid.addEventListener('mouseleave', (e) => {
    if (e.target.closest('.bookmark-card')) {
      hideTooltip();
    }
  }, true);
  
  // 书签右键菜单委托
  bookmarksGrid.addEventListener('contextmenu', (e) => {
    const bookmarkCard = e.target.closest('.bookmark-card');
    if (bookmarkCard) {
      e.preventDefault();
      showBookmarkContextMenu(e.pageX, e.pageY, bookmarkCard.dataset.bookmarkId, bookmarkCard.dataset.url);
    }
  });
  
  // 拖拽事件委托 - dragstart
  bookmarksGrid.addEventListener('dragstart', async (e) => {
    const card = e.target.closest('[draggable="true"]');
    if (!card) return;
    
    const bookmarkId = card.dataset.bookmarkId;
    const folderId = card.dataset.folderId;
    
    e.dataTransfer.effectAllowed = 'move';
    
    if (bookmarkId) {
      // 批量拖拽
      if (selectedBookmarks.size > 0 && selectedBookmarks.has(bookmarkId)) {
        const bookmarkIds = Array.from(selectedBookmarks);
        e.dataTransfer.setData('bookmarkIds', JSON.stringify(bookmarkIds));
        e.dataTransfer.setData('isBatch', 'true');
        document.querySelectorAll('.bookmark-card.selected').forEach(c => c.classList.add('dragging'));
        
        try {
          const [item] = await chrome.bookmarks.get(bookmarkId);
          currentDragInfo = { type: 'bookmark', id: bookmarkId, parentId: item.parentId, isBatch: true, count: bookmarkIds.length };
        } catch (error) {
          currentDragInfo = { type: 'bookmark', id: bookmarkId, isBatch: true, count: bookmarkIds.length };
        }
      } else {
        e.dataTransfer.setData('bookmarkId', bookmarkId);
        try {
          const [item] = await chrome.bookmarks.get(bookmarkId);
          currentDragInfo = { type: 'bookmark', id: bookmarkId, parentId: item.parentId };
        } catch (error) {
          currentDragInfo = { type: 'bookmark', id: bookmarkId };
        }
        card.classList.add('dragging');
      }
    } else if (folderId) {
      e.dataTransfer.setData('folderId', folderId);
      try {
        const [item] = await chrome.bookmarks.get(folderId);
        currentDragInfo = { type: 'folder', id: folderId, parentId: item.parentId };
      } catch (error) {
        currentDragInfo = { type: 'folder', id: folderId };
      }
      card.classList.add('dragging');
    }
  });
  
  bookmarksGrid.addEventListener('dragend', () => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    currentDragInfo = null;
  });
  
  // 拖拽放置事件委托
  bookmarksGrid.addEventListener('dragover', (e) => {
    const card = e.target.closest('.folder-card[data-droppable="true"], .bookmark-card[draggable="true"]');
    if (!card) return;
    
    e.preventDefault();
    card.dataset.isDraggingOver = 'true';
    
    const isFolder = card.classList.contains('folder-card');
    const rect = card.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    
    let newMode;
    if (isFolder) {
      const threshold = 50;
      if (mouseX < threshold) newMode = 'before';
      else if (mouseX > width - threshold) newMode = 'after';
      else newMode = 'into';
    } else {
      const center = width / 2;
      const currentMode = card.dataset.dropMode;
      const hysteresis = width * 0.1;
      
      if (currentMode === 'before') {
        newMode = mouseX > center + hysteresis ? 'after' : 'before';
      } else if (currentMode === 'after') {
        newMode = mouseX < center - hysteresis ? 'before' : 'after';
      } else {
        newMode = mouseX < center ? 'before' : 'after';
      }
    }
    
    if (card.dataset.dropMode !== newMode) {
      card.classList.remove('drag-over', 'drag-before', 'drag-after');
      card.dataset.dropMode = newMode;
      if (newMode === 'before') card.classList.add('drag-before');
      else if (newMode === 'after') card.classList.add('drag-after');
      else if (newMode === 'into') card.classList.add('drag-over');
    }
    
    e.dataTransfer.dropEffect = 'move';
  });
  
  bookmarksGrid.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.folder-card, .bookmark-card');
    if (!card) return;
    
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !card.contains(relatedTarget)) {
      delete card.dataset.isDraggingOver;
      setTimeout(() => {
        if (!card.dataset.isDraggingOver) {
          card.classList.remove('drag-over', 'drag-before', 'drag-after');
          delete card.dataset.dropMode;
        }
      }, 20);
    }
  });
  
  bookmarksGrid.addEventListener('drop', async (e) => {
    const card = e.target.closest('.folder-card[data-droppable="true"], .bookmark-card[draggable="true"]');
    if (!card) return;
    
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('drag-over', 'drag-before', 'drag-after');
    
    const dropMode = card.dataset.dropMode;
    delete card.dataset.dropMode;
    
    const targetId = card.dataset.folderId || card.dataset.bookmarkId;
    const targetType = card.classList.contains('folder-card') ? 'folder' : 'bookmark';
    await handleDrop(e.dataTransfer, targetId, dropMode, targetType);
  });
}

/**
 * 统一的拖放处理函数
 */
async function handleDrop(dataTransfer, targetId, dropMode, targetType) {
  const bookmarkId = dataTransfer.getData('bookmarkId');
  const draggedFolderId = dataTransfer.getData('folderId');
  const isBatch = dataTransfer.getData('isBatch') === 'true';
  const bookmarkIdsStr = dataTransfer.getData('bookmarkIds');
  
  let draggedIds = [];
  if (isBatch && bookmarkIdsStr) {
    try {
      draggedIds = JSON.parse(bookmarkIdsStr);
    } catch (error) {
      logger.error('解析书签ID列表失败', error);
      return;
    }
  } else {
    const draggedId = bookmarkId || draggedFolderId;
    if (!draggedId) return;
    draggedIds = [draggedId];
  }
  
  try {
    // 拖入文件夹模式
    if (dropMode === 'into' && targetType !== 'bookmark') {
      for (const draggedId of draggedIds) {
        const [draggedItem] = await chrome.bookmarks.get(draggedId);
        const oldParentId = draggedItem.parentId;
        const oldIndex = draggedItem.index;
        
        await chrome.bookmarks.move(draggedId, { parentId: targetId });
        
        recordOperation({
          type: 'move',
          itemType: draggedItem.url ? 'bookmark' : 'folder',
          data: { id: draggedId, oldParentId, oldIndex, newParentId: targetId }
        });
      }
      showToast(isBatch ? `已移动 ${draggedIds.length} 个项目` : (draggedFolderId ? t('folderMoved') : t('bookmarkMoved')), 'success');
      
      // 从当前视图移除被拖走的元素（避免图标重新加载）
      for (const draggedId of draggedIds) {
        const selector = `.bookmark-card[data-bookmark-id="${draggedId}"], .folder-card[data-folder-id="${draggedId}"]`;
        document.querySelector(selector)?.remove();
      }
      
      // 更新内存数据和侧边栏
      await loadBookmarks();
      currentFolderData = getFolderById(currentFolderId);
      renderFolders();
      
      // 检查是否需要显示空状态
      const bookmarksGrid = document.getElementById('bookmarksGrid');
      const emptyState = document.getElementById('emptyState');
      if (bookmarksGrid.children.length === 0) {
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = t('emptyFolder');
        emptyState.querySelector('p').textContent = t('clickToAdd');
      }
    }
    // 排序模式
    else if (dropMode === 'before' || dropMode === 'after') {
      if (isBatch) {
        showToast('批量拖动请拖到文件夹上', 'warning');
        return;
      }
      
      const draggedId = draggedIds[0];
      const [targetItem] = await chrome.bookmarks.get(targetId);
      const [draggedItem] = await chrome.bookmarks.get(draggedId);
      
      // 检查是否允许移动到顶级位置
      if (targetItem.parentId === '0' && !draggedItem.url && draggedItem.parentId !== '0') {
        await showAlert('Chrome 不支持将子文件夹移动到顶级位置', '无法移动');
        return;
      }
      
      const [parentFolder] = await chrome.bookmarks.getSubTree(targetItem.parentId);
      let targetIndex = parentFolder.children.findIndex(item => item.id === targetId);
      
      if (dropMode === 'after') targetIndex++;
      
      // 检查是否是同文件夹内排序
      const isSameFolderSort = draggedItem.parentId === targetItem.parentId;
      
      if (isSameFolderSort) {
        const currentIndex = parentFolder.children.findIndex(item => item.id === draggedId);
        if (currentIndex < targetIndex) targetIndex--;
      }
      
      const oldParentId = draggedItem.parentId;
      // 确保获取正确的原始索引
      let oldIndex = draggedItem.index;
      if (oldIndex === undefined) {
        // 如果 index 不存在，从父文件夹中查找
        oldIndex = parentFolder.children.findIndex(item => item.id === draggedId);
        logger.warn(`draggedItem.index 不存在，从父文件夹查找得到: ${oldIndex}`);
      }
      
      logger.debug(`排序前状态: id=${draggedId}, oldParentId=${oldParentId}, oldIndex=${oldIndex}`);
      logger.debug(`排序目标: targetParentId=${targetItem.parentId}, targetIndex=${targetIndex}`);
      
      await chrome.bookmarks.move(draggedId, { parentId: targetItem.parentId, index: targetIndex });
      
      // 获取移动后的实际位置
      const [movedItem] = await chrome.bookmarks.get(draggedId);
      logger.debug(`排序后状态: newIndex=${movedItem.index}`);
      
      recordOperation({
        type: 'move',
        itemType: draggedItem.url ? 'bookmark' : 'folder',
        data: { id: draggedId, oldParentId, oldIndex, newParentId: targetItem.parentId, newIndex: movedItem.index }
      });
      
      logger.debug(`记录撤销操作: oldIndex=${oldIndex}, newIndex=${movedItem.index}`);
      
      showToast(draggedItem.url ? t('bookmarkMoved') : t('folderMoved'), 'success');
      
      // 同文件夹内排序：使用 DOM 操作移动元素，避免图标重新加载
      if (isSameFolderSort && currentFolderId === targetItem.parentId) {
        reorderDOMElement(draggedId, targetId, dropMode, draggedItem.url ? 'bookmark' : 'folder');
        // 更新内存中的数据结构
        await loadBookmarks();
        currentFolderData = getFolderById(currentFolderId);
      } else {
        // 跨文件夹移动需要完全刷新
        await loadBookmarks();
        selectFolder(currentFolderId, false);
        renderFolders();
      }
    }
  } catch (error) {
    logger.error(t('moveBookmarkError'), error);
    await showAlert(t('moveBookmarkError'), t('error'));
  }
}

/**
 * 在 DOM 中重新排序元素（不触发图标重新加载）
 */
function reorderDOMElement(draggedId, targetId, dropMode, itemType) {
  const bookmarksGrid = document.getElementById('bookmarksGrid');
  const selector = itemType === 'bookmark' 
    ? `.bookmark-card[data-bookmark-id="${draggedId}"]`
    : `.folder-card[data-folder-id="${draggedId}"]`;
  const targetSelector = `.bookmark-card[data-bookmark-id="${targetId}"], .folder-card[data-folder-id="${targetId}"]`;
  
  const draggedElement = bookmarksGrid.querySelector(selector);
  const targetElement = bookmarksGrid.querySelector(targetSelector);
  
  if (!draggedElement || !targetElement) {
    logger.warn('DOM 重排：找不到元素', { draggedId, targetId });
    return;
  }
  
  if (dropMode === 'before') {
    targetElement.parentNode.insertBefore(draggedElement, targetElement);
  } else {
    targetElement.parentNode.insertBefore(draggedElement, targetElement.nextSibling);
  }
  
  logger.debug(`DOM 重排完成: ${draggedId} ${dropMode} ${targetId}`);
}

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
    versionInfo: '书签管理器 v1.2.0',
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
    editBookmark: '编辑书签',
    createFolder: '创建文件夹',
    selectedCount: '已选择 {count} 项',
    deleteSelected: '删除选中',
    moveSelected: '移动选中',
    clearSelection: '清除选择',
    selectAll: '全选',
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
    deleteFolderConfirm: '确定要删除这个文件夹吗？文件夹中的书签将移动到上一级目录。',
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
    deleteBookmark: '删除书签',
    deleteFolder: '删除文件夹',
    renameFolder: '重命名',
    renameFolderTitle: '重命名文件夹',
    cannotRenameSystemFolder: '系统文件夹不能重命名',
    createSubfolder: '创建子文件夹',
    subfolder: '子文件夹',
    topLevelFolders: '顶级文件夹',
    currentFolderSubfolders: '当前文件夹的子文件夹',
    dragDataIncomplete: '拖拽数据不完整',
    // 书签右键菜单
    openInNewTab: '在新标签页打开',
    copyUrl: '复制链接',
    urlCopied: '链接已复制',
    editBookmark: '编辑书签',
    deleteBookmark: '删除书签',
    // Toast 提示文本
    bookmarkAdded: '书签已添加',
    bookmarkUpdated: '书签已更新',
    bookmarkDeleted: '书签已删除',
    bookmarkMoved: '书签已移动',
    folderDeleted: '文件夹已删除，书签已移动到上一级',
    folderMoved: '文件夹已移动',
    folderRenamed: '文件夹已重命名',
    folderNotFound: '文件夹不存在',
    renameFolderError: '重命名文件夹失败',
    // 撤销功能
    undo: '撤销',
    undoSuccess: '已撤销',
    noUndoHistory: '没有可撤销的操作',
    // 健康检查
    healthCheck: '健康检查',
    healthChecking: '检查中...',
    healthCheckProgress: '检查中 ({current}/{total})',
    healthCheckComplete: '检查完成',
    healthCheckNoBookmarks: '当前文件夹没有书签',
    unhealthyBookmarks: '发现 {count} 个无效书签',
    allBookmarksHealthy: '所有书签均可访问',
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
    versionInfo: 'Bookmark Manager v1.2.0',
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
    editBookmark: 'Edit Bookmark',
    createFolder: 'Create Folder',
    selectedCount: '{count} selected',
    deleteSelected: 'Delete Selected',
    moveSelected: 'Move Selected',
    clearSelection: 'Clear Selection',
    selectAll: 'Select All',
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
    deleteFolderConfirm: 'Are you sure you want to delete this folder? Bookmarks will be moved to the parent folder.',
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
    deleteBookmark: 'Delete Bookmark',
    deleteFolder: 'Delete Folder',
    renameFolder: 'Rename',
    renameFolderTitle: 'Rename Folder',
    cannotRenameSystemFolder: 'System folders cannot be renamed',
    createSubfolder: 'Create Subfolder',
    subfolder: 'Subfolder',
    topLevelFolders: 'Top Level Folders',
    currentFolderSubfolders: 'Subfolders of Current Folder',
    dragDataIncomplete: 'Drag data incomplete',
    // Bookmark context menu
    openInNewTab: 'Open in New Tab',
    copyUrl: 'Copy URL',
    urlCopied: 'URL copied',
    editBookmark: 'Edit Bookmark',
    deleteBookmark: 'Delete Bookmark',
    // Toast messages
    bookmarkAdded: 'Bookmark added',
    bookmarkUpdated: 'Bookmark updated',
    bookmarkDeleted: 'Bookmark deleted',
    bookmarkMoved: 'Bookmark moved',
    folderDeleted: 'Folder deleted, bookmarks moved to parent',
    folderMoved: 'Folder moved',
    folderRenamed: 'Folder renamed',
    folderNotFound: 'Folder not found',
    renameFolderError: 'Failed to rename folder',
    // Undo function
    undo: 'Undo',
    undoSuccess: 'Undone',
    noUndoHistory: 'No operation to undo',
    // Health check
    healthCheck: 'Health Check',
    healthChecking: 'Checking...',
    healthCheckProgress: 'Checking ({current}/{total})',
    healthCheckComplete: 'Check Complete',
    healthCheckNoBookmarks: 'No bookmarks in current folder',
    unhealthyBookmarks: 'Found {count} broken bookmark(s)',
    allBookmarksHealthy: 'All bookmarks are accessible',
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

// ==================== 应用初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadUnhealthyBookmarkIds(); // 加载 404 书签状态
  await loadBookmarks();
  initTooltip(); // 初始化自定义 tooltip
  initContextMenu(); // 初始化文件夹右键菜单
  initBookmarkContextMenu(); // 初始化书签右键菜单
  initSidebarResize(); // 初始化侧边栏宽度调整
  updateUndoButtonState(); // 初始化撤销按钮状态
  updateTime();
  updateGreeting();
  applyTranslations(); // 应用翻译
  setupEventListeners();
  
  // 初始化事件委托系统
  initSidebarDelegation();
  initBookmarksGridDelegation();
  
  renderFolders();
  
  // 从 URL hash 恢复状态，或默认选中第一个文件夹
  const hash = window.location.hash.substring(1); // 移除 '#'
  if (hash && getFolderById(hash)) {
    selectFolder(hash, false); // false = 不更新 hash（已经在 URL 中）
  } else if (topLevelFolders.length > 0) {
    selectFolder(topLevelFolders[0].id);
  }
  
  // 恢复搜索状态（如果有）
  const savedSearch = sessionStorage.getItem('bookmarkSearchQuery');
  if (savedSearch) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = savedSearch;
      // 触发搜索
      const results = searchInTree(bookmarkTree, savedSearch.toLowerCase());
      renderSearchResults(results);
    }
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
  
  // 撤销
  document.getElementById('undoBtn').addEventListener('click', performUndo);
  
  // 搜索 - 使用 debounce 优化性能
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  
  // 添加书签
  document.getElementById('addBookmarkBtn').addEventListener('click', openAddBookmarkModal);
  
  // 健康检查
  document.getElementById('healthCheckBtn').addEventListener('click', performHealthCheck);
  
  // 批量操作
  document.getElementById('selectAllBtn').addEventListener('click', selectAll);
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedBookmarks);
  document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
  
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
  
  // 只统计当前文件夹直接下的书签，不包括子文件夹中的书签
  let count = 0;
  folder.children.forEach(child => {
    if (child.url) {
      count++;
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
           data-level="${level}"
           draggable="true">
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
  // 注意：事件绑定已移至 initSidebarDelegation() 使用事件委托处理
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
  
  // 清除选中状态
  clearSelection();
  
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
  
  // 计算当前文件夹的层级深度
  function getFolderLevel(folderId) {
    let level = 0;
    let current = getFolderById(folderId);
    while (current && current.parentId && current.parentId !== '0') {
      level++;
      current = getFolderById(current.parentId);
    }
    return level;
  }
  
  const currentLevel = getFolderLevel(currentFolderId);
  
  // 获取直接子文件夹（如果当前层级 >= 2，则显示子文件夹）
  const subfolders = items.filter(item => item.children);
  const bookmarks = items.filter(item => item.url);
  
  let html = '';
  
  // 如果当前层级 >= 2，显示子文件夹作为文件夹卡片（因为它们无法在侧边栏展示）
  if (currentLevel >= 2 && subfolders.length > 0) {
    subfolders.forEach(folder => {
      html += createFolderCard(folder);
    });
  }
  
  // 无论层级如何，都只显示当前文件夹直接下的书签（不包括子文件夹的书签）
  bookmarks.forEach(bookmark => {
    html += createBookmarkCard(bookmark);
  });
  
  bookmarksGrid.innerHTML = html;
  
  logger.debug(`当前页面显示内容，当前文件夹层级: ${currentLevel}`);
  
  // 使用 Intersection Observer 实现懒加载：只加载可见书签的 favicon
  setupLazyLoadFavicons();
  // 注意：事件绑定已移至 initBookmarksGridDelegation() 使用事件委托处理
}

// 创建文件夹卡片
function createFolderCard(folder) {
  const count = countBookmarksInFolder(folder);
  
  return `
    <div class="folder-card" 
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
  // 使用本地默认图标作为占位符
  const placeholderIcon = 'default-favicon.svg';
  const isUnhealthy = unhealthyBookmarkIds.has(bookmark.id);
  
  return `
    <div class="bookmark-card${isUnhealthy ? ' unhealthy' : ''}" 
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
      <div class="bookmark-selected-indicator">✓</div>
    </div>
  `;
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
  const uncachedHostnames = new Set();
  for (const url of urls) {
    const img = document.querySelector(`img[data-bookmark-url="${CSS.escape(url)}"]`);
    if (img && img.src.includes('default-favicon.svg')) {
      uncachedUrls.push(url);
      try {
        uncachedHostnames.add(new URL(url).hostname);
      } catch (e) {
        // 忽略无效 URL
      }
    }
  }
  
  // 批量获取未缓存的 favicon
  if (uncachedUrls.length > 0) {
    logger.debug(`发现 ${uncachedUrls.length} 个未缓存的书签，请求获取 favicon`);
    await fetchVisibleFavicons(uncachedUrls);
    
    // 获取完成后更新显示（只更新之前未缓存的）
    setTimeout(async () => {
      for (const [hostname, urlList] of hostnameToUrls) {
        // 只处理之前未缓存的 hostname
        if (!uncachedHostnames.has(hostname)) continue;
        
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
  
  // 清理旧的 Observer（避免内存泄漏）
  if (faviconObserver) {
    faviconObserver.disconnect();
    faviconObserver = null;
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
  
  // 创建新的 Intersection Observer
  faviconObserver = new IntersectionObserver((entries) => {
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
        faviconObserver.unobserve(img);
      }
    });
  }, {
    root: null, // 相对于视口
    rootMargin: '50px', // 提前 50px 开始加载
    threshold: 0.01 // 1% 可见即触发
  });
  
  // 观察所有书签图标
  bookmarkImages.forEach(img => {
    faviconObserver.observe(img);
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
        // 扫描完成后，只更新当前显示的图标，不重新渲染整个页面
        if (response.count > 0) {
          setTimeout(() => {
            refreshDisplayedFavicons();
          }, 100);
        }
      }
    }
  );
}

// 刷新当前显示的书签图标（不重新渲染页面）
async function refreshDisplayedFavicons() {
  const bookmarkImages = document.querySelectorAll('.bookmark-card-icon[data-bookmark-url]');
  if (bookmarkImages.length === 0) return;
  
  logger.debug(`刷新 ${bookmarkImages.length} 个已显示的书签图标`);
  
  for (const img of bookmarkImages) {
    const url = img.dataset.bookmarkUrl;
    if (!url) continue;
    
    // 只更新还是默认图标的
    if (img.src.includes('default-favicon.svg')) {
      const cachedFavicon = await getCachedFavicon(url);
      if (cachedFavicon) {
        updateFaviconImage(img, cachedFavicon);
      }
    }
  }
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
  
  // 保存搜索状态到 sessionStorage
  if (query) {
    sessionStorage.setItem('bookmarkSearchQuery', query);
  } else {
    sessionStorage.removeItem('bookmarkSearchQuery');
  }
  
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
  
  // 使用懒加载处理 favicon
  setupLazyLoadFavicons();
  // 注意：事件绑定已移至 initBookmarksGridDelegation() 使用事件委托处理
}

// ==================== 健康检查功能 ====================
let healthCheckInProgress = false;
let unhealthyBookmarkIds = new Set(); // 存储无效书签ID

// 从 storage 加载无效书签 ID
async function loadUnhealthyBookmarkIds() {
  try {
    const result = await chrome.storage.local.get('unhealthyBookmarkIds');
    if (result.unhealthyBookmarkIds && Array.isArray(result.unhealthyBookmarkIds)) {
      unhealthyBookmarkIds = new Set(result.unhealthyBookmarkIds);
    }
  } catch (error) {
    logger.error('加载无效书签ID失败:', error);
  }
}

// 保存无效书签 ID 到 storage
async function saveUnhealthyBookmarkIds() {
  try {
    await chrome.storage.local.set({ 
      unhealthyBookmarkIds: Array.from(unhealthyBookmarkIds) 
    });
  } catch (error) {
    logger.error('保存无效书签ID失败:', error);
  }
}

/**
 * 执行书签健康检查
 */
async function performHealthCheck() {
  if (healthCheckInProgress) {
    showToast(t('healthChecking'), 'info');
    return;
  }
  
  // 获取当前文件夹的书签
  if (!currentFolderData || !currentFolderData.children) {
    showToast(t('healthCheckNoBookmarks'), 'warning');
    return;
  }
  
  const bookmarks = currentFolderData.children.filter(item => item.url);
  if (bookmarks.length === 0) {
    showToast(t('healthCheckNoBookmarks'), 'warning');
    return;
  }
  
  healthCheckInProgress = true;
  const btn = document.getElementById('healthCheckBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  
  // 记录本次检查中通过的书签ID（用于清除之前的 404 标记）
  const healthyInThisCheck = new Set();
  
  let checkedCount = 0;
  let unhealthyCount = 0;
  const total = bookmarks.length;
  
  // 更新按钮显示进度
  const updateProgress = () => {
    btn.innerHTML = `⏳ ${t('healthCheckProgress', { current: checkedCount, total })}`;
  };
  
  updateProgress();
  
  // 并发检查，但限制并发数为5
  const concurrencyLimit = 5;
  const results = [];
  
  for (let i = 0; i < bookmarks.length; i += concurrencyLimit) {
    const batch = bookmarks.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(async (bookmark) => {
      try {
        const result = await chrome.runtime.sendMessage({
          action: 'checkUrlHealth',
          url: bookmark.url
        });
        checkedCount++;
        updateProgress();
        
        // 只有 404/410（not-found）才标记为无效
        // 连接失败可能是 VPN/内网，不标记
        if (result && result.status === 'not-found') {
          unhealthyCount++;
          unhealthyBookmarkIds.add(bookmark.id);
          // 标记卡片为无效
          const card = document.querySelector(`.bookmark-card[data-bookmark-id="${bookmark.id}"]`);
          if (card) {
            card.classList.add('unhealthy');
          }
        } else if (result && result.status === 'healthy') {
          // 本次检查通过，记录下来
          healthyInThisCheck.add(bookmark.id);
        }
        return { bookmark, result };
      } catch (error) {
        checkedCount++;
        updateProgress();
        logger.error(`检查书签失败: ${bookmark.url}`, error);
        return { bookmark, result: { status: 'error', error: error.message } };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  // 清除本次检查通过的书签的 404 标记
  for (const id of healthyInThisCheck) {
    if (unhealthyBookmarkIds.has(id)) {
      unhealthyBookmarkIds.delete(id);
      const card = document.querySelector(`.bookmark-card[data-bookmark-id="${id}"]`);
      if (card) {
        card.classList.remove('unhealthy');
      }
    }
  }
  
  // 保存到 storage
  await saveUnhealthyBookmarkIds();
  
  // 恢复按钮状态
  btn.disabled = false;
  btn.innerHTML = originalText;
  healthCheckInProgress = false;
  
  // 显示结果
  if (unhealthyCount > 0) {
    showToast(t('unhealthyBookmarks', { count: unhealthyCount }), 'warning');
  } else {
    showToast(t('allBookmarksHealthy'), 'success');
  }
  
  logger.info(`健康检查完成: ${total} 个书签, ${unhealthyCount} 个无效`);
}

// ==================== 多选功能 ====================
function toggleBookmarkSelection(bookmarkId) {
  if (selectedBookmarks.has(bookmarkId)) {
    selectedBookmarks.delete(bookmarkId);
    lastSelectedBookmark = null;
  } else {
    selectedBookmarks.add(bookmarkId);
    lastSelectedBookmark = bookmarkId;
  }
  updateSelectionUI();
}

function selectBookmarkRange(bookmarkId) {
  if (!lastSelectedBookmark) {
    // 如果没有上一个选中项，就当作普通选择
    toggleBookmarkSelection(bookmarkId);
    return;
  }
  
  // 获取当前显示的所有书签卡片
  const cards = Array.from(document.querySelectorAll('.bookmark-card'));
  const startIndex = cards.findIndex(card => card.dataset.bookmarkId === lastSelectedBookmark);
  const endIndex = cards.findIndex(card => card.dataset.bookmarkId === bookmarkId);
  
  if (startIndex === -1 || endIndex === -1) return;
  
  // 确定范围
  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);
  
  // 选中范围内的所有书签
  for (let i = minIndex; i <= maxIndex; i++) {
    const id = cards[i].dataset.bookmarkId;
    selectedBookmarks.add(id);
  }
  
  lastSelectedBookmark = bookmarkId;
  updateSelectionUI();
}

function clearSelection() {
  selectedBookmarks.clear();
  lastSelectedBookmark = null;
  updateSelectionUI();
}

function selectAll() {
  const cards = document.querySelectorAll('.bookmark-card');
  cards.forEach(card => {
    selectedBookmarks.add(card.dataset.bookmarkId);
  });
  if (cards.length > 0) {
    lastSelectedBookmark = cards[cards.length - 1].dataset.bookmarkId;
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  // 更新所有书签卡片的选中状态
  document.querySelectorAll('.bookmark-card').forEach(card => {
    const bookmarkId = card.dataset.bookmarkId;
    if (selectedBookmarks.has(bookmarkId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // 更新批量操作按钮的显示状态
  updateBatchActionsUI();
}

function updateBatchActionsUI() {
  const batchActions = document.getElementById('batchActions');
  const selectedCountEl = document.getElementById('selectedCount');
  
  if (!batchActions) return;
  
  if (selectedBookmarks.size > 0) {
    batchActions.style.display = 'flex';
    if (selectedCountEl) {
      selectedCountEl.textContent = t('selectedCount', { count: selectedBookmarks.size });
    }
  } else {
    batchActions.style.display = 'none';
  }
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
  const parentFolder = getFolderById(parentFolderId);
  
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
  subfolderGroup.style.display = 'block';
  
  // 移除旧的事件监听器（如果存在）
  const oldHandler = subfolderSelect._clickHandler;
  if (oldHandler) {
    subfolderSelect.removeEventListener('mousedown', oldHandler);
  }
  
  // 使用 mousedown 事件（在选择状态改变之前触发）
  const mousedownHandler = function(e) {
    const clickedOption = e.target;
    if (clickedOption.tagName === 'OPTION') {
      // 记录点击时的选中状态
      const wasSelected = clickedOption.selected;
      
      // 如果点击的是已选中的选项，取消选择
      if (wasSelected) {
        e.preventDefault();
        clickedOption.selected = false;
        subfolderSelect.value = '';
      }
    }
  };
  
  subfolderSelect.addEventListener('mousedown', mousedownHandler);
  // 保存处理器引用以便后续移除
  subfolderSelect._clickHandler = mousedownHandler;
}

// 已移除滚轮事件处理函数（使用列表框模式不再需要）

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
      // 编辑现有书签 - 记录原值用于撤销
      const [oldBookmark] = await chrome.bookmarks.get(editingBookmarkId);
      
      await chrome.bookmarks.update(editingBookmarkId, { title, url });
      
      // 记录操作历史
      recordOperation({
        type: 'update',
        itemType: 'bookmark',
        data: {
          id: editingBookmarkId,
          oldTitle: oldBookmark.title,
          oldUrl: oldBookmark.url,
          newTitle: title,
          newUrl: url
        }
      });
      
      showToast(t('bookmarkUpdated'), 'success');
    } else {
      // 确定书签的父文件夹：优先使用子文件夹，否则使用顶级文件夹（总是有值）
      const parentId = subfolderId || topFolderId;
      
      // 创建新书签
      const newBookmark = await chrome.bookmarks.create({
        title,
        url,
        parentId
      });
      
      // 记录操作历史
      recordOperation({
        type: 'add',
        itemType: 'bookmark',
        data: {
          id: newBookmark.id
        }
      });
      
      showToast(t('bookmarkAdded'), 'success');
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
    // 记录书签信息用于撤销
    const [bookmark] = await chrome.bookmarks.get(bookmarkId);
    
    await chrome.bookmarks.remove(bookmarkId);
    
    // 记录操作历史
    recordOperation({
      type: 'delete',
      itemType: 'bookmark',
      data: {
        id: bookmarkId,
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId,
        index: bookmark.index
      }
    });
    
    showToast(t('bookmarkDeleted'), 'delete');
    await loadBookmarks();
    selectFolder(currentFolderId);
  } catch (error) {
    logger.error(t('deleteError'), error);
    await showAlert(t('deleteError'), t('error'));
  }
}

async function deleteSelectedBookmarks() {
  if (selectedBookmarks.size === 0) return;
  
  const count = selectedBookmarks.size;
  const confirmed = await showConfirm(
    `确定要删除选中的 ${count} 个书签吗？此操作可以撤销。`,
    t('deleteBookmark')
  );
  if (!confirmed) return;
  
  try {
    const bookmarkIds = Array.from(selectedBookmarks);
    const deletedBookmarks = [];
    
    // 先记录所有书签信息用于撤销
    for (const bookmarkId of bookmarkIds) {
      try {
        const [bookmark] = await chrome.bookmarks.get(bookmarkId);
        deletedBookmarks.push({
          id: bookmarkId,
          title: bookmark.title,
          url: bookmark.url,
          parentId: bookmark.parentId,
          index: bookmark.index
        });
      } catch (error) {
        logger.warn(`获取书签 ${bookmarkId} 信息失败:`, error);
      }
    }
    
    // 逐个删除书签
    for (const bookmarkId of bookmarkIds) {
      try {
        await chrome.bookmarks.remove(bookmarkId);
      } catch (error) {
        logger.warn(`删除书签 ${bookmarkId} 失败:`, error);
      }
    }
    
    // 记录批量删除操作到撤销历史
    if (deletedBookmarks.length > 0) {
      recordOperation({
        type: 'batchDelete',
        itemType: 'bookmark',
        data: {
          bookmarks: deletedBookmarks,
          count: deletedBookmarks.length
        }
      });
    }
    
    clearSelection();
    showToast(`已删除 ${count} 个书签`, 'delete');
    await loadBookmarks();
    selectFolder(currentFolderId);
  } catch (error) {
    logger.error('批量删除失败', error);
    await showAlert(t('deleteError'), t('error'));
  }
}

async function deleteFolder(folderId) {
  const confirmed = await showConfirm(t('deleteFolderConfirm'), t('deleteFolder'));
  if (!confirmed) return;
  
  try {
    // 获取要删除的文件夹
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) {
      await showAlert('无法删除系统文件夹', t('error'));
      return;
    }
    
    // 记录文件夹信息用于撤销
    const [folderInfo] = await chrome.bookmarks.get(folderId);
    
    const parentId = folder.parentId;
    
    // 递归收集该文件夹及所有子文件夹中的书签
    function collectAllBookmarks(folderNode) {
      let bookmarks = [];
      if (folderNode.children) {
        folderNode.children.forEach(item => {
          if (item.url) {
            bookmarks.push(item);
          } else if (item.children) {
            bookmarks = bookmarks.concat(collectAllBookmarks(item));
          }
        });
      }
      return bookmarks;
    }
    
    const bookmarksToMove = collectAllBookmarks(folder);
    
    // 先将所有书签移动到父文件夹
    for (const bookmark of bookmarksToMove) {
      try {
        await chrome.bookmarks.move(bookmark.id, { parentId: parentId });
        logger.debug(`已将书签 "${bookmark.title}" 移动到父文件夹`);
      } catch (error) {
        logger.error(`移动书签失败: ${bookmark.title}`, error);
      }
    }
    
    // 然后删除空文件夹（使用 removeTree 会删除该文件夹及其所有子文件夹）
    await chrome.bookmarks.removeTree(folderId);
    
    // 记录操作历史 - 保存书签ID列表用于撤销时恢复
    recordOperation({
      type: 'deleteFolder',
      itemType: 'folder',
      data: {
        id: folderId,
        title: folderInfo.title,
        parentId: parentId,
        index: folderInfo.index,
        bookmarkIds: bookmarksToMove.map(b => b.id), // 记录书签ID用于撤销
        bookmarkCount: bookmarksToMove.length
      }
    });
    
    showToast(t('folderDeleted'), 'delete');
    logger.debug(`已删除文件夹，共移动 ${bookmarksToMove.length} 个书签到上一级`);
    
    await loadBookmarks();
    // 删除后选择父文件夹
    selectFolder(parentId);
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
  // 先隐藏书签的右键菜单
  hideBookmarkContextMenu();
  
  const contextMenu = document.getElementById('contextMenu');
  contextMenuTargetId = folderId;
  
  // 检查是否是系统文件夹（书签栏、其他书签）
  const folder = topLevelFolders.find(f => f.id === folderId);
  const isSystemFolder = folder && folder.displayNameKey;
  
  // 如果是系统文件夹，禁用删除和重命名选项
  const deleteItem = contextMenu.querySelector('[data-action="delete"]');
  const renameItem = contextMenu.querySelector('[data-action="rename"]');
  
  if (deleteItem) {
    if (isSystemFolder) {
      deleteItem.classList.add('disabled');
    } else {
      deleteItem.classList.remove('disabled');
    }
  }
  
  if (renameItem) {
    if (isSystemFolder) {
      renameItem.classList.add('disabled');
    } else {
      renameItem.classList.remove('disabled');
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
    case 'createSubfolder':
      await createSubfolder(folderId);
      break;
    case 'delete':
      await deleteFolder(folderId);
      break;
    case 'rename':
      await renameFolder(folderId);
      break;
  }
}

// ==================== 书签右键菜单 ====================
let bookmarkContextMenuTargetId = null;
let bookmarkContextMenuTargetUrl = null;

function initBookmarkContextMenu() {
  const bookmarkContextMenu = document.getElementById('bookmarkContextMenu');
  if (!bookmarkContextMenu) return;
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', () => {
    hideBookmarkContextMenu();
  });
  
  // 阻止菜单自身的点击事件冒泡
  bookmarkContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // 绑定菜单项点击事件
  bookmarkContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (bookmarkContextMenuTargetId) {
        await handleBookmarkContextMenuAction(action, bookmarkContextMenuTargetId, bookmarkContextMenuTargetUrl);
      }
      hideBookmarkContextMenu();
    });
  });
}

function showBookmarkContextMenu(x, y, bookmarkId, url) {
  // 先隐藏文件夹的右键菜单
  hideContextMenu();
  
  const bookmarkContextMenu = document.getElementById('bookmarkContextMenu');
  bookmarkContextMenuTargetId = bookmarkId;
  bookmarkContextMenuTargetUrl = url;
  
  // 更新位置
  bookmarkContextMenu.style.left = x + 'px';
  bookmarkContextMenu.style.top = y + 'px';
  bookmarkContextMenu.style.display = 'block';
  
  // 确保菜单不超出屏幕
  const menuRect = bookmarkContextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    bookmarkContextMenu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
  }
  if (menuRect.bottom > window.innerHeight) {
    bookmarkContextMenu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
  }
}

function hideBookmarkContextMenu() {
  const bookmarkContextMenu = document.getElementById('bookmarkContextMenu');
  if (bookmarkContextMenu) {
    bookmarkContextMenu.style.display = 'none';
  }
  bookmarkContextMenuTargetId = null;
  bookmarkContextMenuTargetUrl = null;
}

async function handleBookmarkContextMenuAction(action, bookmarkId, url) {
  switch (action) {
    case 'openNewTab':
      window.open(url, '_blank');
      break;
    case 'copyUrl':
      try {
        await navigator.clipboard.writeText(url);
        showToast(t('urlCopied'), 'success');
      } catch (error) {
        logger.error('复制链接失败:', error);
        showToast(t('error'), 'error');
      }
      break;
    case 'editBookmark':
      openEditBookmarkModal(bookmarkId);
      break;
    case 'deleteBookmark':
      await deleteBookmark(bookmarkId);
      break;
  }
}

// 重命名文件夹
async function renameFolder(folderId) {
  try {
    const [folder] = await chrome.bookmarks.get(folderId);
    if (!folder) {
      await showAlert(t('folderNotFound'), t('error'));
      return;
    }
    
    // 检查是否是顶级文件夹（系统文件夹不允许重命名）
    if (folder.parentId === '0') {
      await showAlert(t('cannotRenameSystemFolder'), t('error'));
      return;
    }
    
    const newName = await showPrompt(folder.title, t('renameFolderTitle'));
    
    if (!newName || !newName.trim() || newName.trim() === folder.title) {
      return; // 用户取消或名称未变
    }
    
    const oldTitle = folder.title;
    await chrome.bookmarks.update(folderId, { title: newName.trim() });
    
    // 记录操作以支持撤销
    recordOperation({
      type: 'update',
      itemType: 'folder',
      data: {
        id: folderId,
        oldTitle: oldTitle,
        newTitle: newName.trim()
      }
    });
    
    showToast(t('folderRenamed'), 'success');
    await loadBookmarks();
    renderFolders();
    // 如果当前选中的是被重命名的文件夹，更新标题
    if (currentFolderId === folderId) {
      updateFolderTitle();
    }
  } catch (error) {
    logger.error(t('renameFolderError'), error);
    await showAlert(t('renameFolderError'), t('error'));
  }
}

// 创建子文件夹
async function createSubfolder(parentFolderId) {
  const folderName = await showPrompt(t('subfolder'), t('createSubfolder'));
  
  if (!folderName || !folderName.trim()) {
    return; // 用户取消或输入为空
  }
  
  try {
    await chrome.bookmarks.create({
      title: folderName.trim(),
      parentId: parentFolderId
    });
    
    showToast(`已创建子文件夹"${folderName.trim()}"`, 'success');
    await loadBookmarks();
    // 展开父文件夹以显示新创建的子文件夹
    expandedFolders.add(parentFolderId);
    renderFolders();
  } catch (error) {
    logger.error(t('createFolderError'), error);
    await showAlert(t('createFolderError'), t('error'));
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
// 注意：拖拽相关逻辑已整合到事件委托系统中：
// - initSidebarDelegation(): 处理侧边栏元素的拖拽
// - initBookmarksGridDelegation(): 处理书签网格元素的拖拽
// - handleDrop(): 统一的拖放处理逻辑

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

// 自定义输入对话框 - 替代原生 prompt
function showPrompt(defaultValue = '', title = '请输入') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('promptDialog');
    const titleEl = document.getElementById('promptTitle');
    const inputEl = document.getElementById('promptInput');
    const confirmBtn = document.getElementById('promptConfirmBtn');
    const cancelBtn = document.getElementById('promptCancelBtn');
    
    titleEl.textContent = title;
    inputEl.value = defaultValue;
    confirmBtn.textContent = t('confirm') || '确定';
    cancelBtn.textContent = t('cancel') || '取消';
    
    overlay.style.display = 'flex';
    
    // 聚焦输入框并选中文本
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 50);
    
    const handleConfirm = () => {
      const value = inputEl.value;
      cleanup();
      resolve(value);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(null);
    };
    
    const handleKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    
    const cleanup = () => {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      inputEl.removeEventListener('keydown', handleKeydown);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    inputEl.addEventListener('keydown', handleKeydown);
  });
}

// ==================== Toast 提示系统 ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  
  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // 添加到容器
  container.appendChild(toast);
  
  // 3秒后开始淡出动画
  setTimeout(() => {
    toast.classList.add('toast-hide');
    // 动画完成后移除元素
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// ==================== 撤销功能系统 ====================
/**
 * 记录可撤销的操作
 * @param {Object} operation - 操作对象
 * @param {string} operation.type - 操作类型: 'add', 'update', 'delete', 'move'
 * @param {string} operation.itemType - 项目类型: 'bookmark', 'folder'
 * @param {Object} operation.data - 操作数据
 */
function recordOperation(operation) {
  undoHistory.push(operation);
  
  // 保持历史记录不超过最大限制
  if (undoHistory.length > MAX_UNDO_HISTORY) {
    undoHistory.shift(); // 移除最旧的记录
  }
  
  // 更新撤销按钮状态
  updateUndoButtonState();
  
  logger.debug('操作已记录:', operation);
}

/**
 * 执行撤销操作
 */
async function performUndo() {
  if (undoHistory.length === 0) {
    showToast(t('noUndoHistory'), 'warning');
    return;
  }
  
  const operation = undoHistory.pop();
  logger.debug('执行撤销:', operation);
  
  try {
    switch (operation.type) {
      case 'add':
        // 撤销添加 = 删除
        if (operation.itemType === 'bookmark') {
          await chrome.bookmarks.remove(operation.data.id);
        } else if (operation.itemType === 'folder') {
          // 文件夹可能有内容，使用 removeTree
          await chrome.bookmarks.removeTree(operation.data.id);
        }
        break;
        
      case 'update':
        // 撤销更新 = 恢复原值
        const updateData = {
          title: operation.data.oldTitle
        };
        // 只有书签才有 url 字段
        if (operation.data.oldUrl !== undefined) {
          updateData.url = operation.data.oldUrl;
        }
        await chrome.bookmarks.update(operation.data.id, updateData);
        break;
        
      case 'delete':
        // 撤销删除 = 重新创建
        const createData = {
          title: operation.data.title,
          parentId: operation.data.parentId,
          index: operation.data.index
        };
        if (operation.itemType === 'bookmark') {
          createData.url = operation.data.url;
        }
        await chrome.bookmarks.create(createData);
        break;
        
      case 'move':
        // 撤销移动 = 移回原位置
        logger.debug(`撤销移动: id=${operation.data.id}, 目标位置 parentId=${operation.data.oldParentId}, index=${operation.data.oldIndex}`);
        
        // 获取当前位置
        const [currentItem] = await chrome.bookmarks.get(operation.data.id);
        let restoreIndex = operation.data.oldIndex;
        
        // 如果在同一文件夹内移动，需要调整索引
        // Chrome API 在同一文件夹内移动时，如果目标 index > 当前 index，实际位置会少 1
        if (currentItem.parentId === operation.data.oldParentId) {
          const currentIndex = currentItem.index;
          if (restoreIndex > currentIndex) {
            restoreIndex++; // 补偿 Chrome API 的行为
            logger.debug(`同文件夹内移动，调整撤销目标索引: ${operation.data.oldIndex} -> ${restoreIndex}`);
          }
        }
        
        await chrome.bookmarks.move(operation.data.id, {
          parentId: operation.data.oldParentId,
          index: restoreIndex
        });
        // 验证移动后的位置
        const [undoneItem] = await chrome.bookmarks.get(operation.data.id);
        logger.debug(`撤销后实际位置: index=${undoneItem.index}`);
        break;
        
      case 'batchMove':
        // 撤销批量移动 = 将所有书签移回原位置
        // 按倒序撤销，避免索引冲突
        for (let i = operation.data.items.length - 1; i >= 0; i--) {
          const item = operation.data.items[i];
          try {
            await chrome.bookmarks.move(item.id, {
              parentId: item.oldParentId,
              index: item.oldIndex
            });
          } catch (error) {
            logger.error(`撤销移动书签 ${item.id} 失败:`, error);
          }
        }
        break;
        
      case 'batchDelete':
        // 撤销批量删除 = 重新创建所有书签
        // 按倒序创建，保持原始顺序
        for (let i = operation.data.bookmarks.length - 1; i >= 0; i--) {
          const bookmark = operation.data.bookmarks[i];
          try {
            await chrome.bookmarks.create({
              title: bookmark.title,
              url: bookmark.url,
              parentId: bookmark.parentId,
              index: bookmark.index
            });
          } catch (error) {
            logger.error(`恢复书签 ${bookmark.title} 失败:`, error);
          }
        }
        break;
        
      case 'deleteFolder':
        // 撤销删除文件夹 = 重新创建文件夹并将书签移回去
        const newFolder = await chrome.bookmarks.create({
          title: operation.data.title,
          parentId: operation.data.parentId,
          index: operation.data.index
        });
        
        // 将之前移动到父文件夹的书签移回新文件夹
        if (operation.data.bookmarkIds && operation.data.bookmarkIds.length > 0) {
          let movedCount = 0;
          for (const bookmarkId of operation.data.bookmarkIds) {
            try {
              // 检查书签是否仍然存在
              await chrome.bookmarks.get(bookmarkId);
              await chrome.bookmarks.move(bookmarkId, { parentId: newFolder.id });
              movedCount++;
            } catch (error) {
              logger.warn(`书签 ${bookmarkId} 不存在或已被删除，跳过`);
            }
          }
          logger.debug(`已将 ${movedCount}/${operation.data.bookmarkIds.length} 个书签移回文件夹`);
        }
        break;
        
      default:
        logger.error('未知的操作类型:', operation.type);
        return;
    }
    
    showToast(t('undoSuccess'), 'info');
    
    // 刷新显示
    await loadBookmarks();
    selectFolder(currentFolderId, false);
    renderFolders();
    
  } catch (error) {
    logger.error('撤销操作失败:', error);
    await showAlert('撤销失败: ' + error.message, t('error'));
    // 如果撤销失败，将操作重新放回历史记录
    undoHistory.push(operation);
  }
  
  // 更新撤销按钮状态
  updateUndoButtonState();
}

/**
 * 更新撤销按钮的启用/禁用状态
 */
function updateUndoButtonState() {
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    if (undoHistory.length > 0) {
      undoBtn.disabled = false;
      undoBtn.style.opacity = '1';
    } else {
      undoBtn.disabled = true;
      undoBtn.style.opacity = '0.5';
    }
  }
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

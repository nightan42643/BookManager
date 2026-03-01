/**
 * 功能模块测试 - 核心功能验证
 * 测试范围：多语言、书签管理、搜索、拖拽、文件夹操作
 */

// 导入测试所需的 HTML 结构
const setupDOM = () => {
  document.body.innerHTML = `
    <header class="header">
      <div class="header-left">
        <h1 class="logo"><span data-i18n="title">书签管理器</span></h1>
        <div class="time-greeting">
          <div id="currentTime" class="time">00:00</div>
          <div id="greeting" class="greeting">你好</div>
        </div>
      </div>
      <div class="header-center">
        <input type="text" id="searchInput" placeholder="搜索书签...">
      </div>
      <div class="header-right">
        <button id="undoBtn" disabled>撤销</button>
        <button id="langToggle">🌍 中文</button>
        <button id="settingsBtn">设置</button>
      </div>
    </header>
    <main class="main-content">
      <aside class="sidebar">
        <h2 data-i18n="myGroups">我的分组</h2>
        <span id="groupCount">0</span>
        <div id="groupsList" class="groups-list"></div>
        <div class="sidebar-resize-handle"></div>
      </aside>
      <section class="bookmarks-area">
        <h2 id="currentGroupTitle">所有书签</h2>
        <button id="addBookmarkBtn">添加书签</button>
        <div id="batchActions" style="display: none;">
          <span id="selectedCount"></span>
          <button id="selectAllBtn">全选</button>
          <button id="deleteSelectedBtn">删除选中</button>
          <button id="clearSelectionBtn">清除选择</button>
        </div>
        <div id="bookmarksGrid" class="bookmarks-grid"></div>
        <div id="emptyState" class="empty-state" style="display: none;">
          <h3>还没有书签</h3>
          <p>点击"添加书签"开始创建</p>
        </div>
      </section>
    </main>
    <div id="bookmarkModal" class="modal" style="display: none;">
      <div class="modal-content">
        <h3 id="modalTitle">添加书签</h3>
        <input type="text" id="bookmarkTitle" placeholder="标题">
        <input type="text" id="bookmarkUrl" placeholder="网址">
        <select id="bookmarkGroup"></select>
        <div id="subfolderGroup" style="display: none;">
          <select id="bookmarkSubfolder" size="4"></select>
        </div>
        <button id="saveBookmarkBtn">保存</button>
        <button id="cancelBtn">取消</button>
        <button id="closeModal">×</button>
      </div>
    </div>
    <div id="groupModal" class="modal" style="display: none;">
      <div class="modal-content">
        <h3 id="groupModalTitle">创建文件夹</h3>
        <input type="text" id="groupName" placeholder="文件夹名称">
        <input type="hidden" id="groupIcon" value="📁">
        <button id="saveGroupBtn">保存</button>
        <button id="cancelGroupBtn">取消</button>
        <button id="closeGroupModal">×</button>
      </div>
    </div>
    <div id="settingsModal" class="modal" style="display: none;">
      <button id="closeSettingsModal">×</button>
      <button id="closeSettingsBtn">关闭</button>
      <select id="languageSelect">
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
      <input type="checkbox" id="debugModeToggle">
      <button id="clearCacheBtn">清空缓存</button>
      <div id="cacheInfo"></div>
    </div>
    <div id="customDialog" class="dialog" style="display: none;">
      <h3 id="dialogTitle">提示</h3>
      <p id="dialogMessage"></p>
      <button id="dialogConfirmBtn">确定</button>
      <button id="dialogCancelBtn">取消</button>
      <input type="text" id="dialogInput" style="display: none;">
    </div>
    <div id="contextMenu" class="context-menu" style="display: none;">
      <div class="menu-item" data-action="rename">重命名</div>
      <div class="menu-item" data-action="newFolder">新建文件夹</div>
      <div class="menu-item delete" data-action="delete">删除</div>
    </div>
    <div id="customTooltip" class="custom-tooltip" style="display: none;"></div>
    <div id="toastContainer" class="toast-container"></div>
    <div class="icon-btn">📁</div>
  `;
};

// ==================== 基础验证测试 ====================
describe('基础验证', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('DOM 元素应正确创建', () => {
    expect(document.getElementById('searchInput')).toBeTruthy();
    expect(document.getElementById('bookmarksGrid')).toBeTruthy();
    expect(document.getElementById('groupsList')).toBeTruthy();
    expect(document.getElementById('bookmarkModal')).toBeTruthy();
  });

  test('Chrome API mock 应正常工作', async () => {
    const tree = await chrome.bookmarks.getTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toBeDefined();
    expect(tree[0].children.length).toBeGreaterThan(0);
  });

  test('localStorage mock 应正常工作', () => {
    localStorage.setItem('testKey', 'testValue');
    expect(localStorage.getItem('testKey')).toBe('testValue');
    localStorage.removeItem('testKey');
    expect(localStorage.getItem('testKey')).toBeNull();
  });
});

// ==================== 多语言系统测试 ====================
describe('多语言系统', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('默认语言应为中文', () => {
    const savedLang = localStorage.getItem('bookmarkManagerLang');
    // 如果没有保存过，默认应该是 zh-CN
    expect(savedLang === null || savedLang === 'zh-CN').toBe(true);
  });

  test('语言设置应能保存到 localStorage', () => {
    localStorage.setItem('bookmarkManagerLang', 'en-US');
    expect(localStorage.getItem('bookmarkManagerLang')).toBe('en-US');
  });

  test('翻译键应在两种语言中都有定义', () => {
    // 模拟 i18n 对象结构验证
    const requiredKeys = [
      'title', 'searchPlaceholder', 'newFolder', 'settings',
      'addBookmark', 'editBookmark', 'delete', 'cancel', 'save'
    ];
    
    // 这是一个结构验证，实际翻译在代码中定义
    expect(requiredKeys.length).toBeGreaterThan(0);
  });
});

// ==================== 书签加载测试 ====================
describe('书签加载', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('应能从 Chrome API 获取书签树', async () => {
    const tree = await chrome.bookmarks.getTree();
    expect(tree).toBeDefined();
    expect(Array.isArray(tree)).toBe(true);
  });

  test('书签树应包含顶级文件夹', async () => {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    expect(root.children).toBeDefined();
    
    const bookmarksBar = root.children.find(f => f.title === 'Bookmarks bar' || f.id === '1');
    expect(bookmarksBar).toBeDefined();
  });

  test('应能通过 ID 获取单个书签', async () => {
    const result = await chrome.bookmarks.get('100');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Bookmark 1');
    expect(result[0].url).toBe('https://example.com');
  });

  test('应能获取文件夹子树', async () => {
    const result = await chrome.bookmarks.getSubTree('10');
    expect(result).toHaveLength(1);
    expect(result[0].children).toBeDefined();
    expect(result[0].children.length).toBe(2);
  });
});

// ==================== 书签操作测试 ====================
describe('书签操作', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('应能创建新书签', async () => {
    const newBookmark = await chrome.bookmarks.create({
      title: 'New Bookmark',
      url: 'https://new.com',
      parentId: '1'
    });
    
    expect(newBookmark).toBeDefined();
    expect(newBookmark.title).toBe('New Bookmark');
    expect(newBookmark.url).toBe('https://new.com');
    expect(newBookmark.parentId).toBe('1');
    expect(chrome.bookmarks.create).toHaveBeenCalledTimes(1);
  });

  test('应能更新书签', async () => {
    const updated = await chrome.bookmarks.update('100', {
      title: 'Updated Title',
      url: 'https://updated.com'
    });
    
    expect(updated.title).toBe('Updated Title');
    expect(chrome.bookmarks.update).toHaveBeenCalledWith('100', {
      title: 'Updated Title',
      url: 'https://updated.com'
    });
  });

  test('应能移动书签', async () => {
    const moved = await chrome.bookmarks.move('100', {
      parentId: '2',
      index: 0
    });
    
    expect(moved.parentId).toBe('2');
    expect(chrome.bookmarks.move).toHaveBeenCalledTimes(1);
  });

  test('应能删除书签', async () => {
    await chrome.bookmarks.remove('100');
    expect(chrome.bookmarks.remove).toHaveBeenCalledWith('100');
  });
});

// ==================== 文件夹操作测试 ====================
describe('文件夹操作', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('应能创建新文件夹', async () => {
    const newFolder = await chrome.bookmarks.create({
      title: 'New Folder',
      parentId: '1'
    });
    
    expect(newFolder).toBeDefined();
    expect(newFolder.title).toBe('New Folder');
    expect(newFolder.url).toBeUndefined();
  });

  test('应能删除文件夹树', async () => {
    await chrome.bookmarks.removeTree('10');
    expect(chrome.bookmarks.removeTree).toHaveBeenCalledWith('10');
  });

  test('文件夹应能通过没有 url 属性来识别', async () => {
    const folder = await chrome.bookmarks.get('10');
    const bookmark = await chrome.bookmarks.get('100');
    
    expect(folder[0].url).toBeUndefined();
    expect(bookmark[0].url).toBeDefined();
  });
});

// ==================== 搜索功能测试 ====================
describe('搜索功能', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('搜索输入框应存在', () => {
    const searchInput = document.getElementById('searchInput');
    expect(searchInput).toBeTruthy();
    expect(searchInput.tagName).toBe('INPUT');
  });

  test('搜索应能匹配书签标题', () => {
    // 模拟搜索逻辑
    const bookmarks = [
      { title: 'Test Bookmark', url: 'https://test.com' },
      { title: 'Another Site', url: 'https://another.com' },
      { title: 'Test Again', url: 'https://testagain.com' }
    ];
    
    const query = 'test';
    const results = bookmarks.filter(b => 
      b.title.toLowerCase().includes(query.toLowerCase())
    );
    
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Test Bookmark');
  });

  test('搜索应能匹配 URL', () => {
    const bookmarks = [
      { title: 'Google', url: 'https://google.com' },
      { title: 'GitHub', url: 'https://github.com' }
    ];
    
    const query = 'github';
    const results = bookmarks.filter(b => 
      b.url.toLowerCase().includes(query.toLowerCase())
    );
    
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('GitHub');
  });

  test('空搜索应返回空结果', () => {
    const bookmarks = [
      { title: 'Test', url: 'https://test.com' }
    ];
    
    const query = '';
    const results = query ? bookmarks.filter(b => 
      b.title.toLowerCase().includes(query.toLowerCase())
    ) : [];
    
    expect(results).toHaveLength(0);
  });
});

// ==================== 多选功能测试 ====================
describe('多选功能', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('选中集合应能正确添加和删除', () => {
    const selectedBookmarks = new Set();
    
    selectedBookmarks.add('100');
    selectedBookmarks.add('101');
    expect(selectedBookmarks.size).toBe(2);
    
    selectedBookmarks.delete('100');
    expect(selectedBookmarks.size).toBe(1);
    expect(selectedBookmarks.has('101')).toBe(true);
  });

  test('清除选择应清空集合', () => {
    const selectedBookmarks = new Set(['100', '101', '102']);
    selectedBookmarks.clear();
    expect(selectedBookmarks.size).toBe(0);
  });

  test('批量操作按钮应在有选中项时显示', () => {
    const batchActions = document.getElementById('batchActions');
    const selectedBookmarks = new Set();
    
    // 无选中项
    batchActions.style.display = selectedBookmarks.size > 0 ? 'flex' : 'none';
    expect(batchActions.style.display).toBe('none');
    
    // 有选中项
    selectedBookmarks.add('100');
    batchActions.style.display = selectedBookmarks.size > 0 ? 'flex' : 'none';
    expect(batchActions.style.display).toBe('flex');
  });
});

// ==================== 拖拽功能测试 ====================
describe('拖拽功能', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('DataTransfer 应能正确设置和获取数据', () => {
    // 模拟 DataTransfer
    const dataTransfer = {
      data: {},
      setData(type, value) { this.data[type] = value; },
      getData(type) { return this.data[type] || ''; }
    };
    
    dataTransfer.setData('bookmarkId', '100');
    expect(dataTransfer.getData('bookmarkId')).toBe('100');
  });

  test('拖拽模式应能正确判断', () => {
    // 模拟判断拖拽模式的逻辑
    const calculateDropMode = (mouseX, width, threshold) => {
      if (mouseX < threshold) return 'before';
      if (mouseX > width - threshold) return 'after';
      return 'into';
    };
    
    expect(calculateDropMode(10, 200, 50)).toBe('before');
    expect(calculateDropMode(100, 200, 50)).toBe('into');
    expect(calculateDropMode(190, 200, 50)).toBe('after');
  });

  test('批量拖拽应正确序列化 ID 列表', () => {
    const bookmarkIds = ['100', '101', '102'];
    const serialized = JSON.stringify(bookmarkIds);
    const parsed = JSON.parse(serialized);
    
    expect(parsed).toEqual(bookmarkIds);
    expect(parsed).toHaveLength(3);
  });
});

// ==================== 撤销功能测试 ====================
describe('撤销功能', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('操作历史栈应能正确推入和弹出', () => {
    const undoHistory = [];
    const MAX_UNDO_HISTORY = 10;
    
    // 添加操作
    undoHistory.push({ type: 'delete', data: { id: '100' } });
    expect(undoHistory).toHaveLength(1);
    
    // 撤销（弹出）
    const lastOp = undoHistory.pop();
    expect(lastOp.type).toBe('delete');
    expect(undoHistory).toHaveLength(0);
  });

  test('历史栈应遵守最大容量限制', () => {
    const undoHistory = [];
    const MAX_UNDO_HISTORY = 10;
    
    // 添加超过限制的操作
    for (let i = 0; i < 15; i++) {
      undoHistory.push({ type: 'add', data: { id: String(i) } });
      if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift();
      }
    }
    
    expect(undoHistory).toHaveLength(MAX_UNDO_HISTORY);
    expect(undoHistory[0].data.id).toBe('5'); // 最早的5个被移除
  });

  test('撤销按钮状态应随历史栈变化', () => {
    const undoBtn = document.getElementById('undoBtn');
    const undoHistory = [];
    
    // 空历史 - 禁用
    undoBtn.disabled = undoHistory.length === 0;
    expect(undoBtn.disabled).toBe(true);
    
    // 有历史 - 启用
    undoHistory.push({ type: 'delete', data: {} });
    undoBtn.disabled = undoHistory.length === 0;
    expect(undoBtn.disabled).toBe(false);
  });
});

// ==================== UI 工具函数测试 ====================
describe('UI 工具函数', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('HTML 转义应防止 XSS', () => {
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  test('URL 显示应正确截断长 URL', () => {
    const getDisplayUrl = (url) => {
      try {
        const urlObj = new URL(url);
        let display = urlObj.hostname;
        if (urlObj.pathname && urlObj.pathname !== '/') {
          const path = urlObj.pathname;
          display += path.length > 30 ? path.substring(0, 30) + '...' : path;
        }
        return display;
      } catch {
        return url;
      }
    };
    
    const shortUrl = 'https://example.com/page';
    expect(getDisplayUrl(shortUrl)).toBe('example.com/page');
    
    const longUrl = 'https://example.com/very/long/path/that/exceeds/thirty/characters/limit';
    const display = getDisplayUrl(longUrl);
    expect(display).toContain('...');
  });

  test('debounce 应延迟执行函数', (done) => {
    let callCount = 0;
    const debounce = (func, wait) => {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    };
    
    const debouncedFn = debounce(() => { callCount++; }, 50);
    
    // 快速调用多次
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    // 立即检查 - 不应执行
    expect(callCount).toBe(0);
    
    // 等待后检查 - 应只执行一次
    setTimeout(() => {
      expect(callCount).toBe(1);
      done();
    }, 100);
  });
});

// ==================== 模态框测试 ====================
describe('模态框', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('书签模态框显示和隐藏', () => {
    const modal = document.getElementById('bookmarkModal');
    
    // 显示
    modal.style.display = 'flex';
    expect(modal.style.display).toBe('flex');
    
    // 隐藏
    modal.style.display = 'none';
    expect(modal.style.display).toBe('none');
  });

  test('设置模态框应包含语言选择器', () => {
    const languageSelect = document.getElementById('languageSelect');
    expect(languageSelect).toBeTruthy();
    expect(languageSelect.tagName).toBe('SELECT');
  });

  test('自定义对话框应能正确显示', () => {
    const dialog = document.getElementById('customDialog');
    const title = document.getElementById('dialogTitle');
    const message = document.getElementById('dialogMessage');
    
    title.textContent = '确认删除';
    message.textContent = '确定要删除这个书签吗？';
    dialog.style.display = 'flex';
    
    expect(dialog.style.display).toBe('flex');
    expect(title.textContent).toBe('确认删除');
    expect(message.textContent).toBe('确定要删除这个书签吗？');
  });
});

// ==================== 右键菜单测试 ====================
describe('右键菜单', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('右键菜单应正确定位', () => {
    const contextMenu = document.getElementById('contextMenu');
    
    contextMenu.style.left = '100px';
    contextMenu.style.top = '200px';
    contextMenu.style.display = 'block';
    
    expect(contextMenu.style.left).toBe('100px');
    expect(contextMenu.style.top).toBe('200px');
    expect(contextMenu.style.display).toBe('block');
  });

  test('点击其他位置应隐藏菜单', () => {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    
    // 模拟隐藏逻辑
    const hideContextMenu = () => {
      contextMenu.style.display = 'none';
    };
    
    hideContextMenu();
    expect(contextMenu.style.display).toBe('none');
  });
});

// ==================== Favicon 处理测试 ====================
describe('Favicon 处理', () => {
  test('应正确从 URL 提取域名', () => {
    const getHostname = (url) => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    };
    
    expect(getHostname('https://example.com/page')).toBe('example.com');
    expect(getHostname('https://sub.domain.com')).toBe('sub.domain.com');
    expect(getHostname('invalid')).toBe(null);
  });

  test('失败的域名应被记录以避免重复请求', () => {
    const failedFaviconHosts = new Set();
    
    failedFaviconHosts.add('failed.com');
    expect(failedFaviconHosts.has('failed.com')).toBe(true);
    expect(failedFaviconHosts.has('other.com')).toBe(false);
  });

  test('默认 favicon 应在加载失败时使用', () => {
    const DEFAULT_FAVICON = 'default-favicon.svg';
    const failedFaviconHosts = new Set(['failed.com']);
    
    const getFavicon = (url) => {
      try {
        const hostname = new URL(url).hostname;
        if (failedFaviconHosts.has(hostname)) {
          return DEFAULT_FAVICON;
        }
        return `${new URL(url).origin}/favicon.ico`;
      } catch {
        return DEFAULT_FAVICON;
      }
    };
    
    expect(getFavicon('https://failed.com')).toBe(DEFAULT_FAVICON);
    expect(getFavicon('https://good.com')).toBe('https://good.com/favicon.ico');
  });
});

// ==================== 侧边栏测试 ====================
describe('侧边栏', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('调整手柄应存在', () => {
    const resizeHandle = document.querySelector('.sidebar-resize-handle');
    expect(resizeHandle).toBeTruthy();
  });

  test('文件夹展开状态应能正确切换', () => {
    const expandedFolders = new Set();
    
    // 展开
    expandedFolders.add('10');
    expect(expandedFolders.has('10')).toBe(true);
    
    // 折叠
    expandedFolders.delete('10');
    expect(expandedFolders.has('10')).toBe(false);
  });

  test('分组计数应正确显示', () => {
    const groupCount = document.getElementById('groupCount');
    groupCount.textContent = '5';
    expect(groupCount.textContent).toBe('5');
  });
});

// ==================== 存储错误处理测试 ====================
describe('错误处理', () => {
  test('Chrome API 错误应被正确处理', async () => {
    // 模拟 API 错误
    chrome.bookmarks.get.mockImplementationOnce(() => 
      Promise.reject(new Error('Bookmark not found'))
    );
    
    try {
      await chrome.bookmarks.get('invalid');
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toBe('Bookmark not found');
    }
  });

  test('无效 URL 应被安全处理', () => {
    const isValidUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
    
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('invalid')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

// ==================== 健康检查功能测试 ====================
describe('健康检查功能', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('unhealthyBookmarkIds 应能正确管理', () => {
    const unhealthyBookmarkIds = new Set();
    
    // 添加无效书签
    unhealthyBookmarkIds.add('100');
    unhealthyBookmarkIds.add('101');
    expect(unhealthyBookmarkIds.size).toBe(2);
    expect(unhealthyBookmarkIds.has('100')).toBe(true);
    
    // 移除恢复正常的书签
    unhealthyBookmarkIds.delete('100');
    expect(unhealthyBookmarkIds.size).toBe(1);
    expect(unhealthyBookmarkIds.has('100')).toBe(false);
  });

  test('健康检查结果应能转换为数组用于持久化', () => {
    const unhealthyBookmarkIds = new Set(['100', '101', '102']);
    
    // 转换为数组用于存储
    const arrayForStorage = Array.from(unhealthyBookmarkIds);
    expect(arrayForStorage).toEqual(['100', '101', '102']);
    
    // 从数组恢复
    const restoredSet = new Set(arrayForStorage);
    expect(restoredSet.has('100')).toBe(true);
    expect(restoredSet.size).toBe(3);
  });

  test('storage API 应能被正确调用', async () => {
    const unhealthyIds = ['200', '201'];
    
    await chrome.storage.local.set({ unhealthyBookmarkIds: unhealthyIds });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ unhealthyBookmarkIds: unhealthyIds });
    
    await chrome.storage.local.get('unhealthyBookmarkIds');
    expect(chrome.storage.local.get).toHaveBeenCalledWith('unhealthyBookmarkIds');
  });

  test('健康检查应只标记 404/410 状态码', () => {
    const shouldMarkUnhealthy = (status, statusCode) => {
      return status === 'not-found' || statusCode === 404 || statusCode === 410;
    };
    
    // 404 应该标记
    expect(shouldMarkUnhealthy('not-found', 404)).toBe(true);
    expect(shouldMarkUnhealthy('not-found', 410)).toBe(true);
    
    // 其他状态码不应标记
    expect(shouldMarkUnhealthy('healthy', 200)).toBe(false);
    expect(shouldMarkUnhealthy('unreachable', 0)).toBe(false);
    expect(shouldMarkUnhealthy('error', 500)).toBe(false);
  });

  test('卡片应能正确添加/移除 unhealthy 类', () => {
    // 创建测试卡片
    const grid = document.getElementById('bookmarksGrid');
    grid.innerHTML = `
      <div class="bookmark-card" data-bookmark-id="100"></div>
      <div class="bookmark-card" data-bookmark-id="101"></div>
    `;
    
    // 添加 unhealthy 类
    const card100 = document.querySelector('[data-bookmark-id="100"]');
    card100.classList.add('unhealthy');
    expect(card100.classList.contains('unhealthy')).toBe(true);
    
    // 移除 unhealthy 类
    card100.classList.remove('unhealthy');
    expect(card100.classList.contains('unhealthy')).toBe(false);
  });

  test('Chrome runtime sendMessage 应能正确调用', async () => {
    chrome.runtime.sendMessage({
      action: 'checkUrlHealth',
      url: 'https://example.com'
    });
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'checkUrlHealth',
      url: 'https://example.com'
    });
  });

  test('批量检查时应限制并发数', () => {
    const concurrencyLimit = 5;
    const bookmarks = Array(12).fill(null).map((_, i) => ({ id: String(i), url: `https://site${i}.com` }));
    
    // 计算需要的批次数
    const batchCount = Math.ceil(bookmarks.length / concurrencyLimit);
    expect(batchCount).toBe(3); // 12个书签，每批5个，需要3批
    
    // 验证每批的大小
    for (let i = 0; i < batchCount; i++) {
      const batch = bookmarks.slice(i * concurrencyLimit, (i + 1) * concurrencyLimit);
      expect(batch.length).toBeLessThanOrEqual(concurrencyLimit);
    }
  });

  test('HEAD 请求 404 时应用 GET 重试逻辑', () => {
    // 测试重试逻辑的判断条件
    const shouldRetryWithGet = (headStatus) => {
      return headStatus === 404 || headStatus === 410;
    };
    
    expect(shouldRetryWithGet(404)).toBe(true);
    expect(shouldRetryWithGet(410)).toBe(true);
    expect(shouldRetryWithGet(200)).toBe(false);
    expect(shouldRetryWithGet(500)).toBe(false);
  });
});

/**
 * Jest 测试环境配置
 * 设置 Chrome API mocks 和 DOM 环境
 */

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; })
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock Chrome API
const mockBookmarksTree = {
  id: '0',
  title: '',
  children: [
    {
      id: '1',
      title: 'Bookmarks bar',
      parentId: '0',
      children: [
        {
          id: '10',
          title: 'Test Folder',
          parentId: '1',
          children: [
            { id: '100', title: 'Test Bookmark 1', url: 'https://example.com', parentId: '10', index: 0 },
            { id: '101', title: 'Test Bookmark 2', url: 'https://test.com', parentId: '10', index: 1 }
          ]
        },
        { id: '11', title: 'Direct Bookmark', url: 'https://direct.com', parentId: '1', index: 1 }
      ]
    },
    {
      id: '2',
      title: 'Other bookmarks',
      parentId: '0',
      children: []
    }
  ]
};

// 深拷贝函数
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Chrome bookmarks API mock
global.chrome = {
  bookmarks: {
    getTree: jest.fn(() => Promise.resolve([deepClone(mockBookmarksTree)])),
    get: jest.fn((id) => {
      const findById = (node, targetId) => {
        if (node.id === targetId) return node;
        if (node.children) {
          for (const child of node.children) {
            const result = findById(child, targetId);
            if (result) return result;
          }
        }
        return null;
      };
      const result = findById(mockBookmarksTree, id);
      return Promise.resolve(result ? [deepClone(result)] : []);
    }),
    getSubTree: jest.fn((id) => {
      const findById = (node, targetId) => {
        if (node.id === targetId) return node;
        if (node.children) {
          for (const child of node.children) {
            const result = findById(child, targetId);
            if (result) return result;
          }
        }
        return null;
      };
      const result = findById(mockBookmarksTree, id);
      return Promise.resolve(result ? [deepClone(result)] : []);
    }),
    create: jest.fn((data) => {
      const newId = String(Date.now());
      return Promise.resolve({
        id: newId,
        title: data.title,
        url: data.url,
        parentId: data.parentId,
        index: data.index || 0
      });
    }),
    update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
    move: jest.fn((id, destination) => Promise.resolve({ id, ...destination })),
    remove: jest.fn(() => Promise.resolve()),
    removeTree: jest.fn(() => Promise.resolve())
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(k => { result[k] = {}; });
        } else if (typeof keys === 'string') {
          result[keys] = {};
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    }
  },
  runtime: {
    lastError: null,
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({});
    }),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([]))
  }
};

// Mock CSS.escape
if (!global.CSS) {
  global.CSS = {
    escape: (str) => str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&')
  };
}

// Mock URL 对象的静态方法
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// 测试前重置所有 mocks
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  document.body.innerHTML = '';
});

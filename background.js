// 后台服务工作进程
// ==================== Debug 模式和日志系统 ====================
const logger = {
  // Info 级别：重要信息，始终显示
  info: (message, ...args) => {
    console.log(`%c[BG INFO]%c ${message}`, 'color: #4CAF50; font-weight: bold', 'color: inherit', ...args);
  },
  
  // Debug 级别：详细信息，需要开启 debug 模式
  debug: (message, ...args) => {
    // 从 storage 读取 debug 设置（异步，但不阻塞）
    chrome.storage.local.get(['debugMode'], (result) => {
      if (chrome.runtime.lastError || !result) {
        return; // 静默失败，不显示 debug 信息
      }
      if (result.debugMode) {
        console.log(`%c[BG DEBUG]%c ${message}`, 'color: #9E9E9E; font-weight: bold', 'color: #666', ...args);
      }
    });
  },
  
  // Error 级别：错误信息，始终显示
  error: (message, ...args) => {
    console.error(`%c[BG ERROR]%c ${message}`, 'color: #F44336; font-weight: bold', 'color: inherit', ...args);
  }
};

logger.info('书签管理器后台服务已启动');

// favicon 缓存对象
const faviconCache = new Map();

// 正在请求中的 hostname 集合（防止并发重复请求）
const pendingRequests = new Set();

// 已失败的 hostname 集合（防止重复请求已失败的 URL）
const failedRequests = new Set();

// 缓存有效期：24 小时（毫秒）
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

// 检查缓存是否过期
function isCacheExpired(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return true; // 没有时间戳的旧缓存视为过期
  }
  const now = Date.now();
  return (now - cacheEntry.timestamp) > CACHE_EXPIRY_TIME;
}

// 扫描所有当前打开的标签页，更新最新的 favicon
async function scanAllTabsForFavicons() {
  logger.debug('开始扫描所有打开的标签页，更新最新 favicon...');
  try {
    const tabs = await chrome.tabs.query({});
    logger.debug(`找到 ${tabs.length} 个标签页`);
    let count = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const tab of tabs) {
      if (tab.url && tab.favIconUrl && 
          (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try {
          const urlObj = new URL(tab.url);
          const hostname = urlObj.hostname;
          
          // 检查是否已有有效缓存（24 小时内），避免重复请求
          if (faviconCache.has(hostname)) {
            const existingCache = faviconCache.get(hostname);
            if (!isCacheExpired(existingCache)) {
              skipped++;
              continue; // 跳过已有有效缓存的 hostname
            } else {
              logger.debug(`缓存过期，更新: ${hostname}`);
            }
          }
          
          // 注意：这里不检查 failedRequests，因为这些都是真实打开的标签页
          // 浏览器已经成功加载了页面和 tab.favIconUrl，应该尝试获取
          // 这样可以让之前失败的 favicon 有机会通过扫描已打开标签页来"恢复"
          
          logger.debug(`正在更新: ${hostname}`);
          
          // 将最新 favicon 转换为 data URL（或返回原始 URL）
          const result = await fetchFaviconAsDataUrl(tab.favIconUrl);
          
          if (result) {
            const cacheEntry = { dataUrl: result, timestamp: Date.now() };
            faviconCache.set(hostname, cacheEntry);
            faviconCache.set(tab.url, cacheEntry); // 也保存完整 URL
            count++;
            logger.debug(`更新成功: ${hostname}`);
            
            // 如果之前失败过，现在成功了，从失败列表中移除
            if (failedRequests.has(hostname)) {
              failedRequests.delete(hostname);
            }
          } else {
            // 记录失败，避免在当前会话中重复请求
            failedRequests.add(hostname);
            failed++;
          }
        } catch (e) {
          // 忽略单个标签页的错误，继续处理其他标签页
          failed++;
          logger.debug(`处理失败: ${tab.url}`, e.message);
        }
      }
    }
    
    // 批量保存到 storage
    if (count > 0) {
      const cacheObj = Object.fromEntries(faviconCache);
      await chrome.storage.local.set({ faviconCache: cacheObj });
      logger.info(`扫描完成：更新 ${count} 个，跳过 ${skipped} 个，失败 ${failed} 个，缓存总计 ${faviconCache.size} 条`);
    } else {
      logger.debug(`扫描完成：跳过 ${skipped} 个（已有缓存），失败 ${failed} 个，没有新的需要更新`);
    }
    
    return count;
  } catch (e) {
    logger.error('扫描标签页失败:', e);
    return 0;
  }
}

// 按需获取指定 URL 列表的 favicon（从标准位置 /favicon.ico）
async function fetchFaviconsForUrls(urls) {
  if (!urls || urls.length === 0) {
    return { success: true, count: 0, skipped: 0, failed: 0 };
  }
  
  logger.debug(`开始获取 ${urls.length} 个书签的 favicon...`);
  
  // 按 hostname 去重（避免同一域名重复请求）
  const hostnameMap = new Map(); // hostname -> {protocol, urls[]}
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      if (!hostnameMap.has(hostname)) {
        hostnameMap.set(hostname, {
          protocol: urlObj.protocol,
          urls: [url]
        });
      } else {
        hostnameMap.get(hostname).urls.push(url);
      }
    } catch (e) {
      // 忽略无效 URL
    }
  }
  
  logger.debug(`${urls.length} 个 URL 归属于 ${hostnameMap.size} 个不同的域名`);
  
  let count = 0;
  let skipped = 0;
  let failed = 0;
  
  // 批量处理，避免同时发起过多请求
  const hostnames = Array.from(hostnameMap.keys());
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < hostnames.length; i += BATCH_SIZE) {
    const batch = hostnames.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (hostname) => {
      const info = hostnameMap.get(hostname);
      
      // 检查是否已有有效缓存（24 小时内）
      if (faviconCache.has(hostname)) {
        const existingCache = faviconCache.get(hostname);
        if (!isCacheExpired(existingCache)) {
          skipped++;
          return;
        }
      }
      
      // 检查是否已经失败过（避免重复请求失败的 URL）
      if (failedRequests.has(hostname)) {
        logger.debug(`${hostname} 已失败过，跳过重试`);
        skipped++;
        return;
      }
      
      // 检查是否正在请求中（防止并发重复请求）
      if (pendingRequests.has(hostname)) {
        logger.debug(`${hostname} 正在请求中，跳过`);
        skipped++;
        return;
      }
      
      // 标记为正在请求
      pendingRequests.add(hostname);
      
      try {
        // 构造标准 favicon URL（大多数网站都支持）
        const faviconUrl = `${info.protocol}//${hostname}/favicon.ico`;
        
        // 获取并转换为 data URL
        const dataUrl = await fetchFaviconAsDataUrl(faviconUrl);
        
        if (dataUrl) {
          const cacheEntry = { 
            dataUrl: dataUrl, 
            timestamp: Date.now() 
          };
          // 为该 hostname 和所有相关 URL 设置缓存
          faviconCache.set(hostname, cacheEntry);
          for (const url of info.urls) {
            faviconCache.set(url, cacheEntry);
          }
          count++;
        } else {
          // 请求失败，记录到失败集合
          failedRequests.add(hostname);
          logger.debug(`${hostname} 获取失败，已记录，不再重试`);
          failed++;
        }
      } catch (e) {
        // 请求失败，记录到失败集合
        failedRequests.add(hostname);
        logger.debug(`${hostname} 请求异常，已记录，不再重试`);
        failed++;
      } finally {
        // 请求完成，移除标记
        pendingRequests.delete(hostname);
      }
    }));
  }
  
  // 保存到 storage
  if (count > 0) {
    const cacheObj = Object.fromEntries(faviconCache);
    await chrome.storage.local.set({ faviconCache: cacheObj });
  }
  
  logger.info(`按需加载完成：获取 ${count} 个域名，跳过 ${skipped} 个（已有缓存或请求中），失败 ${failed} 个`);
  return { success: true, count, skipped, failed };
}

// 将 favicon URL 转换为 data URL（解决认证问题）
// 返回：data URL 字符串，或原始 URL（证书错误时），或 null（失败）
async function fetchFaviconAsDataUrl(faviconUrl) {
  try {
    // 仅支持 http:// 和 https:// 协议
    if (!faviconUrl.startsWith('http://') && !faviconUrl.startsWith('https://')) {
      logger.debug(`跳过非 HTTP 协议的 favicon: ${faviconUrl}`);
      return null;
    }
    
    // 使用 fetch 获取图标（会自动携带 Cookie）
    const response = await fetch(faviconUrl, { 
      method: 'GET',
      cache: 'default'
    });
    
    if (!response.ok) {
      return null;
    }
    
    // 转换为 blob
    const blob = await response.blob();
    
    // 检查是否是图片类型
    if (!blob.type.startsWith('image/')) {
      return null;
    }
    
    // 转换为 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // 证书错误：直接返回原始 URL，浏览器已经缓存了这个图标
    if (e.message.includes('ERR_CERT') || e.message.includes('certificate')) {
      logger.debug(`证书验证失败: ${faviconUrl.substring(0, 50)}...`);
      return faviconUrl; // 返回原始 URL，让浏览器从缓存加载
    }
    // 其他错误（网络、CORS 等）
    return null;
  }
}

// 监听标签页更新，实时更新 favicon 到最新版本
// 当用户访问网站时，从 tab.favIconUrl 获取最新的 favicon 并覆盖之前的缓存
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 当标签页加载完成且有 favicon 时
  if (changeInfo.status === 'complete' && tab.url && tab.favIconUrl) {
    const url = tab.url;
    const faviconUrl = tab.favIconUrl;
    
    // 过滤掉 Chrome 特殊页面
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const fullUrl = url; // 保存完整 URL 作为 key
        
        // 检查是否已有有效缓存（24 小时内），避免重复请求
        if (faviconCache.has(hostname)) {
          const existingCache = faviconCache.get(hostname);
          if (!isCacheExpired(existingCache)) {
            logger.debug(`已有有效缓存，跳过更新: ${hostname}`);
            return;
          }
        }
        
        // 注意：这里不检查 failedRequests，因为这是用户真实访问页面时触发的
        // 浏览器已经成功加载了页面和 favicon，应该尝试获取
        // 这样可以让之前失败的 favicon 有机会通过用户访问来"恢复"
        
        // 将最新的 favicon 转换为 data URL（解决认证问题）
        const result = await fetchFaviconAsDataUrl(faviconUrl);
        
        if (result) {
          // 缓存最新的 favicon，添加时间戳
          const cacheEntry = { dataUrl: result, timestamp: Date.now() };
          faviconCache.set(hostname, cacheEntry);
          faviconCache.set(fullUrl, cacheEntry); // 也保存完整 URL
          
          // 保存到 storage（统一使用整个 Map）
          const cacheObj = Object.fromEntries(faviconCache);
          chrome.storage.local.set({ faviconCache: cacheObj });
          
          // 区分 data URL 和原始 URL
          const isDataUrl = result.startsWith('data:');
          logger.debug(`更新最新 favicon ${isDataUrl ? '(data URL)' : '(URL)'}: ${hostname}`);
          
          // 如果之前失败过，现在成功了，从失败列表中移除
          if (failedRequests.has(hostname)) {
            failedRequests.delete(hostname);
          }
        } else {
          // 记录失败，避免在当前会话中重复请求
          failedRequests.add(hostname);
          logger.debug(`无法缓存 favicon，已标记不再重试: ${hostname}`);
        }
      } catch (e) {
        logger.error('处理 favicon 失败:', e.message);
      }
    }
  }
});

// 监听 favicon 请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getFavicon') {
    const url = request.url;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // 优先从完整 URL 缓存查找（更精确）
      if (faviconCache.has(url)) {
        const cacheEntry = faviconCache.get(url);
        if (!isCacheExpired(cacheEntry)) {
          sendResponse({ favicon: cacheEntry.dataUrl });
          return true;
        } else {
          // 过期，删除缓存
          faviconCache.delete(url);
        }
      }
      
      // 其次从 hostname 缓存查找
      if (faviconCache.has(hostname)) {
        const cacheEntry = faviconCache.get(hostname);
        if (!isCacheExpired(cacheEntry)) {
          sendResponse({ favicon: cacheEntry.dataUrl });
          return true;
        } else {
          // 过期，删除缓存
          faviconCache.delete(hostname);
        }
      }
      
      // 从 storage 查找
      chrome.storage.local.get(['faviconCache'], (result) => {
        if (chrome.runtime.lastError || !result) {
          sendResponse({ favicon: null });
          return;
        }
        
        const cache = result.faviconCache || {};
        // 优先查找完整 URL
        if (cache[url] && !isCacheExpired(cache[url])) {
          faviconCache.set(url, cache[url]);
          sendResponse({ favicon: cache[url].dataUrl });
        } else if (cache[hostname] && !isCacheExpired(cache[hostname])) {
          faviconCache.set(hostname, cache[hostname]);
          sendResponse({ favicon: cache[hostname].dataUrl });
        } else {
          sendResponse({ favicon: null });
        }
      });
      
      return true; // 异步响应
    } catch (e) {
      sendResponse({ favicon: null });
    }
  } else if (request.action === 'scanAllTabs') {
    // 打开书签管理器时：扫描标签页获取最新 favicon
    scanAllTabsForFavicons().then(count => {
      sendResponse({ success: true, count: count });
    });
    return true; // 异步响应
  } else if (request.action === 'fetchFaviconsForUrls') {
    // 按需获取指定 URL 列表的 favicon
    const urls = request.urls || [];
    fetchFaviconsForUrls(urls).then(result => {
      sendResponse(result);
    });
    return true; // 异步响应
  }
});

// 安装时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    logger.info('感谢安装书签管理器！');
  } else if (details.reason === 'update') {
    logger.info('书签管理器已更新到版本 ' + chrome.runtime.getManifest().version);
  }
});

// 启动时加载缓存到内存，清理过期缓存
chrome.storage.local.get(['faviconCache'], (result) => {
  if (chrome.runtime.lastError) {
    logger.info('无法读取缓存，favicon 将按需加载');
    return;
  }
  
  if (!result) {
    logger.debug('storage 结果为空，跳过缓存加载');
    return;
  }
  
  logger.debug('开始加载缓存...');
  if (result.faviconCache) {
    const cache = result.faviconCache;
    let validCount = 0;
    let expiredCount = 0;
    const cleanedCache = {};
    
    logger.debug(`storage 中有 ${Object.keys(cache).length} 条缓存记录`);
    
    Object.entries(cache).forEach(([key, entry]) => {
      if (!isCacheExpired(entry)) {
        faviconCache.set(key, entry);
        cleanedCache[key] = entry;
        validCount++;
      } else {
        expiredCount++;
      }
    });
    
    // 如果有过期缓存，更新 storage
    if (expiredCount > 0) {
      chrome.storage.local.set({ faviconCache: cleanedCache });
      logger.info(`清理了 ${expiredCount} 个过期的 favicon 缓存`);
    }
    
    logger.info(`从存储加载了 ${validCount} 个有效 favicon 缓存`);
  } else {
    logger.debug('storage 中没有缓存');
  }
  
  logger.info('缓存加载完成，favicon 将按需加载');
});

// 监听来自前端的 debug 模式更新和缓存清除
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setDebugMode') {
    chrome.storage.local.set({ debugMode: request.enabled });
    logger.info(`Debug 模式已${request.enabled ? '开启' : '关闭'}`);
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'clearFaviconCache') {
    // 清除内存中的缓存和失败记录
    faviconCache.clear();
    failedRequests.clear();
    logger.info('已清除内存中的 favicon 缓存和失败记录');
    sendResponse({ success: true });
    return true;
  }
});

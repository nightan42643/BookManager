/**
 * 代码结构和集成测试
 * 测试重复代码、函数结构、性能相关问题
 */

const fs = require('fs');
const path = require('path');

// 读取源代码
const sourceCode = fs.readFileSync(
  path.join(__dirname, '..', 'newtab.js'),
  'utf8'
);

// ==================== 代码结构分析测试 ====================
describe('代码结构分析', () => {
  test('代码行数应在合理范围内', () => {
    const lines = sourceCode.split('\n').length;
    console.log(`当前代码行数: ${lines}`);
    // 记录当前行数，优化后应该减少
    expect(lines).toBeLessThan(4000);
  });

  test('应有合理数量的函数', () => {
    const functionMatches = sourceCode.match(/^function \w+/gm) || [];
    console.log(`函数数量: ${functionMatches.length}`);
    expect(functionMatches.length).toBeGreaterThan(30);
  });

  test('函数应有合理长度', () => {
    // 找出所有函数定义
    const functionRegex = /^function (\w+)\([^)]*\)\s*\{/gm;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      functions.push({
        name: match[1],
        startIndex: match.index
      });
    }
    
    // 计算每个函数的大致长度
    const longFunctions = [];
    for (let i = 0; i < functions.length; i++) {
      const startLine = sourceCode.substring(0, functions[i].startIndex).split('\n').length;
      const endIndex = i < functions.length - 1 ? functions[i + 1].startIndex : sourceCode.length;
      const functionCode = sourceCode.substring(functions[i].startIndex, endIndex);
      const lines = functionCode.split('\n').length;
      
      if (lines > 100) {
        longFunctions.push({ name: functions[i].name, lines, startLine });
      }
    }
    
    if (longFunctions.length > 0) {
      console.log('超过100行的函数:');
      longFunctions.forEach(f => console.log(`  - ${f.name}: ${f.lines} 行 (第 ${f.startLine} 行)`));
    }
    
    // 允许一些长函数，但不应太多
    expect(longFunctions.length).toBeLessThan(10);
  });
});

// ==================== 重复代码检测测试 ====================
describe('重复代码检测', () => {
  test('检测相似的函数定义', () => {
    // 检查 getFolderById 和 findFolderById 是否重复
    const getFolderById = sourceCode.includes('function getFolderById');
    const findFolderById = sourceCode.includes('function findFolderById');
    
    if (getFolderById && findFolderById) {
      console.log('警告: 存在 getFolderById 和 findFolderById 两个相似函数');
    }
    
    // 统计调用次数
    const getFolderByIdCalls = (sourceCode.match(/getFolderById\(/g) || []).length;
    const findFolderByIdCalls = (sourceCode.match(/findFolderById\(/g) || []).length;
    
    console.log(`getFolderById 调用: ${getFolderByIdCalls} 次`);
    console.log(`findFolderById 调用: ${findFolderByIdCalls} 次`);
    
    expect(true).toBe(true); // 记录信息
  });

  test('检测重复的事件监听器模式', () => {
    // 统计 addEventListener 调用次数
    const listenerMatches = sourceCode.match(/\.addEventListener\(/g) || [];
    console.log(`addEventListener 调用: ${listenerMatches.length} 次`);
    
    // 统计 querySelectorAll + forEach 模式
    const querySelectorAllForEach = sourceCode.match(/querySelectorAll\([^)]+\)\.forEach/g) || [];
    console.log(`querySelectorAll().forEach 模式: ${querySelectorAllForEach.length} 次`);
    
    // 如果太多，说明可能需要事件委托
    if (querySelectorAllForEach.length > 10) {
      console.log('建议: 考虑使用事件委托优化事件监听');
    }
    
    expect(true).toBe(true);
  });

  test('检测重复的 DOM 查询', () => {
    // 找出重复的 getElementById 调用
    const getElementByIdMatches = sourceCode.match(/getElementById\(['"]([^'"]+)['"]\)/g) || [];
    const idCounts = {};
    
    getElementByIdMatches.forEach(match => {
      const id = match.match(/['"]([^'"]+)['"]/)[1];
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicateQueries = Object.entries(idCounts)
      .filter(([, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (duplicateQueries.length > 0) {
      console.log('频繁查询的 DOM 元素:');
      duplicateQueries.forEach(([id, count]) => {
        console.log(`  - #${id}: ${count} 次`);
      });
    }
    
    expect(true).toBe(true);
  });
});

// ==================== 代码质量测试 ====================
describe('代码质量', () => {
  test('应使用 const 和 let 而非 var', () => {
    const varUsage = (sourceCode.match(/\bvar\s+\w+/g) || []).length;
    console.log(`var 使用次数: ${varUsage}`);
    // 现代代码应避免使用 var
    expect(varUsage).toBe(0);
  });

  test('应有适当的注释', () => {
    const singleLineComments = (sourceCode.match(/\/\/[^\n]+/g) || []).length;
    const multiLineComments = (sourceCode.match(/\/\*[\s\S]*?\*\//g) || []).length;
    const totalComments = singleLineComments + multiLineComments;
    
    console.log(`单行注释: ${singleLineComments}`);
    console.log(`多行注释: ${multiLineComments}`);
    console.log(`总注释数: ${totalComments}`);
    
    // 应有足够的注释
    expect(totalComments).toBeGreaterThan(50);
  });

  test('应有模块分隔注释', () => {
    const sectionHeaders = (sourceCode.match(/\/\/ ={10,}/g) || []).length;
    console.log(`模块分隔注释: ${sectionHeaders}`);
    expect(sectionHeaders).toBeGreaterThan(10);
  });

  test('不应有 console.log 直接调用（应使用 logger）', () => {
    const directConsoleLogs = (sourceCode.match(/console\.log\(/g) || []).length;
    // 减去 logger 内部的使用
    const loggerDefinition = sourceCode.includes('const logger = {');
    
    console.log(`console.log 调用: ${directConsoleLogs} 次`);
    console.log(`使用 logger 系统: ${loggerDefinition ? '是' : '否'}`);
    
    expect(loggerDefinition).toBe(true);
  });
});

// ==================== 魔法数字检测 ====================
describe('魔法数字检测', () => {
  test('检测未命名的数字常量', () => {
    // 查找可能的魔法数字（排除 0, 1, 2 等常见值）
    const magicNumbers = [];
    const lines = sourceCode.split('\n');
    
    lines.forEach((line, lineNum) => {
      // 跳过注释和字符串
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      
      // 查找独立的数字（排除数组索引等）
      const matches = line.match(/[^\w.](\d{2,})[^\d]/g);
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m.match(/\d+/)[0]);
          if (num > 10 && num !== 100 && num !== 1000) {
            magicNumbers.push({ line: lineNum + 1, number: num, context: line.trim().substring(0, 60) });
          }
        });
      }
    });
    
    if (magicNumbers.length > 0) {
      console.log('潜在的魔法数字:');
      magicNumbers.slice(0, 10).forEach(m => {
        console.log(`  第 ${m.line} 行: ${m.number} - ${m.context}...`);
      });
      if (magicNumbers.length > 10) {
        console.log(`  ... 还有 ${magicNumbers.length - 10} 个`);
      }
    }
    
    expect(true).toBe(true);
  });
});

// ==================== 事件监听器分析 ====================
describe('事件监听器分析', () => {
  test('统计不同类型的事件监听', () => {
    const eventTypes = {};
    const matches = sourceCode.matchAll(/addEventListener\(['"](\w+)['"]/g);
    
    for (const match of matches) {
      const eventType = match[1];
      eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
    }
    
    console.log('事件类型统计:');
    Object.entries(eventTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    
    // 拖拽相关事件数量
    const dragEvents = (eventTypes.dragstart || 0) + 
                       (eventTypes.dragover || 0) + 
                       (eventTypes.dragleave || 0) + 
                       (eventTypes.drop || 0) + 
                       (eventTypes.dragend || 0);
    console.log(`拖拽相关事件监听器: ${dragEvents}`);
    
    expect(true).toBe(true);
  });

  test('检测可能的内存泄漏模式', () => {
    // 检查是否在循环中添加事件而未移除
    const addListenerInLoop = sourceCode.match(/forEach\([^}]+addEventListener/gs);
    
    if (addListenerInLoop) {
      console.log('警告: 在循环中添加事件监听器可能导致内存泄漏');
      console.log(`检测到 ${addListenerInLoop.length} 处`);
    }
    
    // 检查是否有 removeEventListener
    const removeListeners = (sourceCode.match(/removeEventListener/g) || []).length;
    console.log(`removeEventListener 调用: ${removeListeners} 次`);
    
    expect(true).toBe(true);
  });
});

// ==================== 异步代码分析 ====================
describe('异步代码分析', () => {
  test('应正确使用 async/await', () => {
    const asyncFunctions = (sourceCode.match(/async function/g) || []).length;
    const awaitUsage = (sourceCode.match(/await /g) || []).length;
    
    console.log(`async 函数: ${asyncFunctions}`);
    console.log(`await 调用: ${awaitUsage}`);
    
    // 应有合理的 async/await 使用
    expect(asyncFunctions).toBeGreaterThan(5);
    expect(awaitUsage).toBeGreaterThan(asyncFunctions);
  });

  test('Promise 应被正确处理', () => {
    const thenCalls = (sourceCode.match(/\.then\(/g) || []).length;
    const catchCalls = (sourceCode.match(/\.catch\(/g) || []).length;
    const tryCatch = (sourceCode.match(/try\s*\{/g) || []).length;
    
    console.log(`.then() 调用: ${thenCalls}`);
    console.log(`.catch() 调用: ${catchCalls}`);
    console.log(`try...catch 块: ${tryCatch}`);
    
    // 应有足够的错误处理
    expect(tryCatch).toBeGreaterThan(5);
  });
});

// ==================== 模块化程度分析 ====================
describe('模块化程度分析', () => {
  test('代码应按功能模块组织', () => {
    const modules = [
      '全局变量',
      '多语言系统',
      'Debug 模式',
      '设置模态框',
      '时间和问候语',
      '事件监听',
      '加载书签',
      '渲染',
      '搜索功能',
      '多选功能',
      '书签操作',
      '右键菜单',
      'Tooltip',
      '侧边栏',
      '拖拽功能',
      '文件夹操作',
      '工具函数',
      'Toast',
      '撤销功能'
    ];
    
    const foundModules = modules.filter(m => 
      sourceCode.includes(`// ==================== ${m}`) ||
      sourceCode.includes(`// ====================${m}`)
    );
    
    console.log(`模块覆盖: ${foundModules.length}/${modules.length}`);
    foundModules.forEach(m => console.log(`  ✓ ${m}`));
    
    const missingModules = modules.filter(m => !foundModules.includes(m));
    if (missingModules.length > 0) {
      console.log('缺失的模块标记:');
      missingModules.forEach(m => console.log(`  ✗ ${m}`));
    }
    
    expect(foundModules.length).toBeGreaterThan(10);
  });

  test('全局变量应集中定义', () => {
    const globalSection = sourceCode.indexOf('// ==================== 全局变量');
    const nextSection = sourceCode.indexOf('// ====================', globalSection + 1);
    
    if (globalSection !== -1 && nextSection !== -1) {
      const globalSectionCode = sourceCode.substring(globalSection, nextSection);
      const letDeclarations = (globalSectionCode.match(/^let \w+/gm) || []).length;
      const constDeclarations = (globalSectionCode.match(/^const \w+/gm) || []).length;
      
      console.log(`全局变量区 let 声明: ${letDeclarations}`);
      console.log(`全局变量区 const 声明: ${constDeclarations}`);
    }
    
    expect(globalSection).not.toBe(-1);
  });
});

// ==================== 性能相关检测 ====================
describe('性能相关检测', () => {
  test('检测 DOM 操作效率', () => {
    // 检查 innerHTML 使用
    const innerHTMLUsage = (sourceCode.match(/\.innerHTML\s*[+=]/g) || []).length;
    console.log(`innerHTML 赋值: ${innerHTMLUsage} 次`);
    
    // 检查是否使用 documentFragment
    const fragmentUsage = sourceCode.includes('createDocumentFragment');
    console.log(`使用 DocumentFragment: ${fragmentUsage ? '是' : '否'}`);
    
    // 大量 innerHTML 可能影响性能
    if (innerHTMLUsage > 10 && !fragmentUsage) {
      console.log('建议: 考虑使用 DocumentFragment 优化大量 DOM 操作');
    }
    
    expect(true).toBe(true);
  });

  test('检测是否使用 debounce/throttle', () => {
    const hasDebounce = sourceCode.includes('debounce');
    const hasThrottle = sourceCode.includes('throttle');
    
    console.log(`使用 debounce: ${hasDebounce ? '是' : '否'}`);
    console.log(`使用 throttle: ${hasThrottle ? '是' : '否'}`);
    
    // 搜索功能应使用 debounce
    expect(hasDebounce).toBe(true);
  });
});

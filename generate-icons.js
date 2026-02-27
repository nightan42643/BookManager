#!/usr/bin/env node

/**
 * 图标生成脚本
 * 使用 Canvas 生成 PNG 图标
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

// 如果没有安装 canvas，提示安装
try {
  require.resolve('canvas');
} catch (e) {
  console.log('正在安装依赖...');
  require('child_process').execSync('npm install canvas', { stdio: 'inherit' });
}

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 绘制渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  // 圆角矩形
  const radius = size / 5.3;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // 绘制书签形状
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.95;
  
  const bookmarkWidth = size * 0.38;
  const bookmarkHeight = size * 0.64;
  const bookmarkX = (size - bookmarkWidth) / 2;
  const bookmarkY = size * 0.16;
  
  ctx.beginPath();
  ctx.moveTo(bookmarkX, bookmarkY);
  ctx.lineTo(bookmarkX + bookmarkWidth, bookmarkY);
  ctx.lineTo(bookmarkX + bookmarkWidth, bookmarkY + bookmarkHeight);
  ctx.lineTo(bookmarkX + bookmarkWidth / 2, bookmarkY + bookmarkHeight - bookmarkWidth / 4);
  ctx.lineTo(bookmarkX, bookmarkY + bookmarkHeight);
  ctx.closePath();
  ctx.fill();

  // 绘制装饰线条
  ctx.globalAlpha = 1;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = Math.max(2, size / 40);
  ctx.lineCap = 'round';
  
  const lineX1 = bookmarkX + bookmarkWidth * 0.15;
  const lineX2 = bookmarkX + bookmarkWidth * 0.85;
  const lineY1 = bookmarkY + bookmarkHeight * 0.2;
  const lineY2 = bookmarkY + bookmarkHeight * 0.35;
  const lineY3 = bookmarkY + bookmarkHeight * 0.5;
  
  ctx.beginPath();
  ctx.moveTo(lineX1, lineY1);
  ctx.lineTo(lineX2, lineY1);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(lineX1, lineY2);
  ctx.lineTo(lineX2 - bookmarkWidth * 0.1, lineY2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(lineX1, lineY3);
  ctx.lineTo(lineX2 - bookmarkWidth * 0.2, lineY3);
  ctx.stroke();

  // 保存文件
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./icons/icon${size}.png`, buffer);
  console.log(`✓ 已生成 icon${size}.png`);
});

console.log('\n✅ 所有图标已生成完成！');

# 📚 书签管理器图标

## 🎨 设计说明

这是一个现代、专业的书签管理器图标设计，采用矢量 SVG 格式。

### 设计特点

- **现代渐变背景**：蓝紫色渐变（#4F46E5 → #8B5CF6），符合现代设计趋势
- **清晰的书签造型**：抽象的书签形状，带有圆角和 V 形切口
- **丰富的细节**：
  - 装饰线条：模拟书签上的文字内容
  - 金色星星：代表"收藏"和"重要"的概念
  - 阴影效果：增加立体感和层次感
  - 高光效果：提升视觉质量
- **矢量格式**：SVG 无损缩放，可导出任意尺寸

### 颜色方案

- 主渐变：`#4F46E5` → `#6366F1` → `#8B5CF6`
- 书签主体：白色 (`#FFFFFF`) 到淡灰色 (`#F3F4F6`) 渐变
- 星星装饰：金色 (`#FCD34D`)

## 📦 文件清单

- `icon.svg` - 原始矢量图标（128x128px 画布）
- `icon16.png` - 16x16 扩展工具栏图标 ✅ 已生成
- `icon48.png` - 48x48 扩展管理页面图标 ✅ 已生成
- `icon128.png` - 128x128 Chrome 网上应用店图标 ✅ 已生成
- `preview.html` - 图标预览页面

## 👀 预览图标

在浏览器中打开 `preview.html` 文件，可以查看图标在不同尺寸下的效果。

```bash
open preview.html
```

## 🔄 重新生成 PNG 图标

如果您修改了 SVG 文件并需要重新生成 PNG，可以使用以下方法：

### 方法 1：使用 rsvg-convert（推荐）

```bash
# 如果未安装，先安装
brew install librsvg

# 生成所有尺寸
rsvg-convert icon.svg -w 16 -h 16 -o icon16.png
rsvg-convert icon.svg -w 48 -h 48 -o icon48.png
rsvg-convert icon.svg -w 128 -h 128 -o icon128.png
```

### 方法 2：使用 ImageMagick

```bash
# 安装 ImageMagick
brew install imagemagick

# 生成所有尺寸
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

### 方法 3：在线转换

1. 访问 [CloudConvert](https://cloudconvert.com/svg-to-png) 或 [Convertio](https://convertio.co/zh/svg-png/)
2. 上传 `icon.svg`
3. 分别转换为 16x16、48x48、128x128 像素
4. 下载并保存为对应文件名

### 方法 4：使用设计软件

- **Figma**：导入 SVG，使用 Export 功能
- **Sketch**：打开 SVG，导出为不同尺寸的 PNG
- **Adobe Illustrator**：文件 → 导出 → 导出为 PNG
- **Inkscape**（免费）：文件 → 导出 PNG 图像

## 🚀 应用到扩展

PNG 图标已经生成并准备就绪。重新加载扩展即可看到新图标：

1. 打开 Chrome 扩展管理页面：`chrome://extensions/`
2. 找到"书签管理器"扩展
3. 点击刷新按钮 🔄
4. 新图标将立即生效

## 📝 许可

此图标为书签管理器扩展的一部分，可自由修改和使用。


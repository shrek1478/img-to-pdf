# 圖片轉PDF工具 (TypeScript版本)

一個功能強大的圖片轉PDF工具，使用 TypeScript 開發，支持多种佈局模式、圖片壓縮和自動旋轉校正，並提供靈活的外部配置支援。

## 🔧 安裝與部署

### 本地開發

```bash
# 克隆或下載專案
git clone <repository-url>
cd imgToPdf

# 安裝依賴
npm install

# 編譯 TypeScript
npm run build

# 直接使用（開發模式）
npm run convert -- --source-dir ./images --output-dir ./pdfs
```

### 生產環境

```bash
# 編譯專案
npm run build

# 使用編譯後的版本
npm run convert:build -- --source-dir ./images --output-dir ./pdfs

# 或直接運行編譯後的文件
node dist/cli.js --source-dir ./images --output-dir ./pdfs
```

## ✨ 特色功能

- 🔧 **TypeScript 支援**：完整的類型安全和 IntelliSense 支援
- 📄 **多種頁面格式**：A4、A3、Letter、Legal
- 🎯 **靈活佈局模式**：fit、stretch、crop、custom
- 🖼️ **智能圖片處理**：自動 EXIF 旋轉校正
- 📦 **圖片預壓縮**：使用 Sharp 庫進行高效壓縮
- 📊 **壓縮統計**：詳細的檔案大小減少報告
- 🗂️ **批次處理**：支援多資料夾批次轉換
- ⚙️ **外部配置**：命令行參數、環境變數、配置文件支援
- 🎨 **預設配置**：音樂譜、高品質、緊湊三種預設模式

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 編譯 TypeScript

```bash
npm run build
```

## 📖 使用方法

### 命令行工具（推薦）

#### 基本使用
```bash
# 使用命令行參數
npm run convert -- --source-dir ./images --output-dir ./pdfs

# 使用預設配置
npm run convert -- --source-dir ./images --output-dir ./pdfs --preset music
npm run convert -- --source-dir ./images --output-dir ./pdfs --preset high-quality
npm run convert -- --source-dir ./images --output-dir ./pdfs --preset compact
```

#### 使用配置文件
```bash
# 創建自定義配置文件
cp config.example.json my-config.json
# 編輯 my-config.json 後使用
npm run convert -- --config my-config.json
```

#### 使用環境變數
```bash
# 創建環境變數文件
cp .env.example .env
# 編輯 .env 後直接運行
export IMG_TO_PDF_SOURCE_DIR="./images"
export IMG_TO_PDF_OUTPUT_DIR="./pdfs"
npm run convert
```

#### 命令行選項
```
選項:
  --source-dir <path>      指定源圖片目錄 (必需)
  --output-dir <path>      指定輸出PDF目錄 (必需)
  --config <path>          從JSON文件載入自定義配置
  --preset <name>          使用預設配置 (music|high-quality|compact)
  --help                   顯示幫助信息
  --version                顯示版本信息
```

### 程式化使用

```typescript
import ImageToPDFConverter, { Config } from './src/index';

const config: Config = {
    sourceDir: '/path/to/images',
    outputDir: '/path/to/output',
    fillMode: 'custom',
    customMargin: { top: 15, bottom: 15, left: 0, right: 0 },
    preCompressImages: true,
    autoRotate: true,
    // ...其他配置選項
};

const converter = new ImageToPDFConverter(config);
await converter.run();
```

### 使用預設配置

```typescript
import ImageToPDFConverter, { musicSheetConfig, highQualityConfig } from './src/config';

// 使用音樂譜配置
const musicConverter = new ImageToPDFConverter(musicSheetConfig);
await musicConverter.run();

// 使用高品質配置
const hqConverter = new ImageToPDFConverter(highQualityConfig);
await hqConverter.run();
```

## 🎛️ 配置選項

### 基本設定

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `sourceDir` | string | - | 來源圖片資料夾路徑 |
| `outputDir` | string | - | 輸出PDF資料夾路徑 |
| `pageSize` | string | 'A4' | 頁面大小 (A4/A3/Letter/Legal) |
| `fillMode` | string | 'custom' | 填滿模式 (fit/stretch/crop/custom) |

### 圖片處理

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `preCompressImages` | boolean | true | 啟用圖片預壓縮 |
| `autoRotate` | boolean | true | 自動EXIF旋轉校正 |
| `maxImageWidth` | number | 1200 | 壓縮後最大寬度 |
| `maxImageHeight` | number | 1600 | 壓縮後最大高度 |
| `jpegQuality` | number | 80 | JPEG壓縮品質 (1-100) |

### 佈局設定

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `customMargin` | object | `{top:15, bottom:15, left:0, right:0}` | 自定義邊距 |
| `backgroundColor` | string | '#FFFFFF' | 背景顏色 |

## 🎨 預設配置範本

### 音樂譜配置 (`musicSheetConfig`)
- 上下留白 15pt，左右填滿
- 啟用圖片壓縮和旋轉校正
- 適合樂譜掃描

### 高品質配置 (`highQualityConfig`)
- 保持原始圖片品質
- 適合重要文件
- 較大的檔案大小

### 小檔案配置 (`compactConfig`)
- 最大化壓縮
- 適合網路傳輸
- 較小的檔案大小

## 🏗️ 專案結構

```
├── src/
│   ├── index.ts          # 主要轉換器類別
│   ├── config.ts         # 預設配置檔案
│   └── test.ts          # 測試檔案
├── dist/                # 編譯輸出
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 開發腳本

| 指令 | 說明 |
|------|------|
| `npm run build` | 編譯 TypeScript |
| `npm run dev` | 開發模式運行 |
| `npm run test` | 運行測試 |
| `npm run clean` | 清理編譯檔案 |

## 📊 壓縮統計範例

```
📦 開始圖片預壓縮...
    壓縮中: IMG_001.jpg (4.2MB, 3264x2448)
    ✅ 壓縮完成: 1.8MB (減少57.1%)
    壓縮中: IMG_002.jpg (3.8MB, 2448x3264)
    ✅ 壓縮完成: 1.6MB (減少57.9%)
📊 圖片壓縮統計: 8.0MB -> 3.4MB (減少57.5%)
```

## 🔄 版本更新

### v2.0.0 (TypeScript 版本)
- ✅ 完整的 TypeScript 重寫
- ✅ 類型安全和 IntelliSense 支援
- ✅ 模組化配置系統
- ✅ 改進的錯誤處理
- ✅ 更好的開發體驗

## 📝 依賴項

- **TypeScript**: 類型安全的 JavaScript
- **PDFKit**: PDF 生成庫
- **Sharp**: 高效能圖片處理
- **image-size**: 圖片尺寸檢測

## 🤝 貢獻

歡迎提交 Pull Request 或回報問題！

## 📄 授權

ISC License

## ⚙️ 配置優先級

配置載入順序（後面的會覆蓋前面的）：

1. **預設配置** - 基礎配置或選定的 preset
2. **環境變數** - 從 `IMG_TO_PDF_*` 環境變數載入
3. **配置文件** - 從 `--config` 指定的 JSON 文件載入
4. **命令行參數** - 從 `--source-dir` 和 `--output-dir` 載入

### 配置文件範例

```json
{
  "sourceDir": "./my-images",
  "outputDir": "./my-pdfs",
  "pageSize": "A4",
  "fillMode": "custom",
  "customMargin": {
    "top": 20,
    "bottom": 20,
    "left": 10,
    "right": 10
  },
  "preCompressImages": true,
  "autoRotate": true,
  "jpegQuality": 85,
  "maxImageWidth": 1400,
  "maxImageHeight": 1800
}
```

## 🔍 故障排除

### 常見問題

**Q: 找不到圖片文件**
```bash
# 確認路徑是否正確
ls -la /path/to/your/images

# 確認支援的格式
# 預設支援: .jpg, .jpeg, .png, .gif, .bmp, .webp
```

**Q: PDF 生成失敗**
```bash
# 檢查輸出目錄權限
mkdir -p /path/to/output
chmod 755 /path/to/output

# 檢查磁碟空間
df -h /path/to/output
```

**Q: 圖片旋轉不正確**
```json
{
  "autoRotate": false  // 關閉自動旋轉
}
```

**Q: PDF 文件太大**
```json
{
  "preset": "compact",          // 使用緊湊配置
  "jpegQuality": 60,           // 降低 JPEG 品質
  "maxImageWidth": 800,        // 減小圖片尺寸
  "preCompressImages": true    // 啟用預壓縮
}
```

### 調試模式

```bash
# 設定環境變數啟用詳細日誌
NODE_ENV=development npm run convert -- --source-dir ./images --output-dir ./pdfs
```

import * as fs from "fs";
import * as path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

// 兼容不同版本的 image-size
let sizeOf: any;
try {
  sizeOf = require("image-size");
  // 如果是 ES6 模組格式
  if (sizeOf.default) {
    sizeOf = sizeOf.default;
  }
} catch (error: any) {
  console.error("無法載入 image-size:", error.message);
  // 提供備用方案
  sizeOf = () => ({ width: 1200, height: 1600 });
}

// 類型定義
export interface PageFormat {
  width: number;
  height: number;
}

export interface CustomMargin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ImageFile {
  name: string;
  fullPath: string;
  stats: fs.Stats;
  originalPath?: string;
  compressed?: boolean;
}

export interface DirectoryInfo {
  path: string;
  images: ImageFile[];
  count: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface LayoutInfo {
  width: number;
  height: number;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  fillMode: string;
}

export interface Config {
  sourceDir: string;
  outputDir: string;
  supportedFormats: string[];
  pageSize: string;
  margin: number;
  imageQuality: number;
  fitToPage: boolean;
  compressionLevel: number;
  showFilename: boolean;
  backgroundColor: string;
  minimumMargin: number;
  fillMode: "fit" | "stretch" | "crop" | "custom";
  customMargin: CustomMargin;
  preCompressImages: boolean;
  autoRotate: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  jpegQuality: number;
  pngCompressionLevel: number;
  webpQuality: number;
  optimizeFileSize?: boolean;
}

export class ImageToPDFConverter {
  private config: Config;
  private pageFormats: Record<string, PageFormat>;

  constructor(config: Config) {
    this.config = config;
    this.pageFormats = {
      A4: { width: 595.28, height: 841.89 },
      A3: { width: 841.89, height: 1190.55 },
      Letter: { width: 612, height: 792 },
      Legal: { width: 612, height: 1008 },
    };
  }

  // 獲取所有支援的圖片檔案
  getImageFiles(dir: string): ImageFile[] {
    try {
      const files = fs.readdirSync(dir);
      const imageFiles = files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return this.config.supportedFormats.includes(ext);
        })
        .map((file) => ({
          name: file,
          fullPath: path.join(dir, file),
          stats: fs.statSync(path.join(dir, file)),
        }))
        .sort((a, b) => {
          // 先嘗試按數字排序
          const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
          if (numA !== numB) return numA - numB;
          // 如果數字相同，則按名稱排序
          return a.name.localeCompare(b.name, "zh-TW", { numeric: true });
        });

      return imageFiles;
    } catch (error: any) {
      console.error(`讀取資料夾失敗: ${error.message}`);
      return [];
    }
  }

  // 掃描所有子資料夾
  scanDirectories(rootDir: string): Record<string, DirectoryInfo> {
    const directories: Record<string, DirectoryInfo> = {};

    try {
      const items = fs.readdirSync(rootDir);

      for (const item of items) {
        const fullPath = path.join(rootDir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          const images = this.getImageFiles(fullPath);
          if (images.length > 0) {
            directories[item] = {
              path: fullPath,
              images: images,
              count: images.length,
            };
          }
        }
      }

      // 也檢查根目錄的圖片
      const rootImages = this.getImageFiles(rootDir);
      if (rootImages.length > 0) {
        directories["_root"] = {
          path: rootDir,
          images: rootImages,
          count: rootImages.length,
        };
      }
    } catch (error: any) {
      console.error(`掃描資料夾失敗: ${error.message}`);
    }

    return directories;
  }

  // 獲取圖片真實尺寸
  getImageDimensions(imagePath: string): ImageDimensions {
    try {
      const dimensions = sizeOf(imagePath);
      return dimensions;
    } catch (error: any) {
      console.warn(`無法讀取圖片尺寸 ${imagePath}: ${error.message}`);
      return { width: 800, height: 600 }; // 預設尺寸
    }
  }

  // 壓縮圖片並保存到暫存目錄
  async compressImage(imagePath: string, tempDir: string): Promise<string> {
    try {
      const ext = path.extname(imagePath).toLowerCase();
      const basename = path.basename(imagePath, ext);
      const outputPath = path.join(tempDir, `${basename}_compressed.jpg`);

      // 獲取原始圖片資訊
      const originalSize = fs.statSync(imagePath).size;
      const originalDimensions = this.getImageDimensions(imagePath);

      console.log(
        `    壓縮中: ${path.basename(imagePath)} (${(
          originalSize /
          1024 /
          1024
        ).toFixed(2)}MB, ${originalDimensions.width}x${
          originalDimensions.height
        })`
      );

      // 使用 sharp 進行圖片壓縮，並自動處理EXIF方向
      let sharpInstance = sharp(imagePath);

      // 自動根據EXIF信息旋轉圖片（如果啟用）
      if (this.config.autoRotate) {
        sharpInstance = sharpInstance.rotate();
      }

      // 調整尺寸（如果圖片太大）
      if (
        originalDimensions.width > this.config.maxImageWidth ||
        originalDimensions.height > this.config.maxImageHeight
      ) {
        sharpInstance = sharpInstance.resize(
          this.config.maxImageWidth,
          this.config.maxImageHeight,
          {
            fit: "inside",
            withoutEnlargement: true,
          }
        );
      }

      // 轉換為JPEG並壓縮
      await sharpInstance
        .jpeg({
          quality: this.config.jpegQuality,
          progressive: true,
          mozjpeg: true, // 使用更好的壓縮算法
        })
        .toFile(outputPath);

      // 檢查壓縮效果
      const compressedSize = fs.statSync(outputPath).size;
      const compressionRatio = (
        ((originalSize - compressedSize) / originalSize) *
        100
      ).toFixed(1);

      console.log(
        `    ✅ 壓縮完成: ${(compressedSize / 1024 / 1024).toFixed(
          2
        )}MB (減少${compressionRatio}%)`
      );

      return outputPath;
    } catch (error: any) {
      console.warn(`    ⚠️  圖片壓縮失敗 ${imagePath}: ${error.message}`);
      return imagePath; // 返回原始路徑
    }
  }

  // 批次壓縮圖片
  async compressImages(
    images: ImageFile[],
    tempDir: string
  ): Promise<ImageFile[]> {
    console.log(`📦 開始圖片預壓縮...`);

    const compressedImages: ImageFile[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (!image) continue;

      const originalSize = image.stats.size;
      totalOriginalSize += originalSize;

      if (this.config.preCompressImages) {
        const compressedPath = await this.compressImage(
          image.fullPath,
          tempDir
        );
        const compressedSize = fs.existsSync(compressedPath)
          ? fs.statSync(compressedPath).size
          : originalSize;
        totalCompressedSize += compressedSize;

        compressedImages.push({
          name: image.name,
          stats: image.stats,
          fullPath: compressedPath,
          originalPath: image.fullPath,
          compressed: compressedPath !== image.fullPath,
        });
      } else {
        compressedImages.push(image);
        totalCompressedSize += originalSize;
      }
    }

    const totalCompressionRatio = (
      ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) *
      100
    ).toFixed(1);
    console.log(
      `📊 圖片壓縮統計: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB -> ${(
        totalCompressedSize /
        1024 /
        1024
      ).toFixed(2)}MB (減少${totalCompressionRatio}%)\n`
    );

    return compressedImages;
  }

  // 優化圖片選項以減少檔案大小
  getOptimizedImageOptions(imagePath: string, layout: LayoutInfo): any {
    const options = {
      width: layout.width,
      height: layout.height,
      align: "center" as const,
      valign: "center" as const,
    };

    // 如果啟用檔案大小優化
    if (this.config.optimizeFileSize) {
      // 只對JPEG圖片套用品質設定
      const ext = path.extname(imagePath).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") {
        (options as any).quality = this.config.jpegQuality || 80;
      }
    }

    return options;
  }

  // 計算圖片充滿頁面的最佳尺寸（根據填滿模式）
  calculateOptimalLayout(
    imgWidth: number,
    imgHeight: number,
    pageFormat: string
  ): LayoutInfo {
    const page = this.pageFormats[pageFormat];

    if (!page) {
      throw new Error(`不支援的頁面格式: ${pageFormat}`);
    }

    // 使用配置中的最小邊距
    const margin = this.config.minimumMargin || 0;
    let pageWidth: number, pageHeight: number, x: number, y: number;
    let finalWidth: number, finalHeight: number;

    switch (this.config.fillMode) {
      case "custom":
        // 自定義邊距模式
        const customMargin = this.config.customMargin || {
          top: 10,
          bottom: 10,
          left: 0,
          right: 0,
        };
        pageWidth = page.width - customMargin.left - customMargin.right;
        pageHeight = page.height - customMargin.top - customMargin.bottom;

        // 拉伸到自定義區域
        finalWidth = pageWidth;
        finalHeight = pageHeight;
        x = customMargin.left;
        y = customMargin.top;
        break;

      case "stretch":
        // 撐滿整個頁面，忽略原始比例
        pageWidth = page.width - margin * 2;
        pageHeight = page.height - margin * 2;
        finalWidth = pageWidth;
        finalHeight = pageHeight;
        x = margin;
        y = margin;
        break;

      case "crop":
        // 裁切模式：保持比例但填滿頁面，可能會裁切部分圖片
        pageWidth = page.width - margin * 2;
        pageHeight = page.height - margin * 2;
        const scaleWidth = pageWidth / imgWidth;
        const scaleHeight = pageHeight / imgHeight;
        const scale = Math.max(scaleWidth, scaleHeight); // 使用較大的縮放比例

        finalWidth = imgWidth * scale;
        finalHeight = imgHeight * scale;

        // 居中顯示，可能會超出頁面範圍
        x = margin + (pageWidth - finalWidth) / 2;
        y = margin + (pageHeight - finalHeight) / 2;
        break;

      case "fit":
      default:
        // 保持比例模式：圖片完全顯示但可能有留白
        pageWidth = page.width - margin * 2;
        pageHeight = page.height - margin * 2;
        const scaleW = pageWidth / imgWidth;
        const scaleH = pageHeight / imgHeight;
        const scaleMin = Math.min(scaleW, scaleH);

        finalWidth = imgWidth * scaleMin;
        finalHeight = imgHeight * scaleMin;

        x = margin + (pageWidth - finalWidth) / 2;
        y = margin + (pageHeight - finalHeight) / 2;
        break;
    }

    return {
      width: finalWidth,
      height: finalHeight,
      x: x,
      y: y,
      pageWidth: page.width,
      pageHeight: page.height,
      fillMode: this.config.fillMode,
    };
  }

  // 將圖片陣列轉換為PDF
  async createPDF(
    images: ImageFile[],
    outputPath: string,
    folderName: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`開始處理 "${folderName}"，共 ${images.length} 張圖片...`);

        // 建立暫存目錄
        const tempDir = path.join(__dirname, "temp_compressed");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // 壓縮圖片
        const compressedImages = await this.compressImages(images, tempDir);

        // 建立PDF文件
        const doc = new PDFDocument({
          size: this.config.pageSize as any,
          margin: 0,
          autoFirstPage: false,
          compress: true,
          info: {
            Title: `${folderName} 圖片合集`,
            Author: "Image to PDF Converter",
            Creator: "Node.js PDFKit",
            CreationDate: new Date(),
          },
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // 處理每張圖片
        compressedImages.forEach((imageFile, index) => {
          try {
            console.log(
              `  處理第 ${index + 1}/${compressedImages.length} 張: ${
                imageFile.name
              }`
            );

            // 獲取圖片真實尺寸
            const imgDimensions = this.getImageDimensions(imageFile.fullPath);

            // 計算最佳佈局
            const layout = this.calculateOptimalLayout(
              imgDimensions.width,
              imgDimensions.height,
              this.config.pageSize
            );

            // 添加新頁面
            doc.addPage({
              size: this.config.pageSize as any,
              margin: 0,
            });

            // 設置白色背景
            doc
              .rect(0, 0, layout.pageWidth, layout.pageHeight)
              .fill(this.config.backgroundColor);

            // 簡化的圖片選項（因為圖片已經預壓縮了）
            const imageOptions = {
              width: layout.width,
              height: layout.height,
              align: "center" as const,
              valign: "center" as const,
            };

            // 添加圖片
            doc.image(imageFile.fullPath, layout.x, layout.y, imageOptions);
          } catch (imageError: any) {
            console.warn(`  跳過圖片 ${imageFile.name}: ${imageError.message}`);
          }
        });

        // 完成PDF生成
        doc.end();

        stream.on("finish", () => {
          // 清理暫存檔案
          try {
            if (fs.existsSync(tempDir)) {
              const tempFiles = fs.readdirSync(tempDir);
              tempFiles.forEach((file) => {
                fs.unlinkSync(path.join(tempDir, file));
              });
              fs.rmdirSync(tempDir);
            }
          } catch (cleanupError: any) {
            console.warn("清理暫存檔案時發生錯誤:", cleanupError.message);
          }

          const stats = fs.statSync(outputPath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`✅ PDF 已生成: ${outputPath}`);
          console.log(`📄 檔案大小: ${fileSizeMB} MB`);
          resolve(outputPath);
        });

        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 主要執行函數
  async run(): Promise<void> {
    console.log("🚀 圖片轉PDF工具 - 專業版 (TypeScript)");
    console.log("==========================================");
    console.log(`📁 來源路徑: ${this.config.sourceDir}`);
    console.log(`💾 輸出路徑: ${this.config.outputDir}`);
    console.log(`📄 頁面規格: ${this.config.pageSize}`);
    console.log(`🎯 填滿模式: ${this.config.fillMode}`);
    console.log(`🖼️  支援格式: ${this.config.supportedFormats.join(", ")}`);
    console.log("");

    // 檢查來源資料夾是否存在
    if (!fs.existsSync(this.config.sourceDir)) {
      console.error(`❌ 來源資料夾不存在: ${this.config.sourceDir}`);
      return;
    }

    // 檢查輸出資料夾，不存在則建立
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // 掃描所有資料夾
    const directories = this.scanDirectories(this.config.sourceDir);

    if (Object.keys(directories).length === 0) {
      console.log("❌ 沒有找到任何包含圖片的資料夾");
      return;
    }

    console.log(
      `📊 找到 ${Object.keys(directories).length} 個包含圖片的資料夾:`
    );
    Object.entries(directories).forEach(([name, info]) => {
      const displayName = name === "_root" ? "根目錄" : name;
      console.log(`  📁 ${displayName}: ${info.count} 張圖片`);
    });
    console.log("");

    // 逐一處理每個資料夾
    let successCount = 0;
    let totalCount = Object.keys(directories).length;

    for (const [folderName, folderInfo] of Object.entries(directories)) {
      try {
        const displayName = folderName === "_root" ? "root" : folderName;
        const timestamp = new Date().toISOString().slice(0, 10);
        const outputFileName = `${displayName}_${timestamp}.pdf`;
        const outputPath = path.join(this.config.outputDir, outputFileName);

        console.log(`\n📝 正在生成: ${outputFileName}`);
        await this.createPDF(folderInfo.images, outputPath, displayName);
        successCount++;
      } catch (error: any) {
        console.error(
          `❌ 處理資料夾 "${folderName}" 時發生錯誤: ${error.message}`
        );
      }
    }

    console.log("\n🎉 處理完成！");
    console.log(`✅ 成功: ${successCount}/${totalCount} 個資料夾`);

    if (successCount > 0) {
      console.log(`📁 所有PDF檔案已保存到: ${this.config.outputDir}`);
    }
  }
}

// 主程式入口 (使用預設配置)
async function main(): Promise<void> {
  const { defaultConfig } = await import('./config');
  const converter = new ImageToPDFConverter(defaultConfig);

  try {
    await converter.run();
  } catch (error: any) {
    console.error("❌ 程式執行失敗:", error.message);
    process.exit(1);
  }
}

// 如果是直接執行此腳本
if (require.main === module) {
  main();
}

export default ImageToPDFConverter;

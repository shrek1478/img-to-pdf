import ImageToPDFConverter, { Config } from "./index";

/**
 * 預設配置
 */
export const defaultConfig: Config = {
  sourceDir: "~/Downloads/img-to-pdf",
  outputDir: "~/Downloads",
  supportedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
  pageSize: "A4",
  margin: 0,
  imageQuality: 0.85,
  fitToPage: true,
  compressionLevel: 3,
  showFilename: false,
  backgroundColor: "#FFFFFF",
  minimumMargin: 0,
  fillMode: "custom",
  customMargin: { top: 15, bottom: 15, left: 0, right: 0 },
  preCompressImages: true,
  autoRotate: true,
  maxImageWidth: 1200,
  maxImageHeight: 1600,
  jpegQuality: 80,
  pngCompressionLevel: 8,
  webpQuality: 80,
};

/**
 * 音樂譜專用配置（上下留白，左右填滿）
 */
export const musicSheetConfig: Config = {
  ...defaultConfig,
  fillMode: "custom",
  customMargin: { top: 15, bottom: 15, left: 0, right: 0 },
  preCompressImages: true,
  autoRotate: true,
  jpegQuality: 85,
};

/**
 * 高品質配置（適合重要文件）
 */
export const highQualityConfig: Config = {
  ...defaultConfig,
  fillMode: "fit",
  margin: 10,
  jpegQuality: 95,
  maxImageWidth: 2400,
  maxImageHeight: 3200,
  preCompressImages: false,
};

/**
 * 小檔案配置（優化檔案大小）
 */
export const compactConfig: Config = {
  ...defaultConfig,
  fillMode: "custom",
  customMargin: { top: 5, bottom: 5, left: 0, right: 0 },
  jpegQuality: 70,
  maxImageWidth: 800,
  maxImageHeight: 1200,
  preCompressImages: true,
};

export { ImageToPDFConverter, Config };

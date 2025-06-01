#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { ImageToPDFConverter, Config } from './index';
import { musicSheetConfig, highQualityConfig, compactConfig } from './config';

// 命令行參數接口
interface CLIOptions {
  sourceDir?: string;
  outputDir?: string;
  config?: string;
  preset?: 'music' | 'high-quality' | 'compact';
  help?: boolean;
  version?: boolean;
}

// 顯示幫助信息
function showHelp(): void {
  console.log(`
Image to PDF Converter (TypeScript版本)
將圖片轉換為PDF文件的工具，專為樂譜掃描等用途優化

使用方法:
  npm run convert [選項]
  
選項:
  --source-dir <path>      指定源圖片目錄 (必需)
  --output-dir <path>      指定輸出PDF目錄 (必需)
  --config <path>          從JSON文件載入自定義配置
  --preset <name>          使用預設配置 (music|high-quality|compact)
  --help                   顯示此幫助信息
  --version                顯示版本信息

環境變數:
  IMG_TO_PDF_SOURCE_DIR    源圖片目錄
  IMG_TO_PDF_OUTPUT_DIR    輸出PDF目錄
  IMG_TO_PDF_CONFIG        配置文件路徑

範例:
  npm run convert -- --source-dir ./images --output-dir ./pdfs
  npm run convert -- --source-dir ./images --output-dir ./pdfs --preset music
  npm run convert -- --config ./my-config.json
  
預設配置說明:
  music         適合樂譜掃描 (無邊距，上下留間距)
  high-quality  高品質設定 (較大邊距，高解析度)
  compact       緊湊設定 (較小文件大小)
`);
}

// 顯示版本信息
function showVersion(): void {
  const packagePath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`Image to PDF Converter v${packageJson.version}`);
  } catch (error) {
    console.log('Image to PDF Converter v1.0.0');
  }
}

// 解析命令行參數
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--source-dir':
      case '-s':
        options.sourceDir = args[++i];
        break;
      case '--output-dir':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--config':
      case '-c':
        options.config = args[++i];
        break;
      case '--preset':
      case '-p':
        const preset = args[++i] as 'music' | 'high-quality' | 'compact';
        if (['music', 'high-quality', 'compact'].includes(preset)) {
          options.preset = preset;
        } else {
          console.error(`無效的預設配置: ${preset}`);
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        if (arg && arg.startsWith('-')) {
          console.error(`未知選項: ${arg}`);
          console.log('使用 --help 查看可用選項');
          process.exit(1);
        }
        break;
    }
  }
  
  return options;
}

// 從環境變數載入配置
function loadFromEnv(): Partial<Config> {
  const config: Partial<Config> = {};
  
  if (process.env.IMG_TO_PDF_SOURCE_DIR) {
    config.sourceDir = process.env.IMG_TO_PDF_SOURCE_DIR;
  }
  
  if (process.env.IMG_TO_PDF_OUTPUT_DIR) {
    config.outputDir = process.env.IMG_TO_PDF_OUTPUT_DIR;
  }
  
  return config;
}

// 從JSON文件載入配置
function loadConfigFromFile(configPath: string): Partial<Config> {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // 驗證必要欄位
    if (config.sourceDir && !fs.existsSync(config.sourceDir)) {
      throw new Error(`源目錄不存在: ${config.sourceDir}`);
    }
    
    return config;
  } catch (error: any) {
    console.error(`載入配置文件失敗: ${error.message}`);
    process.exit(1);
  }
}

// 獲取預設配置
function getPresetConfig(preset: string): Config {
  switch (preset) {
    case 'music':
      return musicSheetConfig;
    case 'high-quality':
      return highQualityConfig;
    case 'compact':
      return compactConfig;
    default:
      throw new Error(`未知的預設配置: ${preset}`);
  }
}

// 合併配置（優先級：命令行 > 配置文件 > 環境變數 > 預設配置）
function mergeConfigs(
  baseConfig: Config,
  envConfig: Partial<Config>,
  fileConfig: Partial<Config>,
  cliOptions: CLIOptions
): Config {
  const merged = { ...baseConfig };
  
  // 應用環境變數配置
  Object.assign(merged, envConfig);
  
  // 應用文件配置
  Object.assign(merged, fileConfig);
  
  // 應用命令行選項
  if (cliOptions.sourceDir) merged.sourceDir = cliOptions.sourceDir;
  if (cliOptions.outputDir) merged.outputDir = cliOptions.outputDir;
  
  return merged;
}

// 驗證配置
function validateConfig(config: Config): void {
  const errors: string[] = [];
  
  if (!config.sourceDir) {
    errors.push('必須指定源圖片目錄 (--source-dir 或環境變數 IMG_TO_PDF_SOURCE_DIR)');
  } else if (!fs.existsSync(config.sourceDir)) {
    errors.push(`源目錄不存在: ${config.sourceDir}`);
  } else if (!fs.statSync(config.sourceDir).isDirectory()) {
    errors.push(`源路徑不是目錄: ${config.sourceDir}`);
  }
  
  if (!config.outputDir) {
    errors.push('必須指定輸出目錄 (--output-dir 或環境變數 IMG_TO_PDF_OUTPUT_DIR)');
  } else {
    // 如果輸出目錄不存在，嘗試創建
    try {
      if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
        console.log(`已創建輸出目錄: ${config.outputDir}`);
      }
    } catch (error: any) {
      errors.push(`無法創建輸出目錄: ${config.outputDir} - ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('配置錯誤:');
    errors.forEach(error => console.error(`  ${error}`));
    console.log('\n使用 --help 查看幫助信息');
    process.exit(1);
  }
}

// 主函數
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const cliOptions = parseArgs(args);
    
    // 處理幫助和版本
    if (cliOptions.help) {
      showHelp();
      return;
    }
    
    if (cliOptions.version) {
      showVersion();
      return;
    }
    
    // 載入基礎配置
    let baseConfig: Config;
    if (cliOptions.preset) {
      baseConfig = getPresetConfig(cliOptions.preset);
      console.log(`使用預設配置: ${cliOptions.preset}`);
    } else {
      baseConfig = musicSheetConfig; // 預設使用樂譜配置
    }
    
    // 載入環境變數配置
    const envConfig = loadFromEnv();
    
    // 載入文件配置
    let fileConfig: Partial<Config> = {};
    if (cliOptions.config) {
      fileConfig = loadConfigFromFile(cliOptions.config);
      console.log(`載入配置文件: ${cliOptions.config}`);
    } else if (process.env.IMG_TO_PDF_CONFIG) {
      fileConfig = loadConfigFromFile(process.env.IMG_TO_PDF_CONFIG);
      console.log(`載入配置文件(環境變數): ${process.env.IMG_TO_PDF_CONFIG}`);
    }
    
    // 合併所有配置
    const finalConfig = mergeConfigs(baseConfig, envConfig, fileConfig, cliOptions);
    
    // 驗證配置
    validateConfig(finalConfig);
    
    // 顯示配置信息
    console.log('\n當前配置:');
    console.log(`  源目錄: ${finalConfig.sourceDir}`);
    console.log(`  輸出目錄: ${finalConfig.outputDir}`);
    console.log(`  頁面大小: ${finalConfig.pageSize}`);
    console.log(`  填充模式: ${finalConfig.fillMode}`);
    console.log(`  預壓縮圖片: ${finalConfig.preCompressImages ? '是' : '否'}`);
    console.log(`  自動旋轉: ${finalConfig.autoRotate ? '是' : '否'}\n`);
    
    // 執行轉換
    const converter = new ImageToPDFConverter(finalConfig);
    await converter.run();
    
    console.log('\n✅ 轉換完成！');
    
  } catch (error: any) {
    console.error('❌ 轉換失敗:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 如果直接運行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('未處理的錯誤:', error);
    process.exit(1);
  });
}

export { main, parseArgs, loadConfigFromFile, mergeConfigs, validateConfig };

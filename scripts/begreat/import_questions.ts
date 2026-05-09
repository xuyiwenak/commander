/**
 * 从 JSON 文件批量导入 BFI-2 题库
 *
 * 用法：
 *   ENV=development tsx scripts/begreat/import_questions.ts --file path/to/questions.json
 *   ENV=development tsx scripts/begreat/import_questions.ts --file path/to/questions.json --dry-run
 *   ENV=development tsx scripts/begreat/import_questions.ts --file path/to/questions.json --reset
 *
 * 选项：
 *   --file <path>   题库 JSON 文件路径（数组格式）
 *   --dry-run       仅预览，不写入数据库
 *   --reset         清空原有题库后重新写入
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ENV         = process.env.ENV ?? 'development';
const CONFIG_PATH = path.resolve(__dirname, '../../../art_backend/src/apps/begreat/sysconfig', ENV, 'db_config.json');

function buildMongoUrl(): string {
  const cfg = (JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as {
    db_global: { host: string; port: number; db: string; user?: string; password?: string; authSource?: string };
  }).db_global;
  const auth    = cfg.user ? `${cfg.user}:${encodeURIComponent(cfg.password ?? '')}@` : '';
  const authSrc = cfg.authSource ? `?authSource=${cfg.authSource}` : '';
  return `mongodb://${auth}${cfg.host}:${cfg.port}/${cfg.db}${authSrc}`;
}

async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const reset   = args.includes('--reset');
  const fileIdx = args.indexOf('--file');

  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('用法: tsx scripts/begreat/import_questions.ts --file <path> [--dry-run] [--reset]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args[fileIdx + 1]);
  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }

  const docs = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>[];
  if (!Array.isArray(docs)) {
    console.error('JSON 文件根节点必须是数组');
    process.exit(1);
  }

  const missing = docs.filter((d) => !d['questionId'] || !d['modelType'] || !d['dimension'] || !d['content']);
  if (missing.length > 0) {
    console.error(`❌ ${missing.length} 条缺少必填字段（questionId / modelType / dimension / content）`);
    missing.slice(0, 5).forEach((d) => console.error('  ', d['questionId'] ?? '(无 questionId)'));
    process.exit(1);
  }

  console.log(`\n文件：${filePath}`);
  console.log(`共 ${docs.length} 条题目`);

  if (dryRun) {
    console.log('\n[dry-run] 样本：');
    console.log(JSON.stringify(docs[0], null, 2));
    console.log('\n[dry-run] 未写入数据库。');
    return;
  }

  const conn = await mongoose.connect(buildMongoUrl());
  console.log(`\n已连接 MongoDB (ENV=${ENV})`);

  const Schema = mongoose.Schema;
  const Q      = conn.model('_ImportQuestion', new Schema({}, { strict: false }), 'questions');

  if (reset) {
    const deleted = await Q.deleteMany({});
    console.log(`已清空旧数据（${deleted.deletedCount} 条）`);
  }

  let upserted = 0;
  const errors: string[] = [];
  for (const doc of docs) {
    try {
      await Q.updateOne({ questionId: doc['questionId'] }, { $set: doc }, { upsert: true });
      upserted++;
    } catch (e) {
      errors.push(`${doc['questionId']}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n✓ 写入 ${upserted} 条`);
  if (errors.length > 0) {
    console.warn(`⚠ 跳过 ${errors.length} 条：`);
    errors.slice(0, 5).forEach((e) => console.warn('  ', e));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('导入失败：', err);
  process.exit(1);
});

/**
 * 将常模数据导入数据库（直连 MongoDB，不依赖 art_backend 服务）
 *
 * 用法：
 *   ENV=development tsx scripts/begreat/import_norms.ts
 *   ENV=development tsx scripts/begreat/import_norms.ts --dry-run
 *   ENV=development tsx scripts/begreat/import_norms.ts --activate
 *
 * normVersion 格式：ref_<来源>_<YYYYMMDD>
 * 编辑下方 BIG5_NORMS 数组以更新参考常模数据。
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

// ── 常模数据（按需修改） ─────────────────────────────────────────────────────

const TODAY        = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const NORM_VERSION = `ref_zhang2021_${TODAY}`;
const SOURCE       = 'Zhang et al., Assessment 2021, Chinese college sample';
const INSTRUMENT   = 'BFI2_CN_60';

type NormGender = 'all' | 'male' | 'female';
type AgeGroup   = '18-24' | '25-34' | '35-44' | '45+';

const BIG5_NORMS: { dimension: string; gender: NormGender; mean: number; sd: number; sampleSize: number | null }[] = [
  { dimension: 'O', gender: 'all',    mean: 3.42, sd: 0.64, sampleSize: null },
  { dimension: 'O', gender: 'male',   mean: 3.38, sd: 0.65, sampleSize: null },
  { dimension: 'O', gender: 'female', mean: 3.44, sd: 0.63, sampleSize: null },
  { dimension: 'C', gender: 'all',    mean: 3.55, sd: 0.61, sampleSize: null },
  { dimension: 'C', gender: 'male',   mean: 3.48, sd: 0.63, sampleSize: null },
  { dimension: 'C', gender: 'female', mean: 3.54, sd: 0.61, sampleSize: null },
  { dimension: 'E', gender: 'all',    mean: 3.31, sd: 0.69, sampleSize: null },
  { dimension: 'E', gender: 'male',   mean: 3.33, sd: 0.72, sampleSize: null },
  { dimension: 'E', gender: 'female', mean: 3.25, sd: 0.69, sampleSize: null },
  { dimension: 'A', gender: 'all',    mean: 3.68, sd: 0.57, sampleSize: null },
  { dimension: 'A', gender: 'male',   mean: 3.55, sd: 0.60, sampleSize: null },
  { dimension: 'A', gender: 'female', mean: 3.68, sd: 0.57, sampleSize: null },
  { dimension: 'N', gender: 'all',    mean: 2.82, sd: 0.76, sampleSize: null },
  { dimension: 'N', gender: 'male',   mean: 2.75, sd: 0.77, sampleSize: null },
  { dimension: 'N', gender: 'female', mean: 2.96, sd: 0.74, sampleSize: null },
];

const AGE_GROUPS: AgeGroup[] = ['18-24', '25-34', '35-44', '45+'];

function buildDocs() {
  const docs = [];
  for (const row of BIG5_NORMS) {
    for (const ageGroup of AGE_GROUPS) {
      docs.push({
        normVersion: NORM_VERSION,
        source:      SOURCE,
        instrument:  INSTRUMENT,
        modelType:   'BIG5',
        dimension:   row.dimension,
        gender:      row.gender,
        ageGroup,
        mean:        row.mean,
        sd:          row.sd,
        sampleSize:  row.sampleSize,
        isActive:    false,
      });
    }
  }
  return docs;
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2);
  const dryRun   = args.includes('--dry-run');
  const activate = args.includes('--activate');

  const docs = buildDocs();
  console.log(`\n常模版本：${NORM_VERSION}`);
  console.log(`共 ${docs.length} 条（${BIG5_NORMS.length} 维度×性别 × ${AGE_GROUPS.length} 年龄段）`);

  if (dryRun) {
    console.log('\n[dry-run] 样本：', JSON.stringify(docs[0], null, 2));
    console.log('[dry-run] 未写入数据库。');
    return;
  }

  const conn = await mongoose.connect(buildMongoUrl());
  console.log(`\n已连接 MongoDB (ENV=${ENV})`);

  const Schema = mongoose.Schema;
  const N      = conn.model('_ImportNorm', new Schema({}, { strict: false }), 'norms');

  const existing = await N.countDocuments({ normVersion: NORM_VERSION });
  if (existing > 0) {
    console.log(`\n版本 ${NORM_VERSION} 已存在（${existing} 条），跳过写入。`);
  } else {
    await N.insertMany(docs);
    console.log(`✓ 写入 ${docs.length} 条常模数据。`);
  }

  if (activate) {
    await N.updateMany({ modelType: 'BIG5', isActive: true }, { $set: { isActive: false } });
    await N.updateMany({ normVersion: NORM_VERSION }, { $set: { isActive: true } });
    console.log(`✓ 已激活版本：${NORM_VERSION}`);
  } else {
    console.log('\n提示：此版本未激活。如需设为生效版本，重新运行加 --activate 参数。');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('导入失败：', err);
  process.exit(1);
});

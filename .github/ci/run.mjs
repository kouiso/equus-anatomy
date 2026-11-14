import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [
  ['pnpm', ['type-check']], ['pnpm', ['lint']], ['pnpm', ['test']],
  ['pnpm', ['validate:coords']], ['pnpm', ['derive:left']],
  ['git', ['diff', '--exit-code', 'src/core/data/regions/left.json']],
];
const build = [['pnpm', ['build']]];
const browsers = [['pnpm', ['exec', 'playwright', 'install', '--with-deps', 'chromium']]];
const e2e = [['pnpm', ['e2e']]];
const scan = [['bash', ['.github/ci/scan.sh']]];
// なぜ: 確認済みの設定だけE2Eの無条件ビルドで代替し、不明な設定は全検査に戻す。
let e2eBuildsWeb = false;
try {
  const config = readFileSync(path.join(root, 'playwright.config.ts'));
  const { scripts } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  e2eBuildsWeb = createHash('sha256').update(config).digest('hex') === 'a049463c416e715a1c2414001d5ebd20a61c8b52594b387d4ac9c6803c047eb7' &&
    scripts?.e2e === 'playwright test' && scripts.build === 'expo export --platform web';
} catch {
  // なぜ: ファイルを読めない場合もビルド済みと推測しない。
}
const verifyFast = [...checks, ...build];
const verifyFull = [...checks, ...(e2eBuildsWeb ? [] : build), ...browsers, ...e2e];
const phases = {
  checks, 'build-web': build, 'browser-install': browsers, e2e, scan,
  'verify-fast': verifyFast, 'verify-full': verifyFull,
  fast: [...verifyFast, ...scan], full: [...verifyFull, ...scan],
  'android-prebuild': [['pnpm', ['expo', 'prebuild', '--platform', 'android', '--no-install']]],
  'ios-prebuild': [['pnpm', ['expo', 'prebuild', '--platform', 'ios', '--no-install']]],
  'android-patch-signing': [['pnpm', ['tsx', 'scripts/patch-android-signing.ts']]],
  'android-fad-apk': [['./gradlew', [':app:assembleRelease', '--no-daemon', '-PreactNativeArchitectures=arm64-v8a'], 'android']],
  'android-store-aab': [['./gradlew', [':app:bundleRelease', '--no-daemon'], 'android']],
  'android-smoke-apk': [['./gradlew', [':app:assembleRelease', '--no-daemon'], 'android']],
  'ios-pods': [['pod', ['install'], 'ios']],
  'ios-smoke-build': [['xcodebuild', ['-workspace', 'ios/EQUUS.xcworkspace', '-scheme', 'EQUUS', '-configuration', 'Release', '-destination', `id=${process.env.SIM_ID ?? ''}`, '-derivedDataPath', 'ios/dd', 'build']]],
};
let phase = process.argv[2] ?? 'fast';
if (phase === 'native') {
  const variant = process.env.EQUUS_CI_NATIVE_VARIANT;
  if (['android-fad-apk', 'android-store-aab', 'android-smoke-apk', 'ios-smoke-build'].includes(variant)) phase = variant;
}
if (!Object.hasOwn(phases, phase) || (phase === 'ios-smoke-build' && !process.env.SIM_ID)) {
  console.error(`Unknown or incomplete CI phase: ${phase}`);
  process.exit(2);
}
for (const [command, args, relative = '.'] of phases[phase]) {
  const result = spawnSync(command, args, { cwd: path.join(root, relative), stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

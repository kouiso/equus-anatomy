import { readFileSync, writeFileSync } from 'node:fs';

const file = 'android/app/build.gradle';
const src = readFileSync(file, 'utf8');

const signingBlock = `    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_FILE") ?: "debug.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: "android"
            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: "androiddebugkey"
            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: "android"
        }
        debug {`;

const step1 = src.replace('    signingConfigs {\n        debug {', signingBlock);
const step2 = step1.replace(
  'signingConfig signingConfigs.debug\n            def enableShrinkResources',
  'signingConfig signingConfigs.release\n            def enableShrinkResources',
);

if (step2 === src) {
  console.error(
    'build.gradle への署名パッチが当たらんかった。expo テンプレートが変わった可能性がある。',
  );
  process.exit(1);
}

// versionCode は CI の run number から自動採番する。毎回 1 のままだと
// FAD のどの配布が新しいかテスター側で見分けがつかん。未設定なら 1 のまま
const versionCode = process.env.ANDROID_VERSION_CODE ?? '1';
const step3 = step2.replace(/versionCode \d+/, `versionCode ${versionCode}`);
if (step3 === step2 && versionCode !== '1') {
  console.error('versionCode のパッチが当たらんかった。expo テンプレートを確認すること');
  process.exit(1);
}

writeFileSync(file, step3);
console.log(`${file}: release 署名を ANDROID_KEYSTORE_* 環境変数へ向けた（versionCode=${versionCode}）`);

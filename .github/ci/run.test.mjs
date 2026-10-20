import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'equus-ci-entry-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['.github/ci', 'bin', 'android', 'ios']) mkdirSync(path.join(root, dir), { recursive: true });
  for (const name of ['run.mjs', 'scan.sh']) {
    assert.ok(existsSync(path.join(source, '.github/ci', name)), `shared ${name} must exist`);
    copyFileSync(path.join(source, '.github/ci', name), path.join(root, '.github/ci', name));
  }
  copyFileSync(path.join(source, 'playwright.config.ts'), path.join(root, 'playwright.config.ts'));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8')).scripts }));
  const mock = `#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const name=path.basename(process.argv[1]),args=process.argv.slice(2);
fs.appendFileSync(process.env.CALLS,JSON.stringify({name,args,cwd:process.cwd(),version:process.env.ANDROID_VERSION_CODE,keyPresent:!!process.env.ANDROID_KEYSTORE_PASSWORD,gradleHome:process.env.GRADLE_USER_HOME})+'\\n');
if(process.env.FAIL_AT && (name+' '+args.join(' ')).includes(process.env.FAIL_AT))process.exit(37);
`;
  for (const file of ['bin/pnpm', 'bin/git', 'bin/gitleaks', 'bin/pod', 'bin/xcodebuild', 'android/gradlew']) writeFileSync(path.join(root, file), mock, { mode: 0o755 });
  const calls = path.join(root, 'calls.jsonl');
  return {
    root,
    run(phase, extra = {}) {
      const env = { ...process.env, PATH: `${root}/bin${path.delimiter}${process.env.PATH}`, CALLS: calls };
      for (const key of ['FAIL_AT', 'CI_EVENT_NAME', 'CI_PR_BASE_SHA', 'CI_PR_HEAD_SHA', 'SIM_ID', 'EQUUS_CI_NATIVE_VARIANT', 'ANDROID_VERSION_CODE', 'ANDROID_KEYSTORE_PASSWORD']) delete env[key];
      return spawnSync(process.execPath, [path.join(root, '.github/ci/run.mjs'), phase], { env: { ...env, ...extra }, encoding: 'utf8' });
    },
    calls: () => existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [],
  };
}
const checks = [
  ['pnpm', ['type-check']], ['pnpm', ['lint']], ['pnpm', ['test']], ['pnpm', ['validate:coords']],
  ['pnpm', ['derive:left']], ['git', ['diff', '--exit-code', 'src/core/data/regions/left.json']],
];
const browser = ['pnpm', ['exec', 'playwright', 'install', '--with-deps', 'chromium']];
const e2e = ['pnpm', ['e2e']];
const fullScan = ['gitleaks', ['git', '--redact', '--no-banner', '--exit-code', '1']];

test('verify full keeps every check and builds web once through the exact always-build Playwright config', t => {
  const f = fixture(t), result = f.run('verify-full');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.calls().map(x => [x.name, x.args]), [...checks, browser, e2e]);
  assert.ok(f.calls().every(x => x.cwd === f.root));
});

test('fast keeps an explicit web build and security scan without browsers or native outputs', t => {
  const f = fixture(t);
  assert.equal(f.run('fast').status, 0);
  assert.deepEqual(f.calls().map(x => [x.name, x.args]), [...checks, ['pnpm', ['build']], fullScan]);
});

test('local full includes the separate cloud scan and never publishes', t => {
  const f = fixture(t);
  assert.equal(f.run('full').status, 0);
  assert.deepEqual(f.calls().map(x => [x.name, x.args]), [...checks, browser, e2e, fullScan]);
});

test('each verification failure propagates exact status and stops later checks', t => {
  for (const [failure, count] of [['pnpm type-check', 1], ['pnpm lint', 2], ['pnpm test', 3], ['pnpm validate:coords', 4], ['pnpm derive:left', 5], ['git diff', 6], ['playwright install', 7], ['pnpm e2e', 8], ['gitleaks', 9]]) {
    const f = fixture(t);
    assert.equal(f.run('full', { FAIL_AT: failure }).status, 37, failure);
    assert.equal(f.calls().length, count, failure);
  }
});

test('unknown Playwright config or build chain restores the explicit build and its failure boundary', t => {
  for (const mutation of ['config', 'e2e-script', 'build-script']) {
    const f = fixture(t);
    if (mutation === 'config') writeFileSync(path.join(f.root, 'playwright.config.ts'), '// old command pnpm build && pnpm exec serve dist -l 4187\nexport default {}');
    else {
      const file = path.join(f.root, 'package.json'), pkg = JSON.parse(readFileSync(file, 'utf8'));
      pkg.scripts[mutation === 'e2e-script' ? 'e2e' : 'build'] = 'unknown command';
      writeFileSync(file, JSON.stringify(pkg));
    }
    assert.equal(f.run('verify-full', { FAIL_AT: 'pnpm build' }).status, 37);
    assert.equal(f.calls().length, 7);
  }
});

test('native variants keep ABI, APK versus AAB and simulator Release inputs distinct', t => {
  for (const [phase, command, args, relative] of [
    ['android-fad-apk', 'gradlew', [':app:assembleRelease', '--no-daemon', '-PreactNativeArchitectures=arm64-v8a'], 'android'],
    ['android-store-aab', 'gradlew', [':app:bundleRelease', '--no-daemon'], 'android'],
    ['android-smoke-apk', 'gradlew', [':app:assembleRelease', '--no-daemon'], 'android'],
    ['ios-smoke-build', 'xcodebuild', ['-workspace', 'ios/EQUUS.xcworkspace', '-scheme', 'EQUUS', '-configuration', 'Release', '-destination', 'id=fixture-sim', '-derivedDataPath', 'ios/dd', 'build'], '.'],
  ]) {
    const f = fixture(t);
    assert.equal(f.run(phase, { SIM_ID: 'fixture-sim' }).status, 0);
    assert.deepEqual(f.calls().map(x => [x.name, x.args]), [[command, args]]);
    assert.equal(f.calls()[0].cwd, path.resolve(f.root, relative));
    assert.equal(f.run(phase, { SIM_ID: 'fixture-sim', FAIL_AT: command }).status, 37);
  }
});

test('native preparation keeps no-install prebuild, signing inputs and pod cwd', t => {
  for (const [phase, name, args, relative] of [
    ['android-prebuild', 'pnpm', ['expo', 'prebuild', '--platform', 'android', '--no-install'], '.'],
    ['ios-prebuild', 'pnpm', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], '.'],
    ['android-patch-signing', 'pnpm', ['tsx', 'scripts/patch-android-signing.ts'], '.'],
    ['ios-pods', 'pod', ['install'], 'ios'],
  ]) {
    const f = fixture(t), env = { ANDROID_VERSION_CODE: '100123', ANDROID_KEYSTORE_PASSWORD: 'fixture-private', GRADLE_USER_HOME: '/fixture/shared-gradle' };
    const result = f.run(phase, env);
    assert.equal(result.status, 0);
    assert.deepEqual(f.calls().map(x => [x.name, x.args]), [[name, args]]);
    assert.equal(f.calls()[0].cwd, path.resolve(f.root, relative));
    assert.equal(f.calls()[0].gradleHome, env.GRADLE_USER_HOME);
    assert.equal(f.calls()[0].version, env.ANDROID_VERSION_CODE);
    assert.equal((result.stdout + result.stderr).includes(env.ANDROID_KEYSTORE_PASSWORD), false);
    assert.equal(f.run(phase, { ...env, FAIL_AT: name }).status, 37);
  }
});

test('PR security range is exact and missing PR metadata cannot become a full scan success', t => {
  const f = fixture(t);
  assert.equal(f.run('scan', { CI_EVENT_NAME: 'pull_request', CI_PR_BASE_SHA: 'base123', CI_PR_HEAD_SHA: 'head456' }).status, 0);
  assert.deepEqual(f.calls()[0].args, ['git', '--log-opts=base123..head456', '--redact', '--no-banner', '--exit-code', '1']);
  const bad = fixture(t);
  assert.notEqual(bad.run('scan', { CI_EVENT_NAME: 'pull_request' }).status, 0);
  assert.equal(bad.calls().length, 0);
});

test('unknown modes, missing simulator and outbound lane names fail before any command', t => {
  for (const phase of ['invalid', 'ios-smoke-build', 'testflight', 'fad-upload', 'store-publish']) {
    const f = fixture(t);
    assert.equal(f.run(phase).status, 2);
    assert.equal(f.calls().length, 0);
  }
});

test('Task native alias accepts only prepared non-publishing build variants', t => {
  const f = fixture(t);
  assert.equal(f.run('native', { EQUUS_CI_NATIVE_VARIANT: 'android-fad-apk' }).status, 0);
  assert.deepEqual(f.calls()[0].args, [':app:assembleRelease', '--no-daemon', '-PreactNativeArchitectures=arm64-v8a']);
  const bad = fixture(t);
  assert.equal(bad.run('native', { EQUUS_CI_NATIVE_VARIANT: 'testflight' }).status, 2);
  assert.equal(bad.calls().length, 0);
});

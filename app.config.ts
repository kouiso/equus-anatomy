import type { ExpoConfig, ConfigContext } from 'expo/config';

// fad.yml で target=stg を選ぶと APP_VARIANT=stg が立つ。
// package / bundle id と表示名が STG 用になり、同一端末で本番版と共存インストールできる。
// 未設定時は app.json の値をそのまま返す（本番・後方互換）。
// 旧 develop=STG 運用（2026-10）と同じ .stg サフィックスで、Firebase 側の既存 stg アプリをそのまま使う。
const IS_STG = process.env.APP_VARIANT === 'stg';

export default ({ config }: ConfigContext): ExpoConfig => {
  // ConfigContext の config は Partial<ExpoConfig> だが、app.json が
  // name/slug 等の必須項目を全て持つので実体は ExpoConfig
  const base = config as ExpoConfig;
  if (!IS_STG) return base;
  return {
    ...base,
    name: `${base.name} (STG)`,
    ios: { ...base.ios, bundleIdentifier: 'jp.co.ritmo.equusanatomy.stg' },
    android: { ...base.android, package: 'jp.co.ritmo.equusanatomy.stg' },
  };
};

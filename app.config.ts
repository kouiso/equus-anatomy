import { ExpoConfig, ConfigContext } from 'expo/config';

// develop ブランチ = STG、main ブランチ = PROD。
// APP_VARIANT=stg を付けると package / bundle id と表示名が STG になり、
// 同一端末で PROD 版と共存インストールできる。省略時は prod（後方互換）。
const IS_STG = process.env.APP_VARIANT === 'stg';
const SUFFIX = IS_STG ? '.stg' : '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_STG ? `${config.name} (STG)` : config.name,
  ios: {
    ...config.ios,
    bundleIdentifier: `jp.co.ritmo.equusanatomy${SUFFIX}`,
  },
  android: {
    ...config.android,
    package: `jp.co.ritmo.equusanatomy${SUFFIX}`,
  },
});

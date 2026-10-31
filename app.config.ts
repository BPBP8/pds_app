import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_PATH?.trim();
  return {
    ...config,
    name: config.name ?? '拍点啥',
    slug: config.slug ?? 'pds_app',
    web: { ...config.web, output: 'single' },
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
};

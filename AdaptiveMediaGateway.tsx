/**
 * Legacy compatibility layer for v1 consumers.
 *
 * Security note:
 * This wrapper now delegates all URL generation and validation to the hardened
 * MediaOptimizer v2 implementation.
 */

import {
  configureMedia,
  getConfig,
  getMediaUrl,
  type MediaConfig as CoreMediaConfig,
  type TransformOptions as CoreTransformOptions,
} from './MediaOptimizer';

export interface MediaConfig extends CoreMediaConfig {}

export interface TransformOptions
  extends Pick<CoreTransformOptions, 'width' | 'height' | 'quality' | 'format' | 'fit'> {}

export interface LegacyMediaResult {
  src: string;
  backupSrc: string;
  provider: 'imagekit' | 'supabase';
}

/**
 * Backward-compatible v1 configuration API.
 *
 * Accepts partial updates after first initialization.
 * On first call, all required fields must be present.
 */
export const configureMediaOptimizer = (config: Partial<MediaConfig>): void => {
  const current = getConfig();
  const merged = { ...(current ?? {}), ...config } as Partial<MediaConfig>;

  if (!merged.imageKitId || !merged.supabaseUrl || !merged.bucketName) {
    throw new Error(
      'configureMediaOptimizer requires imageKitId, supabaseUrl, and bucketName before use'
    );
  }

  configureMedia({
    imageKitId: merged.imageKitId,
    supabaseUrl: merged.supabaseUrl,
    bucketName: merged.bucketName,
    forceBackupMode: merged.forceBackupMode,
    debug: merged.debug,
  });
};

/**
 * Backward-compatible v1 URL API.
 * Maps v2 `fallbackSrc` to v1 `backupSrc`.
 */
export const getMediaUrls = (
  path: string,
  options: TransformOptions = {}
): LegacyMediaResult => {
  const result = getMediaUrl(path, options);
  return {
    src: result.src,
    backupSrc: result.fallbackSrc,
    provider: result.provider,
  };
};

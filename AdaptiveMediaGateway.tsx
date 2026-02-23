/**
 * Media Optimizer Core Engine
 * ===========================
 * * This module manages the logic for generating optimized media URLs from
 * different providers (ImageKit and Supabase). It abstracts away the 
 * specific API parameters of each provider into a unified interface.
 * * Architecture:
 * - Primary: ImageKit (via Web Proxy)
 * - Backup: Supabase Storage (via Render API)
 * * @author Specialized Coding Agent
 * @version 1.0.0
 */

// ------------------------------------------------------------------
// 1. Configuration & Types
// ------------------------------------------------------------------

export interface MediaConfig {
  /** Your ImageKit ID (e.g., 'ik_user_123') */
  imageKitId: string;
  /** Your Supabase Project URL (e.g., 'https://xyz.supabase.co') */
  supabaseUrl: string;
  /** The specific Supabase Bucket Name (e.g., 'uploads') */
  bucketName: string;
  /** Global override to force backup mode (useful for testing or manual limit handling) */
  forceBackupMode?: boolean;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'fill'; // Maps to provider-specific resizing strategies
}

// Singleton configuration (can be set at app startup)
let globalConfig: MediaConfig = {
  imageKitId: process.env.NEXT_PUBLIC_IMAGEKIT_ID || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  bucketName: process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'public',
  forceBackupMode: process.env.NEXT_PUBLIC_FORCE_BACKUP === 'true',
};

/**
 * Updates the global configuration at runtime.
 */
export const configureMediaOptimizer = (config: Partial<MediaConfig>) => {
  globalConfig = { ...globalConfig, ...config };
};

// ------------------------------------------------------------------
// 2. Provider-Specific Logic
// ------------------------------------------------------------------

/**
 * Generates the ImageKit URL.
 * Assumes you have set up a Web Proxy source in ImageKit pointing to your Supabase Bucket.
 */
const generateImageKitUrl = (path: string, options: TransformOptions): string => {
  const { imageKitId } = globalConfig;
  
  // Clean path to ensure no double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Build Transformation String
  // ImageKit uses a specific syntax: tr:key-val,key-val
  const transforms: string[] = [];

  if (options.width) transforms.push(`w-${options.width}`);
  if (options.height) transforms.push(`h-${options.height}`);
  if (options.quality) transforms.push(`q-${options.quality}`);
  
  // Mapping 'fit' strategies
  if (options.fit === 'contain') transforms.push('c-at_max');
  else if (options.fit === 'cover') transforms.push('c-maintain_ratio');
  else if (options.fit === 'fill') transforms.push('c-force');

  // Format usually handled by 'f-auto' in dashboard, but we can force it here
  if (options.format && options.format !== 'auto') transforms.push(`f-${options.format}`);

  const transformString = transforms.length > 0 ? `tr:${transforms.join(',')}` : '';

  // Construct URL: https://ik.imagekit.io/{ID}/{transformations}/{path}
  return `https://ik.imagekit.io/${imageKitId}/${transformString}${cleanPath}`;
};

/**
 * Generates the Supabase Render URL (The Backup).
 * Uses Supabase's built-in image transformation API.
 */
const generateSupabaseUrl = (path: string, options: TransformOptions): string => {
  const { supabaseUrl, bucketName } = globalConfig;
  
  // Clean path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Base URL for Supabase Image Transformation
  // Pattern: {url}/storage/v1/render/image/public/{bucket}/{path}
  const baseUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucketName}/${cleanPath}`;

  // Build Query Parameters
  const params = new URLSearchParams();
  
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());
  if (options.format && options.format !== 'auto') params.set('format', options.format);
  
  // Mapping 'fit' strategies for Supabase
  if (options.fit) params.set('resize', options.fit);

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// ------------------------------------------------------------------
// 3. Public API
// ------------------------------------------------------------------

/**
 * The Master Function.
 * Returns both the Primary (ImageKit) and Backup (Supabase) URLs.
 * * @param path - The file path inside your bucket (e.g., 'users/avatar.jpg')
 * @param options - Transformation options (width, quality, etc.)
 */
export const getMediaUrls = (path: string, options: TransformOptions = {}) => {
  // Defaults
  const opts = { quality: 80, fit: 'cover' as const, ...options };

  const primary = generateImageKitUrl(path, opts);
  const backup = generateSupabaseUrl(path, opts);

  // If force mode is on, we essentially swap them or just return backup
  if (globalConfig.forceBackupMode) {
    return { src: backup, backupSrc: backup, provider: 'supabase' };
  }

  return { src: primary, backupSrc: backup, provider: 'imagekit' };
};
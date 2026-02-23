/**
 * ============================================================================
 * MEDIA OPTIMIZER - Production-Grade Image CDN Abstraction
 * ============================================================================
 *
 * A portable, single-file module for generating optimized media URLs from
 * multiple providers (ImageKit, Supabase) with a unified API.
 *
 * Features:
 * - Provider abstraction (ImageKit primary, Supabase backup)
 * - Zod validation for runtime safety
 * - Path sanitization to prevent directory traversal
 * - Responsive srcset generation
 * - React hook for easy component integration
 *
 * Dependencies: zod
 * Install: npm install zod
 *
 * @author Production Coding Agent
 * @version 2.0.0
 * @license MIT
 */

import { z } from 'zod';
import { useMemo } from 'react';

// ============================================================================
// SECTION 1: TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for the media optimizer.
 * Set once at app initialization via `configureMedia()`.
 */
export interface MediaConfig {
    /** ImageKit URL ID (e.g., 'your_imagekit_id') */
    imageKitId: string;
    /** Supabase project URL (e.g., 'https://xyz.supabase.co') */
    supabaseUrl: string;
    /** Supabase storage bucket name */
    bucketName: string;
    /** Force backup provider (useful for testing or quota limits) */
    forceBackupMode?: boolean;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Image transformation options.
 * All options are validated at runtime via Zod.
 */
export interface TransformOptions {
    /** Target width in pixels (1-4000) */
    width?: number;
    /** Target height in pixels (1-4000) */
    height?: number;
    /** Image quality (1-100, default: 80) */
    quality?: number;
    /** Output format */
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    /** Resize strategy */
    fit?: 'cover' | 'contain' | 'fill';
    /** Focal point for smart cropping */
    focal?: 'auto' | 'face' | 'center' | 'top' | 'bottom' | 'left' | 'right';
    /** Device pixel ratio for responsive images (1-3) */
    dpr?: number;
    /** Enable blur effect (1-100) */
    blur?: number;
    /** Enable sharpen effect */
    sharpen?: boolean;
}

/**
 * Result from URL generation containing primary and backup URLs.
 */
export interface OptimizedMedia {
    /** Primary optimized URL (ImageKit) */
    src: string;
    /** Backup URL (Supabase) */
    fallbackSrc: string;
    /** Responsive srcset string for <img> element */
    srcSet?: string;
    /** Current active provider */
    provider: 'imagekit' | 'supabase';
}

// ============================================================================
// SECTION 2: CONSTANTS & DEFAULTS
// ============================================================================

const DEFAULTS = {
    quality: 80,
    fit: 'cover' as const,
    format: 'auto' as const,
    dpr: 1,
} as const;

const LIMITS = {
    minWidth: 1,
    maxWidth: 4000,
    minHeight: 1,
    maxHeight: 4000,
    minQuality: 1,
    maxQuality: 100,
    minBlur: 1,
    maxBlur: 100,
    minDpr: 1,
    maxDpr: 3,
    maxPathLength: 500,
} as const;

const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920] as const;

// ============================================================================
// SECTION 3: CUSTOM ERRORS
// ============================================================================

/**
 * Base error class for all media optimizer errors.
 */
export class MediaOptimizerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MediaOptimizerError';
    }
}

/**
 * Thrown when path validation fails (e.g., directory traversal attempt).
 */
export class InvalidPathError extends MediaOptimizerError {
    constructor(path: string, reason: string) {
        super(`Invalid path "${path}": ${reason}`);
        this.name = 'InvalidPathError';
    }
}

/**
 * Thrown when configuration is missing or invalid.
 */
export class ConfigurationError extends MediaOptimizerError {
    constructor(message: string) {
        super(`Configuration error: ${message}`);
        this.name = 'ConfigurationError';
    }
}

/**
 * Thrown when transform options are invalid.
 */
export class ValidationError extends MediaOptimizerError {
    constructor(message: string) {
        super(`Validation error: ${message}`);
        this.name = 'ValidationError';
    }
}

// ============================================================================
// SECTION 4: ZOD VALIDATION SCHEMAS
// ============================================================================

const ConfigSchema = z.object({
    imageKitId: z.string().min(1, 'ImageKit ID is required'),
    supabaseUrl: z.string().url('Invalid Supabase URL'),
    bucketName: z.string().min(1, 'Bucket name is required'),
    forceBackupMode: z.boolean().optional().default(false),
    debug: z.boolean().optional().default(false),
});

const TransformOptionsSchema = z.object({
    width: z.number().int().min(LIMITS.minWidth).max(LIMITS.maxWidth).optional(),
    height: z.number().int().min(LIMITS.minHeight).max(LIMITS.maxHeight).optional(),
    quality: z.number().int().min(LIMITS.minQuality).max(LIMITS.maxQuality).optional(),
    format: z.enum(['auto', 'webp', 'avif', 'jpg', 'png']).optional(),
    fit: z.enum(['cover', 'contain', 'fill']).optional(),
    focal: z.enum(['auto', 'face', 'center', 'top', 'bottom', 'left', 'right']).optional(),
    dpr: z.number().min(LIMITS.minDpr).max(LIMITS.maxDpr).optional(),
    blur: z.number().int().min(LIMITS.minBlur).max(LIMITS.maxBlur).optional(),
    sharpen: z.boolean().optional(),
});

// ============================================================================
// SECTION 5: PATH SANITIZATION
// ============================================================================

/** Dangerous patterns that indicate directory traversal or injection attempts */
const DANGEROUS_PATTERNS = [
    /\.\./,           // Parent directory traversal
    /\.\\/,           // Windows parent traversal
    /%2e%2e/i,        // URL encoded ..
    /%252e/i,         // Double URL encoded .
    /^\/+/,           // Leading slashes (we'll normalize these)
    /\0/,             // Null bytes
    /<|>/,            // HTML injection
    /[<>:"|?*]/,      // Windows invalid characters
];

/**
 * Sanitizes and validates a file path.
 * @throws {InvalidPathError} If path contains dangerous patterns
 */
function sanitizePath(path: string): string {
    if (!path || typeof path !== 'string') {
        throw new InvalidPathError(path, 'Path must be a non-empty string');
    }

    if (path.length > LIMITS.maxPathLength) {
        throw new InvalidPathError(path, `Path exceeds maximum length of ${LIMITS.maxPathLength}`);
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(path)) {
            throw new InvalidPathError(path, 'Path contains forbidden characters or patterns');
        }
    }

    // Normalize the path
    let cleanPath = path
        .replace(/\\/g, '/')      // Normalize backslashes to forward slashes
        .replace(/\/+/g, '/')     // Remove duplicate slashes
        .replace(/^\/+/, '')      // Remove leading slashes
        .trim();

    if (!cleanPath) {
        throw new InvalidPathError(path, 'Path is empty after sanitization');
    }

    return cleanPath;
}

// ============================================================================
// SECTION 6: PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Abstract base class for media providers.
 */
abstract class BaseProvider {
    abstract readonly name: string;
    abstract generateUrl(path: string, options: TransformOptions): string;
}

/**
 * ImageKit CDN provider implementation.
 * Uses Web Proxy mode pointing to Supabase bucket.
 */
class ImageKitProvider extends BaseProvider {
    readonly name = 'imagekit';

    constructor(private readonly imageKitId: string) {
        super();
    }

    generateUrl(path: string, options: TransformOptions): string {
        const transforms: string[] = [];

        // Dimensions
        if (options.width) transforms.push(`w-${options.width}`);
        if (options.height) transforms.push(`h-${options.height}`);

        // Quality
        if (options.quality) transforms.push(`q-${options.quality}`);

        // Fit mode mapping (corrected from v1)
        if (options.fit === 'cover') {
            transforms.push('c-maintain_ratio');
        } else if (options.fit === 'contain') {
            transforms.push('c-at_max');
        } else if (options.fit === 'fill') {
            transforms.push('c-force');
        }

        // Focal point for smart cropping
        if (options.focal) {
            const focalMap: Record<string, string> = {
                auto: 'fo-auto',
                face: 'fo-face',
                center: 'fo-center',
                top: 'fo-top',
                bottom: 'fo-bottom',
                left: 'fo-left',
                right: 'fo-right',
            };
            transforms.push(focalMap[options.focal]);
        }

        // Format (if not auto, ImageKit handles auto by default)
        if (options.format && options.format !== 'auto') {
            transforms.push(`f-${options.format}`);
        }

        // DPR for retina displays
        if (options.dpr && options.dpr > 1) {
            transforms.push(`dpr-${options.dpr}`);
        }

        // Effects
        if (options.blur) transforms.push(`bl-${options.blur}`);
        if (options.sharpen) transforms.push('e-sharpen');

        const transformString = transforms.length > 0 ? `tr:${transforms.join(',')}` : '';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;

        return `https://ik.imagekit.io/${this.imageKitId}/${transformString}${cleanPath}`;
    }
}

/**
 * Supabase Storage render API provider implementation.
 */
class SupabaseProvider extends BaseProvider {
    readonly name = 'supabase';

    constructor(
        private readonly supabaseUrl: string,
        private readonly bucketName: string
    ) {
        super();
    }

    generateUrl(path: string, options: TransformOptions): string {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        const baseUrl = `${this.supabaseUrl}/storage/v1/render/image/public/${this.bucketName}/${cleanPath}`;

        const params = new URLSearchParams();

        if (options.width) params.set('width', options.width.toString());
        if (options.height) params.set('height', options.height.toString());
        if (options.quality) params.set('quality', options.quality.toString());
        if (options.format && options.format !== 'auto') params.set('format', options.format);
        if (options.fit) params.set('resize', options.fit);

        const queryString = params.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }
}

// ============================================================================
// SECTION 7: CONFIGURATION MANAGER (SINGLETON)
// ============================================================================

let globalConfig: MediaConfig | null = null;
let primaryProvider: ImageKitProvider | null = null;
let backupProvider: SupabaseProvider | null = null;

/**
 * Configures the media optimizer. Call once at app startup.
 *
 * @example
 * ```ts
 * configureMedia({
 *   imageKitId: process.env.NEXT_PUBLIC_IMAGEKIT_ID!,
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   bucketName: 'uploads',
 * });
 * ```
 *
 * @throws {ConfigurationError} If configuration is invalid
 */
export function configureMedia(config: MediaConfig): void {
    const result = ConfigSchema.safeParse(config);

    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ConfigurationError(errors);
    }

    globalConfig = result.data;
    primaryProvider = new ImageKitProvider(globalConfig.imageKitId);
    backupProvider = new SupabaseProvider(globalConfig.supabaseUrl, globalConfig.bucketName);

    if (globalConfig.debug) {
        console.log('[MediaOptimizer] Configured with:', {
            imageKitId: globalConfig.imageKitId,
            supabaseUrl: globalConfig.supabaseUrl,
            bucketName: globalConfig.bucketName,
            forceBackupMode: globalConfig.forceBackupMode,
        });
    }
}

/**
 * Returns the current configuration (read-only).
 */
export function getConfig(): Readonly<MediaConfig> | null {
    return globalConfig ? { ...globalConfig } : null;
}

/**
 * Ensures configuration is set before use.
 */
function ensureConfigured(): void {
    if (!globalConfig || !primaryProvider || !backupProvider) {
        throw new ConfigurationError(
            'Media optimizer not configured. Call configureMedia() at app startup.'
        );
    }
}

// ============================================================================
// SECTION 8: CORE URL GENERATION
// ============================================================================

/**
 * Generates an optimized media URL with fallback.
 *
 * @example
 * ```ts
 * const { src, fallbackSrc } = getMediaUrl('photos/hero.jpg', {
 *   width: 1200,
 *   quality: 85,
 *   format: 'webp',
 * });
 * ```
 *
 * @param path - File path within the storage bucket
 * @param options - Transformation options
 * @returns Primary and backup URLs
 * @throws {InvalidPathError} If path is invalid
 * @throws {ValidationError} If options are invalid
 * @throws {ConfigurationError} If not configured
 */
export function getMediaUrl(path: string, options: TransformOptions = {}): OptimizedMedia {
    ensureConfigured();

    // Sanitize and validate path
    const safePath = sanitizePath(path);

    // Validate transform options
    const parseResult = TransformOptionsSchema.safeParse(options);
    if (!parseResult.success) {
        const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(errors);
    }

    // Merge with defaults
    const opts: TransformOptions = {
        ...DEFAULTS,
        ...parseResult.data,
    };

    // Generate URLs
    const primary = primaryProvider!.generateUrl(safePath, opts);
    const backup = backupProvider!.generateUrl(safePath, opts);

    // Handle force backup mode
    if (globalConfig!.forceBackupMode) {
        return {
            src: backup,
            fallbackSrc: backup,
            provider: 'supabase',
        };
    }

    return {
        src: primary,
        fallbackSrc: backup,
        provider: 'imagekit',
    };
}

/**
 * Generates a responsive srcset string for use in <img> elements.
 *
 * @example
 * ```tsx
 * const srcSet = getResponsiveSrcSet('photos/hero.jpg', { quality: 80 });
 * // Returns: "https://... 320w, https://... 640w, ..."
 * <img src={src} srcSet={srcSet} sizes="100vw" />
 * ```
 *
 * @param path - File path within the storage bucket
 * @param options - Base transformation options (width will be overridden)
 * @param widths - Array of widths for srcset (default: common breakpoints)
 * @returns srcset string
 */
export function getResponsiveSrcSet(
    path: string,
    options: Omit<TransformOptions, 'width'> = {},
    widths: readonly number[] = RESPONSIVE_WIDTHS
): string {
    ensureConfigured();

    const safePath = sanitizePath(path);

    return widths
        .map(width => {
            const { src } = getMediaUrl(safePath, { ...options, width });
            return `${src} ${width}w`;
        })
        .join(', ');
}

/**
 * Generates a complete media object with srcset included.
 *
 * @param path - File path within the storage bucket
 * @param options - Transformation options
 * @returns Complete media object with src, fallbackSrc, and srcSet
 */
export function getOptimizedMedia(path: string, options: TransformOptions = {}): OptimizedMedia {
    const result = getMediaUrl(path, options);
    const srcSet = getResponsiveSrcSet(path, options);

    return {
        ...result,
        srcSet,
    };
}

// ============================================================================
// SECTION 9: REACT INTEGRATION
// ============================================================================

/**
 * Result from the useOptimizedImage hook.
 */
export interface UseOptimizedImageResult {
    /** Primary optimized URL */
    src: string;
    /** Backup URL for error fallback */
    fallbackSrc: string;
    /** Responsive srcset string */
    srcSet: string;
    /** Current provider being used */
    provider: 'imagekit' | 'supabase';
    /** Error if URL generation failed */
    error: Error | null;
}

/**
 * React hook for optimized image URLs with memoization.
 *
 * @example
 * ```tsx
 * function Avatar({ userId }: { userId: string }) {
 *   const { src, srcSet, fallbackSrc, error } = useOptimizedImage(
 *     `avatars/${userId}.jpg`,
 *     { width: 200, format: 'webp' }
 *   );
 *
 *   if (error) return <FallbackAvatar />;
 *
 *   return (
 *     <img
 *       src={src}
 *       srcSet={srcSet}
 *       sizes="200px"
 *       onError={(e) => { e.currentTarget.src = fallbackSrc; }}
 *       alt="User avatar"
 *     />
 *   );
 * }
 * ```
 *
 * @param path - File path within the storage bucket
 * @param options - Transformation options
 * @returns Optimized image URLs and metadata
 */
export function useOptimizedImage(
    path: string,
    options: TransformOptions = {}
): UseOptimizedImageResult {
    return useMemo(() => {
        try {
            const result = getOptimizedMedia(path, options);
            return {
                src: result.src,
                fallbackSrc: result.fallbackSrc,
                srcSet: result.srcSet || '',
                provider: result.provider,
                error: null,
            };
        } catch (err) {
            // Return empty values with error for graceful degradation
            return {
                src: '',
                fallbackSrc: '',
                srcSet: '',
                provider: 'imagekit' as const,
                error: err instanceof Error ? err : new Error('Unknown error'),
            };
        }
    }, [path, JSON.stringify(options)]);
}

// ============================================================================
// SECTION 10: UTILITY EXPORTS
// ============================================================================

/**
 * All exports for convenient destructuring:
 *
 * @example
 * ```ts
 * import {
 *   configureMedia,
 *   getMediaUrl,
 *   getResponsiveSrcSet,
 *   useOptimizedImage,
 *   MediaOptimizerError,
 * } from './MediaOptimizer';
 * ```
 */
export {
    // Types are exported at declaration
    // Errors are exported at declaration
    // Functions are exported at declaration
    DEFAULTS as MEDIA_DEFAULTS,
    LIMITS as MEDIA_LIMITS,
    RESPONSIVE_WIDTHS,
};

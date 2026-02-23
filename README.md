# MediaOptimizer

Production-grade image URL optimizer for TypeScript and React projects.

`MediaOptimizer.ts` gives you one API for generating optimized image URLs with:
- ImageKit as the primary provider
- Supabase Storage render API as the fallback provider
- Runtime validation and path sanitization
- Optional React hook support

## Repository Contents

- `MediaOptimizer.ts`: Main production module (v2)
- `AdaptiveMediaGateway.tsx`: Legacy/earlier implementation (v1 style)
- `MediaOptimizer.README.md`: Previous draft documentation
- `media-optimizer-refactor-prompt.md`: Refactor specification/prompt

## Features

- Strong runtime validation using `zod`
- Safe path sanitization to block traversal and malformed paths
- Provider fallback support (`imagekit` -> `supabase`)
- Responsive `srcSet` generation
- React hook: `useOptimizedImage`
- Typed custom errors for clearer debugging

## Requirements

- Node.js 16+
- TypeScript 4.5+
- React 17+ (required by this file because it imports `useMemo`)
- `zod` 3.x

You also need:
- An ImageKit account (Web Proxy configured)
- A Supabase project with Storage enabled

## Installation

1. Install dependency:

```bash
npm install zod
```

2. Copy `MediaOptimizer.ts` into your project (example: `src/lib/MediaOptimizer.ts`).

3. Configure once at app startup.

## Quick Start

```ts
// app/layout.tsx, _app.tsx, or app bootstrap file
import { configureMedia } from './lib/MediaOptimizer';

configureMedia({
  imageKitId: process.env.NEXT_PUBLIC_IMAGEKIT_ID!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  bucketName: process.env.NEXT_PUBLIC_SUPABASE_BUCKET!,
  forceBackupMode: false,
  debug: false,
});
```

```tsx
import { useOptimizedImage } from './lib/MediaOptimizer';

export function HeroImage() {
  const { src, srcSet, fallbackSrc } = useOptimizedImage('images/hero.jpg', {
    width: 1600,
    quality: 85,
    format: 'webp',
  });

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="100vw"
      alt="Hero"
      onError={(e) => {
        e.currentTarget.src = fallbackSrc;
      }}
    />
  );
}
```

## API Reference

### `configureMedia(config: MediaConfig): void`

Call once before using any URL generation methods.

```ts
configureMedia({
  imageKitId: 'your_imagekit_id',
  supabaseUrl: 'https://your-project.supabase.co',
  bucketName: 'public',
  forceBackupMode: false,
  debug: false,
});
```

### `getConfig(): Readonly<MediaConfig> | null`

Returns current config if set, otherwise `null`.

### `getMediaUrl(path, options?): OptimizedMedia`

Generates:
- `src`: primary URL
- `fallbackSrc`: backup URL
- `provider`: `'imagekit' | 'supabase'`

```ts
const media = getMediaUrl('avatars/user-123.jpg', {
  width: 300,
  height: 300,
  quality: 80,
  format: 'webp',
  fit: 'cover',
  focal: 'face',
});
```

### `getResponsiveSrcSet(path, options?, widths?): string`

Creates a responsive `srcSet` string.

Default widths:
`[320, 640, 768, 1024, 1280, 1536, 1920]`

### `getOptimizedMedia(path, options?): OptimizedMedia`

Returns `getMediaUrl(...)` plus `srcSet`.

### `useOptimizedImage(path, options?): UseOptimizedImageResult`

React hook wrapper with memoization and graceful error handling.

Returns:
- `src`
- `fallbackSrc`
- `srcSet`
- `provider`
- `error`

## Transform Options

`TransformOptions` supports:
- `width`: `1..4000`
- `height`: `1..4000`
- `quality`: `1..100`
- `format`: `'auto' | 'webp' | 'avif' | 'jpg' | 'png'`
- `fit`: `'cover' | 'contain' | 'fill'`
- `focal`: `'auto' | 'face' | 'center' | 'top' | 'bottom' | 'left' | 'right'`
- `dpr`: `1..3`
- `blur`: `1..100`
- `sharpen`: `boolean`

## Error Types

- `MediaOptimizerError`
- `InvalidPathError`
- `ConfigurationError`
- `ValidationError`

Example:

```ts
import { InvalidPathError, getMediaUrl } from './lib/MediaOptimizer';

try {
  getMediaUrl('../../../etc/passwd');
} catch (error) {
  if (error instanceof InvalidPathError) {
    console.error(error.message);
  }
}
```

## Security Notes

- Paths are sanitized and validated before URL generation.
- Dangerous patterns (like `..`, encoded traversal variants, invalid characters) are blocked.
- Invalid option values are rejected with descriptive validation errors.

## Migration (v1 -> v2)

If you used `AdaptiveMediaGateway.tsx`:

- `getMediaUrls()` -> `getMediaUrl()`
- `backupSrc` -> `fallbackSrc`
- Adds Zod validation, custom errors, `getResponsiveSrcSet`, and `useOptimizedImage`

## Troubleshooting

### `Configuration error: Media optimizer not configured`

Call `configureMedia(...)` once before any `getMediaUrl(...)` call.

### Invalid Supabase URL

Use full URL with protocol:
- Correct: `https://your-project.supabase.co`
- Incorrect: `your-project.supabase.co`

### ImageKit URL works poorly or fails

- Verify ImageKit Web Proxy source
- Verify bucket/path alignment
- Temporarily set `forceBackupMode: true` to test Supabase output

## License

MIT

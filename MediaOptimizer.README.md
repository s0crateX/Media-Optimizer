# MediaOptimizer

Secure media URL optimizer for TypeScript and React.

`MediaOptimizer.ts` generates optimized image URLs with:
- ImageKit as primary provider
- Supabase render API as fallback provider
- strict runtime validation
- hardened path sanitization
- responsive `srcSet` support

## Highlights

- Zod-validated config and transform options
- strict provider URL host/protocol validation
- path canonicalization with encoded traversal defense
- provider failover (`imagekit` -> `supabase`)
- React hook (`useOptimizedImage`)
- typed custom errors for safe handling

## Requirements

- Node.js 16+
- TypeScript 4.5+
- React 17+ (required because `MediaOptimizer.ts` imports `useMemo`)
- `zod` 3.x

Service requirements:
- ImageKit account (Web Proxy mode)
- Supabase project with Storage enabled

## Installation

```bash
npm install zod
```

Then copy `MediaOptimizer.ts` into your project (example: `src/lib/MediaOptimizer.ts`).

## Security-First Setup

Initialize once at app startup using server-controlled values:

```ts
import { configureMedia } from './lib/MediaOptimizer';

configureMedia({
  imageKitId: process.env.IMAGEKIT_ID!,
  supabaseUrl: process.env.SUPABASE_URL!, // ex: https://project-ref.supabase.co
  bucketName: process.env.SUPABASE_BUCKET!,
  forceBackupMode: false,
  debug: false,
});
```

Config validation rules:
- `imageKitId`: alphanumeric, `_`, `-`
- `supabaseUrl`: root origin only, no query/hash/credentials
- `supabaseUrl`: HTTPS for non-localhost, host must end with `.supabase.co`
- `bucketName`: validated safe format

## Quick Usage

```ts
import { getMediaUrl } from './lib/MediaOptimizer';

const media = getMediaUrl('images/hero.jpg', {
  width: 1600,
  quality: 85,
  format: 'webp',
  fit: 'cover',
  focal: 'face',
});

// media.src
// media.fallbackSrc
// media.provider
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

## API

### `configureMedia(config)`

Required before any URL generation.

### `getConfig()`

Returns current config or `null`.

### `getMediaUrl(path, options?)`

Returns:
- `src`
- `fallbackSrc`
- `provider`

### `getResponsiveSrcSet(path, options?, widths?)`

Returns a `srcSet` string.

Default widths:
`[320, 640, 768, 1024, 1280, 1536, 1920]`

### `getOptimizedMedia(path, options?)`

Returns `getMediaUrl(...)` + `srcSet`.

### `useOptimizedImage(path, options?)`

Returns:
- `src`
- `fallbackSrc`
- `srcSet`
- `provider`
- `error`

## Transform Options

- `width`: `1..4000`
- `height`: `1..4000`
- `quality`: `1..100`
- `format`: `'auto' | 'webp' | 'avif' | 'jpg' | 'png'`
- `fit`: `'cover' | 'contain' | 'fill'`
- `focal`: `'auto' | 'face' | 'center' | 'top' | 'bottom' | 'left' | 'right'`
- `dpr`: `1..3`
- `blur`: `1..100`
- `sharpen`: `boolean`

## Security Controls

- canonical path sanitization with segment allowlist
- recursive decode checks for encoded traversal attempts
- query/hash/control character blocking in paths
- generated URL protocol and host verification per provider
- strict validation of responsive width arrays
- reduced debug exposure via masked identifiers

## Error Types

- `MediaOptimizerError`
- `InvalidPathError`
- `ConfigurationError`
- `ValidationError`

## Legacy Compatibility

`AdaptiveMediaGateway.tsx` is retained as a compatibility wrapper.
It now routes through the hardened `MediaOptimizer.ts` engine.

## License

MIT

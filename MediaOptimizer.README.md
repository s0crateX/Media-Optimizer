# MediaOptimizer

**Production-grade image CDN abstraction for TypeScript/React/Next.js projects.**

A single-file, portable module that generates optimized image URLs from ImageKit (primary) and Supabase Storage (backup) with automatic fallback support.

---

## Features

- 🔒 **Secure** — Zod validation + path sanitization (blocks directory traversal)
- 🚀 **Fast** — URL generation only, no image processing overhead
- 📱 **Responsive** — Built-in srcset generation for responsive images
- ⚛️ **React Ready** — Includes `useOptimizedImage()` hook
- 🔄 **Fallback** — Automatic backup URLs if primary CDN fails
- 📦 **Portable** — Single file, copy and use anywhere

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 16+ |
| TypeScript | 4.5+ |
| React | 17+ (for hook only) |
| Zod | 3.x |

### External Services

- **ImageKit** account with Web Proxy configured to your Supabase bucket
- **Supabase** project with Storage enabled

---

## Installation

### Step 1: Install Zod

```bash
npm install zod
```

### Step 2: Copy the Module

Copy `MediaOptimizer.ts` to your project:

```
your-project/
├── src/
│   ├── lib/
│   │   └── MediaOptimizer.ts   ← Place here
│   └── ...
```

### Step 3: Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_IMAGEKIT_ID=your_imagekit_id
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_BUCKET=your-bucket-name
```

---

## Quick Start

### 1. Configure at App Startup

```typescript
// app/layout.tsx or _app.tsx
import { configureMedia } from '@/lib/MediaOptimizer';

// Call once when app loads
configureMedia({
  imageKitId: process.env.NEXT_PUBLIC_IMAGEKIT_ID!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  bucketName: process.env.NEXT_PUBLIC_SUPABASE_BUCKET!,
});

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

### 2. Use in Components

```tsx
import { useOptimizedImage } from '@/lib/MediaOptimizer';

function HeroSection() {
  const { src, srcSet, fallbackSrc } = useOptimizedImage('images/hero.jpg', {
    width: 1920,
    quality: 85,
    format: 'webp',
  });

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="100vw"
      onError={(e) => { e.currentTarget.src = fallbackSrc; }}
      alt="Hero"
    />
  );
}
```

---

## API Reference

### `configureMedia(config)`

Initialize the module. **Call once at app startup.**

```typescript
configureMedia({
  imageKitId: string;      // Your ImageKit URL ID
  supabaseUrl: string;     // Supabase project URL
  bucketName: string;      // Storage bucket name
  forceBackupMode?: boolean; // Skip ImageKit, use Supabase only
  debug?: boolean;         // Enable console logging
});
```

---

### `getMediaUrl(path, options?)`

Generate optimized URLs for a single image.

```typescript
const { src, fallbackSrc, provider } = getMediaUrl('photos/profile.jpg', {
  width: 400,
  height: 400,
  quality: 80,
  format: 'webp',
  fit: 'cover',
  focal: 'face',
});
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `src` | `string` | Primary optimized URL (ImageKit) |
| `fallbackSrc` | `string` | Backup URL (Supabase) |
| `provider` | `'imagekit' \| 'supabase'` | Active provider |

---

### `getResponsiveSrcSet(path, options?, widths?)`

Generate srcset string for responsive images.

```typescript
const srcSet = getResponsiveSrcSet('images/banner.jpg', {
  quality: 80,
  format: 'webp',
});
// Returns: "https://...320w, https://...640w, https://...768w, ..."
```

**Default widths:** `[320, 640, 768, 1024, 1280, 1536, 1920]`

---

### `getOptimizedMedia(path, options?)`

Get complete media object including srcset.

```typescript
const media = getOptimizedMedia('images/hero.jpg', { quality: 85 });
// { src, fallbackSrc, srcSet, provider }
```

---

### `useOptimizedImage(path, options?)` (React Hook)

React hook with memoization and error handling.

```tsx
function Avatar({ userId }: { userId: string }) {
  const { src, srcSet, fallbackSrc, error } = useOptimizedImage(
    `avatars/${userId}.jpg`,
    { width: 200, format: 'webp' }
  );

  if (error) return <DefaultAvatar />;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="200px"
      onError={(e) => { e.currentTarget.src = fallbackSrc; }}
      alt="User avatar"
    />
  );
}
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `src` | `string` | Primary URL |
| `srcSet` | `string` | Responsive srcset |
| `fallbackSrc` | `string` | Backup URL |
| `provider` | `string` | Active provider |
| `error` | `Error \| null` | Any error that occurred |

---

## Transform Options

All options are validated at runtime.

| Option | Type | Range | Description |
|--------|------|-------|-------------|
| `width` | `number` | 1-4000 | Target width in pixels |
| `height` | `number` | 1-4000 | Target height in pixels |
| `quality` | `number` | 1-100 | Image quality (default: 80) |
| `format` | `string` | `auto`, `webp`, `avif`, `jpg`, `png` | Output format |
| `fit` | `string` | `cover`, `contain`, `fill` | Resize strategy |
| `focal` | `string` | `auto`, `face`, `center`, `top`, `bottom`, `left`, `right` | Focus point for cropping |
| `dpr` | `number` | 1-3 | Device pixel ratio |
| `blur` | `number` | 1-100 | Blur effect strength |
| `sharpen` | `boolean` | — | Enable sharpening |

---

## Error Handling

The module throws specific error types:

```typescript
import {
  MediaOptimizerError,  // Base error class
  InvalidPathError,     // Path validation failed
  ConfigurationError,   // Missing or invalid config
  ValidationError,      // Invalid transform options
} from '@/lib/MediaOptimizer';

try {
  const url = getMediaUrl('../../../etc/passwd', { width: 100 });
} catch (error) {
  if (error instanceof InvalidPathError) {
    console.error('Blocked malicious path:', error.message);
  }
}
```

---

## Security

The module includes built-in protection against:

- ✅ Directory traversal attacks (`../`, `..\\`)
- ✅ URL-encoded path attacks (`%2e%2e`)
- ✅ Null byte injection
- ✅ HTML/script injection
- ✅ Invalid transform values (enforced ranges)

---

## Best Practices

### 1. Always Use the Fallback

```tsx
<img
  src={src}
  onError={(e) => { e.currentTarget.src = fallbackSrc; }}
/>
```

### 2. Provide Sizes for srcSet

```tsx
<img
  srcSet={srcSet}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 3. Use WebP Format

```typescript
getMediaUrl('image.jpg', { format: 'webp' })
```

### 4. Set Appropriate Quality

- **Hero images:** 85-90
- **Thumbnails:** 70-80
- **Backgrounds:** 60-70

---

## Migration from v1.0

If upgrading from `AdaptiveMediaGateway.tsx`:

| v1.0 | v2.0 |
|------|------|
| `getMediaUrls()` | `getMediaUrl()` |
| `{ src, backupSrc }` | `{ src, fallbackSrc }` |
| No validation | Zod validation |
| No React hook | `useOptimizedImage()` |

```typescript
// v1.0
const { src, backupSrc } = getMediaUrls('path.jpg', { width: 800 });

// v2.0
const { src, fallbackSrc } = getMediaUrl('path.jpg', { width: 800 });
```

---

## Troubleshooting

### "Media optimizer not configured"

Call `configureMedia()` before using any other functions:

```typescript
// ❌ Wrong
const url = getMediaUrl('test.jpg');

// ✅ Correct
configureMedia({ ... });
const url = getMediaUrl('test.jpg');
```

### "Invalid Supabase URL"

Ensure your URL includes the protocol:

```typescript
// ❌ Wrong
supabaseUrl: 'xyz.supabase.co'

// ✅ Correct
supabaseUrl: 'https://xyz.supabase.co'
```

### Images not loading via ImageKit

1. Verify your ImageKit Web Proxy is configured correctly
2. Check that the path matches your bucket structure
3. Try `forceBackupMode: true` to test Supabase directly

---

## License

MIT

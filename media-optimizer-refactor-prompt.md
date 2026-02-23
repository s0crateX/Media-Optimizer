# Media Optimizer Module - Production-Grade Refactoring Task

## Objective
Refactor the existing Media Optimizer module into enterprise-grade, production-ready code with comprehensive security, error handling, testing, and best practices implementation.

## Critical Security Requirements

### 1. Environment Variable Security
- **REMOVE all `NEXT_PUBLIC_*` environment variables** - these expose sensitive data client-side
- Implement server-side-only configuration using Next.js API routes or Server Actions
- Add runtime environment validation with proper error messages
- Use Zod or similar schema validation for all config values
- Never expose ImageKit ID, Supabase URLs, or bucket names to the client

### 2. Input Validation & Sanitization
- Implement strict path validation to prevent directory traversal attacks
- Validate all paths against allowlist patterns (regex)
- Sanitize all user inputs before processing
- Add maximum length limits for all string inputs
- Validate transform options against allowed ranges (width: 1-4000px, quality: 1-100, etc.)
- Throw descriptive errors for invalid inputs

### 3. URL Security
- Validate generated URLs before returning
- Implement URL allowlisting for accepted domains
- Add Content Security Policy (CSP) headers support
- Consider signed URLs for sensitive media (optional enhancement)

## Code Quality Requirements

### 1. Error Handling
```typescript
// Implement comprehensive error handling:
- Custom error classes (MediaOptimizerError, InvalidPathError, ConfigurationError, ProviderError)
- Graceful degradation strategies
- Detailed error logging with context
- Never expose internal errors to client
- Implement retry logic for network failures
- Circuit breaker pattern for provider failover
```

### 2. Type Safety
```typescript
// Enhance TypeScript usage:
- Use strict mode in tsconfig
- No 'any' types allowed
- Comprehensive union types for all options
- Branded types for paths and URLs
- Zod schemas for runtime validation
- Generate TypeScript types from Zod schemas
```

### 3. Architecture Improvements
```typescript
// Implement clean architecture:
- Separate concerns: Core logic, Provider adapters, Configuration, Validation
- Dependency injection for testability
- Interface-based provider system (easy to add Cloudinary, Imgix, etc.)
- Factory pattern for provider instantiation
- Strategy pattern for transformation logic
- Repository pattern for configuration management
```

### 4. Provider Mapping Accuracy
```typescript
// Fix incorrect transformations:
- Research and implement CORRECT mappings between ImageKit and Supabase
- 'cover' should map to ImageKit 'c-at_least' + crop strategies
- 'contain' should map to 'c-at_max'
- Add focal point support (fo-auto, fo-face)
- Implement smart cropping options
- Add crop gravity options (center, north, south, etc.)
```

### 5. Feature Completeness
```typescript
// Add missing but essential features:
- Lazy loading support (low-quality placeholders)
- Responsive image srcset generation
- Modern format fallbacks (AVIF → WebP → JPEG)
- Blur/sharpen transformations
- Rotation and flip options
- Border and overlay support
- Watermarking capabilities
- Progressive JPEG support
- Metadata preservation options
- Cache control headers configuration
```

## Performance Optimizations

### 1. Caching Strategy
```typescript
// Implement multi-layer caching:
- In-memory LRU cache for generated URLs
- Cache key generation based on path + transforms
- TTL configuration per cache layer
- Cache invalidation API
- Optional Redis integration for distributed systems
```

### 2. URL Generation Optimization
```typescript
// Optimize URL building:
- Pre-compute common transformation strings
- Minimize string concatenation operations
- Use URL builder pattern for readability
- Implement URL normalization
```

## Testing Requirements

### 1. Unit Tests (Jest + Testing Library)
```typescript
// Minimum 90% code coverage:
- Test all transformation combinations
- Test error scenarios exhaustively
- Test provider fallback logic
- Test configuration validation
- Mock all external dependencies
- Snapshot tests for generated URLs
```

### 2. Integration Tests
```typescript
// Test real provider interactions:
- Verify ImageKit URL generation against their API
- Verify Supabase URL generation against their API
- Test actual image transformations (optional)
- Test failover scenarios
```

### 3. Security Tests
```typescript
// Dedicated security test suite:
- Path traversal attack attempts
- Injection attack scenarios
- Malformed input handling
- Rate limiting validation
```

## Documentation Requirements

### 1. Code Documentation
```typescript
// Comprehensive JSDoc:
- Document all public APIs
- Include usage examples in comments
- Document security considerations
- Add @throws annotations
- Document performance characteristics
```

### 2. README.md
```markdown
Create comprehensive README with:
- Quick start guide
- Installation instructions
- Configuration guide
- API reference
- Migration guide from old version
- Security best practices
- Performance tuning guide
- Troubleshooting section
- Example integrations (React, Next.js, Vue)
```

### 3. CHANGELOG.md
```markdown
Document all breaking changes and migration paths
```

## Implementation Checklist

### Phase 1: Security Hardening (CRITICAL)
- [ ] Remove all client-side environment variable exposure
- [ ] Implement server-side configuration management
- [ ] Add comprehensive input validation with Zod
- [ ] Implement path sanitization
- [ ] Add custom error classes
- [ ] Implement security tests

### Phase 2: Architecture Refactoring
- [ ] Create provider interface/abstract class
- [ ] Implement ImageKit adapter
- [ ] Implement Supabase adapter
- [ ] Add dependency injection container
- [ ] Implement factory pattern for providers
- [ ] Add configuration builder pattern

### Phase 3: Feature Enhancement
- [ ] Fix transformation mappings
- [ ] Add missing transformation options
- [ ] Implement srcset generation
- [ ] Add format fallback system
- [ ] Implement caching layer
- [ ] Add retry/circuit breaker logic

### Phase 4: Testing & Documentation
- [ ] Write comprehensive unit tests (90%+ coverage)
- [ ] Write integration tests
- [ ] Write security tests
- [ ] Complete JSDoc for all public APIs
- [ ] Write detailed README.md
- [ ] Create usage examples
- [ ] Add TypeScript declaration files

### Phase 5: Developer Experience
- [ ] Add detailed TypeScript types
- [ ] Create CLI tool for testing transformations
- [ ] Add debug mode with logging
- [ ] Create Next.js integration example
- [ ] Add performance benchmarks
- [ ] Create migration guide

## Code Style & Standards

### 1. Follow Industry Standards
- ESLint with Airbnb TypeScript config
- Prettier for formatting
- Conventional Commits for git messages
- SemVer for versioning
- Use meaningful variable names (no abbreviations)

### 2. SOLID Principles
- Single Responsibility: Each class/function does ONE thing
- Open/Closed: Open for extension, closed for modification
- Liskov Substitution: Providers should be interchangeable
- Interface Segregation: Small, focused interfaces
- Dependency Inversion: Depend on abstractions, not concretions

### 3. Code Organization
```
src/
├── core/
│   ├── MediaOptimizer.ts          (Main class)
│   ├── types.ts                    (All TypeScript interfaces/types)
│   ├── errors.ts                   (Custom error classes)
│   └── constants.ts                (Constants and defaults)
├── providers/
│   ├── BaseProvider.ts             (Abstract base class)
│   ├── ImageKitProvider.ts         (ImageKit implementation)
│   ├── SupabaseProvider.ts         (Supabase implementation)
│   └── types.ts                    (Provider-specific types)
├── validation/
│   ├── schemas.ts                  (Zod schemas)
│   ├── validators.ts               (Validation functions)
│   └── sanitizers.ts               (Input sanitization)
├── utils/
│   ├── url-builder.ts              (URL construction utilities)
│   ├── cache.ts                    (Caching implementation)
│   └── logger.ts                   (Logging utilities)
├── config/
│   └── ConfigManager.ts            (Configuration management)
└── index.ts                        (Public API exports)
```

## Expected Deliverables

1. **Fully refactored TypeScript module** with all requirements met
2. **Comprehensive test suite** with 90%+ coverage
3. **Complete documentation** (README, API docs, examples)
4. **Migration guide** from v1.0.0 to v2.0.0
5. **Example Next.js integration** (API route + React component)
6. **Performance benchmarks** comparing v1 vs v2

## Success Criteria

✅ Zero security vulnerabilities (run `npm audit`)
✅ 90%+ test coverage
✅ All TypeScript strict mode checks pass
✅ ESLint passes with zero warnings
✅ All 25+ test scenarios pass
✅ Documentation completeness score 100%
✅ Backward compatible API (where possible) OR clear migration path
✅ Performance equal or better than v1.0.0
✅ Can add new providers in <50 lines of code
✅ Production-ready: Can deploy to NPM as standalone package

## Additional Context

**Current Issues to Fix:**
1. Security: Client-side credential exposure
2. Validation: No input sanitization
3. Mapping: Incorrect fit mode transformations
4. Error handling: Silent failures possible
5. Testing: Zero test coverage
6. Documentation: Minimal
7. Features: Missing common transformations
8. Architecture: Tightly coupled, hard to extend

**Target Quality Level:**
- Enterprise SaaS product quality
- Open-source library standards (like `sharp`, `cloudinary`, etc.)
- Production-ready for high-traffic applications
- Maintainable by team of developers

## Questions to Consider

Before coding, think through:
1. How will this handle 1M+ requests/day?
2. What happens if ImageKit goes down?
3. How do we prevent abuse/DoS through transformation parameters?
4. How do we ensure generated URLs remain valid long-term?
5. How do we handle provider API changes gracefully?
6. What's the upgrade path for existing users?

---

**Priority Order:** Security → Architecture → Features → Testing → Documentation

**Estimated Scope:** This is a significant refactor. Budget 8-12 hours for complete implementation.

**Final Note:** This should be production-ready code that you'd be proud to open-source or include in a professional portfolio. No shortcuts, no "good enough" - aim for excellence.

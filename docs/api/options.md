# `StorageOptions`

```ts
interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
  defaults?: Record<string, any>;
  ttl?: number;
  encryption?: StorageEncryptionOptions;
}

interface StorageEncryptionOptions {
  encrypt: (plainText: string) => string;
  decrypt: (cipherText: string) => string;
  migrate?: boolean;
}
```

## `prefix`

Prepends every storage key.

## `type`

- `"local"` (default)
- `"session"`

## `defaults`

Fallback values returned when keys are missing. Nested objects are deep-merged.

## `ttl`

TTL in milliseconds. Expired values are auto-removed on access.

## `encryption`

Custom sync encryption hooks.

Reserved envelope keys: `__oto_encrypted` and `__oto_payload`. Objects with those fields may be treated as encrypted wrappers.

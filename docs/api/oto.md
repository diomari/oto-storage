# `oto`

```ts
function oto<T extends object>(options?: StorageOptions): T;
```

Creates a typed proxy over `localStorage` (default) or `sessionStorage`.

## Example

```ts
interface AppStorage {
  token: string | null;
}

const storage = oto<AppStorage>({
  prefix: "app-",
  defaults: { token: null },
});
```

## Behavior summary

- Reads/writes are JSON-based.
- Nested object updates are proxied.
- Expired values are removed on access when `ttl` is enabled.
- Encryption wrapper is used when `encryption` is configured.

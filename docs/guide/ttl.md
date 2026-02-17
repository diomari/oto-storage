# TTL

Set `ttl` (milliseconds) to auto-expire values.

```ts
const storage = oto<{ token: string }>({ ttl: 60_000 });
storage.token = "abc123";
```

When a value is expired, oto-storage removes it on read and returns `undefined` (or a configured default).

## TTL + nested updates

```ts
interface SessionData {
  user: { id: string; name: string };
}

const storage = oto<SessionData>({ ttl: 3_600_000 });
storage.user = { id: "1", name: "Alice" };
storage.user.name = "Bob";
```

Nested writes keep TTL wrapping intact.

# Getting Started

## Installation

```bash
npm install oto-storage
```

## Basic usage

```ts
import { oto } from "oto-storage";

interface StorageShape {
  theme: "light" | "dark";
  count: number;
}

const storage = oto<StorageShape>({ prefix: "app-" });

storage.theme = "dark";
storage.count = 1;

console.log(storage.theme);
console.log(storage.count);
```

## Session storage

```ts
const session = oto<{ token: string }>({
  type: "session",
  prefix: "session-",
});
```

## Next steps

- Configure [TTL](/guide/ttl)
- Configure [encryption hooks](/guide/encryption)
- Review [API options](/api/options)

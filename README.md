# Oto Storage

![npm version](https://img.shields.io/npm/v/oto-storage)
![npm version](https://img.shields.io/npm/dm/oto-storage)

A lightweight, Proxy-based wrapper for `localStorage` and `sessionStorage` with full TypeScript type safety.

### 📦 Installation

```bash
npm install oto-storage
```

Or with yarn:

```bash
yarn add oto-storage
```

Or with pnpm:

```bash
pnpm add oto-storage
```

### 📚 Documentation Site (VitePress)

Live documentation: [https://oto.diom.dev](https://oto.diom.dev)

### ⚡ The Problem

Working with browser storage usually involves repetitive `JSON.parse` and `JSON.stringify` calls, manual key prefixing to avoid collisions, and a total lack of Type Safety.

```typescript
// The old, "clunky" way
const user = JSON.parse(localStorage.getItem("user_data") || "{}");
localStorage.setItem("user_data", JSON.stringify({ ...user, theme: "dark" }));
```

### ✨ The Solution

Oto storage uses the JavaScript Proxy API to let you interact with browser storage as if it were a local object. It handles serialization, prefixing, and type-checking automatically.

**Key Features**

- **Type-Safe**: Full autocomplete and build-time error checking.

- **Zero Boilerplate**: No more manual JSON parsing.

- **Nested Property Updates**: Update deeply nested properties directly (e.g., `storage.user.profile.bio = "Hello"`).

- **Driver Support**: Switch between localStorage and sessionStorage with one flag.

- **Collision Protection**: Automatic key prefixing (namespacing).

- **Default Values**: Define fallback values for missing keys with deep merge support.

- **TTL / Expiration**: Set automatic expiration for stored values.

- **Custom Encryption Hooks**: Encrypt/decrypt stored values with your own sync crypto callbacks.

- **Cross-Tab Sync API**: Subscribe to `storage` events with typed callbacks.

### 🚀 Quick Start

**_1. Define your Schema_**

```typescript
interface AppStorage {
  theme: "light" | "dark";
  viewCount: number;
  user: { id: string; name: string } | null;
}
```

**_2. Initialize_**

```typescript
import { oto } from "oto-storage";

// For localStorage (default)
const storage = oto<AppStorage>({
  prefix: "myApp-",
});

// For sessionStorage
const session = oto<AppStorage>({
  prefix: "myApp-",
  type: "session",
});
```

**_3. Use it like a regular object_**

```typescript
// SETTING: Automatically stringified and saved to 'myApp-theme'
storage.theme = "dark";

// GETTING: Automatically parsed and typed
if (storage.theme === "dark") {
  console.log("Dark mode active!");
}

// DELETE: Delete the key-value pair from storage
delete storage.theme;

// CLEAR: Clear entire record
storage.clearAll();
```

### 📖 Comprehensive Examples

**Working with Complex Objects**

```typescript
interface UserData {
  id: string;
  name: string;
  preferences: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

const storage = oto<{ user: UserData | null }>({ prefix: "app-" });

// Store complex objects - automatically serialized
storage.user = {
  id: "123",
  name: "Alice",
  preferences: {
    theme: "dark",
    notifications: true,
  },
};

// Retrieve - fully typed with autocomplete
console.log(storage.user?.preferences.theme); // "dark"
```

**Updating Nested Properties**

Unlike basic storage wrappers, oto-storage allows you to update nested properties directly without overwriting the entire object:

```typescript
interface Settings {
  user: {
    name: string;
    preferences: {
      theme: "light" | "dark";
      notifications: boolean;
    };
  };
}

const storage = oto<Settings>({ prefix: "app-" });

// Initialize with an object
storage.user = {
  name: "Alice",
  preferences: {
    theme: "light",
    notifications: true,
  },
};

// Update just the nested property - other properties remain unchanged
storage.user.preferences.theme = "dark";

console.log(storage.user.preferences.theme); // "dark"
console.log(storage.user.name);              // "Alice" (unchanged)
console.log(storage.user.preferences.notifications); // true (unchanged)
```

**Checking if a Key Exists**

```typescript
const storage = oto<{ token: string | null }>({ prefix: "auth-" });

// Use 'in' operator to check if key exists in storage
if ("token" in storage) {
  console.log("User is authenticated");
}

// Or check directly (returns undefined for non-existent keys)
if (storage.token) {
  console.log("Token exists:", storage.token);
}
```

**Session Storage**

```typescript
const session = oto<{ temporaryData: string }>({
  prefix: "temp-",
  type: "session", // Uses sessionStorage instead of localStorage
});

session.temporaryData = "This will be cleared when tab closes";
```

**Multiple Namespaced Storages**

```typescript
const userPrefs = oto<{ theme: string }>({ prefix: "user-prefs-" });
const appState = oto<{ sidebarOpen: boolean }>({ prefix: "app-" });

userPrefs.theme = "dark";
appState.sidebarOpen = true;

// Keys are stored separately: 'user-prefs-theme' and 'app-sidebarOpen'
```

**Deleting and Clearing**

```typescript
const storage = oto<{ count: number; name: string }>({ prefix: "demo-" });

storage.count = 42;
storage.name = "Test";

// Delete single key
delete storage.count;

// Clear all keys with this storage's prefix
storage.clearAll();
```

**Cross-tab Sync**

Listen for updates made in other tabs/windows for the same origin.

```typescript
const storage = oto<{ theme: "light" | "dark"; count: number }>({
  prefix: "app-",
});

const stopAll = storage.subscribe((change) => {
  console.log(change.key, change.oldValue, "->", change.newValue);
});

const stopTheme = storage.onChange("theme", (value) => {
  console.log("Theme changed to:", value);
});

// Later
stopTheme();
stopAll();
```

**Type Safety at Work**

```typescript
interface AppStorage {
  count: number;
  items: string[];
}

const storage = oto<AppStorage>({ prefix: "app-" });

storage.count = 10; // ✓ Works
storage.count = "ten"; // ✗ TypeScript error: Type 'string' is not assignable to type 'number'

storage.items = ["a", "b"]; // ✓ Works
storage.items = "abc"; // ✗ TypeScript error: Type 'string' is not assignable to type 'string[]'
```

**Version Export**

```typescript
import { oto, version } from "oto-storage";

console.log(`Using oto-storage v${version}`);
```

**Default Values**

Provide default values that are returned when keys don't exist in storage. Defaults support deep merging with stored values.

```typescript
interface AppStorage {
  theme: "light" | "dark";
  user: { name: string; role: string; active: boolean };
}

const storage = oto<AppStorage>({
  prefix: "app-",
  defaults: {
    theme: "light",
    user: { name: "Anonymous", role: "guest", active: false },
  },
});

// Returns default when not set
console.log(storage.theme); // "light"

// Stored values override defaults
storage.theme = "dark";
console.log(storage.theme); // "dark"

// Deep merge - partial updates preserve defaults
storage.user = { name: "Alice" };  // Only set name
console.log(storage.user);
// { name: "Alice", role: "guest", active: false }

// Access nested properties - stored value takes precedence over defaults
console.log(storage.user.name); // "Alice" (stored value)
```

**TTL / Expiration**

Automatically expire stored values after a specified time (in milliseconds). Expired keys are automatically deleted on access.

```typescript
interface SessionStorage {
  token: string;
  user: { id: string; name: string };
}

const storage = oto<SessionStorage>({
  prefix: "session-",
  ttl: 3600000, // 1 hour in milliseconds
});

// Store value - automatically wrapped with expiration
storage.token = "abc123";

// Value is accessible before expiration
console.log(storage.token); // "abc123"

// ... 1 hour later ...

// Expired key is auto-deleted and returns undefined
console.log(storage.token); // undefined

// TTL works with nested objects too
storage.user = { id: "1", name: "Alice" };
storage.user.name = "Bob"; // Updates are also TTL-protected
```

**Encryption**

Use custom synchronous `encrypt`/`decrypt` hooks to protect stored payloads at rest.
Security warning: `btoa`/`atob` is encoding, not cryptographic encryption. Use `encryption.encrypt`/`encryption.decrypt` with a real cipher (for example Web Crypto AES-GCM) in production.

```typescript
interface SecureStorage {
  token: string;
  profile: { id: string; name: string };
}

const keyPrefix = "my-secret-key:";
const secure = oto<SecureStorage>({
  prefix: "secure-",
  encryption: {
    encrypt: (plainText) => btoa(`${keyPrefix}${plainText}`),
    decrypt: (cipherText) => {
      const decoded = atob(cipherText);
      if (!decoded.startsWith(keyPrefix)) {
        throw new Error("Invalid encryption key");
      }
      return decoded.slice(keyPrefix.length);
    },
    migrate: true, // Optional: auto-wrap existing plain JSON entries on read
  },
});

secure.token = "abc123";
console.log(secure.token); // "abc123"
```

`encryption.migrate` helps adopt encryption without a one-time migration script by upgrading plain JSON entries as they are read.
Reserved keys note: `__oto_encrypted` and `__oto_payload` are used by the encryption envelope. If your stored object uses both keys with the same shape, it will be treated as encrypted data by `readStoredValue`/`isEncryptedWrapper`.

Encryption + TTL work together automatically. Expired encrypted entries are deleted on access, just like non-encrypted TTL values.

Security note: this feature protects data at rest in storage, but it does not protect against active XSS (malicious runtime code can access your encryption callbacks and decrypted values).

**Combining Defaults and TTL**

Use both features together for powerful patterns like session management:

```typescript
interface AuthStorage {
  token: string | null;
  user: { id: string; name: string } | null;
}

const auth = oto<AuthStorage>({
  prefix: "auth-",
  ttl: 3600000, // 1 hour
  defaults: {
    token: null,
    user: null,
  },
});

// Before login - returns defaults
console.log(auth.token); // null

// After login
auth.token = "secret-token";
auth.user = { id: "123", name: "Alice" };

// ... after 1 hour (token expires) ...
console.log(auth.token); // null (back to default)
```

### 🛠️ Architecture Decisions

**_Why Proxy?_**
Choosing Proxy API over standard Class-based approach improves Developer Experience (DX). By intercepting `get` and `set` traps, we eliminate the need for `.getItem()` or `.setItem()` methods, making the storage feel "native" to JavaScript.

**_Type Safety via Generics_**
The library uses TypeScript Generics to map the user-provided interface to the Proxy. This ensures that if a developer tries to assign a `string` to a `number` field, the IDE will catch the error before the code even runs.

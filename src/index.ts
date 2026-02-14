interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
}

function getValueAtPath(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
): any {
  const fullKey = `${prefix}${rootKey}`;
  const storedValue = safeStorage.getItem(fullKey);
  if (storedValue === null) return undefined;

  try {
    let current = JSON.parse(storedValue);
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  } catch {
    return undefined;
  }
}

function createNestedProxy(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
): any {
  return new Proxy({} as any, {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") {
        return (getValueAtPath(safeStorage, prefix, rootKey, path) as any)?.[
          prop
        ];
      }

      const current = getValueAtPath(safeStorage, prefix, rootKey, path);
      if (current === null || current === undefined) return undefined;

      const value = current[prop];

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return createNestedProxy(safeStorage, prefix, rootKey, [...path, prop]);
      }
      return value;
    },
    set(_target, prop: string, value: any) {
      const fullKey = `${prefix}${rootKey}`;
      const storedValue = safeStorage.getItem(fullKey);
      let rootObj: any = {};

      if (storedValue !== null) {
        try {
          rootObj = JSON.parse(storedValue);
        } catch {
          rootObj = {};
        }
      }

      let current = rootObj;
      for (const key of path) {
        if (current[key] === null || typeof current[key] !== "object") {
          current[key] = {};
        }
        current = current[key];
      }
      current[prop] = value;

      try {
        safeStorage.setItem(fullKey, JSON.stringify(rootObj));
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${rootKey}`, error);
        return true;
      }
    },
    ownKeys() {
      const current = getValueAtPath(safeStorage, prefix, rootKey, path);
      if (current === null || current === undefined) return [];
      return Object.keys(current);
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;
      const current = getValueAtPath(safeStorage, prefix, rootKey, path);
      if (current === null || current === undefined) return undefined;
      if (!(prop in current)) return undefined;
      const value = current[prop];
      const descriptorValue =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? createNestedProxy(safeStorage, prefix, rootKey, [...path, prop])
          : value;
      return {
        value: descriptorValue,
        writable: true,
        enumerable: true,
        configurable: true,
      };
    },
    has(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return false;
      const current = getValueAtPath(safeStorage, prefix, rootKey, path);
      if (current === null || current === undefined) return false;
      return prop in current;
    },
  });
}

export function oto<T extends object>(options: StorageOptions = {}): T {
  const { prefix = "", type = "local" } = options;
  const storage =
    typeof window !== "undefined"
      ? type === "session"
        ? window.sessionStorage
        : window.localStorage
      : null;

  const safeStorage: Storage = storage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() {
      return 0;
    },
  };

  return new Proxy({} as T, {
    get(_target, prop: string) {
      if (prop === "clearAll") {
        return () => {
          const keys: string[] = [];
          for (let i = 0; i < safeStorage.length; i++) {
            const key = safeStorage.key(i);
            if (key) keys.push(key);
          }
          keys.forEach((key) => {
            if (key.startsWith(prefix)) safeStorage.removeItem(key);
          });
        };
      }
      const value = safeStorage.getItem(`${prefix}${prop}`);
      if (value === null) return undefined;
      try {
        const parsed = JSON.parse(value);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          return createNestedProxy(safeStorage, prefix, prop);
        }
        return parsed;
      } catch {
        return value;
      }
    },
    set(_target, prop: string, value: any) {
      try {
        const stringValue = JSON.stringify(value);
        safeStorage.setItem(`${prefix}${prop}`, stringValue);
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${prop}`, error);
        return true;
      }
    },
    has(_target, prop: string) {
      return safeStorage.getItem(`${prefix}${prop}`) !== null;
    },
    deleteProperty(_target, prop: string) {
      const key = `${prefix}${String(prop)}`;
      safeStorage.removeItem(key);
      return true;
    },
  });
}

export const version = "0.2.0";
export type { StorageOptions };

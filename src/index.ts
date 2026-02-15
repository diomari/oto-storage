interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
  defaults?: Record<string, any>;
  ttl?: number;
}

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;
  if (typeof target !== "object" || typeof source !== "object") return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;

  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      result[key] = deepMerge(target[key], source[key]);
    }
  }
  return result;
}

function wrapWithTTL(value: any, ttl: number): any {
  return {
    __oto_value: value,
    __oto_expires: Date.now() + ttl,
  };
}

function unwrapWithTTL(wrapped: any): { value: any; expired: boolean } {
  // Only treat as TTL wrapper if both sentinel keys are present and __oto_expires is a number
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "__oto_expires" in wrapped &&
    "__oto_value" in wrapped &&
    typeof wrapped.__oto_expires === "number"
  ) {
    const expired = Date.now() > wrapped.__oto_expires;
    return { value: wrapped.__oto_value, expired };
  }
  return { value: wrapped, expired: false };
}

function getValueAtPath(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
  ttl?: number,
): any {
  const fullKey = `${prefix}${rootKey}`;
  const storedValue = safeStorage.getItem(fullKey);
  if (storedValue === null) return undefined;

  try {
    let current = JSON.parse(storedValue);
    // Unwrap TTL if present and TTL is enabled
    if (ttl && ttl > 0) {
      const unwrapped = unwrapWithTTL(current);
      if (unwrapped.expired) {
        // Auto-delete expired key
        safeStorage.removeItem(fullKey);
        return undefined;
      }
      current = unwrapped.value;
    }
    
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  } catch {
    // Return raw string on parse error, consistent with root-level get trap
    return storedValue;
  }
}

function createNestedProxy(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
  defaultsAtRoot?: any,
  ttl?: number,
): any {
  return new Proxy({} as any, {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") {
        return (getValueAtPath(safeStorage, prefix, rootKey, path, ttl) as any)?.[
          prop
        ];
      }

      const current = getValueAtPath(safeStorage, prefix, rootKey, path, ttl);
      
      // Get defaults at this path level
      let defaultsAtPath: any;
      if (defaultsAtRoot !== undefined) {
        defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
      }

      // If no stored value and no defaults, return undefined
      if ((current === null || current === undefined) && !defaultsAtPath) {
        return undefined;
      }

      let value = current?.[prop];

      // Apply defaults at this path level
      if (defaultsAtPath && defaultsAtPath[prop] !== undefined) {
        value = deepMerge(defaultsAtPath[prop], value);
      }

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return createNestedProxy(safeStorage, prefix, rootKey, [...path, prop], defaultsAtRoot, ttl);
      }
      return value;
    },
    set(_target, prop: string, value: any) {
      const fullKey = `${prefix}${rootKey}`;
      const storedValue = safeStorage.getItem(fullKey);
      let rootObj: any = {};

      if (storedValue !== null) {
        try {
          let parsed = JSON.parse(storedValue);
          // Only unwrap TTL if TTL is enabled
          if (ttl && ttl > 0) {
            const unwrapped = unwrapWithTTL(parsed);
            rootObj = unwrapped.expired ? {} : unwrapped.value;
          } else {
            rootObj = parsed;
          }
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
        let valueToStore = rootObj;
        // Wrap with TTL if configured
        if (ttl && ttl > 0) {
          valueToStore = wrapWithTTL(rootObj, ttl);
        }
        safeStorage.setItem(fullKey, JSON.stringify(valueToStore));
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${rootKey}`, error);
        return true;
      }
    },
    ownKeys() {
      const current = getValueAtPath(safeStorage, prefix, rootKey, path, ttl);
      const keys = current ? Object.keys(current) : [];
      
      // Include keys from defaults at this path
      if (defaultsAtRoot !== undefined) {
        let defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
        if (defaultsAtPath && typeof defaultsAtPath === "object") {
          const defaultKeys = Object.keys(defaultsAtPath);
          for (const key of defaultKeys) {
            if (!keys.includes(key)) {
              keys.push(key);
            }
          }
        }
      }
      
      return keys;
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;
      const current = getValueAtPath(safeStorage, prefix, rootKey, path, ttl);
      
      // Get defaults at this path level
      let defaultsAtPath: any;
      if (defaultsAtRoot !== undefined) {
        defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
      }
      
      // Check if property exists in stored value or defaults
      const inCurrent = current && typeof current === "object" && prop in current;
      const inDefaults = defaultsAtPath && typeof defaultsAtPath === "object" && prop in defaultsAtPath;
      
      if (!inCurrent && !inDefaults) return undefined;
      
      let value = current?.[prop];

      // Apply defaults at this path level
      if (defaultsAtPath && defaultsAtPath[prop] !== undefined) {
        value = deepMerge(defaultsAtPath[prop], value);
      }

      const descriptorValue =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? createNestedProxy(safeStorage, prefix, rootKey, [...path, prop], defaultsAtRoot, ttl)
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
      const current = getValueAtPath(safeStorage, prefix, rootKey, path, ttl);
      
      // Check if property exists in stored value
      if (current && typeof current === "object" && prop in current) {
        return true;
      }
      
      // Check if property exists in defaults at this path
      if (defaultsAtRoot !== undefined) {
        let defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
        if (defaultsAtPath && typeof defaultsAtPath === "object" && prop in defaultsAtPath) {
          return true;
        }
      }
      
      return false;
    },
  });
}

export function oto<T extends object>(options: StorageOptions = {}): T {
  const { prefix = "", type = "local", defaults = {}, ttl } = options;
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
      const storedValue = safeStorage.getItem(`${prefix}${prop}`);
      let parsed: any;

      if (storedValue === null) {
        parsed = undefined;
      } else {
        try {
          parsed = JSON.parse(storedValue);
          // Check TTL wrapper only if TTL is enabled
          if (ttl && ttl > 0) {
            const unwrapped = unwrapWithTTL(parsed);
            if (unwrapped.expired) {
              // Auto-delete expired key
              safeStorage.removeItem(`${prefix}${prop}`);
              parsed = undefined;
            } else {
              parsed = unwrapped.value;
            }
          }
        } catch {
          parsed = storedValue;
        }
      }

      // Apply defaults
      if (defaults && defaults[prop] !== undefined) {
        parsed = deepMerge(defaults[prop], parsed);
      }

      if (parsed === undefined) return undefined;

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return createNestedProxy(safeStorage, prefix, prop, [], defaults[prop], ttl);
      }
      return parsed;
    },
    set(_target, prop: string, value: any) {
      try {
        let valueToStore = value;
        // Wrap with TTL if configured
        if (ttl && ttl > 0) {
          valueToStore = wrapWithTTL(value, ttl);
        }
        const stringValue = JSON.stringify(valueToStore);
        safeStorage.setItem(`${prefix}${prop}`, stringValue);
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${prop}`, error);
        return true;
      }
    },
    has(_target, prop: string) {
      // Check if key exists in storage
      if (safeStorage.getItem(`${prefix}${prop}`) !== null) {
        return true;
      }
      // Check if key exists in defaults
      if (defaults && prop in defaults) {
        return true;
      }
      return false;
    },
    deleteProperty(_target, prop: string) {
      const key = `${prefix}${String(prop)}`;
      safeStorage.removeItem(key);
      return true;
    },
  });
}

export const version = "0.3.3";
export type { StorageOptions };

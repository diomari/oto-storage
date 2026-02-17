# Migration

## Migrating existing data to encryption

If you already store plain JSON values and want to introduce encryption:

```ts
const storage = oto<{ profile: { name: string } }>({
  encryption: {
    encrypt,
    decrypt,
    migrate: true,
  },
});
```

With `migrate: true`, plain JSON values are upgraded to encrypted wrappers during read paths.

## Notes

- Invalid encrypted payloads are treated as unreadable and removed on access.
- If TTL is enabled, expiration is still enforced after decryption.

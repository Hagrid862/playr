/**
 * In-memory Redis double for playback integration tests.
 * Mirrors ioredis `keyPrefix: 'playr:playback:'` from RedisProvider.
 */
const KEY_PREFIX = 'playr:playback:';

function prefixedKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

type PendingOp = { kind: 'set'; key: string; value: string } | { kind: 'del'; key: string };

class FakePlaybackRedisDup {
  private readonly watchedKeys = new Set<string>();
  /** String value snapshot at watch() time (null = missing key). */
  private readonly watchSnapshots = new Map<string, string | null>();

  constructor(private readonly root: FakePlaybackRedis) {}

  async watch(key: string): Promise<'OK'> {
    const p = prefixedKey(key);
    this.watchedKeys.add(p);
    this.watchSnapshots.set(p, this.root.getStringRaw(p));
    return 'OK';
  }

  async unwatch(): Promise<'OK'> {
    this.watchedKeys.clear();
    this.watchSnapshots.clear();
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.root.getStringRaw(prefixedKey(key));
  }

  multi(): {
    set: (key: string, value: string) => { exec: () => Promise<[null, string][] | null> };
    del: (key: string) => { exec: () => Promise<[null, string][] | null> };
  } {
    return {
      set: (key: string, value: string) => {
        const ops: PendingOp[] = [{ kind: 'set', key: prefixedKey(key), value }];
        return {
          exec: () => this.execMulti(ops),
        };
      },
      del: (key: string) => {
        const ops: PendingOp[] = [{ kind: 'del', key: prefixedKey(key) }];
        return {
          exec: () => this.execMulti(ops),
        };
      },
    };
  }

  private async execMulti(ops: PendingOp[]): Promise<[null, string][] | null> {
    for (const p of this.watchedKeys) {
      const current = this.root.getStringRaw(p);
      const snap = this.watchSnapshots.get(p);
      if (current !== snap) {
        await this.unwatch();
        return null;
      }
    }

    for (const op of ops) {
      if (op.kind === 'set') {
        this.root.setStringRaw(op.key, op.value);
      } else {
        this.root.deleteStringRaw(op.key);
      }
    }

    this.watchedKeys.clear();
    this.watchSnapshots.clear();
    return [[null, 'OK']];
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }
}

export class FakePlaybackRedis {
  private readonly strings = new Map<string, string>();
  private readonly hashes = new Map<string, Map<string, string>>();

  /** Clear all data (call between tests for isolation). */
  reset(): void {
    this.strings.clear();
    this.hashes.clear();
  }

  /** Used by duplicate connections and direct get. */
  getStringRaw(prefixed: string): string | null {
    return this.strings.has(prefixed) ? this.strings.get(prefixed)! : null;
  }

  setStringRaw(prefixed: string, value: string): void {
    this.strings.set(prefixed, value);
  }

  /** Remove a string key by already-prefixed key (used by duplicate connection `MULTI`). */
  deleteStringRaw(prefixed: string): void {
    this.strings.delete(prefixed);
  }

  async del(key: string): Promise<number> {
    const p = prefixedKey(key);
    const existed = this.strings.has(p);
    this.strings.delete(p);
    return existed ? 1 : 0;
  }

  async get(key: string): Promise<string | null> {
    return this.getStringRaw(prefixedKey(key));
  }

  duplicate(): FakePlaybackRedisDup {
    return new FakePlaybackRedisDup(this);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const p = prefixedKey(key);
    if (!this.hashes.has(p)) {
      this.hashes.set(p, new Map());
    }
    this.hashes.get(p)!.set(field, value);
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    // The fake doesn't implement TTLs; we just acknowledge the call.
    void key;
    void seconds;
    return 1;
  }

  async hdel(key: string, field: string): Promise<number> {
    const p = prefixedKey(key);
    const h = this.hashes.get(p);
    if (!h) return 0;
    const existed = h.delete(field);
    return existed ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const p = prefixedKey(key);
    return this.hashes.get(p)?.get(field) ?? null;
  }

  async hvals(key: string): Promise<string[]> {
    const p = prefixedKey(key);
    const h = this.hashes.get(p);
    if (!h) return [];
    return [...h.values()];
  }
}

export function createFakePlaybackRedis(): FakePlaybackRedis {
  return new FakePlaybackRedis();
}

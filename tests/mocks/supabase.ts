import { vi } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────

interface MockQueryResult {
  data: unknown;
  error: unknown;
  count: number | null;
}

// ─── State ────────────────────────────────────────────────────────────

let _queryResult: MockQueryResult = { data: null, error: null, count: null };
let _singleResult: MockQueryResult = { data: null, error: null, count: null };
let _rpcResult: MockQueryResult = { data: null, error: null, count: null };
let _authUser: { id: string; email: string } | null = { id: "user-1", email: "test@example.com" };
let _functionsResult: { data: unknown; error: unknown } = { data: null, error: null };

// ─── Helpers to set mock returns ──────────────────────────────────────

export function mockSupabaseQuery(data: unknown, error: unknown = null, count: number | null = null) {
  _queryResult = { data, error, count };
}

export function mockSupabaseSingle(data: unknown, error: unknown = null) {
  _singleResult = { data, error, count: null };
}

export function mockSupabaseRpc(data: unknown, error: unknown = null) {
  _rpcResult = { data, error, count: null };
}

export function mockSupabaseAuth(user: { id: string; email: string } | null) {
  _authUser = user;
}

export function mockSupabaseFunctions(data: unknown, error: unknown = null) {
  _functionsResult = { data, error };
}

export function resetSupabaseMocks() {
  _queryResult = { data: null, error: null, count: null };
  _singleResult = { data: null, error: null, count: null };
  _rpcResult = { data: null, error: null, count: null };
  _authUser = { id: "user-1", email: "test@example.com" };
  _functionsResult = { data: null, error: null };
}

// ─── Chainable query builder ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueryBuilder(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};

  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not",
    "like", "ilike",
    "or", "and",
    "order", "limit", "range", "offset",
    "filter", "match", "contains", "containedBy",
    "textSearch",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn((..._args: unknown[]) => builder);
  }

  // Terminal methods
  builder.single = vi.fn(() => Promise.resolve({
    data: _singleResult.data ?? _queryResult.data,
    error: _singleResult.error ?? _queryResult.error,
  }));

  builder.maybeSingle = vi.fn(() => Promise.resolve({
    data: _singleResult.data ?? _queryResult.data,
    error: _singleResult.error ?? _queryResult.error,
  }));

  // Make the builder itself thenable (for queries without .single())
  builder.then = vi.fn((resolve: (value: unknown) => void) => {
    return resolve({
      data: _queryResult.data,
      error: _queryResult.error,
      count: _queryResult.count,
    });
  });

  return builder;
}

// ─── Mock Supabase Client ─────────────────────────────────────────────

export const supabase = {
  from: vi.fn((_table: string) => createQueryBuilder()),

  rpc: vi.fn((_fn: string, _params?: unknown) => Promise.resolve({
    data: _rpcResult.data,
    error: _rpcResult.error,
  })),

  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: _authUser },
      error: null,
    })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },

  functions: {
    invoke: vi.fn((_name: string, _opts?: unknown) => Promise.resolve({
      data: _functionsResult.data,
      error: _functionsResult.error,
    })),
  },
};

// ─── Auto-mock the supabase module ───────────────────────────────────

vi.mock("@shared/lib/supabase", () => ({
  supabase,
}));

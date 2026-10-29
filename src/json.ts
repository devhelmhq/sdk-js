/**
 * JSON value types used wherever the API returns a free-form map
 * (`details`, event payloads). Public types never expose `any` or
 * `unknown`; a free-form value is a {@link JsonValue}.
 */

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue}
export type JsonObject = {[key: string]: JsonValue}

type IndexKey<K> = string extends K ? true : number extends K ? true : false

/**
 * Maps a decoded wire type to its public shape:
 *   - `unknown` / `any` (free-form JSON from the spec) → {@link JsonValue}
 *   - the open index signature a tolerant decoder adds to an object with
 *     known fields is dropped (extra keys still decode at runtime; they are
 *     just not part of the typed contract)
 *   - a pure map (`Record<string, V>`) keeps its index signature
 *
 * Optional and readonly modifiers are preserved.
 */
export type Wire<T> = unknown extends T
  ? JsonValue
  : T extends JsonPrimitive | undefined
    ? T
    : T extends ReadonlyArray<infer U>
      ? Array<Wire<U>>
      : T extends object
        ? HasKnownKeys<T> extends true
          ? {[K in keyof T as IndexKey<K> extends true ? never : K]: Wire<T[K]>}
          : {[key: string]: Wire<T[keyof T]>}
        : T

type RemoveIndex<T> = {[K in keyof T as IndexKey<K> extends true ? never : K]: T[K]}
type HasKnownKeys<T> = [keyof RemoveIndex<T>] extends [never] ? false : true

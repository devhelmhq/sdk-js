/**
 * Minimal zip writer (stored entries, no compression) for bundles that hold
 * binary files: `POST /api/v1/bundles` accepts `application/zip`, while its
 * JSON form carries UTF-8 text only. Entries are written in path order with
 * a fixed timestamp, so the same files always give the same bytes.
 */
import type {BundleFiles} from './digest.js'
import {compareUtf8, contentBytes, utf8} from './digest.js'

let crcTable: Uint32Array | undefined

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of bytes) crc = (crcTable[(crc ^ b) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// 1980-01-01 00:00 in DOS date/time.
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1
const UTF8_FLAG = 0x0800

/** Zip the files (stored). */
export function zipBundle(files: BundleFiles): Uint8Array {
  const paths = Object.keys(files).sort(compareUtf8)
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const path of paths) {
    const name = utf8(path)
    const data = contentBytes(files[path] ?? '')
    const crc = crc32(data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, UTF8_FLAG, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, (3 << 8) | 20, true) // made by: UNIX, v2.0
    cv.setUint16(6, 20, true)
    cv.setUint16(8, UTF8_FLAG, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, (0o100644 << 16) >>> 0, true) // regular file, rw-r--r--
    cv.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local, data)
    centrals.push(central)
    offset += local.length + data.length
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, paths.length, true)
  ev.setUint16(10, paths.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + end.length)
  let at = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at)
    at += part.length
  }
  return out
}

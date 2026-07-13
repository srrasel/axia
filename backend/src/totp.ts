import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import QRCode from 'qrcode'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(bytes = 20) {
  const buf = randomBytes(bytes)
  let bits = 0
  let value = 0
  let output = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(secret: string) {
  const cleaned = secret.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const c of cleaned) {
    const idx = BASE32.indexOf(c)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function hotp(secret: Buffer, counter: number, digits = 6) {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 10 ** digits).padStart(digits, '0')
}

export function verifyTotp(secret: string, token: string, window = 1) {
  const clean = String(token || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  const key = base32Decode(secret)
  const timestep = Math.floor(Date.now() / 1000 / 30)
  for (let w = -window; w <= window; w++) {
    const expected = hotp(key, timestep + w)
    const a = Buffer.from(expected)
    const b = Buffer.from(clean)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

export function totpAuthUrl(secret: string, email: string, issuer = 'NitajFX') {
  const label = encodeURIComponent(`${issuer}:${email}`)
  const iss = encodeURIComponent(issuer)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`
}

export async function totpQrDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 220,
    color: { dark: '#111111', light: '#ffffff' },
  })
}

# M23: Encryption UX — QR Code Share + Key Fingerprint

## What was done

### 1. QR code sharing (`src/components/QRCode.tsx`)
- New component that renders an encrypted URL as a QR code via the `qrcode` library
- White-on-transparent color scheme for dark theme
- Used on the Room page below the share link card when sender

### 2. Key fingerprint (`src/pages/Room.tsx:14-21`)
- Extracts the AES-GCM key from the URL hash fragment
- Converts the base64 key to hex and displays the first 16 hex chars as `XXXX XXXX XXXX XXXX`
- Both sender and receiver can verbally confirm the fingerprint matches
- Added `select-all` CSS class for easy copying

### 3. Bug fix — Copy link now includes encryption key
- `copyRoomLink` was writing `${origin}/room/${roomId}` without the hash fragment
- This meant the receiver would not get the encryption key
- Fixed: now appends `window.location.hash` to the copied URL

### Test results
- **150 tests pass** (21 + 33 + 96), all typechecks pass

## Files Modified / Created
- `packages/client/src/components/QRCode.tsx` — **new**, QR code canvas component
- `packages/client/src/pages/Room.tsx` — QR code display, key fingerprint, fixed copy link
- `packages/client/package.json` — added `qrcode` dependency

## Dependencies Added
- `qrcode` (runtime) — QR code generation to canvas
- `@types/qrcode` (dev) — TypeScript declarations

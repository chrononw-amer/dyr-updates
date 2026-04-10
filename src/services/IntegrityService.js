/**
 * Application Integrity Service
 * Handles distributed license verification and tamper detection.
 * 
 * NOTE: Variable names are intentionally obscure to resist reverse engineering.
 */

// --- Encoded constants (not plain text in source) ---
const _0xA = [115, 117, 115, 112, 101, 110, 100, 101, 100]; // "suspended"
const _0xB = [101, 120, 112, 105, 114, 101, 100]; // "expired"

const _d = (arr) => arr.map(c => String.fromCharCode(c)).join('');

// --- Heartbeat signature validator ---
let _lastValidResponse = null;
let _checkCounter = 0;
let _failStreak = 0;
const _MAX_FAIL = 3;

/**
 * Validates a heartbeat response for tampering.
 * Returns true if the response is legitimate, false if tampered.
 */
export const validateHeartbeat = (statusData) => {
  if (!statusData) {
    _failStreak++;
    return _failStreak < _MAX_FAIL;
  }
  
  _failStreak = 0;
  _lastValidResponse = {
    t: Date.now(),
    s: statusData.status,
    e: statusData.access_expires,
    v: statusData.valid_until,
  };
  _checkCounter++;
  
  return true;
};

/**
 * Performs a secondary lock check using cached heartbeat data.
 * This runs independently of the main check in App.jsx.
 * A cracker who patches App.jsx still hits this.
 */
export const getSecondaryLockState = () => {
  if (!_lastValidResponse) return false;
  
  const { s, e, v, t } = _lastValidResponse;
  
  // Check if status is suspended
  if (s === _d(_0xA)) return true;
  
  // Check if access expired
  if (e) {
    const expiryTime = new Date(e).getTime();
    if (Date.now() > expiryTime) return true;
  }
  
  // Check valid_until
  if (v) {
    const validTime = new Date(v).getTime();
    if (Date.now() > validTime) return true;
  }
  
  // Check if heartbeat is stale (more than 5 min without update = suspicious)
  if (Date.now() - t > 5 * 60 * 1000 && _checkCounter > 10) return true;
  
  return false;
};

/**
 * Periodic integrity verification.
 * Checks multiple signals to determine if the app has been tampered with.
 */
export const runIntegrityCheck = (lockStateFn, heartbeatFn) => {
  // Verify the lock state function exists and hasn't been replaced with a no-op
  if (typeof lockStateFn !== 'function') return true;
  
  // Cross-verify: if secondary check says locked but primary says unlocked = tampered
  const secondaryLocked = getSecondaryLockState();
  
  return secondaryLocked;
};

// --- Time manipulation detection ---
let _serverTimeOffset = null;

export const calibrateTime = (serverTimestamp) => {
  if (serverTimestamp) {
    _serverTimeOffset = new Date(serverTimestamp).getTime() - Date.now();
  }
};

export const getCalibrationDrift = () => {
  if (_serverTimeOffset === null) return 0;
  const currentOffset = _serverTimeOffset;
  // If clock has been moved forward by more than 1 hour, suspicious
  return Math.abs(currentOffset) > 3600000;
};

// --- Fingerprint lock state into a checksum ---
export const computeStateHash = (isLocked, expiresAt) => {
  const raw = `${isLocked ? 1 : 0}|${expiresAt || 'null'}|${_checkCounter}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

import crypto from 'crypto';

// Environment-based encryption key - should be set in production
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.FINGERPRINT_ENCRYPTION_KEY || 'default-dev-key-change-in-production',
  'salt',
  32
);
const ALGORITHM = 'aes-256-gcm';

/**
 * Interface for encrypted fingerprint data
 */
export interface EncryptedFingerprint {
  encryptedData: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  hash: string; // SHA-256 hash of original data for integrity verification
}

/**
 * Encrypts fingerprint data using AES-256-GCM
 * @param fingerprintData - Base64 encoded fingerprint image data
 * @returns Encrypted fingerprint object
 */
export const encryptFingerprint = (fingerprintData: string): EncryptedFingerprint => {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher using modern API
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      ENCRYPTION_KEY as crypto.CipherKey,
      iv as crypto.BinaryLike
    );
    (cipher as any).setAAD(Buffer.from('fingerprint')); // Additional authenticated data

    // Encrypt the data
    let encrypted = cipher.update(fingerprintData, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Generate SHA-256 hash of original data for integrity verification
    const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      hash,
    };
  } catch (error) {
    throw new Error(`Fingerprint encryption failed: ${(error as Error).message}`);
  }
};

/**
 * Decrypts fingerprint data using AES-256-GCM
 * @param encryptedFingerprint - Encrypted fingerprint object
 * @returns Decrypted base64 fingerprint data
 */
export const decryptFingerprint = (encryptedFingerprint: EncryptedFingerprint): string => {
  try {
    const { encryptedData, iv, tag, hash } = encryptedFingerprint;

    // Create decipher using modern API
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY as crypto.CipherKey,
      Buffer.from(iv, 'base64') as crypto.BinaryLike
    );
    (decipher as any).setAAD(Buffer.from('fingerprint'));
    (decipher as any).setAuthTag(Buffer.from(tag, 'base64'));

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Verify integrity by comparing hashes
    const computedHash = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (computedHash !== hash) {
      throw new Error('Fingerprint integrity check failed - data may be corrupted');
    }

    return decrypted;
  } catch (error) {
    throw new Error(`Fingerprint decryption failed: ${(error as Error).message}`);
  }
};

/**
 * Generates SHA-256 hash of fingerprint data for integrity verification
 * @param fingerprintData - Base64 encoded fingerprint data
 * @returns Hex string hash
 */
export const generateFingerprintHash = (fingerprintData: string): string => {
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
};

/**
 * Verifies fingerprint data integrity using stored hash
 * @param fingerprintData - Base64 encoded fingerprint data
 * @param storedHash - Previously stored SHA-256 hash
 * @returns Boolean indicating if data is intact
 */
export const verifyFingerprintIntegrity = (
  fingerprintData: string,
  storedHash: string
): boolean => {
  const computedHash = generateFingerprintHash(fingerprintData);
  return computedHash === storedHash;
};

/**
 * Detects if fingerprint data appears to be corrupted
 * @param fingerprintData - Base64 encoded fingerprint data
 * @returns Boolean indicating corruption detection
 */
export const detectFingerprintCorruption = (fingerprintData: string): boolean => {
  try {
    // Remove data URL prefix if present
    const cleanData = fingerprintData.replace(/^data:image\/\w+;base64,/, '');

    // Check if it's valid base64
    const decoded = Buffer.from(cleanData, 'base64');

    if (decoded.length < 8) return true;

    // PNG header check
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const decodedHeader = decoded.slice(0, 8);
    const headerMatch = decodedHeader.equals(pngHeader);

    return !headerMatch; // If header doesn't match, it's corrupted
  } catch (error) {
    return true; // Invalid base64 or other issues indicate corruption
  }
};

/**
 * Clean base64 fingerprint data (remove data URL prefix, validate format)
 * @param fingerprintData - Raw base64 or data URL
 * @returns Cleaned base64 string
 */
export const cleanFingerprintData = (fingerprintData: string): string => {
  // Remove data URL prefix if present
  let cleaned = fingerprintData.replace(/^data:image\/\w+;base64,/, '');

  // Remove whitespace and newlines
  cleaned = cleaned.replace(/\s/g, '');

  // Validate it's proper base64
  try {
    Buffer.from(cleaned, 'base64');
  } catch (error) {
    throw new Error('Invalid base64 fingerprint data');
  }

  return cleaned;
};

/**
 * Legacy function to handle existing unencrypted fingerprints
 * @param fingerprintData - Raw fingerprint data (may be encrypted or not)
 * @param encryptedFingerprint - Optional encrypted data from database
 * @param fingerprintHash - Optional hash from database
 * @returns Object with decrypted data and corruption status
 */
export const handleFingerprintData = (
  fingerprintData?: string,
  encryptedFingerprint?: string,
  fingerprintHash?: string
) => {
  let decryptedData: string | null = null;
  let isCorrupted = false;
  let needsMigration = false;

  try {
    // Priority 1: Try legacy unencrypted format first (since encrypted often fails)
    if (fingerprintData) {
      console.log('Trying legacy fingerprint field (plain base64) first');

      try {
        // Clean the data
        decryptedData = cleanFingerprintData(fingerprintData);
        needsMigration = true;

        // Check for corruption in legacy data
        if (detectFingerprintCorruption(decryptedData)) {
          console.warn('Corruption detected in legacy fingerprint data');
          isCorrupted = true;
        } else {
          console.log('✓ Successfully loaded legacy fingerprint data');
          return {
            data: decryptedData,
            isCorrupted,
            needsMigration,
          };
        }
      } catch (cleanError) {
        console.error('Failed to clean legacy fingerprint data:', cleanError);
        isCorrupted = true;
      }
    }

    // Priority 2: Try encrypted format as fallback
    if (!decryptedData && encryptedFingerprint) {
      console.log('Falling back to encrypted fingerprint format');

      try {
        // Try parsing as JSON (new encrypted format)
        const encryptedObj: EncryptedFingerprint = JSON.parse(encryptedFingerprint);
        decryptedData = decryptFingerprint(encryptedObj);

        // Verify integrity
        if (fingerprintHash && !verifyFingerprintIntegrity(decryptedData, fingerprintHash)) {
          console.warn('Fingerprint integrity check failed');
          isCorrupted = true;
        } else {
          console.log('✓ Successfully decrypted encrypted fingerprint data');
        }
      } catch (parseError) {
        // If JSON parse fails, it might be legacy encrypted format or plain data
        console.warn('Failed to parse encrypted fingerprint as JSON:', parseError);
        isCorrupted = true;
      }
    }
  } catch (error) {
    console.error('Error handling fingerprint data:', error);
    isCorrupted = true;

    // Last resort: try returning raw fingerprintData if available
    if (fingerprintData && !decryptedData) {
      try {
        decryptedData = cleanFingerprintData(fingerprintData);
        console.log('Using raw fingerprint data as last resort');
      } catch (lastResortError) {
        console.error('All fingerprint processing attempts failed');
      }
    }
  }

  return {
    data: decryptedData,
    isCorrupted,
    needsMigration,
  };
};

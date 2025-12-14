/**
 * Camera helper utilities for browser compatibility and debugging
 */

export interface CameraInfo {
  isSupported: boolean;
  hasGetUserMedia: boolean;
  browserName: string;
  isSecureContext: boolean;
  userAgent: string;
  hostname: string;
}

/**
 * Get comprehensive camera compatibility information
 */
export const getCameraInfo = (): CameraInfo => {
  const browserName = getBrowserName();
  
  return {
    isSupported: !!navigator.mediaDevices,
    hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
    browserName,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    hostname: window.location.hostname
  };
};

/**
 * Detect browser name from user agent
 */
export const getBrowserName = (): string => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari')) {
    return 'Safari';
  } else if (userAgent.includes('Edge')) {
    return 'Edge';
  } else if (userAgent.includes('Opera')) {
    return 'Opera';
  } else {
    return 'Unknown';
  }
};

/**
 * Check if camera functionality should work in the current environment
 */
export const isCameraEnvironmentSupported = (): boolean => {
  const cameraInfo = getCameraInfo();
  
  // Must have MediaDevices API and getUserMedia
  if (!cameraInfo.isSupported || !cameraInfo.hasGetUserMedia) {
    return false;
  }
  
  // Check if we're in a secure context (HTTPS or localhost)
  if (!cameraInfo.isSecureContext && !['localhost', '127.0.0.1'].includes(cameraInfo.hostname)) {
    return false;
  }
  
  return true;
};

/**
 * Get user-friendly error message for camera issues
 */
export const getCameraErrorMessage = (error?: Error): string => {
  if (!error) {
    return 'Camera access failed for an unknown reason.';
  }
  
  const { name, message } = error;
  
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission was denied. Please allow camera access and refresh the page.';
      
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found. Please ensure your camera is connected and not being used by another application.';
      
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is being used by another application. Please close other apps using the camera.';
      
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Camera does not support the required video settings. Trying with basic settings...';
      
    case 'NotSupportedError':
      return 'Camera is not supported in this browser. Please try a different browser.';
      
    case 'AbortError':
      return 'Camera access was interrupted. Please try again.';
      
    default:
      if (message?.includes('MediaDevices') || message?.includes('mediaDevices')) {
        return 'Camera API not available. This may be due to browser security restrictions, testing environment limitations, or an outdated browser.';
      } else if (message?.includes('secure')) {
        return 'Camera access requires a secure connection (HTTPS). Please use a secure URL.';
      } else {
        return `Camera error: ${message}`;
      }
  }
};

/**
 * Test camera permissions and capabilities
 */
export const testCameraPermissions = async (): Promise<{
  hasPermission: boolean;
  deviceCount: number;
  error?: string;
}> => {
  try {
    // First check if the API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API not supported');
    }
    
    // Try to enumerate devices to check permissions
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Try to get a basic stream to test permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => track.stop()); // Clean up immediately
      
      return {
        hasPermission: true,
        deviceCount: videoDevices.length
      };
    } catch (permError: any) {
      if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
        return {
          hasPermission: false,
          deviceCount: videoDevices.length,
          error: 'Camera permission denied'
        };
      } else {
        throw permError;
      }
    }
  } catch (error: any) {
    return {
      hasPermission: false,
      deviceCount: 0,
      error: error.message || 'Camera test failed'
    };
  }
};
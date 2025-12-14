import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { Camera, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Add a small delay to ensure the video element is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Additional useEffect to handle video element availability
  useEffect(() => {
    if (isOpen && videoRef.current && stream && !videoReady) {
      console.log('🎥 [DEBUG] Video element and stream both available, assigning stream...');
      assignStreamToVideo();
    }
  }, [isOpen, videoRef.current, stream, videoReady]);

  const startCamera = async () => {
    setIsLoading(true);
    setError('');

    console.log('🎥 [DEBUG] Starting camera initialization...');
    console.log('🎥 [DEBUG] navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('🎥 [DEBUG] navigator.mediaDevices.getUserMedia:', !!navigator.mediaDevices?.getUserMedia);

    try {
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ [DEBUG] Camera API not supported');
        throw new Error('Camera API not supported in this browser');
      }

      console.log('🎥 [DEBUG] Camera API supported, requesting stream...');

      // Use constraints that match the working webcamtest.com (1280x720)
      let mediaStream;
      try {
        console.log('🎥 [DEBUG] Trying with HD constraints (1280x720)...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30, min: 10 }
          },
          audio: false,
        });
        console.log('✅ [DEBUG] HD constraints successful');
      } catch (hdError) {
        console.log('⚠️ [DEBUG] HD constraints failed, trying basic video:true...', hdError);
        // Fallback to basic constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        console.log('✅ [DEBUG] Basic constraints successful');
      }

      console.log('🎥 [DEBUG] Stream obtained:', mediaStream);
      console.log('🎥 [DEBUG] Stream tracks:', mediaStream.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        readyState: track.readyState
      })));

      setStream(mediaStream);
      setHasPermission(true);
      console.log('✅ [DEBUG] Stream obtained and set successfully');
      console.log('✅ [DEBUG] hasPermission = true');

      // The assignStreamToVideo function will be called by the useEffect when videoRef.current is available
    } catch (err: any) {
      console.error('❌ [DEBUG] Camera initialization failed:', err);
      console.error('❌ [DEBUG] Error name:', err.name);
      console.error('❌ [DEBUG] Error message:', err.message);
      console.error('❌ [DEBUG] Error stack:', err.stack);

      setHasPermission(false);

      let errorMessage = 'Failed to access camera. ';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions in your browser and try again. You may need to refresh the page after granting permission.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found. Please ensure your camera is connected and not being used by another application.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is being used by another application. Please close other apps using the camera and try again.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera constraints not satisfied. Trying with basic settings...';
        // Retry with basic constraints
        setTimeout(() => startCamera(), 1000);
        return;
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser or context.';
      } else if (err.message?.includes('secure')) {
        errorMessage += 'Camera requires HTTPS. Please use a secure connection.';
      } else {
        errorMessage += 'Please check your camera and browser permissions.';
      }

      console.error('❌ [DEBUG] Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('🎥 [DEBUG] Stream acquisition complete, setting isLoading = false');
      setIsLoading(false);
    }
  };

  const assignStreamToVideo = () => {
    console.log('🎥 [DEBUG] assignStreamToVideo called');
    console.log('🎥 [DEBUG] videoRef.current:', !!videoRef.current);
    console.log('🎥 [DEBUG] stream:', !!stream);
    console.log('🎥 [DEBUG] stream.active:', stream?.active);

    if (videoRef.current && stream && stream.active) {
      console.log('🎥 [DEBUG] Assigning stream to video element...');
      videoRef.current.srcObject = stream;

      // Set up comprehensive video event listeners for debugging
      videoRef.current.onloadstart = () => {
        console.log('📹 [DEBUG] Video: loadstart event');
      };

      videoRef.current.onloadedmetadata = () => {
        console.log('📹 [DEBUG] Video: loadedmetadata event');
        console.log('📹 [DEBUG] Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        console.log('📹 [DEBUG] Video ready state:', videoRef.current?.readyState);
      };

      videoRef.current.onloadeddata = () => {
        console.log('📹 [DEBUG] Video: loadeddata event');
      };

      videoRef.current.oncanplay = () => {
        console.log('📹 [DEBUG] Video: canplay event');
      };

      videoRef.current.oncanplaythrough = () => {
        console.log('📹 [DEBUG] Video: canplaythrough event');
        console.log('📹 [DEBUG] Setting videoReady = true');
        setVideoReady(true);
      };

      videoRef.current.onplay = () => {
        console.log('📹 [DEBUG] Video: play event');
        setVideoReady(true);
      };

      videoRef.current.onplaying = () => {
        console.log('📹 [DEBUG] Video: playing event');
        console.log('📹 [DEBUG] Video is now playing successfully!');
      };

      videoRef.current.onerror = (e) => {
        console.error('📹 [DEBUG] Video: error event:', e);
        console.error('📹 [DEBUG] Video error details:', videoRef.current?.error);
      };

      videoRef.current.onpause = () => {
        console.log('📹 [DEBUG] Video: pause event');
      };

      // Try to start playing immediately with detailed error handling
      console.log('🎥 [DEBUG] Attempting to start video playback...');
      try {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('✅ [DEBUG] Video play() promise resolved successfully');
          }).catch((playError) => {
            console.error('❌ [DEBUG] Video play() promise rejected:', playError);
            console.error('❌ [DEBUG] Error name:', playError.name);
            console.error('❌ [DEBUG] Error message:', playError.message);
          });
        }
      } catch (immediateError) {
        console.error('❌ [DEBUG] Immediate video play error:', immediateError);
      }
    } else {
      console.log('⚠️ [DEBUG] Cannot assign stream - conditions not met');
      console.log('🎥 [DEBUG] videoRef.current:', !!videoRef.current);
      console.log('🎥 [DEBUG] stream:', !!stream);
      console.log('🎥 [DEBUG] stream.active:', stream?.active);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(imageData);
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={{ base: "full", md: "4xl", lg: "5xl" }}
      isCentered
      motionPreset="scale"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        maxW={{ base: "100vw", sm: "90vw", md: "800px", lg: "900px" }}
        maxH={{ base: "100vh", sm: "90vh", md: "600px", lg: "700px" }}
        mx={{ base: 0, sm: 4, md: 6 }}
        my={{ base: 0, sm: 4, md: 8 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <ModalHeader>
          <HStack spacing={2} flexWrap="wrap">
            <Camera size={20} />
            <Text>Take Profile Photo</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody
          flex={1}
          overflowY="auto"
          display="flex"
          flexDirection="column"
        >
          <VStack spacing={{ base: 3, md: 4 }} flex={1}>
            {isLoading && (
              <Center w="100%" h={{ base: "200px", md: "300px" }}>
                <VStack spacing={4}>
                  <Spinner size={{ base: "lg", md: "xl" }} color="blue.500" />
                  <Text fontSize={{ base: "sm", md: "md" }}>Starting camera...</Text>
                </VStack>
              </Center>
            )}

            {error && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Camera Error</Text>
                  <Text fontSize="sm">{error}</Text>
                </Box>
              </Alert>
            )}

            {hasPermission && !isLoading && !error && (
              <VStack spacing={{ base: 3, md: 4 }} w="100%">
                <Box
                  position="relative"
                  borderRadius="lg"
                  overflow="hidden"
                  border="2px solid"
                  borderColor={videoReady ? "green.200" : "gray.200"}
                  w="100%"
                  maxW={{ base: "350px", sm: "450px", md: "600px" }}
                  maxH={{ base: "250px", sm: "300px", md: "350px" }}
                  aspectRatio={{ base: "4/3", md: "3/2" }}
                  bg="black"
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      backgroundColor: '#000',
                    }}
                  />

                  {/* Status indicator */}
                  <Box
                    position="absolute"
                    top={{ base: "8px", md: "10px" }}
                    right={{ base: "8px", md: "10px" }}
                    bg={videoReady ? "green.500" : hasPermission ? "orange.500" : "red.500"}
                    color="white"
                    px={{ base: 1.5, md: 2 }}
                    py={1}
                    borderRadius="md"
                    fontSize={{ base: "xs", md: "xs" }}
                    zIndex={1}
                  >
                    {videoReady ? "LIVE" : hasPermission ? "LOADING..." : "ERROR"}
                  </Box>

                  {/* Circular overlay guide */}
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    w={{ base: "120px", md: "200px" }}
                    h={{ base: "120px", md: "200px" }}
                    border="2px solid"
                    borderColor="white"
                    borderRadius="full"
                    pointerEvents="none"
                    opacity={0.8}
                    zIndex={1}
                  />

                  {/* Positioning guide text */}
                  <Text
                    position="absolute"
                    bottom={{ base: "8px", md: "10px" }}
                    left="50%"
                    transform="translateX(-50%)"
                    bg="blackAlpha.700"
                    color="white"
                    px={{ base: 2, md: 3 }}
                    py={1}
                    borderRadius="md"
                    fontSize={{ base: "xs", md: "sm" }}
                    zIndex={1}
                  >
                    Position your face in the circle
                  </Text>
                </Box>

                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" textAlign="center">
                  Make sure you're in good lighting and position your face within the circle for the best result.
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  {typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && (
                    <>
                      ✓ Camera API supported
                    </>
                  )}
                  {videoReady && (
                    <>
                      <br />
                      ✓ Video stream active
                    </>
                  )}
                  {!videoReady && hasPermission && (
                    <>
                      <br />
                      ⚠ Video stream not ready - check camera permissions
                    </>
                  )}
                </Text>
              </VStack>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </VStack>
        </ModalBody>

        <ModalFooter
          flexDir={{ base: "column", md: "row" }}
          gap={{ base: 2, md: 3 }}
          borderTop="1px solid"
          borderColor="gray.200"
          pt={4}
          mt={2}
          flexShrink={0}
          position="sticky"
          bottom={0}
          bg="white"
          zIndex={1}
        >
          {/* Debug Info for Development - Hidden on mobile */}
          <Box
            mb={{ base: 0, md: 4 }}
            p={3}
            bg="gray.50"
            borderRadius="md"
            fontSize="xs"
            display={{ base: "none", md: "block" }}
            w="100%"
            flexShrink={0}
          >
            <Text fontWeight="bold" mb={2}>🔍 Debug Information:</Text>
            <Text>Camera Permission: {hasPermission === null ? 'Unknown' : hasPermission ? 'Granted' : 'Denied'}</Text>
            <Text>Video Ready: {videoReady ? 'Yes' : 'No'}</Text>
            <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
            <Text>Has Error: {error ? 'Yes' : 'No'}</Text>
            <Text fontSize="xs" color="gray.600" mt={1}>
              Check browser console (F12) for detailed debug logs
            </Text>
          </Box>

          <HStack spacing={3} flexWrap="wrap" justify="center">
            <Button
              variant="ghost"
              onClick={handleClose}
              size={{ base: "sm", md: "md" }}
            >
              Cancel
            </Button>
            {hasPermission && !isLoading && !error && videoReady && (
              <Button
                leftIcon={<Camera />}
                colorScheme="blue"
                onClick={capturePhoto}
                size={{ base: "sm", md: "lg" }}
              >
                Capture Photo
              </Button>
            )}
            {hasPermission && !isLoading && !error && !videoReady && (
              <Button
                leftIcon={<Camera />}
                colorScheme="gray"
                size={{ base: "sm", md: "lg" }}
                isDisabled
              >
                Loading Camera...
              </Button>
            )}
            {error && (
              <Button
                leftIcon={<RotateCcw />}
                colorScheme="blue"
                onClick={startCamera}
                isLoading={isLoading}
                size={{ base: "sm", md: "lg" }}
              >
                Try Again
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CameraCaptureModal;

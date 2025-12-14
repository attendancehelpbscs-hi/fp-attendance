import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
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
  Stack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Center,
  Image,
} from '@chakra-ui/react';
import { Crop, RotateCw, Check, X } from 'lucide-react';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageData: string) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = document.createElement('img');
      image.crossOrigin = 'anonymous';
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error: any) => reject(error));
      image.src = url;
    });

  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
  };

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = getRadianAngle(rotation);

    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not found');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not found');

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) throw new Error('2D context not found');

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image onto the new canvas
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return croppedCanvas.toDataURL('image/jpeg', 0.8);
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImageData = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImageData);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size={{ base: "full", md: "4xl", lg: "5xl" }}
        isCentered
        motionPreset="scale"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent
          maxW={{ base: "100vw", sm: "90vw", md: "900px", lg: "1000px" }}
          maxH={{ base: "100vh", sm: "90vh", md: "700px", lg: "800px" }}
          mx={{ base: 0, sm: 4, md: 6 }}
          my={{ base: 0, sm: 4, md: 8 }}
        >
          <ModalHeader>
            <HStack spacing={2} flexWrap="wrap">
              <Crop size={20} />
              <Text>Crop Profile Photo</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={{ base: 4, md: 8 }} alignItems={{ base: "center", md: "flex-start" }} w="100%">
              {/* Crop Area */}
              <Box
                position="relative"
                width="100%"
                flex={1}
                maxWidth={{ base: "300px", sm: "400px", md: "500px" }}
                height={{ base: "300px", sm: "400px", md: "400px", lg: "500px" }}
                borderRadius="lg"
                overflow="hidden"
                border="2px solid"
                borderColor="gray.200"
                mx="auto"
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1} // 1:1 aspect ratio for circular crop
                  onCropChange={onCropChange}
                  onZoomChange={onZoomChange}
                  onCropComplete={onCropCompleteChange}
                  cropShape="round" // This creates circular crop area
                  showGrid={false}
                  style={{
                    containerStyle: {
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f0f0f0',
                    },
                  }}
                />
              </Box>

              {/* Controls */}
              <VStack spacing={{ base: 4, md: 6 }} width="100%" maxW={{ base: "100%", md: "350px" }} flexShrink={0}>
                {/* Zoom Control */}
                <Box width="100%">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize={{ base: "sm", md: "sm" }} fontWeight="medium">
                      Zoom
                    </Text>
                    <Text fontSize={{ base: "sm", md: "sm" }} color="gray.600">
                      {Math.round(zoom * 100)}%
                    </Text>
                  </HStack>
                  <Slider
                    aria-label="zoom-slider"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={setZoom}
                    size={{ base: "sm", md: "md" }}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>

                {/* Rotation Control */}
                <Box width="100%">
                  <HStack justify="space-between" mb={2}>
                    <HStack spacing={1}>
                      <RotateCw size={16} />
                      <Text fontSize={{ base: "sm", md: "sm" }} fontWeight="medium">
                        Rotation
                      </Text>
                    </HStack>
                    <Text fontSize={{ base: "sm", md: "sm" }} color="gray.600">
                      {rotation}°
                    </Text>
                  </HStack>
                  <Slider
                    aria-label="rotation-slider"
                    value={rotation}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={setRotation}
                    size={{ base: "sm", md: "md" }}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>

                {/* Quick Actions */}
                <HStack spacing={4} width="100%" justify="center" flexWrap="wrap">
                  <Button
                    size={{ base: "xs", md: "sm" }}
                    variant="outline"
                    onClick={() => setZoom(1)}
                  >
                    Reset Zoom
                  </Button>
                  <Button
                    size={{ base: "xs", md: "sm" }}
                    variant="outline"
                    onClick={() => setRotation(0)}
                  >
                    Reset Rotation
                  </Button>
                </HStack>

              </VStack>
            </Stack>
          </ModalBody>

          <ModalFooter flexDir={{ base: "column", md: "row" }} gap={{ base: 2, md: 3 }}>
            <HStack spacing={3} flexWrap="wrap" justify="center">
              <Button
                variant="ghost"
                onClick={handleClose}
                leftIcon={<X />}
                size={{ base: "sm", md: "md" }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleCrop}
                isLoading={isProcessing}
                loadingText="Processing..."
                leftIcon={<Check />}
                size={{ base: "sm", md: "md" }}
              >
                Crop & Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};

export default ImageCropModal;
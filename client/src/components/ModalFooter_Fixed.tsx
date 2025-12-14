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
import { useState, useEffect } from 'react';
import type { FC } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Heading,
  Flex,
  Box,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Image,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  VStack,
  HStack,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { Fingerprint, RefreshCw, CheckCircle } from 'lucide-react';
import { fingerprintControl } from '../../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';
import useStore from '../../store/store';
import { useGetStudents, useUpdateStudent } from '../../api/student.api';
import { toast } from 'react-hot-toast';
import { Student } from '../../interfaces/api.interface';
import { getFingerprintImgString } from '../../components/AddStudent';

const FingerprintEnrollment: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);
  const [liveFingerprintImage, setLiveFingerprintImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  // Store the captured fingerprint separately for display
  const [enrolledFingerprintDisplay, setEnrolledFingerprintDisplay] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data: studentsData, isLoading, refetch } = useGetStudents(
    staffInfo?.id as string,
    1,
    1000,
    {
      queryKey: ['students-enrollment'],
      keepPreviousData: true,
    }
  );

  const updateStudentMutation = useUpdateStudent();

  const filteredStudents = studentsData?.data?.students?.filter((student: Student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.matric_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !gradeFilter || student.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  }) || [];

  const handleDeviceConnected = () => {
    console.log('Device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Device disconnected.');
    setDeviceConnected(false);
  };

  const handleSampleAcquired = (event: any) => {
    console.log('Sample acquired => ', event?.samples);
    if (event?.samples && event.samples.length > 0) {
      // Use raw sample directly for live preview - DigitalPersona intermediate samples are already displayable
      console.log('Raw sample for display:', event.samples[0].substring(0, 50) + '...');
      setLiveFingerprintImage(event.samples[0]);
    }
  };

  useEffect(() => {
    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;
    fingerprintControl.onIntermediateSampleCallback = handleSampleAcquired; // Use onIntermediateSampleCallback for live preview
    fingerprintControl.onFingerprintCaptured = (fingerprint) => {
      setFingerprintImage(fingerprint);
      setLiveFingerprintImage(null);
      setIsCapturing(false);
      toast.success('Fingerprint captured successfully');
    };

    const checkInitialConnection = () => {
      try {
        if (fingerprintControl.isDeviceConnected) {
          console.log('Device was already connected, updating UI state');
          setDeviceConnected(true);
        } else {
          console.log('Device not connected yet, waiting for connection event');
        }
      } catch (error) {
        console.warn('Error checking initial connection:', error);
      }
    };

    checkInitialConnection();

    return () => {
      fingerprintControl.onDeviceConnectedCallback = undefined;
      fingerprintControl.onDeviceDisconnectedCallback = undefined;
      fingerprintControl.onIntermediateSampleCallback = undefined; // Clean up the correct callback
      fingerprintControl.onFingerprintCaptured = undefined;
    };
  }, []);

  const handleEnrollFingerprint = async () => {
    if (!selectedStudent || !fingerprintImage) {
      toast.error('Please capture a fingerprint first');
      return;
    }

    setIsEnrolling(true);
    try {
      const result = await updateStudentMutation.mutateAsync({
        id: selectedStudent.id,
        fingerprint: fingerprintImage,
        courses: selectedStudent.courses?.map(course => course.id),
        url: `/${selectedStudent.id}`,
      });

      setEnrollmentStatus('success');
      toast.success(`Fingerprint enrolled successfully for ${selectedStudent.name}`);

      // Store the raw fingerprint image for display
      setEnrolledFingerprintDisplay(fingerprintImage);
      
      // Update the selected student (mark as having fingerprint enrolled)
      setSelectedStudent({ 
        ...result.data.student, 
        fingerprint: 'enrolled' // Just a flag to indicate it's enrolled
      });

      refetch();
      setFingerprintImage(null);
    } catch (error) {
      console.error('Fingerprint enrollment error:', error);
      setEnrollmentStatus('error');
      toast.error('Failed to enroll fingerprint');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleReEnroll = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    setFingerprintImage(null);
    setLiveFingerprintImage(null);
    setEnrollmentStatus('idle');

    setIsCapturing(true);
    try {
      await fingerprintControl.init();
      toast.success('Place your finger on the scanner to re-enroll...');
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error('Failed to initialize fingerprint reader');
      setIsCapturing(false);
    }
  };

  // When selecting a student, check if they have enrolled fingerprint in current session
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    // Reset the enrolled fingerprint display when switching students
    setEnrolledFingerprintDisplay(null);
  };

  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem" marginBottom="1rem">
        <Heading fontSize={25} fontWeight={600}>
          Fingerprint Enrollment
        </Heading>
      </Flex>

      <Box marginBottom="2rem">
        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Fingerprint Enrollment Module</AlertTitle>
            <AlertDescription>
              Select a student, capture their fingerprint, and enroll it in the system for attendance recognition.
            </AlertDescription>
          </Box>
        </Alert>
      </Box>

      <Box marginBottom="2rem">
        {deviceConnected && <Text color="green.500" fontSize="lg" fontWeight="bold">✅ System: Fingerprint scanner is connected</Text>}
        {!deviceConnected && (
          <Text color="orange.500" fontSize="lg" fontWeight="bold">
            🔄 System: Automatically detecting scanner connection...
          </Text>
        )}
      </Box>

      <Flex gap={6} flexWrap="wrap">
        <Box flex="1" minW="300px">
          <Card>
            <CardHeader>
              <Heading size="md">Select Student</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search by name or ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                <Select placeholder="Filter by Grade" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                  <option value="1">Grade 1</option>
                  <option value="2">Grade 2</option>
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                </Select>

                <Box maxH="400px" overflowY="auto" border="1px solid #e2e8f0" borderRadius="md">
                  {isLoading ? (
                    <Box display="flex" justifyContent="center" padding="2rem">
                      <Spinner />
                    </Box>
                  ) : (
                    <VStack spacing={2} align="stretch" padding="1rem">
                      {filteredStudents.map((student: Student) => (
                        <Card
                          key={student.id}
                          size="sm"
                          cursor="pointer"
                          bg={selectedStudent?.id === student.id ? 'blue.50' : 'white'}
                          _hover={{ bg: 'gray.50' }}
                          onClick={() => handleSelectStudent(student)}
                        >
                          <CardBody padding="1rem">
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="bold">{student.name}</Text>
                              <Text fontSize="sm" color="gray.600">ID: {student.matric_no}</Text>
                              <Badge colorScheme="blue">Grade {student.grade}</Badge>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </Box>

        <Box flex="1" minW="300px">
          <Card>
            <CardHeader>
              <Heading size="md">Fingerprint Enrollment</Heading>
            </CardHeader>
            <CardBody>
              {selectedStudent ? (
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold">Selected Student:</Text>
                    <Text>{selectedStudent.name}</Text>
                    <Text fontSize="sm" color="gray.600">ID: {selectedStudent.matric_no}</Text>
                  </Box>

                  <HStack spacing={4}>
                    {fingerprintImage && (
                      <Button
                        leftIcon={<Fingerprint />}
                        colorScheme="green"
                        onClick={handleEnrollFingerprint}
                        isLoading={isEnrolling}
                        loadingText="Enrolling..."
                      >
                        Enroll Fingerprint
                      </Button>
                    )}
                  </HStack>

                  <Box>
                    <Text fontWeight="bold" marginBottom="1rem">Live Fingerprint Scanner:</Text>
                    <Box
                      width="240px"
                      height="240px"
                      border="2px solid #e2e8f0"
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      overflow="hidden"
                      bg={isCapturing ? 'gray.50' : 'white'}
                    >
                      {isCapturing && !liveFingerprintImage && (
                        <Text color="gray.500" fontSize="sm" textAlign="center">
                          Place your finger on the scanner...
                        </Text>
                      )}
                      {liveFingerprintImage && (
                        <Image
                          src={getFingerprintImgString(liveFingerprintImage)}
                          alt="Live Fingerprint"
                          maxW="100%"
                          maxH="100%"
                          objectFit="contain"
                        />
                      )}
                      {!isCapturing && !liveFingerprintImage && (
                        <Text color="gray.500" fontSize="sm" textAlign="center">
                          Click "Re-enroll Fingerprint" to start
                        </Text>
                      )}
                    </Box>
                  </Box>

                  {enrollmentStatus === 'success' && (
                    <Alert status="success">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Enrollment Successful!</AlertTitle>
                        <AlertDescription>
                          Fingerprint has been successfully enrolled for {selectedStudent.name}.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {enrollmentStatus === 'error' && (
                    <Alert status="error">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Enrollment Failed!</AlertTitle>
                        <AlertDescription>
                          There was an error enrolling the fingerprint. Please try again.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </VStack>
              ) : (
                <Box textAlign="center" padding="2rem">
                  <Fingerprint size={48} color="#cbd5e0" />
                  <Text color="gray.500" marginTop="1rem">
                    Select a student to begin fingerprint enrollment
                  </Text>
                </Box>
              )}
            </CardBody>
            <CardFooter>
              <VStack spacing={2} align="stretch" width="100%">
                <Button
                  leftIcon={<RefreshCw />}
                  variant="outline"
                  onClick={handleReEnroll}
                  isDisabled={!selectedStudent}
                >
                  Re-enroll Fingerprint
                </Button>
                <Button
                  leftIcon={<CheckCircle />}
                  colorScheme="purple"
                  onClick={onOpen}
                  isDisabled={!selectedStudent || isEnrolling}
                >
                  View Enrollment Status
                </Button>
              </VStack>
            </CardFooter>
          </Card>
        </Box>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enrollment Status</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedStudent ? (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Student Information:</Text>
                  <Text>Name: {selectedStudent.name}</Text>
                  <Text>ID: {selectedStudent.matric_no}</Text>
                  <Text>Grade: {selectedStudent.grade}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold">Enrollment Status:</Text>
                  <HStack>
                    <Badge colorScheme={selectedStudent.fingerprint ? 'green' : 'red'}>
                      {selectedStudent.fingerprint ? 'Enrolled' : 'Not Enrolled'}
                    </Badge>
                    {selectedStudent.fingerprint && (
                      <Text fontSize="sm" color="gray.600">
                        Fingerprint on file
                      </Text>
                    )}
                  </HStack>
                </Box>

                {enrolledFingerprintDisplay && (
                  <Box>
                    <Text fontWeight="bold" marginBottom="1rem">Recently Captured Fingerprint:</Text>
                    <Box
                      width="200px"
                      height="200px"
                      border="2px solid #e2e8f0"
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      overflow="hidden"
                      bg="gray.50"
                    >
                      <img
                        src={getFingerprintImgString(enrolledFingerprintDisplay)}
                        alt="Enrolled Fingerprint"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                    <Text fontSize="xs" color="gray.500" marginTop="0.5rem">
                      This is the fingerprint that was just captured in this session
                    </Text>
                  </Box>
                )}

                {selectedStudent.fingerprint && !enrolledFingerprintDisplay && (
                  <Alert status="info">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Fingerprint Enrolled</AlertTitle>
                      <AlertDescription>
                        This student has a fingerprint on file. The fingerprint image is encrypted for security and cannot be displayed after enrollment. To view a fingerprint preview, capture and enroll a new one.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}

                {selectedStudent.fingerprint && (
                  <Alert status="success">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Ready for Attendance</AlertTitle>
                      <AlertDescription>
                        This student's fingerprint is enrolled and ready for attendance recognition.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}

                {!selectedStudent.fingerprint && (
                  <Alert status="warning">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>No Fingerprint Enrolled</AlertTitle>
                      <AlertDescription>
                        This student needs to have their fingerprint enrolled before they can use the attendance system.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            ) : (
              <Text>Please select a student first.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </WithStaffLayout>
  );
};

export default FingerprintEnrollment;
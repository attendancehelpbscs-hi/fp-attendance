import { useState, useEffect } from 'react';
import type { FC } from 'react';
import axios from 'axios';
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
import { Fingerprint, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { fingerprintControl, cleanFingerprintData } from '../../lib/fingerprint';
import useStore from '../../store/store';
import {
  useGetStudents,
  useGetStudentFingerprints,
  useGetStudentsFingerprints,
  useAddStudentFingerprint,
  useCheckFingerprintUniquenesMulti,
  useDeleteStudentFingerprint,
} from '../../api/student.api';
import { toast } from 'react-hot-toast';
import { Student, StudentFingerprint } from '../../interfaces/api.interface';
import { getFingerprintImgString } from '../../components/AddStudent';
import { queryClient } from '../../lib/query-client';
import constants from '../../config/constants.config';

const FingerprintEnrollment: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);
  const [liveFingerprintImage, setLiveFingerprintImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    isUnique: boolean;
    confidence?: number;
    matchedStudent?: { id: string; name: string; matric_no: string };
    matchedFingerType?: string;
    message: string;
  } | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  const [fingerType, setFingerType] = useState<string>('thumb');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isAdmin = staffInfo?.role === 'ADMIN';

  const { data: studentsData, isLoading, refetch } = useGetStudents(
    staffInfo?.id as string,
    1,
    1000,
    {
      queryKey: ['students-enrollment'],
      keepPreviousData: true,
    }
  );

  // Get all student fingerprints to check enrollment status
  const { data: allFingerprintsData } = useGetStudentsFingerprints(
    staffInfo?.id as string,
    1,
    1000,
    {
      queryKey: ['all-students-fingerprints'],
      enabled: !!staffInfo?.id,
    }
  );

  // Create a map of student IDs to their enrollment status
  const studentEnrollmentMap = new Map<string, boolean>();
  if (allFingerprintsData?.data?.students) {
    allFingerprintsData.data.students.forEach((student: StudentFingerprint) => {
      studentEnrollmentMap.set(student.matric_no, true);
    });
  }

  const addFingerprintMutation = useAddStudentFingerprint();
  const checkFingerprintMutation = useCheckFingerprintUniquenesMulti();
  const deleteFingerprintMutation = useDeleteStudentFingerprint();

  // Fetch enrolled fingerprints for selected student
  const { data: fingerprintsData, refetch: refetchFingerprints } = useGetStudentFingerprints(
    selectedStudent?.id || '',
    {
      enabled: !!selectedStudent?.id,
    }
  );

  const enrolledFingerprints = fingerprintsData?.data?.fingerprints || [];

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

  const handleIntermediateSample = (event: any) => {
    console.log('Intermediate sample acquired => ', event);

    if (event?.samples && event.samples.length > 0) {
      console.log('Setting live fingerprint from samples');
      const cleanedSample = cleanFingerprintData(event.samples[0]);
      setLiveFingerprintImage(cleanedSample);
    } else if (event?.quality !== undefined) {
      console.log('Quality reported:', event.quality);
    }
  };

  const handleFingerprintCaptured = (fingerprint: string) => {
    console.log('Final fingerprint captured');
    setFingerprintImage(fingerprint);
    setLiveFingerprintImage(null);
    setIsCapturing(false);
    toast.success('Fingerprint captured successfully');
  };

  useEffect(() => {
    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;
    fingerprintControl.onIntermediateSampleCallback = handleIntermediateSample;
    fingerprintControl.onFingerprintCaptured = handleFingerprintCaptured;

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
      fingerprintControl.onIntermediateSampleCallback = undefined;
      fingerprintControl.onFingerprintCaptured = undefined;
    };
  }, []);

  const handleEnrollFingerprint = async () => {
    if (!selectedStudent || !fingerprintImage) {
      toast.error('Please capture a fingerprint first');
      return;
    }

    // Check if student already has 5 fingerprints
    if (enrolledFingerprints.length >= 5) {
      toast.error('Maximum of 5 fingerprints per student reached');
      return;
    }

    // Check if this finger type is already enrolled
    if (enrolledFingerprints.some(fp => fp.finger_type === fingerType)) {
      toast.error(`This student already has a ${fingerType} fingerprint enrolled`);
      return;
    }

    setIsEnrolling(true);

    try {
      // Add the new fingerprint
      await addFingerprintMutation.mutateAsync({
        student_id: selectedStudent.id,
        fingerprint: fingerprintImage,
        finger_type: fingerType,
      });

      setEnrollmentStatus('success');
      toast.success(`Fingerprint (${fingerType}) enrolled successfully for ${selectedStudent.name}`);

      // Refetch fingerprints and students list
      refetchFingerprints();
      refetch();

      // Invalidate fingerprint cache for attendance kiosk
      queryClient.invalidateQueries(['studentsfingerprints', staffInfo?.id]);

      // Invalidate Python server cache for the enrolled student
      try {
        await axios.post(`${constants.matchBaseUrl}/invalidate-cache/${selectedStudent.id}`);
        console.log('Python server cache invalidated for student:', selectedStudent.id);
      } catch (cacheError) {
        console.warn('Failed to invalidate Python server cache:', cacheError);
      }

      // Clear the fingerprint image for next capture
      setFingerprintImage(null);
      setCheckResult(null);
      setFingerType('thumb');
    } catch (error: any) {
      console.error('Fingerprint enrollment error:', error);
      setEnrollmentStatus('error');

      const errorMessage = error.response?.data?.message || error.message || 'Failed to enroll fingerprint';
      toast.error(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStartCapture = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    setFingerprintImage(null);
    setLiveFingerprintImage(null);
    setEnrollmentStatus('idle');
    setCheckResult(null);
    setIsCapturing(true);

    try {
      await fingerprintControl.init();
      toast.success('Ready! Place your finger on the scanner...');
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error('Failed to initialize fingerprint reader. Check if device is connected.');
      setIsCapturing(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setFingerprintImage(null);
    setLiveFingerprintImage(null);
    setCheckResult(null);
    setEnrollmentStatus('idle');
  };

  const handleCheckFingerprint = async () => {
    if (!fingerprintImage) {
      toast.error('Please capture a fingerprint first');
      return;
    }

    setIsChecking(true);
    setCheckResult(null);

    try {
      const result = await checkFingerprintMutation.mutateAsync({
        fingerprint: fingerprintImage,
        excludeStudentId: selectedStudent?.id,
      });
      setCheckResult(result.data);

      if (!result.data.isUnique) {
        toast.error(result.data.message);
      } else {
        toast.success('Fingerprint is unique and ready to enroll');
      }
    } catch (error: any) {
      console.error('Fingerprint check error:', error);
      toast.error('Failed to check fingerprint uniqueness');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteFingerprint = async (fingerprintId: string) => {
    if (!selectedStudent) return;

    if (!confirm('Are you sure you want to delete this fingerprint?')) return;

    try {
      await deleteFingerprintMutation.mutateAsync({
        fingerprint_id: fingerprintId,
        student_id: selectedStudent.id,
      });

      toast.success('Fingerprint deleted successfully');
      refetchFingerprints();
      refetch();

      // Invalidate Python server cache
      try {
        await axios.post(`${constants.matchBaseUrl}/invalidate-cache/${selectedStudent.id}`);
      } catch (cacheError) {
        console.warn('Failed to invalidate Python server cache:', cacheError);
      }
    } catch (error: any) {
      console.error('Delete fingerprint error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete fingerprint');
    }
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
            <AlertTitle>Multi-Fingerprint Enrollment</AlertTitle>
            <AlertDescription>
              Enroll up to 5 different fingerprints per student. Each fingerprint must be unique across all students.
            </AlertDescription>
          </Box>
        </Alert>
      </Box>

      <Box marginBottom="2rem">
        {deviceConnected && (
          <Text color="green.500" fontSize="lg" fontWeight="bold">
            ✅ System: Fingerprint scanner is connected
          </Text>
        )}
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
                              <HStack>
                                <Badge colorScheme="blue">Grade {student.grade}</Badge>
                                {studentEnrollmentMap.has(student.matric_no) && (
                                  <Badge colorScheme="green">ENROLLED</Badge>
                                )}
                              </HStack>
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
              <Flex justifyContent="space-between" alignItems="center">
                <Heading size="md">Fingerprint Enrollment</Heading>
                {isAdmin && (
                  <Badge colorScheme="blue" fontSize="sm">
                    View Only (Admin Access)
                  </Badge>
                )}
              </Flex>
            </CardHeader>
            <CardBody>
              {selectedStudent ? (
                <VStack spacing={4} align="stretch">
                  {isAdmin && (
                    <Alert status="info" size="sm">
                      <AlertIcon />
                      <AlertDescription>
                        Admin users can view enrolled fingerprints but cannot enroll new ones.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Box>
                    <Text fontWeight="bold">Selected Student:</Text>
                    <Text>{selectedStudent.name}</Text>
                    <Text fontSize="sm" color="gray.600">ID: {selectedStudent.matric_no}</Text>
                  </Box>

                  {/* Enrolled Fingerprints Display */}
                  {enrolledFingerprints.length > 0 && (
                    <Box>
                      <Text fontWeight="bold" marginBottom="0.5rem">Enrolled Fingerprints ({enrolledFingerprints.length}/5):</Text>
                      <VStack spacing={2} align="stretch">
                        {enrolledFingerprints.map((fp) => (
                          <HStack
                            key={fp.id}
                            justify="space-between"
                            p={2}
                            bg="green.50"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="green.200"
                          >
                            <HStack>
                              <Badge colorScheme="green" variant="solid" px={2} py={1}>
                                {fp.finger_type}
                              </Badge>
                              <Text fontSize="xs" color="gray.600">
                                {new Date(fp.created_at).toLocaleDateString()}
                              </Text>
                            </HStack>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              leftIcon={<Trash2 size={14} />}
                              onClick={() => handleDeleteFingerprint(fp.id)}
                              isDisabled={isAdmin}
                            >
                              Delete
                            </Button>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* Finger Type Selection and Scanner - Hidden for Admin */}
                  {!isAdmin && (
                    <>
                      {/* Finger Type Selection */}
                      <Box>
                        <Text fontWeight="bold" marginBottom="0.5rem">Select Finger Type:</Text>
                        <Select
                          value={fingerType}
                          onChange={(e) => setFingerType(e.target.value)}
                          isDisabled={isCapturing || isEnrolling}
                        >
                          <option value="thumb">Thumb</option>
                          <option value="index">Index Finger</option>
                          <option value="middle">Middle Finger</option>
                          <option value="ring">Ring Finger</option>
                          <option value="pinky">Pinky Finger</option>
                        </Select>
                      </Box>

                      {/* Live Scanner Display */}
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
                          bg={isCapturing ? 'blue.50' : 'white'}
                        >
                          {isCapturing && !liveFingerprintImage && !fingerprintImage && (
                            <VStack>
                              <Spinner size="xl" color="blue.500" />
                              <Text color="gray.600" fontSize="sm" textAlign="center">
                                Place your finger on the scanner...
                              </Text>
                            </VStack>
                          )}
                          {liveFingerprintImage && (
                            <VStack spacing={2}>
                              <Image
                                src={getFingerprintImgString(liveFingerprintImage)}
                                alt="Live Fingerprint Preview"
                                maxW="100%"
                                maxH="100%"
                                objectFit="contain"
                              />
                              <Text color="blue.600" fontSize="xs" fontWeight="bold">
                                Live Preview - Keep finger on scanner
                              </Text>
                            </VStack>
                          )}
                          {fingerprintImage && !liveFingerprintImage && (
                            <VStack spacing={2}>
                              <Image
                                src={getFingerprintImgString(fingerprintImage)}
                                alt="Captured Fingerprint"
                                maxW="100%"
                                maxH="100%"
                                objectFit="contain"
                              />
                              <Text color="green.600" fontSize="xs" fontWeight="bold">
                                Capture Complete - Ready to Check
                              </Text>
                            </VStack>
                          )}
                          {!isCapturing && !liveFingerprintImage && !fingerprintImage && (
                            <Text color="gray.500" fontSize="sm" textAlign="center" padding="1rem">
                              Click "Start Capture" to begin
                            </Text>
                          )}
                        </Box>
                      </Box>
                    </>
                  )}

                  {/* Action Buttons */}
                  {!isAdmin && (
                    <HStack spacing={4}>
                      {!isCapturing && !fingerprintImage && (
                        <Button
                          leftIcon={<Fingerprint />}
                          colorScheme="blue"
                          onClick={handleStartCapture}
                          isDisabled={!deviceConnected || enrolledFingerprints.length >= 5}
                        >
                          Start Capture
                        </Button>
                      )}
                      {fingerprintImage && !checkResult && (
                        <Button
                          leftIcon={<CheckCircle />}
                          colorScheme="orange"
                          onClick={handleCheckFingerprint}
                          isLoading={isChecking}
                          loadingText="Checking..."
                        >
                          Check Fingerprint
                        </Button>
                      )}
                      {fingerprintImage && checkResult && checkResult.isUnique && (
                        <Button
                          leftIcon={<CheckCircle />}
                          colorScheme="green"
                          onClick={handleEnrollFingerprint}
                          isLoading={isEnrolling}
                          loadingText="Enrolling..."
                        >
                          Enroll Fingerprint
                        </Button>
                      )}
                      {(isCapturing || fingerprintImage) && (
                        <Button
                          leftIcon={<RefreshCw />}
                          variant="outline"
                          onClick={handleStartCapture}
                          isDisabled={!deviceConnected}
                        >
                          Recapture
                        </Button>
                      )}
                    </HStack>
                  )}

                  {/* Check Result Display - Hidden for Admin */}
                  {!isAdmin && checkResult && (
                    <Alert status={checkResult.isUnique ? 'success' : 'warning'}>
                      <AlertIcon />
                      <Box>
                        <AlertTitle>
                          {checkResult.isUnique ? 'Fingerprint is Unique ✅' : 'Fingerprint Already Exists ⚠️'}
                        </AlertTitle>
                        <AlertDescription>
                          {checkResult.message}
                          {checkResult.matchedStudent && (
                            <>
                              <Text mt={2} fontSize="sm" fontWeight="bold">
                                Matched with: {checkResult.matchedStudent.name} (ID: {checkResult.matchedStudent.matric_no})
                              </Text>
                              {checkResult.matchedFingerType && (
                                <Text fontSize="sm" color="gray.600">
                                  Finger Type: {checkResult.matchedFingerType}
                                </Text>
                              )}
                            </>
                          )}
                          {checkResult.confidence && (
                            <Text mt={1} fontSize="sm" color="gray.600">
                              Confidence: {Math.round(checkResult.confidence)}%
                            </Text>
                          )}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {/* Enrollment Status Messages - Hidden for Admin */}
                  {!isAdmin && enrollmentStatus === 'success' && (
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

                  {!isAdmin && enrollmentStatus === 'error' && (
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
              <Button
                leftIcon={<CheckCircle />}
                colorScheme="purple"
                onClick={onOpen}
                isDisabled={!selectedStudent}
                width="100%"
              >
                View Enrollment Status
              </Button>
            </CardFooter>
          </Card>
        </Box>
      </Flex>

      {/* Enrollment Status Modal */}
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
                    <Badge colorScheme={enrolledFingerprints.length > 0 ? 'green' : 'red'}>
                      {enrolledFingerprints.length > 0 ? `${enrolledFingerprints.length} Fingerprint(s) Enrolled` : 'Not Enrolled'}
                    </Badge>
                  </HStack>
                </Box>

                {enrolledFingerprints.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" marginBottom="0.5rem">Enrolled Fingers:</Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {enrolledFingerprints.map((fp) => (
                        <Badge key={fp.id} colorScheme="green" variant="subtle" px={2} py={1}>
                          {fp.finger_type}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
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
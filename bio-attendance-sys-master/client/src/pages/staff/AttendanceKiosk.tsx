import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Card,
  CardBody,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  VStack,
  Image,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { fingerprintControl } from '../../lib/fingerprint';
import { useMarkAttendance, useAddAttendance, useGetAttendances, useGetAttendanceList } from '../../api/atttendance.api';
import { useGetStudentsFingerprints } from '../../api/student.api';
import type { StudentFingerprint } from '../../interfaces/api.interface';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { Base64 } from '@digitalpersona/core';
import { getFingerprintImgString } from '../../components/AddStudent';
import axios from 'axios';
import constants from '../../config/constants.config';
import dayjs from 'dayjs';
import { queryClient } from '../../lib/query-client';

const AttendanceKiosk: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(dayjs().format('MMMM D, YYYY'));
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');
  const [fingerprints, setFingerprints] = useState<{ newFingerprint: string }>({
    newFingerprint: '',
  });
  const [identifiedStudent, setIdentifiedStudent] = useState<StudentFingerprint | null>(null);
  const [identificationStatus, setIdentificationStatus] = useState<'idle' | 'scanning' | 'identifying' | 'success' | 'error'>('idle');
  const [confidence, setConfidence] = useState<number>(0);
  const [matchedFingerType, setMatchedFingerType] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{ name: string; time: string; status: 'success' | 'error' }>>([]);
  const [attendanceId, setAttendanceId] = useState<string>('');
  const [timeType, setTimeType] = useState<'IN' | 'OUT'>('IN');
  const [sessionType, setSessionType] = useState<'AM' | 'PM'>(new Date().getHours() < 12 ? 'AM' : 'PM');
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const isAdmin = staffInfo?.role === 'ADMIN';

  // Restrict kiosk access to teachers only
  if (isAdmin) {
    return (
      <Box minH="100vh" bg="gray.50" p={8} display="flex" alignItems="center" justifyContent="center">
        <Card maxW="md" w="full">
          <CardBody textAlign="center">
            <InfoIcon boxSize={12} color="orange.500" mb={4} />
            <Heading size="md" mb={2}>Access Restricted</Heading>
            <Text color="gray.600">
              The attendance kiosk is only available for teachers to mark attendance for their students.
              Admins should use the management dashboard for administrative tasks.
            </Text>
          </CardBody>
        </Card>
      </Box>
    );
  }

  const studentFingerprintsData = useGetStudentsFingerprints(staffInfo?.id as string, 1, 1000, {
    queryKey: ['studentsfingerprints', staffInfo?.id],
  });

  const { mutate: addAttendance } = useAddAttendance({
    onSuccess: (data) => {
      setAttendanceId(data.attendance.id);
      toast.success('Attendance session created successfully');
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'Failed to create attendance session');
    },
  });

  const attendancesData = useGetAttendances(staffInfo?.id as string, 1, 100, {
    queryKey: ['attendances', staffInfo?.id],
  });

  const attendanceListData = useGetAttendanceList(attendanceId, 1, 50, {
    queryKey: ['attendanceList', attendanceId],
    enabled: !!attendanceId,
    refetchInterval: 5000,
  });

  const { mutate: markAttendance } = useMarkAttendance({
    onSuccess: () => {
      toast.success('Student marked successfully - Ready for next scan');
      resetScanState();
      attendanceListData.refetch();
      queryClient.invalidateQueries(['attendanceList', attendanceId]);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message as string;
      if (errorMessage?.includes('Student is already marked present for the day')) {
        toast.error('Student is already marked present for the day');
      } else {
        toast.error(errorMessage ?? 'An error occurred');
      }
      resetScanState();
    },
  });

  const resetScanState = () => {
    setFingerprints({ newFingerprint: '' });
    setIdentifiedStudent(null);
    setIdentificationStatus('idle');
    setConfidence(0);
    setMatchedFingerType(null);
  };

  const attendanceData = attendanceListData.data?.data?.attendanceList?.reduce((acc: any[], record: any) => {
    // Only process present/late records, skip absent records for kiosk display
    if (record.status === 'absent') return acc;

    const statusLabel = record.status === 'present' && record.isLate ? 'late' : record.status;
    const existing = acc.find(item => item.id === record.student.matric_no);
    if (existing) {
      if (record.time_type === 'IN' && record.status === 'present') {
        if (!existing.timeInRaw || dayjs(record.created_at).isAfter(dayjs(existing.timeInRaw))) {
          existing.timeIn = dayjs(record.created_at).format('hh:mm A');
          existing.timeInRaw = record.created_at;
        }
      } else if (record.time_type === 'OUT' && record.status === 'present') {
        if (!existing.timeOutRaw || dayjs(record.created_at).isAfter(dayjs(existing.timeOutRaw))) {
          existing.timeOut = dayjs(record.created_at).format('hh:mm A');
          existing.timeOutRaw = record.created_at;
        }
      }
      if (dayjs(record.created_at).isAfter(dayjs(existing.statusUpdatedAt || '1970-01-01'))) {
        existing.status = statusLabel;
        existing.statusUpdatedAt = record.created_at;
      }
    } else {
      acc.push({
        id: record.student.matric_no,
        name: record.student.name,
        grade: record.student.grade,
        section: record.section,
        timeIn: (record.time_type === 'IN' && record.status === 'present') ? dayjs(record.created_at).format('hh:mm A') : null,
        timeOut: (record.time_type === 'OUT' && record.status === 'present') ? dayjs(record.created_at).format('hh:mm A') : null,
        timeInRaw: (record.time_type === 'IN' && record.status === 'present') ? record.created_at : null,
        timeOutRaw: (record.time_type === 'OUT' && record.status === 'present') ? record.created_at : null,
        status: statusLabel,
        statusUpdatedAt: record.created_at,
      });
    }
    return acc;
  }, []) || [];

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const dateInterval = setInterval(() => {
      setCurrentDate(dayjs().format('MMMM D, YYYY'));
    }, 60000);

    if (staffInfo?.id && !attendanceId && attendancesData?.data?.data?.attendances) {
      const today = dayjs().format('YYYY-MM-DD');
      const existingSession = attendancesData.data.data.attendances.find((att: any) => dayjs(att.date).format('YYYY-MM-DD') === today);
      if (existingSession) {
        setAttendanceId(existingSession.id);
      } else {
        addAttendance({
          staff_id: staffInfo.id,
          name: `Daily Attendance - ${dayjs().format('MMMM D, YYYY')}`,
          date: dayjs().startOf('day').toISOString(),
        });
      }
    }

    return () => {
      clearInterval(timeInterval);
      clearInterval(dateInterval);
    };
  }, [staffInfo?.id, attendanceId, attendancesData, addAttendance]);

  useEffect(() => {
    const handleDeviceConnected = () => {
      setScannerConnected(true);
      setScannerStatus('Connected');
    };

    const handleDeviceDisconnected = () => {
      setScannerConnected(false);
      setScannerStatus('Disconnected');
    };

    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;

    const initializeFingerprintReader = async () => {
      try {
        console.log('Initializing fingerprint reader for kiosk...');
        await fingerprintControl.init();
        console.log('Fingerprint reader initialized successfully');

        // Check initial connection after init
        if (fingerprintControl.isDeviceConnected) {
          console.log('Device was already connected, updating kiosk UI state');
          setScannerConnected(true);
          setScannerStatus('Connected');
        } else {
          console.log('Device not connected yet, waiting for connection event');
          setScannerStatus('Checking...');

          setTimeout(() => {
            if (fingerprintControl.isDeviceConnected) {
              console.log('Device connected after delay, updating kiosk UI state');
              setScannerConnected(true);
              setScannerStatus('Connected');
            } else {
              console.log('Device still not connected after delay');
              setScannerStatus('Not Detected');
            }
          }, 3000);
        }
      } catch (error) {
        console.warn('Error initializing fingerprint reader:', error);
        setScannerStatus('Error');
      }
    };

    initializeFingerprintReader();

    return () => {
      fingerprintControl.onDeviceConnectedCallback = null as any;
      fingerprintControl.onDeviceDisconnectedCallback = null as any;
    };
  }, []);

  const handleSampleAcquired = (event: any) => {
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprints({ newFingerprint: rawImages[0] });
    setIdentificationStatus('scanning');
  };

  // ============================================================================
  // FIXED: Multi-Fingerprint Identification Function
  // ============================================================================
  const handleFingerprintIdentification = async () => {
    if (!fingerprints.newFingerprint) return;

    setIdentificationStatus('identifying');
    setMatchedFingerType(null);

    try {
      // Convert base64 to File object for upload
      const base64Data = fingerprints.newFingerprint;
      
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;
      
      // Convert base64 to blob
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const file = new File([blob], 'scanned_fingerprint.png', { type: 'image/png' });

      // Get enrolled fingerprints data
      const enrolledFingerprints = studentFingerprintsData.data?.data?.students || [];

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fingerprints_data', JSON.stringify(enrolledFingerprints));

      console.log('🔍 Calling multi-fingerprint identification endpoint...');
      console.log(`📊 Sending ${enrolledFingerprints.length} enrolled fingerprints for comparison`);

      // FIXED: Send to Python server - UPDATED ENDPOINT for multi-fingerprint
      const res = await axios.post(
        `${constants.matchBaseUrl}/identify/fingerprint/multi`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Response from Python server:', res.data);

      // FIXED: Extract student_id, confidence, and finger_type from response
      const { student_id, confidence, finger_type } = res.data;

      if (student_id && confidence > 40) {
        // Find the student in our local data
        const student = studentFingerprintsData.data?.data?.students?.find(
          (s: StudentFingerprint) => s.id === student_id
        );
        
        if (student) {
          setIdentifiedStudent(student);
          setConfidence(confidence);
          setMatchedFingerType(finger_type || null); // FIXED: Set the matched finger type
          setIdentificationStatus('success');

          // FIXED: Include finger type in recent scans
          setRecentScans(prev => [{
            name: student.name,
            time: dayjs().format('hh:mm:ss A'),
            status: 'success'
          }, ...prev.slice(0, 9)]);

          // FIXED: Show finger type in success message
          toast.success(
            `Student identified: ${student.name}${finger_type ? ` using ${finger_type} finger` : ''} (${confidence.toFixed(1)}% confidence)`
          );

          setTimeout(() => markAttendance({
            student_id: student_id,
            attendance_id: attendanceId,
            time_type: timeType,
            section: (student.courses.length > 0 
              ? student.courses[0].course_code 
              : student.grade).slice(0, 10),
            session_type: sessionType,
          }), 1000);
        } else {
          setIdentificationStatus('error');
          setRecentScans(prev => [{
            name: 'Unknown',
            time: dayjs().format('hh:mm:ss A'),
            status: 'error'
          }, ...prev.slice(0, 9)]);
          toast.error('Student not found in records');
        }
      } else {
        setIdentificationStatus('error');
        setRecentScans(prev => [{
          name: 'Unrecognized',
          time: dayjs().format('hh:mm:ss A'),
          status: 'error'
        }, ...prev.slice(0, 9)]);
        toast.error('Fingerprint not recognized. Please try again.');
      }
    } catch (err: any) {
      setIdentificationStatus('error');
      setRecentScans(prev => [{
        name: 'Error',
        time: dayjs().format('hh:mm:ss A'),
        status: 'error'
      }, ...prev.slice(0, 9)]);
      
      console.error('Identification error: ', err);
      
      if (err.response?.status === 404) {
        toast.error('No students enrolled with fingerprints.');
      } else if (err.response?.status === 400) {
        toast.error('Invalid fingerprint data. Please try again.');
      } else if (err.response?.status === 500) {
        toast.error('Server error. Check if Python server is running.');
      } else {
        toast.error(err.response?.data?.message || 'Could not identify fingerprint');
      }
    }
  };

  useEffect(() => {
    if (fingerprints.newFingerprint && identificationStatus === 'scanning') {
      handleFingerprintIdentification();
    }
  }, [fingerprints.newFingerprint, identificationStatus]);

  useEffect(() => {
    fingerprintControl.onSampleAcquiredCallback = handleSampleAcquired;
  }, [attendanceId]);

  useEffect(() => {
    const newSessionType = currentTime.getHours() < 12 ? 'AM' : 'PM';
    setSessionType(newSessionType);
  }, [currentTime]);


  return (
    <Box minH="100vh" bg="gray.50" p={0} maxW="1400px" mx="auto" overflow="hidden">
      {/* Header Section */}
      <Flex
        bg="var(--bg-primary)"
        color="white"
        p={6}
        alignItems="center"
        boxShadow="lg"
      >
        <VStack align="start" spacing={1}>
          <Heading size="lg">Mark Attendance</Heading>
          <Text fontSize="md">{currentDate}</Text>
        </VStack>

        <Box flex="1" display="flex" justifyContent="center">
          <VStack align="center" spacing={1}>
            <Text fontSize="5xl" fontWeight="bold" fontFamily="monospace">
              {dayjs(currentTime).format('hh:mm:ss A')}
            </Text>
            <Badge
              colorScheme={
                scannerConnected
                  ? "green"
                  : scannerStatus === "Checking..."
                  ? "yellow"
                  : scannerStatus === "Disconnected" || scannerStatus === "Not Detected"
                  ? "red"
                  : "orange"
              }
              fontSize="md"
              p={2}
            >
              Scanner: {scannerStatus}
            </Badge>
          </VStack>
        </Box>
      </Flex>

      {/* Instructions Sidebar */}
      <Flex>
        {/* Sidebar with Instructions */}
        <Box w="150px" bg="gray.100" p={2} borderRight="1px" borderColor="gray.200">
          <VStack spacing={2} align="start">
            <Heading size="xs">Kiosk Instructions</Heading>
            <Text fontSize="xs" color="gray.600">
              Scan your fingerprint to mark attendance. Session type is automatically detected based on current time. Select check-in or check-out for quick successive scans.
            </Text>
            <Text fontSize="xs" color="gray.600">
              Monitor real-time attendance logs and scanner status below.
            </Text>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex={1} p={4}>
          <VStack spacing={4} h="full">
            {/* Top Row - Scanner Controls */}
            <Flex gap={4} w="full">
              {/* Attendance Controls */}
              <Card flex={1}>
                <Box p={3}>
                  <Text fontWeight="bold" mb={2} fontSize="sm">Attendance Controls</Text>

                  {/* Time Type and Session Type Selectors */}
                  <VStack spacing={2} align="start">
                    <Box w="100%">
                      <HStack justifyContent="space-between" alignItems="center" mb={1}>
                        <Text fontWeight="bold" fontSize="sm">Time Type:</Text>
                        <Select
                          size="sm"
                          w="140px"
                          value={timeType}
                          onChange={(e) => setTimeType(e.target.value as 'IN' | 'OUT')}
                        >
                          <option value="IN">Check In</option>
                          <option value="OUT">Check Out</option>
                        </Select>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text fontWeight="bold" fontSize="sm">Session:</Text>
                        <Select
                          size="sm"
                          w="140px"
                          value={sessionType}
                          onChange={(e) => {
                            const selected = e.target.value as 'AM' | 'PM';
                            setSessionType(selected);
                            setShowSessionWarning(true);
                          }}
                        >
                          <option value="AM">AM (Morning)</option>
                          <option value="PM">PM (Afternoon)</option>
                        </Select>
                      </HStack>
                    </Box>

                    <Box w="100%">
                      <Flex gap="0.3rem" borderLeft="2px solid #534949" padding="0.3rem" alignItems="flex-start">
                        <InfoIcon boxSize={3} />
                        <Text fontStyle="italic" fontSize="xs">Scan fingerprint to automatically mark attendance.</Text>
                      </Flex>
                      {scannerConnected && <Text fontSize="xs" color="green.600" mt={1}>✅ Fingerprint scanner is connected</Text>}
                    </Box>

                    {/* Fingerprint Display */}
                    <Box w="100%">
                      <Box
                        overflow="hidden"
                        shadow="xs"
                        h={100}
                        w={100}
                        margin="0.5rem auto"
                        border="1px solid rgba(0, 0, 0, 0.04)"
                      >
                        {fingerprints.newFingerprint && <Image src={getFingerprintImgString(fingerprints.newFingerprint)} />}
                      </Box>
                    </Box>
                  </VStack>
                </Box>
              </Card>

              {/* Live Scanner Feedback */}
              <Card flex={1}>
                <Box p={3}>
                  <Text fontWeight="bold" mb={3} fontSize="sm">Live Scanner Feedback</Text>

                  {/* FIXED: Student Info Display with Finger Type */}
                  {identifiedStudent && identificationStatus === 'success' && (
                    <Alert status="success" mb={3} py={2}>
                      <VStack align="start" spacing={1} w="full">
                        <AlertTitle fontSize="xs">✅ Student Identified!</AlertTitle>
                        <Text fontSize="xs"><strong>ID:</strong> {identifiedStudent.matric_no}</Text>
                        <Text fontSize="xs"><strong>Name:</strong> {identifiedStudent.name}</Text>
                        <Text fontSize="xs"><strong>Grade:</strong> {identifiedStudent.grade}</Text>
                        <Text fontSize="xs"><strong>Section:</strong> {identifiedStudent.courses.length > 0 ? identifiedStudent.courses[0].course_code : identifiedStudent.grade}</Text>

                        <Text fontSize="xs"><strong>Status:</strong> {timeType === 'IN' ? 'Checked In' : 'Checked Out'}</Text>
                        <Text fontSize="xs"><strong>Time:</strong> {dayjs().format('hh:mm A')}</Text>
                      </VStack>
                    </Alert>
                  )}

                  {identificationStatus === 'error' && (
                    <Alert status="error" mb={3} py={2}>
                      <AlertIcon boxSize={3} />
                      <AlertTitle fontSize="xs">Unrecognized Fingerprint</AlertTitle>
                      <AlertDescription fontSize="xs">
                        Please try scanning again.
                      </AlertDescription>
                    </Alert>
                  )}

                  {identificationStatus === 'identifying' && (
                    <Alert status="info" mb={3} py={2}>
                      <Spinner size="xs" mr={2} />
                      <AlertTitle fontSize="xs">Identifying student...</AlertTitle>
                    </Alert>
                  )}

                  {/* Recent Scans */}
                  <Box>
                    <Text fontWeight="bold" mb={2} fontSize="sm">Recent Scans</Text>
                    <VStack spacing={1} maxH="120px" overflowY="auto">
                      {recentScans.map((scan, idx) => (
                        <HStack key={idx} w="full" justify="space-between" p={1} bg={scan.status === 'success' ? 'green.50' : 'red.50'} borderRadius="md">
                          <Text fontSize="xs">{scan.name}</Text>
                          <HStack>
                            <Text fontSize="xs" color="gray.600">{scan.time}</Text>
                            <Badge colorScheme={scan.status === 'success' ? 'green' : 'red'} size="sm" fontSize="xs">
                              {scan.status === 'success' ? '✅' : '❌'}
                            </Badge>
                          </HStack>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                </Box>
              </Card>
            </Flex>

            {/* Bottom - Daily Attendance Log */}
            <Card flex={1} overflow="hidden">
              <Box p={3} borderBottom="1px" borderColor="gray.200">
                <Heading size="md">Daily Attendance Log</Heading>
                <Text color="gray.600" fontSize="sm">Real-time attendance records</Text>
              </Box>
              <Box overflowY="auto" h="calc(100% - 70px)">
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} bg="white" zIndex={1}>
                      <Tr>
                        <Th minW="100px" fontSize="xs">ID</Th>
                        <Th fontSize="xs">Name</Th>
                        <Th fontSize="xs">Grade</Th>
                        <Th fontSize="xs">Section</Th>
                        <Th fontSize="xs">Time In</Th>
                        <Th fontSize="xs">Time Out</Th>
                        <Th fontSize="xs">Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {attendanceData.map((record, idx) => (
                        <Tr key={record.id} bg={idx === 0 ? "green.50" : "white"}>
                          <Td fontSize="xs">{record.id}</Td>
                          <Td fontSize="xs">{record.name}</Td>
                          <Td fontSize="xs">{record.grade}</Td>
                          <Td fontSize="xs">{record.section}</Td>
                          <Td fontSize="xs">{record.timeIn}</Td>
                          <Td fontSize="xs">{record.timeOut || '-'}</Td>
                          <Td>
                            <Badge
                              colorScheme={record.status === 'present' ? 'green' : record.status === 'late' ? 'yellow' : record.status === 'departure' ? 'blue' : 'red'}
                              size="sm"
                              fontSize="xs"
                            >
                              {record.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </Card>
          </VStack>
        </Box>
      </Flex>

      {/* Session Warning Modal */}
      <Modal isOpen={showSessionWarning} onClose={() => setShowSessionWarning(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>⚠️ Session Type Warning</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Session type is automatically determined by the system based on the check-in time. Manual selection is for display only and does not affect how attendance is recorded.
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              The system will always use the correct session type (AM/PM) based on when the student scans their fingerprint.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={() => setShowSessionWarning(false)}>
              I Understand
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AttendanceKiosk;
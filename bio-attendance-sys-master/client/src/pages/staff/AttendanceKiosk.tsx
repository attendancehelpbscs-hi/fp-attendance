import { useState, useEffect, useRef } from 'react';
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
  Button,
  Spinner,
  Card,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Switch,
  HStack,
  VStack,
  Image,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import { ViewIcon, InfoIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { fingerprintControl } from '../../lib/fingerprint';
import { useMarkAttendance, useAddAttendance, useGetAttendances, useGetAttendanceList } from '../../api/atttendance.api';
import { useGetStudentsFingerprints } from '../../api/student.api';
import type { MarkAttendanceInput, StudentFingerprint } from '../../interfaces/api.interface';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { Base64 } from '@digitalpersona/core';
import { getFingerprintImgString } from '../../components/AddStudent';
import axios from 'axios';
import constants from '../../config/constants.config';
import dayjs from 'dayjs';
import { queryClient } from '../../lib/query-client';

const AttendanceKiosk: FC = () => {
  const navigate = useNavigate();
  const staffInfo = useStore.use.staffInfo();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(dayjs().format('MMMM D, YYYY'));
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [markInput, setMarkInput] = useState<MarkAttendanceInput>({
    student_id: '',
    attendance_id: '',
    time_type: 'IN',
    section: '',
  });
  const [fingerprints, setFingerprints] = useState<{ newFingerprint: string }>({
    newFingerprint: '',
  });
  const [identifiedStudent, setIdentifiedStudent] = useState<StudentFingerprint | null>(null);
  const [identificationStatus, setIdentificationStatus] = useState<'idle' | 'scanning' | 'identifying' | 'success' | 'error'>('idle');
  const [confidence, setConfidence] = useState<number>(0);
  const [recentScans, setRecentScans] = useState<Array<{ name: string; time: string; status: 'success' | 'error' }>>([]);
  const [attendanceId, setAttendanceId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [timeType, setTimeType] = useState<'IN' | 'OUT'>('IN');
  const [sessionType, setSessionType] = useState<'AM' | 'PM'>('AM');




  const studentFingerprintsData = useGetStudentsFingerprints(staffInfo?.id as string, {
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

  // Real-time attendance data fetching
  const attendanceListData = useGetAttendanceList(attendanceId, 1, 50, {
    queryKey: ['attendanceList', attendanceId],
    enabled: !!attendanceId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const { isLoading, mutate: markAttendance } = useMarkAttendance({
    onSuccess: () => {
      if (continuousMode) {
        toast.success('Student marked successfully - Ready for next scan');
        resetScanState();
      } else {
        toast.success('Student marked successfully');
        resetScanState();
      }
      // Trigger refetch of attendance data
      attendanceListData.refetch();
      // Also invalidate and refetch the query cache
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
  };

  // Transform attendance data for display - group by student and show latest times and status
  const attendanceData = attendanceListData.data?.data?.attendanceList?.reduce((acc: any[], record: any) => {
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
      // Always update status to the latest record's status
      if (dayjs(record.created_at).isAfter(dayjs(existing.statusUpdatedAt || '1970-01-01'))) {
        existing.status = record.status as 'present' | 'absent';
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
        status: record.status as 'present' | 'absent',
        statusUpdatedAt: record.created_at,
      });
    }
    return acc;
  }, []) || [];

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Update date when day changes
    const dateInterval = setInterval(() => {
      setCurrentDate(dayjs().format('MMMM D, YYYY'));
    }, 60000); // Check every minute

    // Auto-create attendance session if none exists
    if (staffInfo?.id && !attendanceId && attendancesData?.data?.data?.attendances) {
      const today = dayjs().format('YYYY-MM-DD');
      const existingSession = attendancesData.data.data.attendances.find((att: any) => dayjs(att.date).format('YYYY-MM-DD') === today);
      if (existingSession) {
        setAttendanceId(existingSession.id);
      } else {
        // Create new attendance session for today
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

    // Check if device is already connected (since global init might have connected it before this component mounted)
    const checkInitialConnection = () => {
      try {
        // Use the public getter to check current connection status
        if (fingerprintControl.isDeviceConnected) {
          console.log('Device was already connected, updating kiosk UI state');
          setScannerConnected(true);
          setScannerStatus('Connected');
        } else {
          console.log('Device not connected yet, waiting for connection event');
          setScannerStatus('Checking...');

          // Add a small delay to check again in case the global init is still running
          setTimeout(() => {
            if (fingerprintControl.isDeviceConnected) {
              console.log('Device connected after delay, updating kiosk UI state');
              setScannerConnected(true);
              setScannerStatus('Connected');
            } else {
              console.log('Device still not connected after delay');
              setScannerStatus('Not Detected');
            }
          }, 3000); // Wait 3 seconds for global init to complete
        }
      } catch (error) {
        console.warn('Error checking initial connection:', error);
        setScannerStatus('Error');
      }
    };

    checkInitialConnection();

    // Note: Don't call fingerprintControl.init() here since it's already initialized globally in App.tsx
    // This component just sets up the callbacks for this specific use case

    // Cleanup callbacks on unmount (but don't destroy the global instance)
    return () => {
      fingerprintControl.onDeviceConnectedCallback = undefined;
      fingerprintControl.onDeviceDisconnectedCallback = undefined;
    };
  }, []);

  const handleSampleAcquired = (event: any) => {
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprints({ newFingerprint: rawImages[0] });
    setIdentificationStatus('scanning');
  };

  const handleFingerprintIdentification = async () => {
    if (!fingerprints.newFingerprint) return;

    setIdentificationStatus('identifying');
    const data = new FormData();
    data.append('file', dataURLtoFile(getFingerprintImgString(fingerprints.newFingerprint), 'scanned_fingerprint.jpeg'));
    data.append('staff_id', staffInfo?.id as string);

    try {
      const res = await axios.post(`${constants.matchBaseUrl}/identify/fingerprint`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { student_id, confidence } = res.data;
      setConfidence(confidence);

      if (student_id && confidence > 0.5) {
        const student = studentFingerprintsData.data?.data?.students?.find((s: StudentFingerprint) => s.id === student_id);
        if (student) {
          setIdentifiedStudent(student);
          setMarkInput({
            student_id: student_id,
            attendance_id: attendanceId,
            time_type: 'IN',
            section: (student.courses.length > 0 ? student.courses[0].course_code : student.grade).slice(0, 10),
          });
          setIdentificationStatus('success');

          // Add to recent scans
          setRecentScans(prev => [{
            name: student.name,
            time: dayjs().format('hh:mm:ss A'),
            status: 'success'
          }, ...prev]);

          toast.success(`Student identified: ${student.name} (${student.matric_no})`);

          if (continuousMode) {
            setTimeout(() => markAttendance({
              student_id: student_id,
              attendance_id: attendanceId,
              time_type: timeType,
              section: (student.courses.length > 0 ? student.courses[0].course_code : student.grade).slice(0, 10),
              session_type: sessionType,
            }), 1000);
          }
        } else {
          setIdentificationStatus('error');
          setRecentScans(prev => [{
            name: 'Unknown',
            time: dayjs().format('hh:mm:ss A'),
            status: 'error'
          }, ...prev]);
          toast.error('Student not found in records');
        }
      } else {
        setIdentificationStatus('error');
        setRecentScans(prev => [{
          name: 'Unrecognized',
          time: dayjs().format('hh:mm:ss A'),
          status: 'error'
        }, ...prev]);
        // Check if the error is due to no students found
        if (res.data.message && res.data.message.includes('No students found')) {
          toast.error('No students enrolled with fingerprints for this staff member.');
        } else {
          toast.error('Fingerprint not recognized. Please try again.');
        }
      }
    } catch (err) {
      setIdentificationStatus('error');
      setRecentScans(prev => [{
        name: 'Error',
        time: dayjs().format('hh:mm:ss A'),
        status: 'error'
      }, ...prev]);
      toast.error('Could not identify fingerprint');
      console.error('Err: ', err);
    }
  };

  useEffect(() => {
    if (fingerprints.newFingerprint && identificationStatus === 'scanning') {
      handleFingerprintIdentification();
    }
  }, [fingerprints.newFingerprint, identificationStatus]);

  useEffect(() => {
    fingerprintControl.onSampleAcquiredCallback = handleSampleAcquired;
  }, [attendanceId, continuousMode]);

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr?.[0]?.match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n) {
      u8arr[n - 1] = bstr.charCodeAt(n - 1);
      n -= 1;
    }
    return new File([u8arr], filename, { type: mime });
  };





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
              Scan your fingerprint to mark attendance. Select check-in or check-out, and use continuous mode for quick successive scans.
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
            {/* Continuous Mode Toggle */}
            <Card flex={1}>
              <Box p={3}>
                <HStack justifyContent="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold" fontSize="sm">Continuous Mode</Text>
                    <Text fontSize="xs" color="gray.600">
                      Auto-mark after successful scan
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={continuousMode}
                    onChange={(e) => setContinuousMode(e.target.checked)}
                    colorScheme="blue"
                    size="md"
                  />
                </HStack>
              </Box>
            </Card>

            {/* Mark Student Section */}
            <Card flex={1}>
              <Box p={3}>
                <Text fontWeight="bold" mb={2} fontSize="sm">Mark Student</Text>

                {/* Time Type and Session Type Selectors */}
                <Box mb={2}>
                  <HStack justifyContent="space-between" alignItems="center" mb={1}>
                    <Text fontWeight="bold" fontSize="xs">Time Type:</Text>
                    <Select
                      size="xs"
                      w="120px"
                      value={timeType}
                      onChange={(e) => setTimeType(e.target.value as 'IN' | 'OUT')}
                    >
                      <option value="IN">Check In</option>
                      <option value="OUT">Check Out</option>
                    </Select>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold" fontSize="xs">Session:</Text>
                    <Select
                      size="xs"
                      w="120px"
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value as 'AM' | 'PM')}
                    >
                      <option value="AM">AM (Morning)</option>
                      <option value="PM">PM (Afternoon)</option>
                    </Select>
                  </HStack>
                </Box>

                <Box mb={2}>
                  <Flex gap="0.3rem" borderLeft="2px solid #534949" padding="0.3rem" alignItems="flex-start">
                    <InfoIcon boxSize={3} />
                    <Text fontStyle="italic" fontSize="xs">Scan fingerprint to identify and mark attendance for the student.</Text>
                  </Flex>
                  {scannerConnected && <Text fontSize="xs" color="green.600">✅ System: Fingerprint scanner is connected</Text>}
                </Box>

                {/* Fingerprint Display - Made smaller */}
                <Box
                  overflow="hidden"
                  shadow="xs"
                  h={120}
                  w={120}
                  margin="0.3rem auto"
                  border="1px solid rgba(0, 0, 0, 0.04)"
                >
                  {fingerprints.newFingerprint && <Image src={getFingerprintImgString(fingerprints.newFingerprint)} />}
                </Box>



                <Button
                  w="100%"
                  bg="var(--bg-primary)"
                  color="white"
                  size="xs"
                  _hover={{ background: 'var(--bg-primary-light)' }}
                  disabled={isLoading || identificationStatus !== 'success'}
                  onClick={() => {
                    if (identifiedStudent) {
                      markAttendance({
                        student_id: identifiedStudent.id,
                        attendance_id: attendanceId,
                        time_type: timeType,
                        section: (identifiedStudent.courses.length > 0 ? identifiedStudent.courses[0].course_code : identifiedStudent.grade).slice(0, 10),
                        session_type: sessionType,
                      });
                    }
                  }}
                >
                  {isLoading ? 'Marking student...' : 'Mark student'}
                </Button>
              </Box>
            </Card>

            {/* Live Scanner Feedback */}
            <Card flex={1}>
              <Box p={3}>
                <Text fontWeight="bold" mb={3} fontSize="sm">Live Scanner Feedback</Text>

                {/* Student Info Display */}
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
                          <Badge colorScheme={record.status === 'present' ? 'green' : 'red'} size="sm" fontSize="xs">
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


    </Box>
  );
};

export default AttendanceKiosk;



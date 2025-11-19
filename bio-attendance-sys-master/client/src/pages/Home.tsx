import type { FC } from 'react';
import { Card, CardHeader, Heading, Flex, Button, Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Text, Badge, List, ListItem, ListIcon, CircularProgress, CircularProgressLabel, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer, HStack, Select } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { fingerprintControl } from '../lib/fingerprint';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaUsers, FaCheck } from 'react-icons/fa6';
import { FaHistory } from 'react-icons/fa';
import { MdCancel } from 'react-icons/md';

import { useGetDashboardStats, useGetReports } from '../api/atttendance.api';
import { getAuditLogs } from '../api/audit.api';
import useStore from '../store/store';

const Home: FC = () => {
  const navigate = useNavigate();
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string>('all');

  const isAuthenticated = useStore.use.isAuthenticated();
  const staffInfo = useStore.use.staffInfo();

  // Fetch dashboard stats if authenticated
  const { data: dashboardData, isLoading: statsLoading, refetch: refetchDashboard } = useGetDashboardStats(
    isAuthenticated && staffInfo?.id ? staffInfo.id : '',
    {
      enabled: isAuthenticated && !!staffInfo?.id,
      session: selectedSession !== 'all' ? selectedSession : undefined,
    }
  );

  // Filter dashboard data by session type
  const filteredDashboardData = useMemo(() => {
    if (!dashboardData?.data || selectedSession === 'all') return dashboardData?.data;

    const filtered = { ...dashboardData.data };

    // Note: Dashboard API currently doesn't return session_type in gradeStats
    // This filtering will work once the backend is updated to include session_type
    // For now, we'll show all data when a specific session is selected
    // TODO: Update backend to include session_type in dashboard stats

    return filtered;
  }, [dashboardData, selectedSession]);

  // Fetch real data for daily trend (last 7 days)
  const { data: reportsData, refetch: refetchReports } = useGetReports(
    isAuthenticated && staffInfo?.id ? staffInfo.id : '',
    {
      dateRange: '7days',
      session: selectedSession !== 'all' ? selectedSession : undefined,
    }
  );

  // Use real data if available, otherwise fallback to mock data
  const stats = filteredDashboardData || dashboardData?.data || {
    totalStudents: 254,
    presentToday: 200,
    absentToday: 54,
    attendanceRate: 78.7,
    gradeStats: []
  };
  const absentToday = stats.absentToday || (stats.totalStudents - stats.presentToday);

  // Use real data for daily Present/Absent trend (last 7 days)
  const dailyTrendData = useMemo(() => {
    if (reportsData?.data?.reports) {
      const reports = reportsData.data.reports;
      // Group by date and session, then sum present/absent across all grades
      const dateGroups: Record<string, { present: number; absent: number }> = {};
      reports.forEach((report: any) => {
        const dateKey = new Date(report.date).toISOString().split('T')[0];
        const session = report.session_type || 'AM'; // Default to AM if not specified
        const key = `${dateKey}-${session}`;

        if (!dateGroups[key]) {
          dateGroups[key] = { present: 0, absent: 0 };
        }
        dateGroups[key].present += report.present;
        dateGroups[key].absent += report.absent;
      });

      // Get last 7 days, filtered by selected session
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Sum data for both AM and PM sessions, or filter by selected session
        let present = 0;
        let absent = 0;

        if (selectedSession === 'all') {
          // Sum both AM and PM
          const amKey = `${dateKey}-AM`;
          const pmKey = `${dateKey}-PM`;
          const amGroup = dateGroups[amKey];
          const pmGroup = dateGroups[pmKey];
          present = (amGroup ? amGroup.present : 0) + (pmGroup ? pmGroup.present : 0);
          absent = (amGroup ? amGroup.absent : 0) + (pmGroup ? pmGroup.absent : 0);
        } else {
          // Filter by selected session
          const key = `${dateKey}-${selectedSession}`;
          const group = dateGroups[key];
          present = group ? group.present : 0;
          absent = group ? group.absent : 0;
        }

        last7Days.push({
          day: dayName,
          Present: present,
          Absent: absent,
        });
      }

      // Sort by weekday order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      last7Days.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

      return last7Days;
    }

    // Fallback to mock data
    return [
      { day: 'Mon', Present: 210, Absent: 44 },
      { day: 'Tue', Present: 205, Absent: 49 },
      { day: 'Wed', Present: 220, Absent: 34 },
      { day: 'Thu', Present: 215, Absent: 39 },
      { day: 'Fri', Present: 200, Absent: 54 },
      { day: 'Sat', Present: 180, Absent: 74 },
      { day: 'Sun', Present: 150, Absent: 104 },
    ];
  }, [reportsData, selectedSession]);



  const fetchAuditLogs = async (page: number = currentPage) => {
    try {
      const response = await getAuditLogs(page);
      setAuditLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
      setTotalLogs(response.data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  useEffect(() => {
    const handleDeviceConnected = () => {
      setScannerConnected(true);
      setScannerStatus('Connected');
    };

    const handleDeviceDisconnected = () => {
      setScannerConnected(false);
      setScannerStatus('Disconnected');
    };

    fingerprintControl.onDeviceConnected = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnected = handleDeviceDisconnected;

    // Check initial connection status (same as AttendanceKiosk)
    const checkInitialConnection = () => {
      try {
        if (fingerprintControl.isDeviceConnected) {
          console.log('Home: Device was already connected');
          // Call the callback to update UI state
          handleDeviceConnected();
        } else {
          console.log('Home: Device not connected yet, waiting for connection event');
          setScannerStatus('Checking...');

          // Add a small delay to check again in case the global init is still running
          setTimeout(() => {
            if (fingerprintControl.isDeviceConnected) {
              console.log('Home: Device connected after delay');
              // Call the callback to update UI state
              handleDeviceConnected();
            } else {
              console.log('Home: Device still not connected after delay');
              setScannerConnected(false);
              setScannerStatus('Not Detected');
            }
          }, 3000); // Wait 3 seconds for global init to complete
        }
      } catch (error) {
        console.warn('Home: Error checking initial connection:', error);
        setScannerConnected(false);
        setScannerStatus('Error');
      }
    };

    checkInitialConnection();

    // Cleanup callbacks on unmount (but don't destroy the global instance)
    return () => {
      // Clear callbacks to prevent memory leaks
      fingerprintControl.onDeviceConnected = null as any;
      fingerprintControl.onDeviceDisconnected = null as any;
    };
  }, []);

  // Redirect to staff login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/staff/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div>
      <Heading as="h2" fontSize="1.8rem" margin="2rem auto" textAlign="center">
        👋 Welcome!
      </Heading>

      {/* System Status Floating Widget */}
      <Alert
        status={scannerConnected ? "success" : "warning"}
        position="fixed"
        bottom="20px"
        right="20px"
        maxW="250px"
        zIndex="10"
        boxShadow="lg"
        borderRadius="md"
        padding="0.5rem"
      >
        <AlertIcon boxSize="1rem" />
        <AlertTitle fontSize="sm">System Status: {scannerConnected ? "Online" : "Limited"}</AlertTitle>
        <AlertDescription fontSize="xs">
          Fingerprint scanner: <Badge colorScheme={scannerConnected ? "green" : "orange"} fontSize="0.7em">{scannerStatus}</Badge>
          {scannerConnected ? " - Ready for attendance marking." : " - Connect scanner for full functionality."}
        </AlertDescription>
      </Alert>



      {/* Dashboard Stats - Only show if authenticated */}
      {isAuthenticated && staffInfo && (
        <Card marginBottom="2rem" maxW="800px" marginX="auto">
          <Box padding="1rem">
            {/* Session Filter */}
            <Flex justifyContent="center" marginBottom="1rem">
              <Select
                placeholder="Select Session"
                value={selectedSession}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSession(e.target.value)}
                maxW="200px"
                bg="white"
                borderColor="gray.300"
              >
                <option value="all">All Sessions</option>
                <option value="AM">Morning (AM)</option>
                <option value="PM">Afternoon (PM)</option>
              </Select>
            </Flex>

            {/* Key Stats */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} marginBottom="2rem">
              <Card bg="gray.50" p={4} borderRadius="md" boxShadow="md">
                <Stat>
                  <StatLabel display="flex" alignItems="center">
                    <Icon as={FaUsers} mr={2} color="gray.600" />
                    Total Students
                  </StatLabel>
                  <StatNumber fontSize="3xl" color="gray.800">{stats.totalStudents}</StatNumber>
                </Stat>
              </Card>
              <Card bg="blue.50" p={4} borderRadius="md" boxShadow="md">
                <Stat>
                  <StatLabel display="flex" alignItems="center">
                    <Icon as={FaCheck} mr={2} color="blue.500" />
                    Present Today
                  </StatLabel>
                  <StatNumber fontSize="3xl" color="blue.600">{stats.presentToday}</StatNumber>
                </Stat>
              </Card>
              <Card bg="red.50" p={4} borderRadius="md" boxShadow="md">
                <Stat>
                  <StatLabel display="flex" alignItems="center">
                    <Icon as={MdCancel} mr={2} color="red.500" />
                    Absent Today
                  </StatLabel>
                  <StatNumber fontSize="3xl" color="red.600">{absentToday}</StatNumber>
                </Stat>
              </Card>
            </Grid>

            {/* Today's Attendance by Grade */}
            {stats.gradeStats && stats.gradeStats.length > 0 && (
              <Box marginBottom="2rem">
                <Text fontSize="xl" fontWeight="bold" textAlign="center" marginBottom="1rem">
                  Today's Attendance by Grade
                </Text>
                <Grid templateColumns="repeat(6, 1fr)" gap={4}>
                  {stats.gradeStats
                    .sort((a: any, b: any) => parseInt(a.grade) - parseInt(b.grade))
                    .map((gradeStat: any, index: number) => {
                    const gradeColors: Record<string, string> = {
                      '1': '#E57373', // Bright Red
                      '2': '#FFB74D', // Vivid Orange
                      '3': '#FFD54F', // Neon Yellow
                      '4': '#81C784', // Lime Green
                      '5': '#64B5F6', // Pure Blue
                      '6': '#9575CD', // Strong Blue Violet
                    };

                    const createGradient = (baseColor: string) => {
                      // Create a gradient by lightening and darkening the base color
                      const lightenColor = (color: string, percent: number) => {
                        const num = parseInt(color.replace("#", ""), 16);
                        const amt = Math.round(2.55 * percent);
                        const R = (num >> 16) + amt;
                        const G = (num >> 8 & 0x00FF) + amt;
                        const B = (num & 0x0000FF) + amt;
                        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                          (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                          (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
                      };
                      const darkerColor = lightenColor(baseColor, -20);
                      const lighterColor = lightenColor(baseColor, 20);
                      return `linear(to-br, ${lighterColor}, ${darkerColor})`;
                    };

                    const gradients = Object.values(gradeColors).map(color => createGradient(color));
                    const present = gradeStat.data[0]?.presentStudents || 0;
                    const absent = gradeStat.data[0]?.absentStudents || 0;
                    const total = gradeStat.data[0]?.totalStudents || 0;
                    return (
                      <Card
                        key={gradeStat.grade}
                        bgGradient={gradients[index % gradients.length]}
                        borderRadius="xl"
                        boxShadow="lg"
                        p={4}
                        minH="160px"
                        position="relative"
                        overflow="hidden"
                        _hover={{ transform: 'translateY(-1px)', transition: 'all 0.2s' }}
                      >
                        <Box
                          position="absolute"
                          top="20px"
                          left="50%"
                          transform="translateX(-50%)"
                          bg="whiteAlpha.200"
                          borderRadius="xl"
                          p={3}
                          backdropFilter="blur(10px)"
                        >
                          <Icon as={FaUsers} color="white" boxSize={6} />
                        </Box>
                        <Box textAlign="center" mt="60px">
                          <Text fontSize="lg" fontWeight="bold" color="white" mb={1}>
                            Grade {gradeStat.grade}
                          </Text>
                          <Text fontSize="sm" color="whiteAlpha.800" mb={2}>
                            Present: {present} / Absent: {absent}
                          </Text>
                          <Text fontSize="sm" color="whiteAlpha.900" position="absolute" bottom="5px" right="10px">
                            Total: {total}
                          </Text>
                        </Box>
                      </Card>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* Key Visualizations */}
            <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={6} marginTop="2rem">
              {/* Daily Present vs. Absent Trend */}
              <Box>
                <Text fontWeight="bold" marginBottom="1rem" textAlign="center">Daily Present vs. Absent Trend (Last 7 Days)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                      <YAxis domain={[0, 50]} ticks={[50, 40, 30, 20, 10, 0]} tickFormatter={(value) => Math.round(value).toString()} />
                    <Tooltip />
                    <Bar dataKey="Present" fill="#3182CE" />
                    <Bar dataKey="Absent" fill="#E53E3E" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Today's Attendance Rate Gauge */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <Text fontWeight="bold" marginBottom="1rem" textAlign="center">Today's Attendance Rate</Text>
                <CircularProgress value={stats.attendanceRate} size="200px" thickness="12px" color={stats.attendanceRate >= 80 ? "green.400" : stats.attendanceRate >= 60 ? "yellow.400" : "red.400"}>
                  <CircularProgressLabel fontSize="2xl" fontWeight="bold">{stats.attendanceRate}%</CircularProgressLabel>
                </CircularProgress>
              </Box>
            </Grid>

          </Box>
        </Card>
      )}





      {/* Quick Action Buttons */}
      <Card maxW={800} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Quick Actions
        </CardHeader>
        <Flex flexDirection={{ base: 'column', md: 'row' }} gap="1rem" padding="1rem" justifyContent="center" flexWrap="wrap">
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }} minW="160px">
            <Link to="/staff/manage/attendance" className="login-link">
              Mark Attendance
            </Link>
          </Button>
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }} minW="160px">
            <Link to="/staff/manage/students" className="login-link">
              Manage Students
            </Link>
          </Button>
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }} minW="160px">
            <Link to="/staff/reports" className="login-link">
              View Reports
            </Link>
          </Button>
          {isAuthenticated && (
            <Button
              bg="var(--bg-primary)"
              color="white"
              _hover={{ background: 'var(--bg-primary-light)' }}
              leftIcon={<FaHistory />}
              minW="160px"
              onClick={() => {
                setIsActivityLogsOpen(true);
                fetchAuditLogs(1);
              }}
            >
              Activity Logs
            </Button>
          )}
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }} minW="160px">
            <Link to="/staff/login" className="login-link">
              Staff Login
            </Link>
          </Button>
        </Flex>
      </Card>

      {/* Activity Logs Modal */}
      <Modal isOpen={isActivityLogsOpen} onClose={() => setIsActivityLogsOpen(false)} size="6xl">
        <ModalOverlay />
        <ModalContent maxW="90vw">
          <ModalHeader>Activity Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th width="15%">Action</Th>
                    <Th width="20%">User</Th>
                    <Th width="25%">Timestamp</Th>
                    <Th width="40%">Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {auditLogs.map((log: any) => (
                    <Tr key={log.id}>
                      <Td fontSize="sm">{log.action}</Td>
                      <Td fontSize="sm">{log.staff?.name || 'Unknown'}</Td>
                      <Td fontSize="sm">{new Date(log.created_at).toLocaleString()}</Td>
                      <Td fontSize="sm" wordBreak="break-word">{log.details || 'N/A'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            <Box marginTop="1rem">
              <HStack spacing={4} justify="center">
                <Button
                  onClick={() => fetchAuditLogs(currentPage - 1)}
                  isDisabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <Text>
                  Page {currentPage} of {totalPages} ({totalLogs} total logs)
                </Text>
                <Button
                  onClick={() => fetchAuditLogs(currentPage + 1)}
                  isDisabled={currentPage === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </HStack>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsActivityLogsOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Home;

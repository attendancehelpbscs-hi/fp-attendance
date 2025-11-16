import type { FC } from 'react';
import { Card, CardHeader, Heading, Flex, Button, Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Text, Badge, List, ListItem, ListIcon, CircularProgress, CircularProgressLabel, Icon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { fingerprintControl } from '../lib/fingerprint';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaUsers, FaCheck } from 'react-icons/fa6';
import { MdCancel } from 'react-icons/md';

import { useGetDashboardStats, useGetReports } from '../api/atttendance.api';
import { useGetAuditLogs } from '../api/audit.api';
import useStore from '../store/store';

const Home: FC = () => {
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');


  const isAuthenticated = useStore.use.isAuthenticated();
  const staffInfo = useStore.use.staffInfo();

  // Fetch dashboard stats if authenticated
  const { data: dashboardData, isLoading: statsLoading, refetch: refetchDashboard } = useGetDashboardStats(
    isAuthenticated && staffInfo?.id ? staffInfo.id : '',
    {
      enabled: isAuthenticated && !!staffInfo?.id,
    }
  );

  // Fetch real data for daily trend (last 7 days)
  const { data: reportsData, refetch: refetchReports } = useGetReports(
    isAuthenticated && staffInfo?.id ? staffInfo.id : '',
    {
      dateRange: '7days',
    }
  );

  // Fetch recent audit logs
  const { data: auditData } = useGetAuditLogs(1, 3, {
    enabled: isAuthenticated && !!staffInfo?.id,
  });

  // Use real data if available, otherwise fallback to mock data
  const stats = dashboardData?.data || {
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
      // Group by date and sum present/absent across all grades
      const dateGroups: Record<string, { present: number; absent: number }> = {};
      reports.forEach((report: any) => {
        const dateKey = new Date(report.date).toISOString().split('T')[0];
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = { present: 0, absent: 0 };
        }
        dateGroups[dateKey].present += report.present;
        dateGroups[dateKey].absent += report.absent;
      });

      // Get last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const group = dateGroups[dateKey];
        const present = group ? group.present : 0;
        const absent = group ? group.absent : 0;
        last7Days.push({
          day: dayName,
          Present: present,
          Absent: absent,
        });
      }

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
  }, [reportsData]);

  // Use real data for monthly absence breakdown
  const monthlyAbsenceData = useMemo(() => {
    if (reportsData?.data?.reports) {
      const reports = reportsData.data.reports;
      // Group by month and sum absences
      const monthGroups: Record<string, number> = {};
      reports.forEach((report: any) => {
        const date = new Date(report.date);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        if (!monthGroups[monthName]) {
          monthGroups[monthName] = 0;
        }
        monthGroups[monthName] += report.absent;
      });

      // Convert to array
      return Object.entries(monthGroups).map(([name, value]) => ({ name, value }));
    }

    // Fallback to mock data
    return [
      { name: 'Jan', value: 15 },
      { name: 'Feb', value: 20 },
      { name: 'Mar', value: 18 },
      { name: 'Apr', value: 12 },
      { name: 'May', value: 10 },
      { name: 'Jun', value: 25 },
    ];
  }, [reportsData]);

  const monthColorMap: Record<string, string> = {
    'Jan': '#4DB6AC',
    'Feb': '#F06292',
    'Mar': '#BA68C8',
    'Apr': '#A1887F',
    'May': '#7986CB',
    'Jun': '#DCE775',
    'Jul': '#4DD0E1',
    'Aug': '#AED581',
    'Sep': '#BCAAA4',
    'Oct': '#FF8A65',
    'Nov': '#757575',
    'Dec': '#FFCA28',
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
    fingerprintControl.init();

    // Check initial status
    setTimeout(() => {
      if (!scannerConnected) {
        setScannerStatus('Not Detected');
      }
    }, 2000);

    // Recent activity / audit logs removed from dashboard to simplify UI
  }, [scannerConnected]);

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

      {/* Recent Activity & Audit Logs Floating Widget */}
      {isAuthenticated && auditData?.data?.logs && (
        <Box
          position="fixed"
          bottom="20px"
          left="20px"
          maxW="240px"
          zIndex="10"
          boxShadow="lg"
          borderRadius="md"
          bg="white"
          p={3}
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            Recent Activity
          </Text>
          <List spacing={1}>
            {auditData.data.logs.slice(0, 2).map((log: any, index: number) => (
              <ListItem key={index} fontSize="xs">
                <ListIcon as={FaCheck} color="green.500" />
                <Text as="span" fontWeight="medium">
                  {log.staff?.name || 'Unknown'}:
                </Text>{' '}
                {log.action}
                {log.details && (
                  <Text as="span" color="gray.600" ml={1}>
                    ({log.details})
                  </Text>
                )}
                <Text as="span" color="gray.500" ml={1}>
                  {new Date(log.created_at).toLocaleString()}
                </Text>
              </ListItem>
            ))}
          </List>
          <Text fontSize="xs" color="gray.600" mt={2}>
            For full audit logs or to download, go to Settings → Audit Logs.
          </Text>
        </Box>
      )}

      {/* Dashboard Stats - Only show if authenticated */}
      {isAuthenticated && staffInfo && (
        <Card marginBottom="2rem" maxW="800px" marginX="auto">
          <Box padding="1rem">
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
            <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr' }} gap={6} marginTop="2rem">
              {/* Daily Present vs. Absent Trend */}
              <Box>
                <Text fontWeight="bold" marginBottom="1rem" textAlign="center">Daily Present vs. Absent Trend (Last 7 Days)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                      <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
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

              {/* Monthly Absence Breakdown */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <Text fontWeight="bold" marginBottom="1rem" textAlign="center">Monthly Absence Breakdown</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlyAbsenceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                    label={({ name }) => `${name}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {monthlyAbsenceData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={monthColorMap[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>

          </Box>
        </Card>
      )}





      {/* Quick Action Buttons */}
      <Card maxW={600} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Quick Actions
        </CardHeader>
        <Flex flexDirection={{ base: 'column', md: 'row' }} gap="1rem" padding="1rem" justifyContent="center">
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }}>
            <Link to="/staff/manage/attendance" className="login-link">
              Mark Attendance
            </Link>
          </Button>
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }}>
            <Link to="/staff/manage/students" className="login-link">
              Manage Students
            </Link>
          </Button>
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }}>
            <Link to="/staff/reports" className="login-link">
              View Reports
            </Link>
          </Button>
          <Button bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }}>
            <Link to="/staff/login" className="login-link">
              Staff Login
            </Link>
          </Button>
        </Flex>
      </Card>
    </div>
  );
};

export default Home;

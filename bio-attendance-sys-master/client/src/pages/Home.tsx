import type { FC } from 'react';
import { Card, CardHeader, Heading, Flex, Button, Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Text, Badge, List, ListItem, ListIcon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fingerprintControl } from '../lib/fingerprint';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { useGetDashboardStats } from '../api/atttendance.api';
import useStore from '../store/store';

const Home: FC = () => {
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');


  const isAuthenticated = useStore.use.isAuthenticated();
  const staffInfo = useStore.use.staffInfo();

  // Fetch dashboard stats if authenticated
  const { data: dashboardData, isLoading: statsLoading } = useGetDashboardStats(
    isAuthenticated && staffInfo?.id ? staffInfo.id : '',
    {
      enabled: isAuthenticated && !!staffInfo?.id,
    }
  );

  // Use real data if available, otherwise fallback to mock data
  const stats = dashboardData?.data || {
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    gradeStats: []
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

      {/* System Status Alert */}
      <Alert status={scannerConnected ? "success" : "warning"} marginBottom="2rem" borderRadius="md">
        <AlertIcon />
        <AlertTitle>System Status: {scannerConnected ? "Online" : "Limited"}</AlertTitle>
        <AlertDescription>
          Fingerprint scanner: <Badge colorScheme={scannerConnected ? "green" : "orange"}>{scannerStatus}</Badge>
          {scannerConnected ? " - Ready for attendance marking." : " - Connect scanner for full functionality."}
        </AlertDescription>
      </Alert>

      {/* Scanner Status Card */}
      <Card marginBottom="2rem" maxW="400px" marginX="auto">
        <CardHeader padding="1rem">
          <Flex alignItems="center" justifyContent="space-between">
            <Box>
              <Text fontWeight="bold" fontSize="lg">Scanner Status</Text>
              <Text fontSize="sm" color="gray.600">Hardware Connection</Text>
            </Box>
            <Badge
              colorScheme={scannerConnected ? "green" : scannerStatus === 'Checking...' ? "blue" : "red"}
              fontSize="0.8em"
              padding="0.25rem 0.5rem"
            >
              {scannerStatus}
            </Badge>
          </Flex>
        </CardHeader>
      </Card>

      {/* Dashboard Stats - Only show if authenticated */}
      {isAuthenticated && staffInfo && (
        <Card marginBottom="2rem" maxW="800px" marginX="auto">
          <Box padding="1rem">
            {/* Key Stats */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} marginBottom="2rem">
              <Stat>
                <StatLabel>Total Enrolled Students</StatLabel>
                <StatNumber>{stats.totalStudents}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Present Today</StatLabel>
                <StatNumber>{stats.presentToday}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Overall Attendance Rate</StatLabel>
                <StatNumber>{stats.attendanceRate}%</StatNumber>
              </Stat>
            </Grid>

            {/* Historical Line Graph for Grades - Last 7 Days */}
            <Box marginTop="2rem">
              <Text fontWeight="bold" marginBottom="1rem" textAlign="center">Attendance Trends by Grade (Last 7 Days)</Text>
              {stats.gradeStats && stats.gradeStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      type="category"
                      allowDuplicatedCategory={false}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      formatter={(value, name) => [`${value}%`, `Grade ${name}`]}
                    />
                    {stats.gradeStats.map((gradeStat, index) => (
                      <Line
                        key={gradeStat.grade}
                        type="monotone"
                        dataKey="attendanceRate"
                        data={gradeStat.data}
                        name={gradeStat.grade}
                        stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={{ fill: `hsl(${index * 137.5 % 360}, 70%, 50%)`, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: `hsl(${index * 137.5 % 360}, 70%, 50%)`, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box height="400px" display="flex" alignItems="center" justifyContent="center" border="1px solid #E2E8F0" borderRadius="md">
                  <Text fontSize="lg" color="gray.500" textAlign="center">
                    No attendance data available.<br />
                    The graph will show trends once students are enrolled and attendance is marked over multiple days.
                  </Text>
                </Box>
              )}
              <Box marginTop="1rem">
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Hover over lines to see attendance rates for each grade over time
                </Text>
              </Box>
            </Box>

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

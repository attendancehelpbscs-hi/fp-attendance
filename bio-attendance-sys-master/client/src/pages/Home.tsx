import type { FC } from 'react';
import { Card, CardHeader, Heading, Flex, Button, Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Text, Badge, List, ListItem, ListIcon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fingerprintControl } from '../lib/fingerprint';
import { getAuditLogs } from '../api/audit.api';
import { useGetDashboardStats } from '../api/atttendance.api';
import useStore from '../store/store';

const Home: FC = () => {
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Checking...');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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
    attendanceRate: 0
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

    // Fetch audit logs if authenticated
    const fetchAuditLogs = async () => {
      if (isAuthenticated) {
        try {
          const response = await getAuditLogs();
          setAuditLogs(response.data.logs.slice(0, 3)); // Show last 3 logs for confidentiality
        } catch (error) {
          console.error('Failed to fetch audit logs:', error);
        }
      }
    };

    fetchAuditLogs();
  }, [scannerConnected]);

  return (
    <div>
      <Heading as="h2" fontSize="1.8rem" margin="2rem auto" textAlign="center">
        Welcome to FP Attendance System
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



      {/* Recent Activity / Audit Logs */}
      <Card maxW={800} margin="2rem auto" marginBottom="2rem">
        <CardHeader fontWeight={600} fontSize="1.5rem" textAlign="center">
          Recent Activity
        </CardHeader>
        <Box padding="1rem">
          {auditLogs.length > 0 ? (
            <List spacing={3}>
              {auditLogs.map((log) => (
                <ListItem key={log.id}>
                  <ListIcon as={() => <Badge colorScheme={log.action === 'LOGIN' ? 'green' : 'orange'}>{log.action}</Badge>} />
                  <Text as="span" fontWeight="bold">{log.staff.name}</Text> ({log.staff.email}) - {log.details} at {new Date(log.created_at).toLocaleString()}
                </ListItem>
              ))}
            </List>
          ) : (
            <Text textAlign="center" color="gray.500">No recent activities</Text>
          )}
        </Box>
      </Card>

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

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Card,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  VStack,
  HStack,
  Divider,
} from '@chakra-ui/react';
import { DownloadIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { getAuditLogs } from '../../api/audit.api';

const Settings: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [schoolName, setSchoolName] = useState('Bula South Central Elementary School');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [gracePeriod, setGracePeriod] = useState(5);
  const [lateMarking, setLateMarking] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();
  const { isOpen: isClearLogsOpen, onOpen: onClearLogsOpen, onClose: onClearLogsClose } = useDisclosure();
  const { isOpen: isViewLogsOpen, onOpen: onViewLogsOpen, onClose: onViewLogsClose } = useDisclosure();

  const handleBackup = () => {
    // Mock backup functionality
    toast.success('Data backup initiated successfully');
    onBackupClose();
  };

  const handleClearLogs = () => {
    // Mock clear logs functionality
    toast.success('System logs cleared successfully');
    onClearLogsClose();
  };

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveSchoolInfo = () => {
    toast.success('School information updated successfully');
  };

  const handleSaveRules = () => {
    toast.success('Attendance rules updated successfully');
  };

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await getAuditLogs();
        setAuditLogs(response.data.logs);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        toast.error('Failed to load audit logs');
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <WithStaffLayout>
      <Heading as="h2" fontSize="1.8rem" margin="2rem auto" textAlign="center">
        SETTINGS
      </Heading>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Profile</Tab>
          <Tab>School Info</Tab>
          <Tab>Attendance Rules</Tab>
          <Tab>Data & Security</Tab>
          <Tab>Audit Logs</Tab>
          <Tab>Session Management</Tab>
        </TabList>

        <TabPanels>
          {/* Profile Tab */}
          <TabPanel>
            <Card maxW={500} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Update Profile</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input type="text" value={staffInfo?.name} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Email address</FormLabel>
                    <Input type="email" disabled value={staffInfo?.email} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <Input type="password" />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Confirm New Password</FormLabel>
                    <Input type="password" />
                  </FormControl>
                  <Button
                    bg="var(--bg-primary)"
                    color="white"
                    _hover={{ background: 'var(--bg-primary-light)' }}
                    onClick={handleSaveProfile}
                  >
                    Save Profile
                  </Button>
                </VStack>
              </Box>
            </Card>
          </TabPanel>

          {/* School Info Tab */}
          <TabPanel>
            <Card maxW={500} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">School Information</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>School Name</FormLabel>
                    <Input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>School Logo URL</FormLabel>
                    <Input type="text" value={schoolLogo} onChange={(e) => setSchoolLogo(e.target.value)} placeholder="Enter logo URL" />
                  </FormControl>
                  <FormControl>
                    <FormLabel>School Address</FormLabel>
                    <Input type="text" placeholder="Enter school address" />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Contact Number</FormLabel>
                    <Input type="tel" placeholder="Enter contact number" />
                  </FormControl>
                  <Button
                    bg="var(--bg-primary)"
                    color="white"
                    _hover={{ background: 'var(--bg-primary-light)' }}
                    onClick={handleSaveSchoolInfo}
                  >
                    Save School Info
                  </Button>
                </VStack>
              </Box>
            </Card>
          </TabPanel>

          {/* Attendance Rules Tab */}
          <TabPanel>
            <Card maxW={500} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Attendance Rules</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Grace Period (minutes)</FormLabel>
                    <NumberInput value={gracePeriod} onChange={(_, value) => setGracePeriod(value)} min={0} max={60}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Enable Late Marking</FormLabel>
                    <Switch isChecked={lateMarking} onChange={(e) => setLateMarking(e.target.checked)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Late Threshold (%)</FormLabel>
                    <NumberInput defaultValue={75} min={0} max={100}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <Button
                    bg="var(--bg-primary)"
                    color="white"
                    _hover={{ background: 'var(--bg-primary-light)' }}
                    onClick={handleSaveRules}
                  >
                    Save Rules
                  </Button>
                </VStack>
              </Box>
            </Card>
          </TabPanel>

          {/* Data & Security Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Card maxW={500} margin="1rem auto">
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Data Encryption</Heading>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Enable Data Encryption</FormLabel>
                    <Switch isChecked={encryptionEnabled} onChange={(e) => setEncryptionEnabled(e.target.checked)} />
                  </FormControl>
                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    Encrypt sensitive data like fingerprints and personal information.
                  </Text>
                </Box>
              </Card>

              <Card maxW={500} margin="1rem auto">
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Data Management</Heading>
                  <HStack spacing={4}>
                    <Button leftIcon={<DownloadIcon />} colorScheme="blue" onClick={onBackupOpen}>
                      Backup Data
                    </Button>
                    <Button leftIcon={<DeleteIcon />} colorScheme="red" onClick={onClearLogsOpen}>
                      Clear Logs
                    </Button>
                  </HStack>
                </Box>
              </Card>
            </VStack>
          </TabPanel>

          {/* Audit Logs Tab */}
          <TabPanel>
            <Card maxW={800} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Access & Audit Logs</Heading>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Action</Th>
                        <Th>User</Th>
                        <Th>Timestamp</Th>
                        <Th>Details</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {auditLogs.map((log) => (
                        <Tr key={log.id}>
                          <Td>{log.action}</Td>
                          <Td>{log.staff?.name || 'Unknown'}</Td>
                          <Td>{new Date(log.created_at).toLocaleString()}</Td>
                          <Td>{log.details || 'N/A'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Button leftIcon={<ViewIcon />} colorScheme="teal" marginTop="1rem" onClick={onViewLogsOpen}>
                  View Full Logs
                </Button>
              </Box>
            </Card>
          </TabPanel>

          {/* Session Management Tab */}
          <TabPanel>
            <Card maxW={500} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">User Session Management</Heading>
                <VStack spacing={4} align="stretch">
                  <Text>Current active sessions: 1</Text>
                  <Divider />
                  <Button colorScheme="red" variant="outline">
                    Logout All Other Sessions
                  </Button>
                  <Button colorScheme="orange" variant="outline">
                    Force Logout All Users
                  </Button>
                  <Text fontSize="sm" color="gray.600">
                    Use these options carefully as they will affect user access.
                  </Text>
                </VStack>
              </Box>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Backup Confirmation Modal */}
      <Modal isOpen={isBackupOpen} onClose={onBackupClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Data Backup</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to backup all system data? This may take a few minutes.</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleBackup}>
              Yes, Backup
            </Button>
            <Button variant="ghost" onClick={onBackupClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Clear Logs Confirmation Modal */}
      <Modal isOpen={isClearLogsOpen} onClose={onClearLogsClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Clear System Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                  Clearing system logs will permanently delete all audit records. This action cannot be undone.
                  Are you sure you want to proceed?
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleClearLogs}>
              Yes, Clear Logs
            </Button>
            <Button variant="ghost" onClick={onClearLogsClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Full Logs Modal */}
      <Modal isOpen={isViewLogsOpen} onClose={onViewLogsClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Full Audit Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Timestamp</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {auditLogs.map((log) => (
                    <Tr key={log.id}>
                      <Td>{log.action}</Td>
                      <Td>{log.staff?.name || 'Unknown'}</Td>
                      <Td>{new Date(log.created_at).toLocaleString()}</Td>
                      <Td>{log.details || 'N/A'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onViewLogsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </WithStaffLayout>
  );
};

export default Settings;

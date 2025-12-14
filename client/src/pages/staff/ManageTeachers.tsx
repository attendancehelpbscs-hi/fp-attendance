import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Heading,
  Flex,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  Button,
  Box,
  Spinner,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Card,
  CardBody,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Checkbox,
  HStack,
} from '@chakra-ui/react';
import AddTeacher from '../../components/AddTeacher';
import EnrolledStudentsModal from '../../components/EnrolledStudentsModal';
import useStore from '../../store/store';
import { EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { UserPlus, Eye, List, Mail } from 'lucide-react';
import { useGetTeachers, useDeleteTeacher, useGetPendingTeachers, useApproveTeacher, useSendWelcomeEmail } from '../../api/staff.api';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import { queryClient } from '../../lib/query-client';
import { Teacher } from '../../interfaces/api.interface';

const ManageTeachers: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10);
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  
  // Teacher details modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTeacherForDetails, setSelectedTeacherForDetails] = useState<Teacher | null>(null);
  const { isOpen: isStudentsModalOpen, onOpen: onStudentsModalOpen, onClose: onStudentsModalClose } = useDisclosure();
  const [selectedTeacherForStudents, setSelectedTeacherForStudents] = useState<Teacher | null>(null);
  
  // Delete single teacher
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [deletePasswordError, setDeletePasswordError] = useState<string>('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // Bulk delete
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const bulkCancelRef = useRef<HTMLButtonElement>(null);

  // Approve/Reject confirmation dialogs
  const { isOpen: isApproveOpen, onOpen: onApproveOpen, onClose: onApproveClose } = useDisclosure();
  const { isOpen: isRejectOpen, onOpen: onRejectOpen, onClose: onRejectClose } = useDisclosure();
  const [teacherToApprove, setTeacherToApprove] = useState<Teacher | null>(null);
  const [teacherToReject, setTeacherToReject] = useState<Teacher | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const { data, error, isLoading, isError } = useGetTeachers(page, per_page, {
    keepPreviousData: true,
  });

  const { data: pendingData, isLoading: isPendingLoading, error: pendingError } = useGetPendingTeachers({
    keepPreviousData: true,
  });

  const toastRef = useRef<string>('');
  const { mutate: deleteTeacher } = useDeleteTeacher({
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      toast.dismiss(toastRef.current);
      toast.success('Teacher deleted successfully');
    },
    onError: (err) => {
      toast.dismiss(toastRef.current);
      toast.error((err.response?.data?.message as string) ?? 'An error occurred');
    },
  });

  const { mutate: approveTeacher } = useApproveTeacher({
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['teachers']);
      queryClient.invalidateQueries(['pending_teachers']);
      toast.success(`Teacher ${variables.action}d successfully`);
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occurred');
    },
  });

  const { mutate: sendWelcomeEmail } = useSendWelcomeEmail({
    onSuccess: () => {
      toast.success('Welcome email sent successfully');
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'Failed to send welcome email');
    },
  });

  useEffect(() => {
    if (activeTeacher) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [activeTeacher]);

  // Filter and sort teachers
  const filteredTeachers = data?.data?.teachers?.filter((teacher: Teacher) => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          teacher.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (teacher.matric_no && teacher.matric_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (teacher.section && teacher.section.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (teacher.grade && teacher.grade.toString().includes(searchTerm));
    return matchesSearch;
  }).sort((a: Teacher, b: Teacher) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'email') return a.email.localeCompare(b.email);
    if (sortBy === 'role') return a.role.localeCompare(b.role);
    return 0;
  }) || [];

  const meta = data?.data?.meta;

  const handleSelectTeacher = (teacherId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTeachers(prev => [...prev, teacherId]);
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedTeachers(filteredTeachers.map((teacher: Teacher) => teacher.id));
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleBulkDelete = () => {
    selectedTeachers.forEach((teacherId: string) => {
      deleteTeacher({ url: `/${teacherId}` });
    });
    setSelectedTeachers([]);
    onBulkDeleteClose();
  };

  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem">
        <Heading fontSize={25} fontWeight={600}>
          Manage Teachers
        </Heading>
        <Flex gap={4}>
          {selectedTeachers.length > 0 && (
            <Button
              bg="red.500"
              color="white"
              _hover={{ background: 'red.600' }}
              onClick={onBulkDeleteOpen}
            >
              Delete Selected ({selectedTeachers.length})
            </Button>
          )}
          <Button
            bg="var(--bg-primary)"
            color="white"
            _hover={{ background: 'var(--bg-primary-light)' }}
            leftIcon={<UserPlus />}
            onClick={() => setDrawerOpen(true)}
          >
            Add New Teacher
          </Button>
        </Flex>
      </Flex>

      <Tabs variant="enclosed" colorScheme="blue" marginTop="1rem">
        <TabList>
          <Tab>All Teachers</Tab>
          <Tab>Pending Approvals</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>

      {/* Filters and Search */}
      <Card marginTop="1rem" marginBottom="1rem">
        <CardBody>
          <Flex gap={4} flexWrap="wrap" alignItems="center">
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by name, email, role, ID, or section"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>

            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name-asc">Sort by Name (A-Z)</option>
              <option value="name-desc">Sort by Name (Z-A)</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
            </Select>
          </Flex>
        </CardBody>
      </Card>

      {isLoading ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Spinner color="var(--bg-primary)" />
        </Box>
      ) : isError ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Text>Error: {error?.response?.data?.message}</Text>
        </Box>
      ) : (
        <TableContainer marginTop={10} width="100%" overflowX="auto">
          <Table variant="simple" size="sm" width="100%">
            <TableCaption>All Teachers</TableCaption>
            <Thead>
              <Tr>
                <Th width="30px">
                  <Checkbox
                    isChecked={selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0}
                    isIndeterminate={selectedTeachers.length > 0 && selectedTeachers.length < filteredTeachers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                <Th width="120px">Name</Th>
                <Th width="150px">Email</Th>
                <Th width="100px">Teacher ID</Th>
                <Th width="80px">Section</Th>
                <Th width="70px">Grade</Th>
                <Th width="90px">Status</Th>
                <Th width="80px">Role</Th>
                <Th width="110px">Created At</Th>
                <Th width="120px">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTeachers.map((teacher: Teacher, idx: number) => (
                <Tr key={idx}>
                  <Td>
                    <Checkbox
                      isChecked={selectedTeachers.includes(teacher.id)}
                      onChange={(e) => handleSelectTeacher(teacher.id, e.target.checked)}
                    />
                  </Td>
                  <Td><strong>{teacher.name}</strong></Td>
                  <Td>{teacher.email}</Td>
                  <Td>{teacher.matric_no || 'N/A'}</Td>
                  <Td>{teacher.section || 'N/A'}</Td>
                  <Td>{teacher.grade ? `Grade ${teacher.grade}` : 'N/A'}</Td>
                  <Td>
                    <Badge
                      colorScheme={
                        (teacher as any).approval_status === 'APPROVED' ? 'green' :
                        (teacher as any).approval_status === 'PENDING' ? 'yellow' :
                        (teacher as any).approval_status === 'REJECTED' ? 'red' : 'gray'
                      }
                    >
                      {(teacher as any).approval_status || 'APPROVED'}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={teacher.role === 'admin' ? 'red' : 'blue'}>
                      {teacher.role}
                    </Badge>
                  </Td>
                  <Td>{new Date(teacher.created_at).toLocaleDateString()}</Td>
                  <Td>
                    <Flex flexDirection="column" gap={1} alignItems="center">
                      <IconButton
                        size="sm"
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="View teacher details"
                        onClick={() => {
                          setSelectedTeacherForDetails(teacher);
                          onOpen();
                        }}
                        icon={<Eye size={16} />}
                      />
                      {staffInfo?.role === 'ADMIN' && (
                        <IconButton
                          size="sm"
                          bg="transparent"
                          _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                          color="var(--bg-primary)"
                          aria-label="View enrolled students"
                          onClick={() => {
                            setSelectedTeacherForStudents(teacher);
                            onStudentsModalOpen();
                          }}
                          icon={<List size={16} />}
                        />
                      )}
                      <IconButton
                        size="sm"
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="Send welcome email"
                        onClick={() => sendWelcomeEmail({ teacherId: teacher.id, url: `/${teacher.id}/send-welcome-email` })}
                        icon={<Mail size={16} />}
                      />
                      <IconButton
                        size="sm"
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="Edit teacher"
                        onClick={() => setActiveTeacher(teacher)}
                        icon={<EditIcon />}
                      />
                      <IconButton
                        size="sm"
                        bg="white"
                        color="#d10d0d"
                        _hover={{ color: 'white', background: '#d10d0d' }}
                        aria-label="Delete teacher"
                        onClick={() => {
                          setTeacherToDelete(teacher);
                          onDeleteOpen();
                        }}
                        icon={<DeleteIcon />}
                      />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Flex flexDirection="column" justifyContent="space-between" alignItems="center" marginBottom="1rem">
            <Text>Total Teachers: {filteredTeachers.length} (filtered from {meta?.total_items})</Text>
            <Text>
              Page {meta?.page} of {meta?.total_pages}
            </Text>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center">
            <Button
              size="sm"
              disabled={Number(meta?.page ?? 0) <= 1}
              onClick={() => !(Number(meta?.page ?? 0) <= 1) && setPage(Number(meta?.page ?? 0) - 1)}
            >
              Prev
            </Button>
            <Button
              size="sm"
              disabled={Number(meta?.page ?? 0) >= Number(meta?.total_pages ?? 0)}
              onClick={() =>
                !(Number(meta?.page ?? 0) >= Number(meta?.total_pages ?? 0)) && setPage(Number(meta?.page ?? 0) + 1)
              }
            >
              Next
            </Button>
          </Flex>
        </TableContainer>
      )}
          </TabPanel>

          <TabPanel>
            <Text fontSize="lg" fontWeight="bold" mb={4}>Pending Teacher Approvals</Text>
            <Text mb={6}>Review and approve teacher registration requests.</Text>

            {isPendingLoading ? (
              <Box marginTop="4rem" display="flex" justifyContent="center">
                <Spinner color="var(--bg-primary)" />
              </Box>
            ) : pendingError ? (
              <Box marginTop="4rem" display="flex" justifyContent="center">
                <Text>Error: {pendingError?.response?.data?.message}</Text>
              </Box>
            ) : (
              <TableContainer marginTop={4} width="100%" overflowX="auto">
                <Table variant="simple" size="sm" width="100%">
                  <TableCaption>Teachers awaiting approval</TableCaption>
                  <Thead>
                    <Tr>
                      <Th width="150px">Name</Th>
                      <Th width="180px">Email</Th>
                      <Th width="100px">Teacher ID</Th>
                      <Th width="80px">Section</Th>
                      <Th width="70px">Grade</Th>
                      <Th width="110px">Registered</Th>
                      <Th width="120px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pendingData?.data?.teachers?.map((teacher: any, idx: number) => (
                      <Tr key={idx}>
                        <Td><strong>{teacher.name}</strong></Td>
                        <Td>{teacher.email}</Td>
                        <Td>{teacher.matric_no || 'N/A'}</Td>
                        <Td>{teacher.section || 'N/A'}</Td>
                        <Td>{teacher.grade ? `Grade ${teacher.grade}` : 'N/A'}</Td>
                        <Td>{new Date(teacher.created_at).toLocaleDateString()}</Td>
                        <Td>
                          <Flex gap={2}>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => {
                                setTeacherToApprove(teacher);
                                onApproveOpen();
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => {
                                setTeacherToReject(teacher);
                                onRejectOpen();
                              }}
                            >
                              Reject
                            </Button>
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {(!pendingData?.teachers || pendingData.teachers.length === 0) && (
                  <Box textAlign="center" py={8}>
                    <Text fontSize="lg" color="gray.500">
                      No pending teacher approvals at this time.
                    </Text>
                  </Box>
                )}
              </TableContainer>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <AddTeacher
        isOpen={drawerOpen}
        onClose={() => {
          setActiveTeacher(null);
          setDrawerOpen(false);
        }}
        activeTeacher={activeTeacher}
        setActiveTeacher={(teacher) => setActiveTeacher(teacher)}
      />

      {selectedTeacherForStudents && (
        <EnrolledStudentsModal
          isOpen={isStudentsModalOpen}
          onClose={() => {
            onStudentsModalClose();
            setSelectedTeacherForStudents(null);
          }}
          teacher={selectedTeacherForStudents}
        />
      )}

      {/* Teacher Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Teacher Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTeacherForDetails && (
              <Box>
                <HStack spacing={4} mb={4}>
                  <Box>
                    <Text fontWeight="bold">Name:</Text>
                    <Text>{selectedTeacherForDetails.name}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Email:</Text>
                    <Text>{selectedTeacherForDetails.email}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Role:</Text>
                    <Badge colorScheme={selectedTeacherForDetails.role === 'admin' ? 'red' : 'blue'}>
                      {selectedTeacherForDetails.role}
                    </Badge>
                  </Box>
                </HStack>
                <HStack spacing={4} mb={4}>
                  <Box>
                    <Text fontWeight="bold">Teacher ID:</Text>
                    <Text>{selectedTeacherForDetails.matric_no || 'N/A'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Section:</Text>
                    <Text>{selectedTeacherForDetails.section || 'N/A'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Grade:</Text>
                    <Text>{selectedTeacherForDetails.grade ? `Grade ${selectedTeacherForDetails.grade}` : 'N/A'}</Text>
                  </Box>
                </HStack>
                <Box>
                  <Text fontWeight="bold">Created At:</Text>
                  <Text>{new Date(selectedTeacherForDetails.created_at).toLocaleString()}</Text>
                </Box>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Single Teacher Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        closeOnOverlayClick={false}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Teacher - Password Confirmation Required
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={3}>
                Are you sure you want to delete teacher "{teacherToDelete?.name}" (Email: {teacherToDelete?.email})?
              </Text>
              <Text fontSize="sm" color="red.600" fontWeight="bold" mb={2}>
                ⚠️ Warning: This will permanently delete the teacher and ALL associated data including:
              </Text>
              <Text fontSize="sm" color="gray.700" mb={3}>
                • All students enrolled by this teacher<br/>
                • All attendance records<br/>
                • All audit logs and activity history<br/>
                • All authentication tokens
              </Text>
              <Text fontSize="sm" color="red.600" mb={4}>
                This action cannot be undone.
              </Text>

              <Text fontWeight="bold" mb={2}>
                To confirm deletion, please enter the teacher's password:
              </Text>
              <Input
                type="password"
                placeholder="Enter teacher's password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeletePasswordError('');
                }}
                mb={2}
              />
              {deletePasswordError && (
                <Text fontSize="sm" color="red.500" mb={2}>
                  {deletePasswordError}
                </Text>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => {
                onDeleteClose();
                setDeletePassword('');
                setDeletePasswordError('');
                setTeacherToDelete(null);
              }}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (teacherToDelete) {
                    if (!deletePassword.trim()) {
                      setDeletePasswordError('Password is required to confirm deletion');
                      return;
                    }
                    toastRef.current = toast.loading('Deleting teacher...');
                    deleteTeacher({
                      url: `/${teacherToDelete.id}`,
                      password: deletePassword
                    });
                    setTeacherToDelete(null);
                    setDeletePassword('');
                    setDeletePasswordError('');
                    onDeleteClose();
                  }
                }}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog
        isOpen={isBulkDeleteOpen}
        leastDestructiveRef={bulkCancelRef}
        onClose={onBulkDeleteClose}
        closeOnOverlayClick={false}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Selected Teachers
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={3}>
                Are you sure you want to delete {selectedTeachers.length} selected teacher(s)?
              </Text>
              <Text fontSize="sm" color="red.600" fontWeight="bold" mb={2}>
                ⚠️ Warning: This will permanently delete the teachers and ALL their associated data including:
              </Text>
              <Text fontSize="sm" color="gray.700">
                • All students enrolled by these teachers<br/>
                • All courses created by these teachers<br/>
                • All attendance records<br/>
                • All audit logs and activity history<br/>
                • All authentication tokens
              </Text>
              <Text fontSize="sm" color="red.600" mt={2}>
                This action cannot be undone.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={bulkCancelRef} onClick={onBulkDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleBulkDelete}
                ml={3}
              >
                Delete All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog
        isOpen={isApproveOpen}
        leastDestructiveRef={cancelRef}
        onClose={onApproveClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Approve Teacher Registration
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to approve {teacherToApprove?.name}'s registration? This will allow them to access the system.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onApproveClose}>
                Cancel
              </Button>
              <Button colorScheme="green" onClick={() => {
                if (teacherToApprove) {
                  approveTeacher({
                    teacherId: teacherToApprove.id,
                    action: 'approve',
                    url: `/${teacherToApprove.id}/approve`
                  });
                }
                onApproveClose();
              }}>
                Approve
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        isOpen={isRejectOpen}
        leastDestructiveRef={cancelRef}
        onClose={onRejectClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Reject Teacher Registration
            </AlertDialogHeader>
            <AlertDialogBody>
              <Box mb={4}>
                Are you sure you want to reject {teacherToReject?.name}'s registration?
              </Box>
              <Box mb={4}>
                <Text fontWeight="medium" mb={2}>Reason for rejection (optional):</Text>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                />
              </Box>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onRejectClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={() => {
                if (teacherToReject) {
                  approveTeacher({
                    teacherId: teacherToReject.id,
                    action: 'reject',
                    reason: rejectionReason || 'Registration rejected by administrator',
                    url: `/${teacherToReject.id}/approve`
                  });
                  setRejectionReason('');
                }
                onRejectClose();
              }}>
                Reject
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </WithStaffLayout>
  );
};

export default ManageTeachers;
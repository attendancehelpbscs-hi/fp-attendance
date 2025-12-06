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
import { UserPlus, Eye, List } from 'lucide-react';
import { useGetTeachers, useDeleteTeacher } from '../../api/staff.api';
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
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  
  // Teacher details modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTeacherForDetails, setSelectedTeacherForDetails] = useState<Teacher | null>(null);
  const { isOpen: isStudentsModalOpen, onOpen: onStudentsModalOpen, onClose: onStudentsModalClose } = useDisclosure();
  const [selectedTeacherForStudents, setSelectedTeacherForStudents] = useState<Teacher | null>(null);
  
  // Delete single teacher
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // Bulk delete
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const bulkCancelRef = useRef<HTMLButtonElement>(null);

  const { data, error, isLoading, isError } = useGetTeachers(page, per_page, {
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
    const matchesRole = !roleFilter || teacher.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
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
            <Select placeholder="Filter by Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
            </Select>
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
        <TableContainer marginTop={10} overflowX="auto">
          <Table variant="simple" size="sm">
            <TableCaption>All Teachers</TableCaption>
            <Thead>
              <Tr>
                <Th minW="50px">
                  <Checkbox
                    isChecked={selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0}
                    isIndeterminate={selectedTeachers.length > 0 && selectedTeachers.length < filteredTeachers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                <Th minW="120px">Name</Th>
                <Th minW="150px">Email</Th>
                <Th minW="100px">Teacher ID</Th>
                <Th minW="80px">Section</Th>
                <Th minW="70px">Grade</Th>
                <Th minW="70px">Role</Th>
                <Th minW="100px">Created At</Th>
                <Th minW="100px">Action</Th>
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
                  <Td>{teacher.name}</Td>
                  <Td>{teacher.email}</Td>
                  <Td>{teacher.matric_no || 'N/A'}</Td>
                  <Td>{teacher.section || 'N/A'}</Td>
                  <Td>{teacher.grade ? `Grade ${teacher.grade}` : 'N/A'}</Td>
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
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
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
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Teacher
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={3}>
                Are you sure you want to delete teacher "{teacherToDelete?.name}" (Email: {teacherToDelete?.email})?
              </Text>
              <Text fontSize="sm" color="red.600" fontWeight="bold" mb={2}>
                ⚠️ Warning: This will permanently delete the teacher and ALL associated data including:
              </Text>
              <Text fontSize="sm" color="gray.700">
                • All students enrolled by this teacher<br/>
                • All attendance records<br/>
                • All audit logs and activity history<br/>
                • All authentication tokens
              </Text>
              <Text fontSize="sm" color="red.600" mt={2}>
                This action cannot be undone.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (teacherToDelete) {
                    toastRef.current = toast.loading('Deleting teacher...');
                    deleteTeacher({ url: `/${teacherToDelete.id}` });
                    setTeacherToDelete(null);
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
    </WithStaffLayout>
  );
};

export default ManageTeachers;
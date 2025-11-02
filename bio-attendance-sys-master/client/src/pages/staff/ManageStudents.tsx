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
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Checkbox,
} from '@chakra-ui/react';
import AddStudent from '../../components/AddStudent';
import useStore from '../../store/store';
import { PlusSquareIcon, EditIcon, DeleteIcon, SearchIcon, ViewIcon } from '@chakra-ui/icons';
import { useGetStudents, useDeleteStudent } from '../../api/student.api';
import { useGetStudentReports } from '../../api/atttendance.api';
import { toast } from 'react-hot-toast';
import { queryClient } from '../../lib/query-client';
import { Student, Course } from '../../interfaces/api.interface';
import type { Student as StudentType } from '../../interfaces/api.interface';

const ManageStudents: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const bulkCancelRef = useRef<HTMLButtonElement>(null);

  // Pagination states for attendance history
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyItemsPerPage] = useState<number>(5);

  const { data, error, isLoading, isError } = useGetStudents(
    staffInfo?.id as string,
    page,
    per_page,
  )({
    queryKey: ['students', page],
    keepPreviousData: true,
  });

  const { data: studentReportData, isLoading: isReportLoading, error: reportError } = useGetStudentReports(
    staffInfo?.id as string,
    {
      studentId: selectedStudentForHistory?.id as string,
    }
  )({
    queryKey: ['student-reports', selectedStudentForHistory?.id],
    enabled: !!selectedStudentForHistory?.id,
  });

  const toastRef = useRef<string>('');
  const { mutate: deleteStudent } = useDeleteStudent({
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.dismiss(toastRef.current);
      toast.success('Student deleted successfully');
    },
    onError: (err) => {
      toast.dismiss(toastRef.current);
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });

  useEffect(() => {
    if (activeStudent) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [activeStudent]);

  // Reset history pagination when student changes
  useEffect(() => {
    setHistoryPage(1);
  }, [selectedStudentForHistory]);

  // Filter and sort students
  const filteredStudents = data?.data?.students?.filter((student: StudentType) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.matric_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.courses?.some(course => course.course_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = !gradeFilter || student.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  }).sort((a: StudentType, b: StudentType) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'matric_no') return a.matric_no.localeCompare(b.matric_no);
    if (sortBy === 'grade') return parseInt(a.grade) - parseInt(b.grade);
    if (sortBy === 'section-asc') return a.courses[0]?.course_name.localeCompare(b.courses[0]?.course_name);
    if (sortBy === 'section-desc') return b.courses[0]?.course_name.localeCompare(a.courses[0]?.course_name);
    return 0;
  }) || [];

  const meta = data?.data?.meta;

  const handleSelectStudent = (studentId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(filteredStudents.map((student: StudentType) => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleBulkDelete = () => {
    selectedStudents.forEach((studentId: string) => {
      deleteStudent({ url: `/${studentId}` });
    });
    setSelectedStudents([]);
    onBulkDeleteClose();
  };

  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem">
        <Heading fontSize={25} fontWeight={600}>
          Manage Students
        </Heading>
        <Flex gap={4}>
          {selectedStudents.length > 0 && (
            <Button
              bg="red.500"
              color="white"
              _hover={{ background: 'red.600' }}
              onClick={onBulkDeleteOpen}
            >
              Delete Selected ({selectedStudents.length})
            </Button>
          )}
          <Button
            bg="var(--bg-primary)"
            color="white"
            _hover={{ background: 'var(--bg-primary-light)' }}
            leftIcon={<PlusSquareIcon />}
            onClick={() => setDrawerOpen(true)}
          >
            Add New Student
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
                placeholder="Search by name, ID, grade, or section"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Select placeholder="Filter by Grade" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name-asc">Sort by Name (A-Z)</option>
              <option value="name-desc">Sort by Name (Z-A)</option>
              <option value="matric_no">Sort by ID</option>
              <option value="grade">Sort by Grade (1-6)</option>
              <option value="section-asc">Sort by Section (A-Z)</option>
              <option value="section-desc">Sort by Section (Z-A)</option>
            </Select>
          </Flex>
        </CardBody>
      </Card>

      {isLoading ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Spinner color="var(--bg-primar)" />
        </Box>
      ) : isError ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Text>Error: {error?.response?.data?.message}</Text>
        </Box>
      ) : (
        <TableContainer marginTop={10}>
          <Table variant="simple">
            <TableCaption>All Students</TableCaption>
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    isIndeterminate={selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                <Th>S/N</Th>
                <Th>Name</Th>
                <Th>ID Number</Th>
                <Th>Grade</Th>
                <Th>Sections</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredStudents.map((student: StudentType, idx: number) => (
                <Tr key={idx}>
                  <Td>
                    <Checkbox
                      isChecked={selectedStudents.includes(student.id)}
                      onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                    />
                  </Td>
                  <Td>{(page - 1) * per_page + (idx + 1)}</Td>
                  <Td>{student.name}</Td>
                  <Td>{student.matric_no}</Td>
                  <Td>{student.grade}</Td>
                  <Td>
                    {student.courses?.map((course: Course) => (
                      <Badge key={course.id} colorScheme="blue" marginRight="0.5rem" marginBottom="0.25rem">
                        {course.course_code}
                      </Badge>
                    ))}
                  </Td>
                  <Td>
                    <Flex justifyContent="flex-start" gap={2} alignItems="center">
                      <IconButton
                        size="sm"
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="View attendance history"
                        onClick={() => {
                          setSelectedStudentForHistory(student);
                          onOpen();
                        }}
                        icon={<ViewIcon />}
                      />
                      <IconButton
                        size="sm"
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="Edit student"
                        onClick={() => setActiveStudent(student)}
                        icon={<EditIcon />}
                      />
                      <IconButton
                        size="sm"
                        bg="white"
                        color="#d10d0d"
                        _hover={{ color: 'white', background: '#d10d0d' }}
                        aria-label="Delete student"
                        onClick={() => {
                          setStudentToDelete(student);
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
            <Text>Total Students: {filteredStudents.length} (filtered from {meta?.total_items})</Text>
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

      <AddStudent
        isOpen={drawerOpen}
        onClose={() => {
          setActiveStudent(null);
          setDrawerOpen(false);
        }}
        closeDrawer={() => {
          setActiveStudent(null);
          setDrawerOpen(false);
        }}
        size="md"
        activeStudent={activeStudent}
        setActiveStudent={(student) => setActiveStudent(student)}
      />

      {/* Attendance History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Attendance History - {selectedStudentForHistory?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingBottom="2rem">
            {selectedStudentForHistory && (
              <Box>
                <Text fontSize="lg" marginBottom="1rem">
                  Student ID: {selectedStudentForHistory.matric_no}
                </Text>
                <Text fontSize="sm" color="gray.600" marginBottom="1rem">
                  Note: For comprehensive reports on all students, please visit the Reports and Analytics section.
                </Text>

                {isReportLoading ? (
                  <Box display="flex" justifyContent="center" padding="2rem">
                    <Spinner />
                    <Text marginLeft="1rem">Loading attendance data...</Text>
                  </Box>
                ) : reportError ? (
                  <Box padding="1rem" border="1px solid #e53e3e" borderRadius="md" backgroundColor="#fed7d7">
                    <Text color="#c53030">Error loading attendance data: {reportError?.response?.data?.message}</Text>
                  </Box>
                ) : studentReportData ? (
                  <Box>
                    {/* Attendance Summary */}
                    <Box marginBottom="2rem">
                      <Text fontSize="lg" fontWeight="bold" marginBottom="1rem">Attendance Summary</Text>
                      <Flex gap={4} flexWrap="wrap">
                        <Card minW="200px">
                          <CardBody>
                            <Text fontSize="sm" color="gray.600">Total Records</Text>
                            <Text fontSize="2xl" fontWeight="bold">{studentReportData.data?.reports?.length ?? 0}</Text>
                          </CardBody>
                        </Card>
                        <Card minW="200px">
                          <CardBody>
                            <Text fontSize="sm" color="gray.600">Present Days</Text>
                            <Text fontSize="2xl" fontWeight="bold">{studentReportData.data?.reports?.filter(r => r.status === 'present').length ?? 0}</Text>
                          </CardBody>
                        </Card>
                      </Flex>
                    </Box>

                    {/* Recent Attendance Records */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" marginBottom="1rem">Recent Attendance Records</Text>
                      {studentReportData.data?.reports && studentReportData.data.reports.length > 0 ? (
                        <>
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>Date</Th>
                                <Th>Status</Th>
                                <Th>Time Type</Th>
                                <Th>Section</Th>
                                <Th>Created At</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {studentReportData.data.reports
                                .slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage)
                                .map((record: any, idx: number) => (
                                <Tr key={idx}>
                                  <Td>{new Date(record.date).toLocaleDateString()}</Td>
                                  <Td>
                                    <Badge colorScheme={record.status === 'present' ? 'green' : record.status === 'late' ? 'yellow' : 'red'}>
                                      {record.status}
                                    </Badge>
                                  </Td>
                                  <Td>{record.time_type || 'N/A'}</Td>
                                  <Td>{record.section}</Td>
                                  <Td>{record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>

                          {/* Pagination Controls for Attendance History */}
                          {studentReportData.data.reports.length > 0 && (
                            <Box marginTop="1rem" display="flex" justifyContent="center" alignItems="center" gap={2}>
                              <Text fontSize="sm" color="gray.600">
                                Page {historyPage} of {Math.ceil(studentReportData.data.reports.length / historyItemsPerPage) || 1}
                              </Text>
                              <Button
                                size="sm"
                                onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                                isDisabled={historyPage === 1}
                              >
                                Previous
                              </Button>
                              {Array.from({ length: Math.ceil(studentReportData.data.reports.length / historyItemsPerPage) || 1 }, (_, i) => i + 1).map(page => (
                                <Button
                                  key={page}
                                  size="sm"
                                  colorScheme={historyPage === page ? 'blue' : 'gray'}
                                  onClick={() => setHistoryPage(page)}
                                >
                                  {page}
                                </Button>
                              ))}
                              <Button
                                size="sm"
                                onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(studentReportData.data.reports.length / historyItemsPerPage) || 1))}
                                isDisabled={historyPage === (Math.ceil(studentReportData.data.reports.length / historyItemsPerPage) || 1)}
                              >
                                Next
                              </Button>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Box border="1px solid #e2e8f0" borderRadius="md" padding="1rem">
                          <Text>No attendance records found for this student.</Text>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box border="1px solid #e2e8f0" borderRadius="md" padding="1rem">
                    <Text>No attendance data available.</Text>
                  </Box>
                )}
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Student
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the student "{studentToDelete?.name}" (ID: {studentToDelete?.matric_no})?
              This action cannot be undone and will remove all associated attendance records.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (studentToDelete) {
                    toastRef.current = toast.loading('Deleting student...');
                    deleteStudent({ url: `/${studentToDelete.id}` });
                    setStudentToDelete(null);
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

      <AlertDialog
        isOpen={isBulkDeleteOpen}
        leastDestructiveRef={bulkCancelRef}
        onClose={onBulkDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Selected Students
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedStudents.length} selected student(s)?
              This action cannot be undone and will remove all associated attendance records.
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

export default ManageStudents;
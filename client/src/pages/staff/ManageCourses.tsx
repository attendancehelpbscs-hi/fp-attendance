import { useState, useRef, useEffect } from 'react';
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
  Spinner,
  Box,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
  Checkbox,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import AddCourse from '../../components/AddCourse';
import EnrolledStudentsModal from '../../components/EnrolledStudentsModal';
import { EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { List, ListPlus } from 'lucide-react';
import { useGetCourses, useDeleteCourse } from '../../api/course.api';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { queryClient } from '../../lib/query-client';
import { Course } from '../../interfaces/api.interface';

const ManageCourses: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const bulkCancelRef = useRef<HTMLButtonElement>(null);
  const { isOpen: isEnrolledModalOpen, onOpen: onEnrolledModalOpen, onClose: onEnrolledModalClose } = useDisclosure();
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<Course | null>(null);
  const { data, error, isLoading, isError } = useGetCourses(
    staffInfo?.id as string,
    page,
    per_page,
    {
      queryKey: ['courses', page],
      keepPreviousData: true,
    }
  );
  const toastRef = useRef<string>('');
  const { mutate: deleteCourse } = useDeleteCourse({
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      toast.dismiss(toastRef.current);
      toast.success('Course deleted successfully');
    },
    onError: (err) => {
      toast.dismiss(toastRef.current);
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });

  useEffect(() => {
    if (activeCourse) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [activeCourse]);

  const meta = data?.data?.meta;

  const handleSelectCourse = (courseId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCourses(prev => [...prev, courseId]);
    } else {
      setSelectedCourses(prev => prev.filter(id => id !== courseId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedCourses(filteredCourses.map((course: Course) => course.id));
    } else {
      setSelectedCourses([]);
    }
  };

  const handleBulkDelete = () => {
    selectedCourses.forEach(courseId => {
      deleteCourse({ url: `/${courseId}` });
    });
    setSelectedCourses([]);
    onBulkDeleteClose();
  };

  // Filter courses based on search term and user role
  const filteredCourses = data?.data?.courses?.filter((course: Course) => {
    // For teachers, only show their own courses
    if (staffInfo?.role === 'TEACHER' && course.staff_id !== staffInfo.id) {
      return false;
    }

    // Apply search filter
    return course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (course.matric_no && course.matric_no.toLowerCase().includes(searchTerm.toLowerCase()));
  }) || [];

  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem">
        <Heading fontSize={25} fontWeight={600}>
          Manage Section
        </Heading>
        <Flex gap={4}>
          {selectedCourses.length > 0 && staffInfo?.role !== 'TEACHER' && (
            <Button
              bg="red.500"
              color="white"
              _hover={{ background: 'red.600' }}
              onClick={onBulkDeleteOpen}
            >
              Delete Selected ({selectedCourses.length})
            </Button>
          )}
          {staffInfo?.role !== 'TEACHER' && (
            <Button
              bg="var(--bg-primary)"
              color="white"
              _hover={{ background: 'var(--bg-primary-light)' }}
              leftIcon={<ListPlus />}
              onClick={() => setDrawerOpen(true)}
            >
              Add New Section
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Search Input */}
      <Box marginTop="1rem" marginBottom="1rem">
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by teacher name, section, or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

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
            <TableCaption>All Courses</TableCaption>
            <Thead>
              <Tr>
                {staffInfo?.role !== 'TEACHER' && (
                  <Th>
                    <Checkbox
                      isChecked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                      isIndeterminate={selectedCourses.length > 0 && selectedCourses.length < filteredCourses.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </Th>
                )}
                <Th>Teacher Name</Th>
                <Th>Teacher ID</Th>
                <Th>Section</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCourses.map((course: Course, idx: number) => (
                <Tr key={idx}>
                  {staffInfo?.role !== 'TEACHER' && (
                    <Td>
                      <Checkbox
                        isChecked={selectedCourses.includes(course.id)}
                        onChange={(e) => handleSelectCourse(course.id, e.target.checked)}
                      />
                    </Td>
                  )}
                  <Td>{course.course_name}</Td>
                  <Td>{course.matric_no || 'N/A'}</Td>
                  <Td>{course.course_code}</Td>
                  <Td>
                    <Flex justifyContent="flex-start" gap={4} alignItems="center">
                      <IconButton
                        bg="transparent"
                        _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                        color="var(--bg-primary)"
                        aria-label="View enrolled students"
                        onClick={() => {
                          setSelectedCourseForModal(course);
                          onEnrolledModalOpen();
                        }}
                        icon={<List size={20} />}
                      />
                      {staffInfo?.role !== 'TEACHER' && (
                        <IconButton
                          bg="transparent"
                          _hover={{ color: 'white', background: 'var(--bg-primary)' }}
                          color="var(--bg-primary)"
                          aria-label="Edit course"
                          onClick={() => setActiveCourse(course)}
                          icon={<EditIcon />}
                        />
                      )}
                      {staffInfo?.role !== 'TEACHER' && (
                        <IconButton
                          bg="white"
                          color="#d10d0d"
                          _hover={{ color: 'white', background: '#d10d0d' }}
                          aria-label="Delete course"
                          onClick={() => {
                            setCourseToDelete(course);
                            onOpen();
                          }}
                          icon={<DeleteIcon />}
                        />
                      )}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Flex flexDirection="column" justifyContent="space-between" alignItems="center" marginBottom="1rem">
            <Text>Total Courses: {filteredCourses.length} (filtered from {meta?.total_items})</Text>
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

      <AddCourse
        isOpen={drawerOpen}
        onClose={() => {
          setActiveCourse(null);
          setDrawerOpen(false);
        }}
        size="md"
        closeDrawer={() => {
          setActiveCourse(null);
          setDrawerOpen(false);
        }}
        activeCourse={activeCourse}
        setActiveCourse={(course) => setActiveCourse(course)}
      />

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Course
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the course "{courseToDelete?.course_name}" ({courseToDelete?.course_code})?
              This action cannot be undone and will remove all associated data.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (courseToDelete) {
                    toastRef.current = toast.loading('Deleting course...');
                    deleteCourse({ url: `/${courseToDelete.id}` });
                    setCourseToDelete(null);
                    onClose();
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
              Delete Selected Courses
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedCourses.length} selected course(s)?
              This action cannot be undone and will remove all associated data.
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

      {selectedCourseForModal && (
        <EnrolledStudentsModal
          isOpen={isEnrolledModalOpen}
          onClose={onEnrolledModalClose}
          course={selectedCourseForModal}
        />
      )}
    </WithStaffLayout>
  );
};

export default ManageCourses;

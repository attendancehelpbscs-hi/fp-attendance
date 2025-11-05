import { useState } from 'react';
import type { FC } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  Spinner,
  Text,
  Box,
} from '@chakra-ui/react';
import { useGetStudents } from '../api/student.api';
import useStore from '../store/store';
import type { Course, Student } from '../interfaces/api.interface';

interface EnrolledStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

const EnrolledStudentsModal: FC<EnrolledStudentsModalProps> = ({ isOpen, onClose, course }) => {
  const staffInfo = useStore.use.staffInfo();
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10); // Students per page in modal
  const [fetchPage] = useState<number>(1);
  const [fetchPerPage] = useState<number>(100); // Fetch all students to filter

  const { data, isLoading, isError, error } = useGetStudents(
    staffInfo?.id as string,
    fetchPage,
    fetchPerPage,
    {
      queryKey: ['students-modal', fetchPage],
      keepPreviousData: true,
    }
  );

  // Filter students enrolled in the selected course
  const allEnrolledStudents = data?.data?.students?.filter((student: Student) =>
    student.courses.some((c: Course) => c.id === course.id)
  ) || [];

  // Paginate the enrolled students
  const totalEnrolled = allEnrolledStudents.length;
  const totalPages = Math.ceil(totalEnrolled / per_page) || 1;
  const startIndex = (page - 1) * per_page;
  const endIndex = startIndex + per_page;
  const enrolledStudents = allEnrolledStudents.slice(startIndex, endIndex);

  const meta = {
    total_items: totalEnrolled,
    total_pages: totalPages,
    page,
    per_page,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Enrolled Students - {course.course_name} ({course.course_code})</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Box display="flex" justifyContent="center" padding="4rem">
              <Spinner color="var(--bg-primary)" />
            </Box>
          ) : isError ? (
            <Box display="flex" justifyContent="center" padding="4rem">
              <Text>Error: {error?.response?.data?.message}</Text>
            </Box>
          ) : enrolledStudents.length === 0 ? (
            <Box display="flex" justifyContent="center" padding="4rem">
              <Text>No students enrolled in this course.</Text>
            </Box>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <TableCaption>Students enrolled in {course.course_name}</TableCaption>
                <Thead>
                  <Tr>
                    <Th>S/N</Th>
                    <Th>Name</Th>
                    <Th>Matric No</Th>
                    <Th>Grade</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {enrolledStudents.map((student: Student, idx: number) => (
                    <Tr key={student.id}>
                      <Td>{startIndex + idx + 1}</Td>
                      <Td>{student.name}</Td>
                      <Td>{student.matric_no}</Td>
                      <Td>{student.grade}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <Box marginTop="1rem" display="flex" justifyContent="space-between" alignItems="center">
                <Text>Total Students: {totalEnrolled}</Text>
                <Text>Page {meta.page} of {meta.total_pages}</Text>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" marginTop="1rem">
                <Button
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => meta.page > 1 && setPage(meta.page - 1)}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  disabled={meta.page >= meta.total_pages}
                  onClick={() => meta.page < meta.total_pages && setPage(meta.page + 1)}
                >
                  Next
                </Button>
              </Box>
            </TableContainer>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EnrolledStudentsModal;

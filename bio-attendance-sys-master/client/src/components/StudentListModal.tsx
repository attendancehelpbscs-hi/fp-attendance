import React, { useEffect } from 'react';
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
  TableContainer,
  Text,
  Badge,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Center,
  Box,
} from '@chakra-ui/react';
import { useGetStudentsByStatus } from '../api/atttendance.api';
import useStore from '../store/store';

interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  grade: string;
  section: string;
  status: 'present' | 'absent';
  session?: string;
}

const StudentListModal: React.FC<StudentListModalProps> = ({
  isOpen,
  onClose,
  date,
  grade,
  section,
  status,
  session,
}) => {
  const staffInfo = useStore.use.staffInfo();

  console.log('StudentListModal params:', { date, grade, section, status, session }); // Debug log

    // Defensive: always extract students as array
    const { data: studentsData, isLoading, error, refetch } = useGetStudentsByStatus(
      staffInfo?.id || '',
      date,
      grade,
      section,
      status,
      session,
      {
        enabled: !!staffInfo?.id && isOpen && !!date && !!grade && !!section,
        refetchOnMount: true
      }
    );

    // Defensive extraction
    let students: any[] = [];
    if (
      studentsData &&
      studentsData.data &&
      studentsData.data.students &&
      Array.isArray((studentsData.data.students as any).students)
    ) {
      students = (studentsData.data.students as any).students;
    } else if (
      studentsData &&
      studentsData.data &&
      Array.isArray(studentsData.data.students)
    ) {
      students = studentsData.data.students;
    }

    // Debug logging
    console.log('StudentListModal studentsData (raw):', studentsData);
    console.log('StudentListModal students (extracted):', students);

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {status === 'present' ? 'Present' : 'Absent'} Students - {grade} {section} ({new Date(date).toLocaleDateString()})
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Center>
              <Spinner size="lg" />
            </Center>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error loading students</AlertTitle>
              <Text>{(error as any)?.message || 'Failed to load student data'}</Text>
            </Alert>
          ) : students.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>No students found</AlertTitle>
              <Text>No {status} students found for the selected date, grade, and section.</Text>
                {/* Debug: Show raw API response if empty */}
                <Box mt={2} p={2} bg="gray.50" borderRadius="md" fontSize="xs" color="gray.600">
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(studentsData, null, 2)}</pre>
                </Box>
            </Alert>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Student Name</Th>
                    <Th>ID No</Th>
                    <Th>Check-in Time</Th>
                    <Th>Check-out Time</Th>
                    <Th>Session Type</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {students.map((student: any, index: number) => (
                    <Tr key={index}>
                      <Td>{student.name}</Td>
                      <Td>{student.matric_no}</Td>
                      <Td>
                        {student.checkin_time ? new Date(student.checkin_time).toLocaleTimeString() : '-'}
                      </Td>
                      <Td>
                        {student.checkout_time ? new Date(student.checkout_time).toLocaleTimeString() : '-'}
                      </Td>
                      <Td>{student.time_type || '-'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StudentListModal;

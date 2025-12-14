import type { FC } from 'react';
import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  Button,
  List,
  ListItem,
  Text,
  Box,
  Spinner,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import type { Attendance, GetAttendanceListResult } from '../interfaces/api.interface';
import dayjs from 'dayjs';
import { useGetAttendanceList } from '../api/atttendance.api';

const AttendanceList: FC<{ isOpen: boolean; onClose: () => void; attendance: Attendance | null }> = ({
  isOpen,
  onClose,
  attendance,
}) => {
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10);
  const { data, error, isLoading, isError } = useGetAttendanceList(attendance?.id || '', page, per_page, {
    queryKey: ['attendance_list', attendance?.id, page, per_page],
    keepPreviousData: true,
    enabled: !!attendance?.id,
  });
  return (
    <Modal onClose={onClose} isOpen={isOpen} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          List for {attendance?.name} ({dayjs(attendance?.date).format('DD/MM/YYYY')})
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Box marginTop="4rem" display="flex" justifyContent="center">
              <Spinner color="var(--bg-primar)" />
            </Box>
          ) : isError ? (
            <Box marginTop="4rem" display="flex" justifyContent="center">
              <Text>Error: {error?.response?.data?.message}</Text>
            </Box>
          ) : (
            <>
              <List spacing={3}>
                {data?.data?.attendanceList.map((student) => (
                  <ListItem key={student.student.id} display="flex" gap="1rem" alignItems="center">
                    <CheckIcon color="green.500" />
                    <Text>
                      {student?.student?.name} ({student?.student?.matric_no}) - {student?.student?.grade}
                      <br />
                      <Text as="span" fontSize="sm" color="gray.600">
                        {student?.time_type || 'N/A'} - Session: {student?.session_type || 'N/A'} - Section: {student?.section} - Time: {student?.created_at ? dayjs(student?.created_at).format('HH:mm:ss') : 'N/A'} - Status: <Badge colorScheme={student?.isLate ? 'yellow' : student?.time_type === 'IN' ? 'green' : student?.time_type === 'OUT' ? 'blue' : 'red'}>
                          {student?.isLate ? 'Late' : student?.time_type === 'IN' ? 'Present' : student?.time_type === 'OUT' ? 'Departure' : 'Absent'}
                        </Badge>
                      </Text>
                    </Text>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Flex justifyContent="space-between" alignItems="center" width="100%">
            <Text fontSize="sm" color="gray.600">
              Showing {data?.data?.attendanceList.length || 0} of {data?.data?.meta?.total_items || 0} students
            </Text>
            {data?.data?.meta && data.data.meta.total_items > 0 && (
              <Flex gap={2}>
                <Button
                  size="sm"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  isDisabled={page === 1}
                >
                  Previous
                </Button>
                <Text fontSize="sm" alignSelf="center">
                  Page {page} of {data.data.meta.total_pages}
                </Text>
                <Button
                  size="sm"
                  onClick={() => setPage(prev => Math.min(prev + 1, data.data.meta.total_pages))}
                  isDisabled={page === data.data.meta.total_pages}
                >
                  Next
                </Button>
              </Flex>
            )}
            <Button onClick={onClose}>Close</Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AttendanceList;

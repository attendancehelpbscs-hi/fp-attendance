import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Select,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  Badge,
  Divider,
} from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useManualMarkAttendance } from '../api/atttendance.api';
import { useGetStudents } from '../api/student.api';
import { useToast } from '@chakra-ui/react';
import useStore from '../store/store';

interface ManualMarkAttendanceProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: string;
  staffId: string;
}

const ManualMarkAttendance: React.FC<ManualMarkAttendanceProps> = ({
  isOpen,
  onClose,
  attendanceId,
  staffId,
}) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const staffSettings = useStore.use.staffSettings();

  // Fetch all students for the staff (assuming we can get all by setting high per_page or modify API)
  const { data: studentsData, isLoading: studentsLoading } = useGetStudents(
    staffId,
    1,
    999 // High number to get all students (max 3 chars)
  )({
    queryKey: ['all-students', staffId],
  });

  const manualMarkMutation = useManualMarkAttendance();

  const students = studentsData?.data?.students || [];
  const allStudentIds = students.map((student: { id: string }) => student.id);

  const handleSubmit = async () => {
    if (!selectedDates.length) {
      toast({
        title: 'Validation Error',
        description: 'Please select dates',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (allStudentIds.length === 0) {
      toast({
        title: 'No Students',
        description: 'No students found to mark attendance for',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await manualMarkMutation.mutateAsync({
        student_ids: allStudentIds,
        attendance_id: attendanceId,
        dates: selectedDates.map(date => date.toISOString().split('T')[0]),
        // section is optional, can be omitted for all
      });

      toast({
        title: 'Success',
        description: `Attendance marked as present for all ${allStudentIds.length} students on ${selectedDates.length} dates`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setSelectedDates([]);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark attendance',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDates(prev => {
        const dateStr = date.toISOString().split('T')[0];
        const exists = prev.some(d => d.toISOString().split('T')[0] === dateStr);
        if (exists) {
          return prev.filter(d => d.toISOString().split('T')[0] !== dateStr);
        } else {
          return [...prev, date];
        }
      });
    }
  };

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => d.getTime() !== dateToRemove.getTime()));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manual Attendance Marking</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* All Students Info */}
            <Box>
              <Text fontWeight="bold" marginBottom="2">Students to Mark</Text>
              {studentsLoading ? (
                <Center padding="4">
                  <Spinner />
                </Center>
              ) : (
                <Text>All {allStudentIds.length} enrolled students will be marked as present.</Text>
              )}
            </Box>

            <Divider />

            {/* Date Selection */}
            <Box>
              <Text fontWeight="bold" marginBottom="2">Select Dates</Text>
              <VStack align="stretch" spacing={3}>
                <DatePicker
                  selected={null}
                  onChange={handleDateChange}
                  placeholderText="Click to select dates"
                  dateFormat="yyyy-MM-dd"
                  inline
                  highlightDates={selectedDates}
                />
                {selectedDates.length > 0 && (
                  <Box>
                    <Text fontSize="sm" color="gray.600" marginBottom="2">Selected Dates:</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {selectedDates.map((date, index) => (
                        <Badge key={index} colorScheme="blue" cursor="pointer" onClick={() => removeDate(date)}>
                          {date.toLocaleDateString()} ×
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Summary */}
            {selectedDates.length > 0 && (
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Summary</AlertTitle>
                  <AlertDescription>
                    All {allStudentIds.length} students × {selectedDates.length} dates = {allStudentIds.length * selectedDates.length} attendance records will be marked as present.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Marking..."
            isDisabled={!selectedDates.length || studentsLoading}
          >
            Mark All as Present
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ManualMarkAttendance;

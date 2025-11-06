import React from 'react';
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
  Select,
  FormControl,
  FormLabel,
  Input,
} from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useGetStudentsByStatus, useMarkStudentAttendance } from '../api/atttendance.api';
import { useToast } from '@chakra-ui/react';
import useStore from '../store/store';

interface StudentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  setDate: (date: string) => void;
  grade: string;
  setGrade: (grade: string) => void;
  section: string;
  setSection: (section: string) => void;
  status: 'present' | 'absent';
  setStatus: (status: 'present' | 'absent') => void;
  onMarkAttendance: () => Promise<void>;
}

const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  isOpen,
  onClose,
  date,
  setDate,
  grade,
  setGrade,
  section,
  setSection,
  status,
  setStatus,
  onMarkAttendance,
}) => {
  const staffInfo = useStore.use.staffInfo();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = React.useState<Date | null>(date ? new Date(date) : new Date());

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setDate(date.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!date || !grade || !section) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await onMarkAttendance();
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark attendance',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Mark Student Attendance</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                className="date-picker-input"
                placeholderText="Select date"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Grade</FormLabel>
              <Select value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Select grade">
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Section</FormLabel>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Enter section (e.g., A, B, C)"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Status</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value as 'present' | 'absent')}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit}>
            Mark Attendance
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StudentAttendanceModal;

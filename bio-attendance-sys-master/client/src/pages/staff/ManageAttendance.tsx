import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Heading,
  Flex,
  Button,
  Spinner,
  Box,
  Text,
  useDisclosure,
  Card,
  CardHeader,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';

import AddAttendance from '../../components/AddAttendance';
import { ClockPlus } from 'lucide-react';
import MarkAttendance from '../../components/MarkAttendance';

import { useGetAttendances } from '../../api/atttendance.api';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { queryClient } from '../../lib/query-client';
import { Attendance } from '../../interfaces/api.interface';
import dayjs from 'dayjs';
import AttendanceList from '../../components/AttendanceList';

const ManageAttendance: FC = () => {
  const navigate = useNavigate();
  const staffInfo = useStore.use.staffInfo();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerOpen2, setDrawerOpen2] = useState<boolean>(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [page, setPage] = useState<number>(1);
  const [per_page] = useState<number>(10);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [activeAttendance2, setActiveAttendance2] = useState<Attendance | null>(null);
  const [activeAttendance3, setActiveAttendance3] = useState<Attendance | null>(null);


  const { data, error, isLoading, isError } = useGetAttendances(
    staffInfo?.id as string,
    page,
    per_page,
    {
      queryKey: ['attendances', page],
      keepPreviousData: true,
    }
  );
  const btnRef = useRef(null);

  useEffect(() => {
    if (activeAttendance) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [activeAttendance]);

  useEffect(() => {
    if (activeAttendance2) {
      setDrawerOpen2(true);
    } else {
      setDrawerOpen2(false);
    }
  }, [activeAttendance2]);



  const meta = data?.data?.meta;

  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem">
        <Heading fontSize={25} fontWeight={600}>
          Manage Attendance
        </Heading>
        <Flex gap={4}>
          <Button
            bg="var(--bg-primary)"
            color="white"
            _hover={{ background: 'var(--bg-primary-light)' }}
            leftIcon={<ClockPlus />}
            onClick={() => navigate('/staff/manage/attendance/kiosk')}
          >
            Open Attendance Kiosk
          </Button>
        </Flex>
      </Flex>



      {/* Instructions */}
      <Box marginBottom="2rem" maxW="600px">
        <Text fontSize="lg" fontWeight="bold" mb={2}>Getting Started</Text>
        <Text color="gray.600" mb={2}>
          To manage attendance sessions, click the "Open Attendance Kiosk" button above to start marking attendance using the fingerprint scanner.
        </Text>
        <Text color="gray.600">
          The kiosk provides real-time attendance tracking and scanner status updates.
        </Text>
      </Box>

      {isLoading ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Spinner color="var(--bg-primar)" />
        </Box>
      ) : isError ? (
        <Box marginTop="4rem" display="flex" justifyContent="center">
          <Text>Error: {error?.response?.data?.message}</Text>
        </Box>
      ) : null}

      <AddAttendance
        isOpen={drawerOpen}
        onClose={() => {
          setActiveAttendance(null);
          setDrawerOpen(false);
        }}
        size="md"
        closeDrawer={() => {
          setActiveAttendance(null);
          setDrawerOpen(false);
        }}
        activeAttendance={activeAttendance}
        setActiveAttendance={(attendance) => setActiveAttendance(attendance)}
      />
      <MarkAttendance
        isOpen={drawerOpen2}
        onClose={() => {
          setActiveAttendance2(null);
          setDrawerOpen2(false);
        }}
        size="md"
        closeDrawer={() => {
          setActiveAttendance2(null);
          setDrawerOpen2(false);
        }}
        activeAttendance={activeAttendance2}
      />
      <AttendanceList isOpen={isOpen} onClose={onClose} attendance={activeAttendance3} />
    </WithStaffLayout>
  );
};

export default ManageAttendance;

import { useState, useEffect, useRef } from 'react';
import type { FC, FormEventHandler } from 'react';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  FormControl,
  FormLabel,
  Text,
  Button,
  Box,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { Flex } from '@chakra-ui/react';
import { useMarkAttendance } from '../api/atttendance.api';
import { useGetStudentsFingerprints } from '../api/student.api';
import type { MarkAttendanceInput, Attendance, StudentFingerprint } from '../interfaces/api.interface';
import useStore from '../store/store';
import SimpleReactValidator from 'simple-react-validator';
import { toast } from 'react-hot-toast';
import { removeObjectProps } from '../../../server/src/helpers/general.helper';
import { fingerprintControl } from '../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';
import { getFingerprintImgString } from './AddStudent';
import axios from 'axios';
import constants from '../config/constants.config';

const MarkAttendance: FC<{
  isOpen: boolean;
  size: string;
  onClose: () => void;
  closeDrawer: () => void;
  activeAttendance: Attendance | null;
}> = ({ isOpen, onClose, size, closeDrawer, activeAttendance }) => {
  const staffInfo = useStore.use.staffInfo();
  const [markInput, setMarkInput] = useState<MarkAttendanceInput>({
    student_id: '',
    attendance_id: '',
    time_type: 'IN',
    section: '',
  });
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  const [fingerprints, setFingerprints] = useState<{ newFingerprint: string }>({
    newFingerprint: '',
  });
  const [identifiedStudent, setIdentifiedStudent] = useState<StudentFingerprint | null>(null);
  const [identificationStatus, setIdentificationStatus] = useState<'idle' | 'scanning' | 'identifying' | 'success' | 'error'>('idle');
  const [confidence, setConfidence] = useState<number>(0);
  const [, forceUpdate] = useState<boolean>(false);
  const studentFingerprintsData = useGetStudentsFingerprints(staffInfo?.id as string)({
    queryKey: ['studentsfingerprints', staffInfo?.id],
  });

  const defaultMarkInput = () => {
    setMarkInput((prev) => ({ ...prev, student_id: '', time_type: 'IN', section: '' }));
    setFingerprints((prev) => ({ ...prev, newFingerprint: '' }));
    setIdentifiedStudent(null);
    setIdentificationStatus('idle');
    setConfidence(0);
  };

  const { isLoading, mutate: markAttendance } = useMarkAttendance({
    onSuccess: () => {
      closeDrawer();
      toast.success('Student marked successfully');
      defaultMarkInput();
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr?.[0]?.match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n) {
      u8arr[n - 1] = bstr.charCodeAt(n - 1);
      n -= 1; // to make eslint happy
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleFingerprintIdentification = async () => {
    if (!fingerprints.newFingerprint) return;

    setIdentificationStatus('identifying');
    const data = new FormData();
    data.append('file', dataURLtoFile(getFingerprintImgString(fingerprints.newFingerprint), 'scanned_fingerprint.jpeg'));
    data.append('staff_id', staffInfo?.id as string);

    try {
      const res = await axios.post(`${constants.matchBaseUrl}/identify/fingerprint`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { student_id, confidence } = res.data;
      setConfidence(confidence);

      if (student_id && confidence > 6) { // Adjusted threshold to accept legitimate matches
        const student = studentFingerprintsData.data?.data?.students?.find((s: StudentFingerprint) => s.id === student_id);
        if (student) {
          setIdentifiedStudent(student);
          setMarkInput((prev) => ({
            ...prev,
            student_id: student_id,
            section: student.grade, // Use grade as section for now
          }));
          setIdentificationStatus('success');
          toast.success(`Student identified: ${student.name} (${student.matric_no})`);
        } else {
          setIdentificationStatus('error');
          toast.error('Student not found in records');
        }
      } else {
        setIdentificationStatus('error');
        toast.error('Fingerprint not recognized. Please try again.');
      }
    } catch (err) {
      setIdentificationStatus('error');
      toast.error('Could not identify fingerprint');
      console.error('Err: ', err);
    }
  };

  useEffect(() => {
    if (fingerprints.newFingerprint && identificationStatus === 'scanning') {
      handleFingerprintIdentification();
    }
  }, [fingerprints.newFingerprint, identificationStatus]);

  useEffect(() => {
    if (isOpen && activeAttendance) {
      setMarkInput((prev) => ({
        ...prev,
        attendance_id: activeAttendance.id,
      }));
    }
  }, [isOpen, activeAttendance]);

  const handleDeviceConnected = () => {
    console.log('Device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Device disconnected.');
    setDeviceConnected(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSampleAcquired = (event: any) => {
    console.log('Sample acquired => ', event?.samples);
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));

    setFingerprints((prev) => ({ ...prev, newFingerprint: rawImages[0] }));
    setIdentificationStatus('scanning');
  };

  useEffect(() => {
    fingerprintControl.onDeviceConnected = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnected = handleDeviceDisconnected;
    fingerprintControl.onSamplesAcquired = handleSampleAcquired;
    fingerprintControl.init();
  }, []);

  const simpleValidator = useRef(
    new SimpleReactValidator({
      element: (message: string) => <div className="formErrorMsg">{message}</div>,
    }),
  );

  const handleAddAttendance: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      try {
        markAttendance(markInput);
      } catch (err) {
        console.log('error => ', err);
      }
    } else {
      simpleValidator.current.showMessages();
      forceUpdate((prev) => !prev);
    }
  };
  return (
    <Drawer
      onClose={() => {
        defaultMarkInput();
        onClose();
      }}
      isOpen={isOpen}
      size={size}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Mark Student</DrawerHeader>
        <DrawerBody>
          <form className="login-form" method="post" action="#" onSubmit={handleAddAttendance}>
            <FormControl marginTop="1rem">
              <FormLabel>Fingerprint Identification</FormLabel>
              <Flex gap="0.4rem" borderLeft="3px solid #534949" padding="0.5rem" alignItems="flex-start">
                <InfoIcon />
                <Text fontStyle="italic">Scan fingerprint to identify and mark attendance for the student.</Text>
              </Flex>
              {deviceConnected && <Text>NB: Fingerprint scanner is connected</Text>}

              <Box
                overflow="hidden"
                shadow="xs"
                h={240}
                w={240}
                margin="1rem auto"
                border="1px solid rgba(0, 0, 0, 0.04)"
              >
                {fingerprints.newFingerprint && <Image src={getFingerprintImgString(fingerprints.newFingerprint)} />}
              </Box>

              {identificationStatus === 'identifying' && (
                <Text color="blue.500" textAlign="center">Identifying student...</Text>
              )}

              {identificationStatus === 'success' && identifiedStudent && (
                <Alert status="success" marginTop="1rem">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Student Identified!</AlertTitle>
                    <AlertDescription>
                      {identifiedStudent.name} ({identifiedStudent.matric_no})<br />
                      Grade: {identifiedStudent.grade}<br />
                      Confidence: {confidence.toFixed(2)}%
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {identificationStatus === 'error' && (
                <Alert status="error" marginTop="1rem">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Identification Failed</AlertTitle>
                    <AlertDescription>
                      Fingerprint not recognized. Please try scanning again.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {simpleValidator.current.message('fingerprint', fingerprints.newFingerprint, 'required|min:2')}
              {simpleValidator.current.message('student', markInput.student_id, 'required|between:2,128')}
              {simpleValidator.current.message('section', markInput.section, 'required|min:1')}
            </FormControl>

            <FormControl marginTop="1rem">
              <FormLabel>Time Type</FormLabel>
              <Select
                value={markInput.time_type}
                onChange={(e) => setMarkInput((prev) => ({ ...prev, time_type: e.target.value as 'IN' | 'OUT' }))}
                disabled={identificationStatus !== 'success'}
              >
                <option value="IN">Check In</option>
                <option value="OUT">Check Out</option>
              </Select>
            </FormControl>

            <Button
              w="100%"
              type="submit"
              bg="var(--bg-primary)"
              color="white"
              marginTop="3rem"
              _hover={{ background: 'var(--bg-primary-light)' }}
              disabled={isLoading || identificationStatus !== 'success'}
            >
              {isLoading ? 'Marking student...' : 'Mark student'}
            </Button>
          </form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default MarkAttendance;

import { useRef, useState, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import SimpleReactValidator from 'simple-react-validator';
import { AddStudentInput, Student, Course } from '../interfaces/api.interface';
import { useAddStudent, useUpdateStudent } from '../api/student.api';
import { useGetCourses } from '../api/course.api';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  Image,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import useStore from '../store/store';
import { queryClient } from '../lib/query-client';
import { fingerprintControl } from '../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';

export const getFingerprintImgString = (base64ImageData: string) => `data:image/png;base64,${base64ImageData}`;

const AddStudent: FC<{
  isOpen: boolean;
  size: string;
  onClose: () => void;
  closeDrawer: () => void;
  activeStudent: Student | null;
  setActiveStudent: (student: Student | null) => void;
}> = ({ onClose, isOpen, size, closeDrawer, activeStudent, setActiveStudent }) => {
  const staffInfo = useStore.use.staffInfo();
  const [studentInput, setStudentInput] = useState<AddStudentInput>({
    staff_id: staffInfo?.id as string,
    name: '',
    matric_no: '',
    grade: '',
    fingerprint: '',
    courses: [],
  } as AddStudentInput);

  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  // console.log('studentInput => ', studentInput);
  const [, forceUpdate] = useState<boolean>(false);
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [page] = useState<number>(1);
  const [per_page] = useState<number>(500);
  const { data: courseData } = useGetCourses(
    staffInfo?.id as string,
    page,
    per_page,
  )({ queryKey: ['availablecourses', page], keepPreviousData: true });
  const defaultStudentInput = () =>
    setStudentInput((prev: AddStudentInput) => ({ ...prev, name: '', matric_no: '', grade: '', courses: [], fingerprint: '' }));
  const { isLoading, mutate: addStudent } = useAddStudent({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeDrawer();
      toast.success('Course added successfully');
      defaultStudentInput();
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  const { isLoading: isUpdating, mutate: updateStudent } = useUpdateStudent({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setActiveStudent(null);
      closeDrawer();
      toast.success('Course updated successfully');
      defaultStudentInput();
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  useEffect(() => {
    if (isOpen && activeStudent) {
      setStudentInput((prev: AddStudentInput) => ({
        ...prev,
        name: activeStudent.name,
        matric_no: activeStudent.matric_no,
        grade: activeStudent.grade,
        fingerprint: activeStudent.fingerprint,
        courses: activeStudent.courses?.map((course) => course.id),
      }));
    }
  }, [isOpen, activeStudent]);

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

    setStudentInput((prev: AddStudentInput) => ({ ...prev, fingerprint: rawImages[0] }));
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

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Auto-capitalize the name field (ALL CAPS)
    if (name === 'name') {
      processedValue = value.toUpperCase();
    }

    setStudentInput((prev: AddStudentInput) => ({ ...prev, [name]: processedValue }));
  };

  console.log('studentInput => ', studentInput);

  const handleAddStudent: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      try {
        if (activeStudent) {
          onConfirmOpen();
        } else {
          addStudent(studentInput);
        }
      } catch (err) {
        console.log('error => ', err);
      }
    } else {
      simpleValidator.current.showMessages();
      forceUpdate((prev) => !prev);
    }
  };

  const confirmUpdate = () => {
    if (activeStudent) {
      updateStudent({ ...studentInput, id: activeStudent.id, url: `/${activeStudent.id}` });
      onConfirmClose();
    }
  };

  const courses = courseData?.data?.courses?.map((course: Course) => ({ value: course.id, label: course.course_code })) ?? [];
  return (
    <Drawer
      onClose={() => {
        defaultStudentInput();
        onClose();
      }}
      isOpen={isOpen}
      size={size}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{activeStudent ? 'Update' : 'Add New'} Student</DrawerHeader>
        <DrawerBody>
          <form className="login-form" method="post" action="#" onSubmit={handleAddStudent}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Text fontSize="sm" color="gray.500" mb={1}>(First Name, Middle Initial/Name, Last Name)</Text>
              <Input type="text" name="name" required value={studentInput.name} onChange={handleInputChange} />
              {simpleValidator.current.message('name', studentInput.name, 'required|string|between:2,128')}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Matric Number (or ID Number)</FormLabel>
              <Input
                type="text"
                name="matric_no"
                required
                value={studentInput.matric_no}
                onChange={handleInputChange}
              />
              {simpleValidator.current.message(
                'matric number',
                studentInput.matric_no,
                'required|alpha_num|between:3,128',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Grade</FormLabel>
              <Text fontSize="sm" color="gray.500" mb={1}>(Select grade level)</Text>
              <Select
                value={studentInput.grade ? { value: studentInput.grade, label: `Grade ${studentInput.grade}` } : null}
                name="grade"
                options={[
                  { value: '1', label: 'Grade 1' },
                  { value: '2', label: 'Grade 2' },
                  { value: '3', label: 'Grade 3' },
                  { value: '4', label: 'Grade 4' },
                  { value: '5', label: 'Grade 5' },
                  { value: '6', label: 'Grade 6' },
                ]}
                className="basic-single-select"
                classNamePrefix="select"
                onChange={(newValue: any) =>
                  setStudentInput((prev: AddStudentInput) => ({ ...prev, grade: newValue ? newValue.value : '' }))
                }
              />
              {simpleValidator.current.message(
                'grade',
                studentInput.grade,
                'required|string|between:1,6',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Fingerprint</FormLabel>
              {deviceConnected && <Text>✅ System: Fingerprint scanner is connected</Text>}
              <Box shadow="xs" h={240} w={240} margin="1rem auto 0" border="1px solid rgba(0, 0, 0, 0.04)">
                {studentInput.fingerprint && <Image src={getFingerprintImgString(studentInput.fingerprint)} />}
              </Box>
              {simpleValidator.current.message('fingerprint', studentInput.fingerprint, 'required|between:2,500000')}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Section</FormLabel>
              <Select
                value={studentInput.courses && studentInput.courses.length > 0 ? {
                  value: studentInput.courses[0],
                  label: courses?.find((course: { value: string; label: string }) => course.value === studentInput.courses[0])?.label,
                } : null}
                name="section"
                options={courses}
                className="basic-single-select"
                classNamePrefix="select"
                onChange={(newValue: any) =>
                  setStudentInput((prev: AddStudentInput) => ({ ...prev, courses: newValue ? [newValue.value] : [] }))
                }
              />
            </FormControl>
            <Button
              w="100%"
              type="submit"
              bg="var(--bg-primary)"
              color="white"
              marginTop="2rem"
              _hover={{ background: 'var(--bg-primary-light)' }}
              disabled={isLoading || isUpdating}
            >
              {isUpdating && activeStudent
                ? 'Updating student...'
                : isLoading && !activeStudent
                ? 'Adding student...'
                : activeStudent
                ? 'Update student'
                : 'Add student'}
            </Button>
          </form>
        </DrawerBody>
      </DrawerContent>

      <AlertDialog
        isOpen={isConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={onConfirmClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Changes
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to update the student "{activeStudent?.name}" (ID: {activeStudent?.matric_no})?
              This action will save the changes you made.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onConfirmClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={confirmUpdate}
                ml={3}
              >
                Confirm Changes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Drawer>
  );
};

export default AddStudent;

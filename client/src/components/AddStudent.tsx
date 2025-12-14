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


export const getFingerprintImgString = (base64ImageData: string) => {
  // If it's already a data URL, return as is
  if (base64ImageData.startsWith('data:image/')) {
    return base64ImageData;
  }

  // If it contains a comma, it might be a data URL, extract the base64 part
  if (base64ImageData.includes(',')) {
    const parts = base64ImageData.split(',');
    if (parts.length > 1) {
      return `data:image/png;base64,${parts[1]}`;
    }
  }

  // Otherwise, assume it's just base64 data and add the prefix
  return `data:image/png;base64,${base64ImageData}`;
};

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
    grade: staffInfo?.role === 'TEACHER' ? staffInfo?.grade || '' : '',
    fingerprint: undefined,
    courses: [],
  } as AddStudentInput);


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
    { queryKey: ['availablecourses', page], keepPreviousData: true }
  );
  const defaultStudentInput = () =>
    setStudentInput((prev: AddStudentInput) => ({
      ...prev,
      name: '',
      matric_no: '',
      grade: staffInfo?.role === 'TEACHER' ? staffInfo?.grade || '' : '',
      courses: [],
      fingerprint: undefined
    }));
  const { isLoading, mutate: addStudent } = useAddStudent({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeDrawer();
      toast.success('Student added successfully');
      defaultStudentInput();
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  const { isLoading: isUpdating, mutate: updateStudent } = useUpdateStudent();
  useEffect(() => {
    if (isOpen && activeStudent) {
      setStudentInput((prev: AddStudentInput) => ({
        ...prev,
        name: activeStudent.name,
        matric_no: activeStudent.matric_no,
        grade: activeStudent.grade,
        courses: activeStudent.courses?.map((course) => course.id),
      }));
    } else if (isOpen && !activeStudent && staffInfo?.role === 'TEACHER' && courseData?.data?.courses) {
      // Auto-populate grade and section for teachers when adding new students
      const teacherGrade = staffInfo.grade || '';
      const teacherSection = staffInfo.section || '';

      // Find the course that matches the teacher's grade and section
      const teacherCourse = courseData.data.courses.find(
        (course: any) => course.grade === teacherGrade && course.course_code === teacherSection
      );

      setStudentInput((prev: AddStudentInput) => ({
        ...prev,
        grade: teacherGrade,
        courses: teacherCourse ? [teacherCourse.id] : [],
      }));
    }
  }, [isOpen, activeStudent, courseData?.data?.courses, staffInfo]);




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

  const handleAddStudent: FormEventHandler = async (e) => {
    e.preventDefault();

    // For teachers, ensure grade is set
    const finalStudentInput = { ...studentInput };
    if (staffInfo?.role === 'TEACHER' && !finalStudentInput.grade && staffInfo.grade) {
      finalStudentInput.grade = staffInfo.grade;
    }

    if (simpleValidator.current.allValid()) {
      try {
        if (activeStudent) {
          onConfirmOpen();
        } else {
          addStudent(finalStudentInput);
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

  const courses = courseData?.data?.courses?.map((course: Course) => ({ value: course.id, label: course.course_code, grade: course.grade })) ?? [];
  return (
    <Drawer
      onClose={() => {
        defaultStudentInput();
        onClose();
      }}
      isOpen={isOpen}
      size={size}
      closeOnOverlayClick={false}
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
              <FormLabel>ID Number</FormLabel>
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
              <Text fontSize="sm" color="gray.500" mb={1}>
                {staffInfo?.role === 'TEACHER' ? '(Auto-filled from your assignment)' : '(Select grade level)'}
              </Text>
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
                isDisabled={staffInfo?.role === 'TEACHER'} // Disable for teachers
                onChange={(newValue: any) => {
                  setStudentInput((prev: AddStudentInput) => ({ ...prev, grade: newValue ? newValue.value : '', courses: [] }));
                }}
              />
              {staffInfo?.role !== 'TEACHER' && simpleValidator.current.message(
                'grade',
                studentInput.grade,
                'required|string|between:1,6',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Section</FormLabel>
              <Text fontSize="sm" color="gray.500" mb={1}>
                {staffInfo?.role === 'TEACHER' ? '(Auto-filled from your assignment)' : '(Select section)'}
              </Text>
              <Select
                value={studentInput.courses && studentInput.courses.length > 0 ? {
                  value: studentInput.courses[0],
                  label: courses?.find((course: { value: string; label: string }) => course.value === studentInput.courses[0])?.label,
                } : null}
                name="section"
                options={courses.filter(course => course.grade === studentInput.grade)}
                className="basic-single-select"
                classNamePrefix="select"
                onChange={(newValue: any) =>
                  setStudentInput((prev: AddStudentInput) => ({ ...prev, courses: newValue ? [newValue.value] : [] }))
                }
                isDisabled={!studentInput.grade || staffInfo?.role === 'TEACHER'} // Disable for teachers
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

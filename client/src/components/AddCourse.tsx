import { useRef, useState, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import SimpleReactValidator from 'simple-react-validator';
import { AddCourseInput, Course } from '../interfaces/api.interface';
import { useAddCourse, useUpdateCourse } from '../api/course.api';
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Select,
} from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import useStore from '../store/store';
import { queryClient } from '../lib/query-client';
import { getSectionsForGrade } from '../config/sections.config';

const AddCourse: FC<{
  isOpen: boolean;
  size: string;
  onClose: () => void;
  closeDrawer: () => void;
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;
}> = ({ onClose, isOpen, size, closeDrawer, activeCourse, setActiveCourse }) => {
  const staffInfo = useStore.use.staffInfo();
  const [courseInput, setCourseInput] = useState<AddCourseInput>({
    staff_id: staffInfo?.id as string,
    course_name: '',
    course_code: '',
    grade: '',
    matric_no: '',
  } as AddCourseInput);
  const [, forceUpdate] = useState<boolean>(false);
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { isLoading, mutate: addCourse } = useAddCourse({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeDrawer();
      toast.success('Course added successfully');
      setCourseInput((prev: AddCourseInput) => ({ ...prev, course_name: '', course_code: '', grade: '', matric_no: '' }));
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  const { isLoading: isUpdating, mutate: updateCourse } = useUpdateCourse({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setActiveCourse(null);
      closeDrawer();
      toast.success('Course updated successfully');
      setCourseInput((prev: AddCourseInput) => ({ ...prev, course_name: '', course_code: '', grade: '', matric_no: '' }));
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  useEffect(() => {
    if (isOpen && activeCourse) {
      setCourseInput((prev: AddCourseInput) => ({
        ...prev,
        course_name: activeCourse.course_name,
        course_code: activeCourse.course_code,
        grade: activeCourse.grade,
        matric_no: activeCourse.matric_no || '',
      }));
    }
  }, [isOpen, activeCourse]);
  const simpleValidator = useRef(
    new SimpleReactValidator({
      element: (message: string) => <div className="formErrorMsg">{message}</div>,
    }),
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement | HTMLSelectElement> = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Auto-capitalize the course_name and course_code fields (ALL CAPS)
    if (name === 'course_name' || name === 'course_code') {
      processedValue = value.toUpperCase();
    }

    // Auto-capitalize matric_no field (ALL CAPS)
    if (name === 'matric_no') {
      processedValue = value.toUpperCase();
    }

    setCourseInput((prev: AddCourseInput) => ({ ...prev, [name]: processedValue }));
  };

  const handleAddCourse: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      try {
        if (activeCourse) {
          onConfirmOpen();
        } else {
          addCourse(courseInput);
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
    if (activeCourse) {
      // FIXED: Only send the fields that should be updated, excluding staff_id
      updateCourse({
        id: activeCourse.id,
        url: `/${activeCourse.id}`,
        course_name: courseInput.course_name,
        course_code: courseInput.course_code,
        grade: courseInput.grade,
        matric_no: courseInput.matric_no,
      });
      onConfirmClose();
    }
  };

  return (
    <Drawer
      onClose={() => {
        setCourseInput((prev: AddCourseInput) => ({ ...prev, course_name: '', course_code: '', grade: '', matric_no: '' }));
        onClose();
      }}
      isOpen={isOpen}
      size={size}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{activeCourse ? 'Update' : 'Add New'} Section</DrawerHeader>
        <DrawerBody>
          <form className="login-form" method="post" action="#" onSubmit={handleAddCourse}>
            <FormControl>
              <FormLabel>Teacher Name</FormLabel>
              <Input
                type="text"
                name="course_name"
                required
                value={courseInput.course_name}
                onChange={handleInputChange}
              />
              {simpleValidator.current.message(
                'teacher name',
                courseInput.course_name,
                'required|string|between:2,128',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Section</FormLabel>
              <Select
                name="course_code"
                required
                value={courseInput.course_code}
                onChange={handleInputChange}
                placeholder="Select section"
              >
                {courseInput.grade && getSectionsForGrade(courseInput.grade).map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </Select>
              {simpleValidator.current.message(
                'section',
                courseInput.course_code,
                'required|string|between:2,128',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Teacher ID Number</FormLabel>
              <Input
                type="text"
                name="matric_no"
                required
                value={courseInput.matric_no}
                onChange={handleInputChange}
              />
              {simpleValidator.current.message(
                'teacher id number',
                courseInput.matric_no,
                'required|string|between:2,128',
              )}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Grade</FormLabel>
              <Select
                name="grade"
                required
                value={courseInput.grade}
                onChange={handleInputChange}
                placeholder="Select grade"
              >
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
              </Select>
              {simpleValidator.current.message(
                'grade',
                courseInput.grade,
                'required|string',
              )}
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
              {isUpdating && activeCourse
                ? 'Updating course...'
                : isLoading && !activeCourse
                ? 'Adding course...'
                : activeCourse
                ? 'Update'
                : 'Add section'}
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
              Are you sure you want to update the course "{activeCourse?.course_name}" ({activeCourse?.course_code})?
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

export default AddCourse;
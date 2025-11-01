import { useState, useEffect, useRef } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import SimpleReactValidator from 'simple-react-validator';
import { AddAttendanceInput, Attendance } from '../interfaces/api.interface';
import { useAddAttendance, useUpdateAttendance } from '../api/atttendance.api';
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
} from '@chakra-ui/react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';
import useStore from '../store/store';
import { queryClient } from '../lib/query-client';

const AddAttendance: FC<{
  isOpen: boolean;
  size: string;
  onClose: () => void;
  closeDrawer: () => void;
  activeAttendance: Attendance | null;
  setActiveAttendance: (attendance: Attendance | null) => void;
}> = ({ onClose, isOpen, size, closeDrawer, activeAttendance, setActiveAttendance }) => {
  const staffInfo = useStore.use.staffInfo();
  const [attendanceInput, setAttendanceInput] = useState<AddAttendanceInput>({
    staff_id: staffInfo?.id || '',
    name: '',
    date: new Date().toISOString(),
  });
  const [, forceUpdate] = useState<boolean>(false);
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { isLoading, mutate: addAttendance } = useAddAttendance({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      closeDrawer();
      toast.success('Attendance added successfully');
      setAttendanceInput((prev) => ({ ...prev, name: '', date: new Date().toISOString() }));
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  const { isLoading: isUpdating, mutate: updateAttendance } = useUpdateAttendance({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setActiveAttendance(null);
      closeDrawer();
      toast.success('Attendance updated successfully');
      setAttendanceInput((prev) => ({ ...prev, name: '', date: new Date().toISOString() }));
    },
    onError: (err) => {
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });
  useEffect(() => {
    if (isOpen && activeAttendance) {
      setAttendanceInput((prev) => ({
        ...prev,
        name: activeAttendance.name,
        date: activeAttendance.date,
      }));
    }
  }, [isOpen, activeAttendance]);
  const simpleValidator = useRef(
    new SimpleReactValidator({
      element: (message: string) => <div className="formErrorMsg">{message}</div>,
    }),
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setAttendanceInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAttendance: FormEventHandler = async (e) => {
    e.preventDefault();
    if (!staffInfo?.id) {
      toast.error('Staff information not available. Please log in again.');
      return;
    }
    if (simpleValidator.current.allValid()) {
      try {
        if (activeAttendance) {
          onConfirmOpen();
        } else {
          addAttendance(attendanceInput);
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
    if (activeAttendance) {
      updateAttendance({ ...attendanceInput, id: activeAttendance.id });
      onConfirmClose();
    }
  };
  return (
    <Drawer
      onClose={() => {
        setAttendanceInput((prev) => ({ ...prev, name: '', date: new Date().toISOString() }));
        onClose();
      }}
      isOpen={isOpen}
      size={size}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{activeAttendance ? 'Update' : 'Add New'} Attendance</DrawerHeader>
        <DrawerBody>
          <form className="login-form" method="post" action="#" onSubmit={handleAddAttendance}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input type="text" name="name" required value={attendanceInput.name} onChange={handleInputChange} />
              {simpleValidator.current.message('name', attendanceInput.name, 'required|alpha_num_space|between:3,128')}
            </FormControl>
            <FormControl marginTop="1rem">
              <FormLabel>Date</FormLabel>
              <DatePicker
                className="attendance-datepicker"
                selected={new Date(attendanceInput.date ? new Date(attendanceInput.date) : new Date())}
                onChange={(date: Date) => setAttendanceInput((prev) => ({ ...prev, date: date.toISOString() }))}
              />
              {simpleValidator.current.message('name', attendanceInput.date, 'required|between:2,128')}
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
              {isUpdating && activeAttendance
                ? 'Updating attendance...'
                : isLoading && !activeAttendance
                ? 'Adding attendance...'
                : activeAttendance
                ? 'Update attendance'
                : 'Add attendance'}
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
              Are you sure you want to update the attendance session "{activeAttendance?.name}" for {activeAttendance?.date ? new Date(activeAttendance.date).toLocaleDateString() : ''}?
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

export default AddAttendance;

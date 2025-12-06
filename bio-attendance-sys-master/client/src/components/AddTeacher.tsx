import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useDisclosure,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { Upload, X, Download, Info, Eye, EyeOff } from 'lucide-react';
import { useAddTeacher, useImportTeachers } from '../api/staff.api';
import { Teacher, AddTeacherInput } from '../interfaces/api.interface';
import { queryClient } from '../lib/query-client';
import SimpleReactValidator from 'simple-react-validator';

interface AddTeacherProps {
  isOpen: boolean;
  onClose: () => void;
  activeTeacher?: Teacher | null;
  setActiveTeacher?: (teacher: Teacher | null) => void;
}

const AddTeacher: FC<AddTeacherProps> = ({ isOpen, onClose, activeTeacher, setActiveTeacher }) => {
  const [teacherInput, setTeacherInput] = useState<AddTeacherInput>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'teacher',
    section: '',
    grade: '',
    matric_no: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImportMode, setIsImportMode] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState<boolean>(false);
  const { isOpen: isInfoOpen, onOpen: onInfoOpen, onClose: onInfoClose } = useDisclosure();

  const toast = useToast();
  const simpleValidator = useRef(
    new SimpleReactValidator({
      element: (message: string) => <div className="formErrorMsg">{message}</div>,
      validators: {
        password_match: {
          message: 'The :attribute must match password',
          rule: (val, params) => val === params[0],
        },
        strong_password: {
          message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          rule: (val) => {
            return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val);
          },
        },
      },
    }),
  );

  const { mutate: addTeacher, isLoading: isAddingTeacher } = useAddTeacher({
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      toast({
        title: 'Success',
        description: activeTeacher ? 'Teacher updated successfully' : 'Teacher added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      handleClose();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: (err.response?.data?.message as string) ?? 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const { mutate: importTeachers, isLoading: isImporting } = useImportTeachers({
    onSuccess: (data: any) => {
      queryClient.invalidateQueries(['teachers']);
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${data.imported} teachers.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (data.errors && data.errors.length > 0) {
        toast({
          title: 'Import Warnings',
          description: `${data.errors.length} records had errors.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }

      handleClose();
    },
    onError: (err: any) => {
      toast({
        title: 'Import Error',
        description: (err.response?.data?.message as string) ?? 'An error occurred during import',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  useEffect(() => {
    if (activeTeacher) {
      setTeacherInput({
        firstName: activeTeacher.firstName,
        lastName: activeTeacher.lastName,
        email: activeTeacher.email,
        password: '',
        role: activeTeacher.role,
        section: activeTeacher.section || '',
        grade: activeTeacher.grade || '',
        matric_no: activeTeacher.matric_no || '',
      });
      setIsImportMode(false);
    } else {
      setTeacherInput({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'teacher',
        section: '',
        grade: '',
        matric_no: '',
      });
    }
  }, [activeTeacher, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Auto-capitalize the firstName, lastName, and section fields (ALL CAPS)
    if (name === 'firstName' || name === 'lastName' || name === 'section') {
      processedValue = value.toUpperCase();
    }

    // For matric_no, allow only numbers and symbols
    if (name === 'matric_no') {
      processedValue = value.replace(/[^0-9\-_]/g, ''); // Allow numbers, hyphens, underscores
    }

    setTeacherInput((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isImportMode) {
      if (!csvFile) {
        toast({
          title: 'Error',
          description: 'Please select a CSV file to import',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', csvFile);
      importTeachers(formData);
    } else {
      if (simpleValidator.current.allValid()) {
        if (activeTeacher) {
          // For update, don't include password if it's empty
          const updateData: any = { ...teacherInput, id: activeTeacher.id };
          if (!teacherInput.password) {
            delete updateData.password;
          }
          // Don't send empty optional fields
          if (!updateData.section) delete updateData.section;
          if (!updateData.grade) delete updateData.grade;
          if (!updateData.matric_no) delete updateData.matric_no;
          addTeacher(updateData);
        } else {
          const createData = { ...teacherInput };
          // Don't send empty optional fields
          if (!createData.section) delete createData.section;
          if (!createData.grade) delete createData.grade;
          if (!createData.matric_no) delete createData.matric_no;
          addTeacher(createData);
        }
      } else {
        simpleValidator.current.showMessages();
        setForceUpdate(!forceUpdate);
      }
    }
  };

  const handleClose = () => {
    setTeacherInput({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'teacher',
      section: '',
      grade: '',
      matric_no: '',
    });
    setCsvFile(null);
    setIsImportMode(false);
    if (setActiveTeacher) setActiveTeacher(null);
    onClose();
  };

  const downloadSampleCSV = () => {
    // Create a sample CSV content
    const csvContent = `firstName,lastName,email,password,role,matric_no,section,grade
John,Doe,john.doe@example.com,password123,teacher,T001,A,1
Jane,Smith,jane.smith@example.com,password123,teacher,T002,B,2`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="lg" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{activeTeacher ? 'Edit Teacher' : 'Add New Teacher'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {!activeTeacher && (
                <HStack justifyContent="space-between">
                  <Button
                    leftIcon={<Upload />}
                    onClick={() => setIsImportMode(!isImportMode)}
                    colorScheme={isImportMode ? 'blue' : 'gray'}
                    variant={isImportMode ? 'solid' : 'outline'}
                  >
                    {isImportMode ? 'Manual Entry' : 'Import from CSV'}
                  </Button>
                  {isImportMode && (
                    <HStack>
                      <Button
                        leftIcon={<Download />}
                        onClick={downloadSampleCSV}
                        variant="outline"
                        size="sm"
                      >
                        Download Sample
                      </Button>
                      <IconButton
                        aria-label="CSV format info"
                        icon={<Info />}
                        onClick={onInfoOpen}
                        size="sm"
                      />
                    </HStack>
                  )}
                </HStack>
              )}

              {isImportMode ? (
                <Box>
                  <FormControl>
                    <FormLabel>CSV File</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <Upload color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        placeholder="Select CSV file"
                      />
                    </InputGroup>
                  </FormControl>
                  {csvFile && (
                    <HStack mt={2} justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">
                        Selected: {csvFile.name}
                      </Text>
                      <IconButton
                        size="xs"
                        aria-label="Remove file"
                        icon={<X />}
                        onClick={() => setCsvFile(null)}
                      />
                    </HStack>
                  )}
                </Box>
              ) : (
                <form onSubmit={handleSubmit}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>First Name</FormLabel>
                      <Input
                        name="firstName"
                        value={teacherInput.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                      />
                      {simpleValidator.current.message('firstName', teacherInput.firstName, 'required|between:2,50')}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Last Name</FormLabel>
                      <Input
                        name="lastName"
                        value={teacherInput.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                      />
                      {simpleValidator.current.message('lastName', teacherInput.lastName, 'required|between:2,50')}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input
                        name="email"
                        type="email"
                        value={teacherInput.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                      />
                      {simpleValidator.current.message('email', teacherInput.email, 'required|email')}
                    </FormControl>

                    {!activeTeacher && (
                      <FormControl>
                        <FormLabel>Password</FormLabel>
                        <InputGroup>
                          <Input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={teacherInput.password}
                            onChange={handleInputChange}
                            placeholder="Enter password"
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              icon={showPassword ? <EyeOff /> : <Eye />}
                              onClick={() => setShowPassword(!showPassword)}
                              variant="ghost"
                              size="sm"
                            />
                          </InputRightElement>
                        </InputGroup>
                        {simpleValidator.current.message('password', teacherInput.password, 'required|strong_password')}
                      </FormControl>
                    )}

                    <FormControl>
                      <FormLabel>Role</FormLabel>
                      <Select name="role" value={teacherInput.role} onChange={handleInputChange}>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Teacher ID Number</FormLabel>
                      <Input
                        name="matric_no"
                        value={teacherInput.matric_no}
                        onChange={handleInputChange}
                        placeholder="Enter teacher ID number"
                      />
                      {simpleValidator.current.message('matric_no', teacherInput.matric_no, 'required|between:2,50')}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Section</FormLabel>
                      <Input
                        name="section"
                        value={teacherInput.section}
                        onChange={handleInputChange}
                        placeholder="Enter section"
                      />
                      {simpleValidator.current.message('section', teacherInput.section, 'required|between:2,50')}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Grade</FormLabel>
                      <Select name="grade" value={teacherInput.grade} onChange={handleInputChange} placeholder="Select grade">
                        <option value="1">Grade 1</option>
                        <option value="2">Grade 2</option>
                        <option value="3">Grade 3</option>
                        <option value="4">Grade 4</option>
                        <option value="5">Grade 5</option>
                        <option value="6">Grade 6</option>
                      </Select>
                      {simpleValidator.current.message('grade', teacherInput.grade, 'required')}
                    </FormControl>
                  </VStack>
                </form>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isAddingTeacher || isImporting}
            >
              {activeTeacher ? 'Update' : isImportMode ? 'Import' : 'Add'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* CSV Format Info Modal */}
      <Modal isOpen={isInfoOpen} onClose={onInfoClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>CSV Format Information</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text>
                Your CSV file should contain the following columns in this exact order:
              </Text>
              <Box p={3} bg="gray.100" borderRadius="md">
                <Text fontFamily="mono" fontSize="sm">
                  firstName,lastName,email,password,role,matric_no,section,grade
                </Text>
              </Box>
              <Text>
                <strong>Notes:</strong>
              </Text>
              <UnorderedList pl={5}>
                <ListItem>firstName: Teacher's first name (required)</ListItem>
                <ListItem>lastName: Teacher's last name (required)</ListItem>
                <ListItem>email: Teacher's email address (required, must be unique)</ListItem>
                <ListItem>password: Initial password (required, must be at least 8 characters with uppercase, lowercase, number, and special character)</ListItem>
                <ListItem>role: Either "teacher" or "admin" (required)</ListItem>
                <ListItem>matric_no: Teacher ID number (required)</ListItem>
                <ListItem>section: Section name (required)</ListItem>
                <ListItem>grade: Grade level (1-6, required)</ListItem>
              </UnorderedList>
              <Text fontSize="sm" color="blue.600" mt={2}>
                <strong>Note:</strong> A course will be automatically created for each teacher using the section and grade information.
              </Text>
              <Text fontSize="sm" color="gray.600">
                The first row should contain the column headers as shown above.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onInfoClose}>
              Got it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AddTeacher;
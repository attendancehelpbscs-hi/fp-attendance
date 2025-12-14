import { useState, useRef, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import { Card, CardHeader, Heading, FormControl, FormLabel, Input, Button, Text, InputGroup, InputRightElement, IconButton, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SimpleReactValidator from 'simple-react-validator';
import { useResetPassword } from '../../api/staff.api';
import { useDisclosure } from '@chakra-ui/react';

const ResetPassword: FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [resetInput, setResetInput] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [, forceUpdate] = useState<boolean>(false);
  const navigate = useNavigate();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const { isLoading, mutate: resetPassword } = useResetPassword({
    onSuccess: () => {
      onOpen();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reset password');
    },
  });

  const simpleValidator = useRef(new SimpleReactValidator({
    validators: {
      passwordStrength: {
        message: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character.',
        rule: (val: string) => {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val);
        },
      },
      confirmPassword: {
        message: 'Passwords do not match.',
        rule: (val: string, params: any) => val === params[0],
      },
    },
  }));

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/staff/login');
    }
  }, [token, navigate]);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setResetInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPassword: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      if (!token) return;
      resetPassword({ token, newPassword: resetInput.newPassword });
    } else {
      simpleValidator.current.showMessages();
      forceUpdate((prev) => !prev);
    }
  };

  if (!token) {
    return (
      <div>
        <Alert status="error">
          <AlertIcon />
          Invalid reset link. Please request a new password reset.
        </Alert>
      </div>
    );
  }

  const handleModalClose = () => {
    onClose();
    navigate('/staff/login');
  };

  return (
    <div>
      <Card maxW={400} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Reset Password
        </CardHeader>
        <form className="reset-password-form" method="post" action="#" onSubmit={handleResetPassword}>
          <FormControl marginTop="1rem">
            <FormLabel>New Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={resetInput.newPassword}
                name="newPassword"
                required
                onChange={handleInputChange}
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
            {simpleValidator.current.message('newPassword', resetInput.newPassword, 'required|passwordStrength')}
          </FormControl>

          <FormControl marginTop="1rem">
            <FormLabel>Confirm New Password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={resetInput.confirmPassword}
                name="confirmPassword"
                required
                onChange={handleInputChange}
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
            {simpleValidator.current.message('confirmPassword', resetInput.confirmPassword, `required|confirmPassword:${resetInput.newPassword}`)}
          </FormControl>

          <Button
            w="100%"
            type="submit"
            bg="var(--bg-primary)"
            color="white"
            marginTop="2rem"
            _hover={{ background: 'var(--bg-primary-light)' }}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </Card>

      {/* Success Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">Password Reset Successful</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text textAlign="center" mb={4}>
              Your password has been successfully reset! You can now log in with your new password.
            </Text>
            <Button colorScheme="blue" onClick={handleModalClose} w="100%">
              Go to Login
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ResetPassword;

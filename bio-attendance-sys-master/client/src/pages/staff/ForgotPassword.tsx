import { useState, useRef, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import { Card, CardHeader, Heading, FormControl, FormLabel, Input, Button, Text, Alert, AlertIcon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SimpleReactValidator from 'simple-react-validator';
import { useForgotPassword } from '../../api/staff.api';

const ForgotPassword: FC = () => {
  const [email, setEmail] = useState('');
  const [, forceUpdate] = useState<boolean>(false);
  const navigate = useNavigate();

  const { isLoading, mutate: forgotPassword } = useForgotPassword({
    onSuccess: () => {
      toast.success('If an account with this email exists, a password reset link has been sent.');
      navigate('/staff/login');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send reset email');
    },
  });

  const simpleValidator = useRef(new SimpleReactValidator());

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setEmail(e.target.value);
  };

  const handleForgotPassword: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      forgotPassword({ email });
    } else {
      simpleValidator.current.showMessages();
      forceUpdate((prev) => !prev);
    }
  };

  return (
    <div>
      <Card maxW={400} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Forgot Password
        </CardHeader>
        <form className="forgot-password-form" method="post" action="#" onSubmit={handleForgotPassword}>
          <FormControl marginTop="1rem">
            <FormLabel>Email address</FormLabel>
            <Input
              type="email"
              value={email}
              name="email"
              required
              onChange={handleInputChange}
              placeholder="Enter your email address"
            />
            {simpleValidator.current.message('email', email, 'required|email|between:2,128')}
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
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
        <Text padding="1rem" textAlign="center">
          Remember your password?{' '}
          <a href="/staff/login" style={{ textDecoration: 'underline' }}>
            Login
          </a>
        </Text>
      </Card>
    </div>
  );
};

export default ForgotPassword;

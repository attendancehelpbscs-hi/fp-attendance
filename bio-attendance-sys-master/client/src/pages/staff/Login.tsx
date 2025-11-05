import { useState, useRef } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import { Card, CardHeader, Heading, FormControl, FormLabel, Input, Button, Link, Text, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import '../../styles/Staff.scss';
import type { LoginStaffInput } from '../../interfaces/api.interface';
import { useLoginStaff } from '../../api/staff.api';
import { toast } from 'react-hot-toast';
import useStore from '../../store/store';
import SimpleReactValidator from 'simple-react-validator';

const Login: FC = () => {
  const [loginInput, setLoginInput] = useState<LoginStaffInput>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [, forceUpdate] = useState<boolean>(false);
  const login = useStore.use.loginStaff();
  const navigate = useNavigate();

  const { isLoading, mutate: loginStaff } = useLoginStaff({
    onSuccess: (response) => {
      console.log('🔍 Full API Response:', response);
      console.log('🔍 Response.data:', (response as any)?.data);
      
      // The backend returns: { data: { staff: { accessToken, refreshToken, staff } } }
      const responseData = (response as any)?.data?.staff; // ← Extract from staff property!
      const accessToken = responseData?.accessToken;
      const refreshToken = responseData?.refreshToken;
      const staff = responseData?.staff;
      
      console.log('🔍 Extracted values:', { accessToken, refreshToken, staff });
      
      if (!accessToken || !refreshToken || !staff) {
        console.error('❌ Missing required data!');
        toast.error('Login failed: Invalid server response');
        return;
      }
      
      toast.success('Login successful');
      
      // Call store login function
      console.log('🔍 Calling login()...');
      login({ accessToken, refreshToken, staff });
      
      // Check store after a brief delay
      setTimeout(() => {
        const state = useStore.getState();
        console.log('🔍 Store state after login:', {
          isAuthenticated: state.isAuthenticated,
          hasTokens: !!state.tokens,
          tokens: state.tokens,
          hasStaffInfo: !!state.staffInfo,
        });
        
        // Check localStorage
        const persisted = localStorage.getItem('bas-persist');
        console.log('🔍 LocalStorage:', persisted ? JSON.parse(persisted) : null);
        
        if (state.isAuthenticated && state.tokens) {
          console.log('✅ Login successful, navigating to profile...');
          navigate('/staff/profile', { replace: true });
        } else {
          console.error('❌ Store not updated properly!');
          toast.error('Login failed: Authentication state not updated');
        }
      }, 200); // Increased delay to ensure persist has time to save
    },
    onError: (err) => {
      console.error('❌ Login error:', err);
      toast.error((err.response?.data?.message as string) ?? 'An error occured');
    },
  });

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setLoginInput((prev) => ({ ...prev, [name]: value }));
  };

  const simpleValidator = useRef(
    new SimpleReactValidator({
      element: (message: string) => <div className="formErrorMsg">{message}</div>,
      validators: {
        password_match: {
          message: 'The :attribute must match password',
          rule: (val, params) => val === params[0],
        },
      },
    }),
  );

  const handleLoginStaff: FormEventHandler = async (e) => {
    e.preventDefault();
    if (simpleValidator.current.allValid()) {
      try {
        loginStaff(loginInput);
      } catch (err) {
        console.log('error => ', err);
      }
    } else {
      simpleValidator.current.showMessages();
      forceUpdate((prev) => !prev);
    }
  };

  return (
    <div>
      <Card maxW={400} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Login
        </CardHeader>
        <form className="login-form" method="post" action="#" onSubmit={handleLoginStaff}>
          <FormControl>
            <FormLabel>Email address</FormLabel>
            <Input type="email" value={loginInput.email} name="email" required onChange={handleInputChange} />
            {simpleValidator.current.message('email', loginInput.email, 'required|email|between:2,128')}
          </FormControl>
          <FormControl marginTop="1rem">
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={loginInput.password}
                name="password"
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
            {simpleValidator.current.message('password', loginInput.password, 'required|between:4,15')}
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
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <Text padding="1rem">
          No Account?{' '}
          <Link as={RouterLink} to="/staff/register" textDecoration="underline">
            Register
          </Link>
        </Text>
      </Card>
    </div>
  );
};

export default Login;
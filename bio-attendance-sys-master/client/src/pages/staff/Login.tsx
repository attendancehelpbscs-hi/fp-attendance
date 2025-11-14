import { useState, useRef, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import { Card, CardHeader, Heading, FormControl, FormLabel, Input, Button, Link, Text, InputGroup, InputRightElement, IconButton, Tabs, TabList, TabPanels, Tab, TabPanel, Box } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import '../../styles/Staff.scss';
import type { LoginStaffInput } from '../../interfaces/api.interface';
import { useLoginStaff, useFingerprintLogin } from '../../api/staff.api';
import { toast } from 'react-hot-toast';
import useStore from '../../store/store';
import SimpleReactValidator from 'simple-react-validator';
import { fingerprintControl } from '../../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';

const Login: FC = () => {
  const [loginInput, setLoginInput] = useState<LoginStaffInput>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [, forceUpdate] = useState<boolean>(false);
  const login = useStore.use.loginStaff();
  const navigate = useNavigate();
  const [fingerprintData, setFingerprintData] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);

  const { isLoading, mutate: loginStaff } = useLoginStaff({
    onSuccess: (response) => {
      console.log('🔍 Full API Response:', response);
      console.log('🔍 Response.data:', (response as any)?.data);

      // The backend returns: { data: { accessToken, refreshToken, staff } }
      const responseData = (response as any)?.data; // ← Direct access now
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

  const { mutate: fingerprintLogin } = useFingerprintLogin({
    onSuccess: (response) => {
      console.log('🔍 Fingerprint login response:', response);
      const responseData = (response as any)?.data;
      const accessToken = responseData?.accessToken;
      const refreshToken = responseData?.refreshToken;
      const staff = responseData?.staff;

      if (!accessToken || !refreshToken || !staff) {
        toast.error('Fingerprint login failed: Invalid server response');
        return;
      }

      toast.success('Fingerprint login successful');

      // Call store login function
      console.log('🔍 Calling login() for fingerprint...');
      login({ accessToken, refreshToken, staff });

      // Check store after a brief delay
      setTimeout(() => {
        const state = useStore.getState();
        console.log('🔍 Store state after fingerprint login:', {
          isAuthenticated: state.isAuthenticated,
          hasTokens: !!state.tokens,
          tokens: state.tokens,
          hasStaffInfo: !!state.staffInfo,
        });

        if (state.isAuthenticated && state.tokens) {
          console.log('✅ Fingerprint login successful, navigating to profile...');
          navigate('/staff/profile', { replace: true });
        } else {
          console.error('❌ Fingerprint login failed: Store not updated properly!');
          toast.error('Fingerprint login failed: Authentication state not updated');
        }
      }, 200); // Increased delay to ensure persist has time to save
    },
    onError: (err) => {
      console.error('❌ Fingerprint login error:', err);
      toast.error((err.response?.data?.message as string) ?? 'Fingerprint login failed');
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

  const handleFingerprintLogin = () => {
    console.log('handleFingerprintLogin called, fingerprintData:', fingerprintData);
    if (fingerprintData) {
      console.log('Calling fingerprintLogin with fingerprint:', fingerprintData.substring(0, 50) + '...');
      fingerprintLogin({ fingerprint: fingerprintData });
    } else {
      console.log('No fingerprint data available');
      toast.error('No fingerprint data available');
    }
  };

  // Handle device connection events (same as student enrollment)
  const handleDeviceConnected = () => {
    console.log('Fingerprint device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Fingerprint device disconnected');
    setDeviceConnected(false);
  };

  // Handle sample acquisition (same as student enrollment)
  const handleSampleAcquired = (event: any) => {
    console.log('Fingerprint sample acquired:', event?.samples);
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprintData(rawImages[0]);
  };

  // Initialize fingerprint control on component mount
  useEffect(() => {
    fingerprintControl.onDeviceConnected = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnected = handleDeviceDisconnected;
    fingerprintControl.onSamplesAcquired = handleSampleAcquired;
    fingerprintControl.init();

    // Cleanup on unmount
    return () => {
      fingerprintControl.destroy();
    };
  }, []);

  return (
    <div>
      <Card maxW={400} margin="1rem auto">
        <CardHeader fontWeight={600} fontSize="1.7rem" textAlign="center">
          Login
        </CardHeader>
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Email & Password</Tab>
            <Tab>Fingerprint</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
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
            </TabPanel>
            <TabPanel>
              <Box textAlign="center">
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Place your enrolled finger on the scanner to login
                </Text>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  {deviceConnected
                    ? "✅ System: Fingerprint scanner is connected"
                    : "❌ System: Fingerprint scanner not connected. Please refresh the page and try again."
                  }
                </Text>
                <Box shadow="xs" h={120} w={120} margin="1rem auto" border="1px solid rgba(0, 0, 0, 0.04)">
                  {fingerprintData && <img src={`data:image/png;base64,${fingerprintData}`} alt="Fingerprint" />}
                </Box>
                <Button
                  w="100%"
                  bg="var(--bg-primary)"
                  color="white"
                  marginTop="2rem"
                  _hover={{ background: 'var(--bg-primary-light)' }}
                  onClick={handleFingerprintLogin}
                  disabled={!fingerprintData}
                >
                  Login with Fingerprint
                </Button>
                <Text fontSize="sm" color="gray.500" mt={4}>
                  Don't have your fingerprint enrolled? Go to Settings to enroll it first.
                </Text>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Text padding="1rem" textAlign="center">
          <Link as={RouterLink} to="/staff/forgot-password" textDecoration="underline">
            Forgot Password?
          </Link>
        </Text>
      </Card>
    </div>
  );
};

export default Login;
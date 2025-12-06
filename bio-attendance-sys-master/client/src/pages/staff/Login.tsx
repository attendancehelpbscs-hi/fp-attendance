import { useState, useRef, useEffect } from 'react';
import type { FC, ChangeEventHandler, FormEventHandler } from 'react';
import { Card, CardHeader, Heading, FormControl, FormLabel, Input, Button, Link, Text, InputGroup, InputRightElement, IconButton, Tabs, TabList, TabPanels, Tab, TabPanel, Box, Image, Flex } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ViewIcon, ViewOffIcon, EmailIcon, LockIcon } from '@chakra-ui/icons';
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
  const [currentSlide, setCurrentSlide] = useState<number>(0);

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
      
      // Store role information for role-based access control
      if (staff && staff.role) {
        console.log('🔍 User role:', staff.role);
      }

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
          // Use window.location.replace instead of navigate for full page reload
          window.location.replace('/staff/profile');
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
          // Use window.location.replace instead of navigate for full page reload
          window.location.replace('/staff/profile');
        } else {
          console.error('❌ Fingerprint login failed: Store not updated properly!');
          toast.error('Fingerprint login failed: Authentication state not updated');
        }
      }, 200); // Increased delay to ensure persist has time to save
    },
    onError: (err) => {
      console.error('❌ Fingerprint login error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Fingerprint login failed. Please try again.';
      toast.error(errorMessage);
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
    console.log('Login: Fingerprint device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Login: Fingerprint device disconnected');
    setDeviceConnected(false);
  };

  // Handle sample acquisition (same as student enrollment)
  const handleSampleAcquired = (event: any) => {
    console.log('Login: Fingerprint sample acquired:', event?.samples);
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprintData(rawImages[0]);
  };

  // Set up fingerprint control callbacks (global init is handled in App.tsx)
  useEffect(() => {
    // Set up callbacks for this component
    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;
    fingerprintControl.onSamplesAcquiredCallback = handleSampleAcquired;

    // Check initial connection status with multiple attempts
    const checkInitialConnection = () => {
      try {
        console.log('Login: Checking initial connection status...');
        console.log('Login: isDeviceConnected:', fingerprintControl.isDeviceConnected);

        if (fingerprintControl.isDeviceConnected) {
          console.log('Login: Device was already connected');
          setDeviceConnected(true);
          return;
        }

        console.log('Login: Device not connected yet, waiting for connection event');
        setDeviceConnected(false);

        // Multiple delayed checks to account for async initialization
        const checkDelays = [1000, 3000, 5000, 8000]; // Progressive delays

        checkDelays.forEach((delay, index) => {
          setTimeout(() => {
            console.log(`Login: Re-checking connection after ${delay}ms...`);
            console.log(`Login: isDeviceConnected after ${delay}ms:`, fingerprintControl.isDeviceConnected);

            if (fingerprintControl.isDeviceConnected) {
              console.log(`Login: Device connected after ${delay}ms delay`);
              setDeviceConnected(true);
            } else if (index === checkDelays.length - 1) {
              console.log('Login: Device still not connected after all checks');
              setDeviceConnected(false);
            }
          }, delay);
        });

      } catch (error) {
        console.warn('Login: Error checking initial connection:', error);
        setDeviceConnected(false);
      }
    };

    checkInitialConnection();

    // Cleanup callbacks on unmount (but don't destroy the global instance)
    return () => {
      fingerprintControl.onDeviceConnectedCallback = null as any;
      fingerprintControl.onDeviceDisconnectedCallback = null as any;
      fingerprintControl.onSamplesAcquiredCallback = null as any;
    };
  }, []);

  // Auto-slideshow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 2);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="login-page">
      <div className="moving-background"></div>
      <div className="login-content">
        <div className="login-container">
          <div className="login-image">
            <Image src="/White Tosca Modern Art Exhibition Trifold Brochurevv.png" alt="Illustration" />
          </div>
          <div className="login-form-container">
            <Card w={500} margin="1rem 0 1rem 0">
              <CardHeader textAlign="center" paddingBottom="0">
                <Heading as="h1" className="login-title">Welcome Back, Admin</Heading>
                <Text className="welcome-message">Sign in to access your dashboard</Text>
              </CardHeader>
              <Tabs variant="enclosed">
                <TabList>
                  <Tab>Email & Password</Tab>
                  <Tab>Fingerprint</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <form className="login-form" method="post" action="#" onSubmit={handleLoginStaff}>
                      <FormControl position="relative">
                        <FormLabel>Email address</FormLabel>
                        <EmailIcon className="input-icon" />
                        <Input
                          type="email"
                          value={loginInput.email}
                          name="email"
                          placeholder="Enter your email"
                          required
                          onChange={handleInputChange}
                          aria-label="Email address"
                        />
                        {simpleValidator.current.message('email', loginInput.email, 'required|email|between:2,128')}
                      </FormControl>
                      <FormControl marginTop="1rem" position="relative">
                        <FormLabel>Password</FormLabel>
                        <LockIcon className="input-icon" />
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={loginInput.password}
                            name="password"
                            placeholder="Enter your password"
                            required
                            onChange={handleInputChange}
                            aria-label="Password"
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                              onClick={() => setShowPassword(!showPassword)}
                              size="sm"
                              className="password-toggle"
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
              <Box 
                padding="0.5rem" 
                textAlign="center" 
                bg="var(--bg-primary-light)" 
                borderRadius="md" 
                mt={4}
                mb={2}
              >
                <Text fontWeight="bold" color="white" >
                  Are you a teacher?
                </Text>
                <Flex justifyContent="center" mt={2}>
                  <Link 
                    as={RouterLink} 
                    to="/teacher-login" 
                    color="white" 
                    bg="var(--bg-primary)" 
                    px={4} 
                    py={2} 
                    borderRadius="md" 
                    mr={2}
                    _hover={{ bg: "var(--bg-primary-dark)" }}
                  >
                    Login here
                  </Link>
                  <Link 
                    as={RouterLink} 
                    to="/teacher-register" 
                    color="white" 
                    bg="var(--bg-primary)" 
                    px={4} 
                    py={2} 
                    borderRadius="md"
                    _hover={{ bg: "var(--bg-primary-dark)" }}
                  >
                    Register here
                  </Link>
                </Flex>
              </Box>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
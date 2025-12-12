import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabList, Tab, TabPanel, TabPanels, Box, Text, Button, InputGroup, InputLeftElement, Input, InputRightElement, IconButton } from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, EmailIcon, LockIcon } from '@chakra-ui/icons';
import useStore from '../store/store';
import { toast } from 'react-hot-toast';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import '../styles/Auth.css';
import { useFingerprintLogin } from '../api/staff.api';
import { fingerprintControl } from '../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';

const TeacherLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginStaff = useStore.use.loginStaff();
  const navigate = useNavigate();

  // Fingerprint login state
  const [fingerprintData, setFingerprintData] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

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
      loginStaff({ accessToken, refreshToken, staff });

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
          window.location.replace('/');
        } else {
          console.error('❌ Fingerprint login failed: Store not updated properly!');
          toast.error('Fingerprint login failed: Authentication state not updated');
        }
      }, 200);
    },
    onError: (err) => {
      console.error('❌ Fingerprint login error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Fingerprint login failed. Please try again.';
      toast.error(errorMessage);
    },
  });

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

  // Handle device connection events
  const handleDeviceConnected = () => {
    console.log('Teacher Login: Fingerprint device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Teacher Login: Fingerprint device disconnected');
    setDeviceConnected(false);
  };

  // Handle sample acquisition
  const handleSampleAcquired = (event: any) => {
    console.log('Teacher Login: Fingerprint sample acquired:', event?.samples);
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprintData(rawImages[0]);
  };

  // Set up fingerprint control callbacks
  useEffect(() => {
    // Set up callbacks for this component
    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;
    fingerprintControl.onSampleAcquiredCallback = handleSampleAcquired;

    // Check initial connection status
    const checkInitialConnection = () => {
      try {
        console.log('Teacher Login: Checking initial connection status...');
        console.log('Teacher Login: isDeviceConnected:', fingerprintControl.isDeviceConnected);

        if (fingerprintControl.isDeviceConnected) {
          console.log('Teacher Login: Device was already connected');
          setDeviceConnected(true);
          return;
        }

        console.log('Teacher Login: Device not connected yet, waiting for connection event');
        setDeviceConnected(false);

        // Multiple delayed checks to account for async initialization
        const checkDelays = [1000, 3000, 5000, 8000];

        checkDelays.forEach((delay, index) => {
          setTimeout(() => {
            console.log(`Teacher Login: Re-checking connection after ${delay}ms...`);
            console.log(`Teacher Login: isDeviceConnected after ${delay}ms:`, fingerprintControl.isDeviceConnected);

            if (fingerprintControl.isDeviceConnected) {
              console.log(`Teacher Login: Device connected after ${delay}ms delay`);
              setDeviceConnected(true);
            } else if (index === checkDelays.length - 1) {
              console.log('Teacher Login: Device still not connected after all checks');
              setDeviceConnected(false);
            }
          }, delay);
        });

      } catch (error) {
        console.warn('Teacher Login: Error checking initial connection:', error);
        setDeviceConnected(false);
      }
    };

    checkInitialConnection();

    // Cleanup callbacks on unmount
    return () => {
      fingerprintControl.onDeviceConnectedCallback = null as any;
      fingerprintControl.onDeviceDisconnectedCallback = null as any;
      fingerprintControl.onSampleAcquiredCallback = null as any;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For teacher login, we'll use the same login function but with teacher role
      // This would need to be implemented in the backend to differentiate between admin and teacher
      const response = await fetch('/api/teachers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to log in');
      }

      const responseData = await response.json();

      // Use the store's loginStaff function
      loginStaff({
        accessToken: responseData.data.accessToken,
        refreshToken: responseData.data.refreshToken,
        staff: responseData.data.staff
      });

      toast.success('Login successful');
      window.location.href = '/';
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to log in';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Teacher Login</h1>
          <p>Sign in to your teacher account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <Tabs variant="enclosed">
          <TabList>
            <Tab>Email & Password</Tab>
            <Tab>Fingerprint</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <EmailIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </InputGroup>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <LockIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
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
                </div>

                <Button
                  type="submit"
                  className="auth-button"
                  disabled={loading}
                  width="100%"
                  bg="var(--bg-primary)"
                  color="white"
                  _hover={{ background: 'var(--bg-primary-light)' }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
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
                  width="100%"
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
                  Don't have your fingerprint enrolled? Contact your administrator to enroll it.
                </Text>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/teacher-register">Register</Link>
          </p>
          <p>
            <Link to="/staff/forgot-password">Forgot Password?</Link>
          </p>
          <p>
            <Link to="/staff/login">ADMIN LOGIN</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default TeacherLogin;

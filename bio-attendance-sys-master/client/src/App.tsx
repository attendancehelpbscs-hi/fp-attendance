// import FingerprintSigninControl from './lib/fingerprint';
import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import WithMainLayout from './layouts/WithMainLayout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import PrivacyPolicy from './pages/PrivacyPolicy';
import About from './pages/About';
import Login from './pages/staff/Login';
import ForgotPassword from './pages/staff/ForgotPassword';
import ResetPassword from './pages/staff/ResetPassword';
import Profile from './pages/staff/Profile';
import ManageCourses from './pages/staff/ManageCourses';
import ManageStudents from './pages/staff/ManageStudents';
import StudentManagement from './pages/staff/StudentManagement';
import FingerprintEnrollment from './pages/staff/FingerprintEnrollment';
import Settings from './pages/staff/Settings';
import ManageAttendance from './pages/staff/ManageAttendance';
import Reports from './pages/staff/Reports';
import Help from './pages/staff/Help';
import AttendanceKiosk from './pages/staff/AttendanceKiosk';
import useStore from './store/store';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import AuthLayout from './layouts/AuthLayout';
import { useGetStaffSettings } from './api/staff.api';
import { fingerprintControl } from './lib/fingerprint';

function App() {
  useStore();
  const isAuthenticated = useStore.use.isAuthenticated();
  const setStaffSettings = useStore.use.setStaffSettings();
  
  // ✅ FIX: Call the hook BEFORE using it in config
  const tokens = useStore.use.tokens();

  // Load staff settings on app start if authenticated
  const { data: staffSettingsData } = useGetStaffSettings({
    enabled: isAuthenticated && !!tokens, // ✅ Now using the variable, not calling hook
  });

  useEffect(() => {
    if (staffSettingsData?.settings) {
      setStaffSettings(staffSettingsData.settings);
    }
  }, [staffSettingsData, setStaffSettings]);

  // Initialize fingerprint control globally on app start
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        // Check if already initialized to avoid duplicate initialization
        if (fingerprintControl.isDeviceConnected) {
          console.log('Global fingerprint control already connected');
          return;
        }

        await fingerprintControl.init();
        console.log('Global fingerprint control initialized successfully');

        // Set up global callbacks
        fingerprintControl.onDeviceConnectedCallback = () => {
          console.log('Global: Device connected');
        };

        fingerprintControl.onDeviceDisconnectedCallback = () => {
          console.log('Global: Device disconnected');
        };

      } catch (error) {
        console.error('Failed to initialize global fingerprint control:', error);
        // Don't retry here as components will handle their own initialization if needed
      }
    };

    // Initialize immediately
    initializeFingerprint();

    // Also try to initialize after a short delay in case the device wasn't ready
    const delayedInit = setTimeout(() => {
      if (!fingerprintControl.isDeviceConnected) {
        console.log('Retrying global fingerprint initialization...');
        initializeFingerprint();
      }
    }, 2000);

    // Cleanup on app unmount
    return () => {
      clearTimeout(delayedInit);
      // Don't destroy here as components might still be using it
      // fingerprintControl.destroy();
    };
  }, []);

  const router = createBrowserRouter([
    {
      path: '/',
      element: <WithMainLayout><Home /></WithMainLayout>,
      errorElement: <WithMainLayout><NotFound /></WithMainLayout>,
    },
    {
      path: '/staff/login',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="noauth">
            <Login />
          </AuthLayout>
        </WithMainLayout>
      ),
    },

    {
      path: '/staff/forgot-password',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="noauth">
            <ForgotPassword />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/reset-password',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="noauth">
            <ResetPassword />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/profile',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <Profile />
          </AuthLayout>
        </WithMainLayout>
      ),
    },

    {
      path: '/staff/student-management',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <StudentManagement />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/fingerprint-enrollment',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <FingerprintEnrollment />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/manage/attendance',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <ManageAttendance />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/manage/students',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <ManageStudents />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/manage/courses',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <ManageCourses />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/settings',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <Settings />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/reports',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <Reports />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/help',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <Help />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/staff/manage/attendance/kiosk',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="auth">
            <AttendanceKiosk />
          </AuthLayout>
        </WithMainLayout>
      ),
    },
    {
      path: '/privacy-policy',
      element: <WithMainLayout><PrivacyPolicy /></WithMainLayout>,
    },
    {
      path: '/about',
      element: <WithMainLayout><About /></WithMainLayout>,
    },
  ]);

  // useEffect(() => {
  //   (async () => {
  //     console.log('test');
  //     const fingerprintSigninControl = new FingerprintSigninControl();
  //     await fingerprintSigninControl.init();
  //   })();
  // }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

export default App;
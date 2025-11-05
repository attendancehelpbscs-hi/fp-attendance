// import FingerprintSigninControl from './lib/fingerprint';
import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import WithMainLayout from './layouts/WithMainLayout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/staff/Login';
import Register from './pages/staff/Register';
import Profile from './pages/staff/Profile';
import ManageCourses from './pages/staff/ManageCourses';
import ManageStudents from './pages/staff/ManageStudents';
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

function App() {
  useStore();
  const isAuthenticated = useStore.use.isAuthenticated();
  const setStaffSettings = useStore.use.setStaffSettings();

  // Load staff settings on app start if authenticated
  const { data: staffSettingsData } = useGetStaffSettings({
    enabled: isAuthenticated && !!useStore.use.tokens(),
  });

  useEffect(() => {
    if (staffSettingsData) {
      setStaffSettings(staffSettingsData.settings);
    }
  }, [staffSettingsData, setStaffSettings]);

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
      path: '/staff/register',
      element: (
        <WithMainLayout>
          <AuthLayout routeType="noauth">
            <Register />
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


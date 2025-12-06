import type { FC, ReactNode } from 'react';

const WithStaffLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="staff-layout-wrapper">
      <div>{children}</div>
    </div>
  );
};

export default WithStaffLayout;
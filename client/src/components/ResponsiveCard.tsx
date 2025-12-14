import React from 'react';

interface ResponsiveCardProps {
  title: string;
  content: string;
  actionText?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Example responsive card component using the new mobile-first design system
 * This component demonstrates how to create mobile-friendly components
 */
const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  title,
  content,
  actionText,
  onAction,
  children,
  className = ''
}) => {
  return (
    <div className={`card-responsive fade-in-up ${className}`}>
      <div className="row-responsive">
        <div className="col-responsive">
          <h3 className="text-responsive-lg">{title}</h3>
          <p className="text-responsive mb-responsive">{content}</p>
          
          {children && (
            <div className="mt-responsive">
              {children}
            </div>
          )}
          
          {actionText && onAction && (
            <div className="mt-responsive center-responsive">
              <button 
                className="btn-responsive" 
                onClick={onAction}
                style={{ 
                  background: 'var(--bg-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px'
                }}
              >
                {actionText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveCard;

/**
 * Example usage:
 * 
 * <ResponsiveCard
 *   title="Student Attendance"
 *   content="View and manage student attendance records"
 *   actionText="View Details"
 *   onAction={() => console.log('Navigate to attendance')}
 * >
 *   <div className="show-desktop">
 *     <p>Desktop-specific content</p>
 *   </div>
 * </ResponsiveCard>
 */
import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  action,
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`bg-surface-1 border border-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-surface-2/40">
          <div className="font-semibold text-xs tracking-wider uppercase text-gray-300 flex items-center gap-2">
            {title}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-4 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>
    </div>
  );
};

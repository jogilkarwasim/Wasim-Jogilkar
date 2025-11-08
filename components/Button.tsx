import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...rest
}) => {
  let baseStyles = 'font-bold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
  let variantStyles = '';
  let sizeStyles = '';

  switch (variant) {
    case 'primary':
      variantStyles = 'bg-pink-500 text-white hover:bg-pink-600 focus:ring-pink-500';
      break;
    case 'secondary':
      variantStyles = 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-500';
      break;
    case 'outline':
      variantStyles = 'border-2 border-purple-500 text-purple-700 hover:bg-purple-100 focus:ring-purple-500';
      break;
  }

  switch (size) {
    case 'sm':
      sizeStyles = 'text-sm py-1.5 px-3';
      break;
    case 'md':
      sizeStyles = 'text-base py-2 px-4';
      break;
    case 'lg':
      sizeStyles = 'text-lg py-3 px-6';
      break;
  }

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;

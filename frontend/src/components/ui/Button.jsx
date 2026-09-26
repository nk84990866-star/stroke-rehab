import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200 border border-primary-200',
  outline:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
};

/**
 * Button — the one button used everywhere.
 * Pass `asChild` when you need to render a router <Link> or <a> instead of a
 * <button>: <Button asChild><Link to="/x">Go</Link></Button>
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  asChild = false,
  ...props
}) => {
  const classes = cn(
    'inline-flex items-center justify-center font-semibold rounded-lg',
    'transition-colors duration-150 cursor-pointer',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { className: cn(classes, children.props.className) });
  }
  return (
    <button disabled={disabled || loading} className={classes} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;

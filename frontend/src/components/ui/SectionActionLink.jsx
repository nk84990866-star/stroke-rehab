import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const SectionActionLink = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 cursor-pointer"
  >
    {children} <ChevronRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);

export default SectionActionLink;

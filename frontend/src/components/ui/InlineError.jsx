import React from 'react';

const InlineError = ({ id, children }) => (
  <div
    id={id}
    role="alert"
    className="mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3"
  >
    {children}
  </div>
);

export default InlineError;

import { useState } from 'react';

export default function PasswordInput({ id, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const action = visible ? 'Hide password' : 'Show password';

  return (
    <div className="password-input">
      <input
        {...inputProps}
        id={id}
        type={visible ? 'text' : 'password'}
        className="password-input__control"
      />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={action}
        aria-controls={id}
        aria-pressed={visible}
        title={action}
        onClick={() => setVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.4 9.5 7-.4 1-1.3 2.3-2.5 3.5" />
              <path d="M6.2 6.2C3.9 7.6 2.7 9.8 2.5 12c.4 1 1.3 2.3 2.5 3.5A10.6 10.6 0 0012 19c1 0 1.9-.2 2.8-.5" />
            </>
          ) : (
            <>
              <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

import { useState, type FormEvent } from 'react';

type AuthFormProps = {
  onLoginSuccess: (token: string) => void;
};

const getErrorMessage = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null) return null;

  if ('message' in data && typeof data.message === 'string') return data.message;
  if ('error' in data && typeof data.error === 'string') return data.error;
  return null;
};

export const AuthForm = ({ onLoginSuccess }: AuthFormProps) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const endpoint = isRegister ? '/api/users' : '/api/login';

    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data) ?? 'Authentication failed');
      }

      if (isRegister) {
        setIsRegister(false);
        setNotice('Registration successful. Please log in.');
        return;
      }

      if (
        typeof data !== 'object' ||
        data === null ||
        !('Token' in data) ||
        typeof data.Token !== 'string'
      ) {
        throw new Error('The server did not return a valid login token.');
      }

      localStorage.setItem('token', data.Token);
      onLoginSuccess(data.Token);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Server unreachable',
      );
    }
  };

  return (
    <form onSubmit={handleAuth} className="flex flex-wrap gap-2 items-center">
      <input
        type="text"
        placeholder="Username"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="border p-2 rounded bg-white text-base"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="border p-2 rounded bg-white text-base"
        required
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
      >
        {isRegister ? 'Register' : 'Login'}
      </button>
      <button
        type="button"
        onClick={() => {
          setIsRegister(!isRegister);
          setError('');
          setNotice('');
        }}
        className="text-sm text-blue-600 underline ml-2"
      >
        {isRegister ? 'Back to Login' : 'Create an account'}
      </button>
      {error && <p className="text-red-600 text-sm w-full" role="alert">{error}</p>}
      {notice && <p className="text-green-700 text-sm w-full" role="status">{notice}</p>}
    </form>
  );
};

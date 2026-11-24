import { useState } from 'react';

type DeletePlaceButtonProps = {
  placeId: number;
  token: string | null;
  onDeleted: (deletedId: number) => void;
  onError: (message: string) => void;
};

export const DeletePlaceButton = ({
  placeId,
  token,
  onDeleted,
  onError,
}: DeletePlaceButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!token) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    onError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/places/${placeId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof data.message === 'string'
            ? data.message
            : `Could not delete place (${response.status})`;
        throw new Error(message);
      }

      onDeleted(placeId);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete place');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-2.5 py-1 rounded text-sm font-medium transition shrink-0"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
};

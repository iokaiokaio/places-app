import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthForm } from './components/authform';
import { DeletePlaceButton } from './components/deletePlaceButton';

type Place = {
  ID: number;
  Name: string;
  Latitude: number;
  Longitude: number;
  UserID: number;
};

const getUserIdFromToken = (token: string | null): number | null => {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      typeof decoded.id === 'number' &&
      Number.isInteger(decoded.id)
    ) {
      return decoded.id;
    }
  } catch {
    return null;
  }

  return null;
};

const PlaceMarker = ({
  place,
  isSelected,
  onSelect,
}: {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[place.Latitude, place.Longitude]}
      eventHandlers={{
        click: () => onSelect(),
      }}
    >
      <Popup>
        <strong>{place.Name}</strong>
      </Popup>
    </Marker>
  );
};

const App = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [actionError, setActionError] = useState('');
  const currentUserId = getUserIdFromToken(token);

  const loadPlaces = async () => {
    const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/places', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error(`Could not load places (${response.status})`);
    }

    const data: unknown = await response.json();
    if (Array.isArray(data)) {
      setPlaces(data as Place[]);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadPlacesForEffect = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/places', {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          return;
        }

        const data: unknown = await response.json();
        if (Array.isArray(data)) {
          setPlaces(data as Place[]);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPlaces([]);
        }
      }
    };

    void loadPlacesForEffect();
    return () => controller.abort();
  }, [token]);

  const handleAddPlace = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError('');

    if (!token || currentUserId === null) {
      setActionError('Your login session is invalid. Please log in again.');
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Name: name,
          Latitude: Number(latitude),
          Longitude: Number(longitude),
          UserID: currentUserId,
        }),
      });

      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof data === 'object' &&
          data !== null &&
          ('message' in data || 'error' in data)
            ? String(
                ('message' in data ? data.message : data.error) ??
                  'Could not add place'
              )
            : 'Could not add place';
        throw new Error(message);
      }

      setName('');
      setLatitude('');
      setLongitude('');
      await loadPlaces();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not add place'
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar for login / logout */}
      <header className="p-3 bg-gray-100 border-b">
        {token ? (
          <div className="flex justify-between items-center">
            <span className="text-green-700 font-medium">Logged in</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <AuthForm onLoginSuccess={(newToken) => setToken(newToken)} />
        )}
      </header>

      {/* Main area: list + map */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* List */}
        <div className="w-full md:w-1/3 h-1/2 md:h-full overflow-y-auto p-4 border-b md:border-b-0 md:border-r">
          <h2 className="text-xl font-bold mb-3">Places</h2>

          {/* Show the form only for a valid logged-in user */}
          {token && (
            <form onSubmit={handleAddPlace} className="mb-4 space-y-2 p-3 bg-gray-50 rounded border">
              <h3 className="font-semibold text-sm">Add New Place</h3>
              <input
                type="text"
                placeholder="Place name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded bg-white text-base"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="Latitude (e.g. 62.60)"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-base"
                  required
                />
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="Longitude (e.g. 29.76)"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-base"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium"
              >
                Add Place
              </button>
            </form>
          )}

          {actionError && (
            <p className="text-red-600 text-sm mb-3">{actionError}</p>
          )}

          <ul className="space-y-2">
            {places.map((p) => (
              <li
                key={p.ID}
                onClick={() => setSelectedPlaceId(p.ID)}
                className={`p-3 rounded border cursor-pointer transition flex justify-between items-center gap-2 ${
                  selectedPlaceId === p.ID
                    ? 'bg-blue-100 border-blue-500 font-bold'
                    : 'bg-white hover:bg-gray-100'
                }`}
              >
                <div>
                  {p.Name} ({p.Latitude.toFixed(4)}, {p.Longitude.toFixed(4)})
                </div>

                {currentUserId === p.UserID && (
                  <DeletePlaceButton
                    placeId={p.ID}
                    token={token}
                    onDeleted={(deletedId) => {
                      setSelectedPlaceId((id) => (id === deletedId ? null : id));
                      void loadPlaces();
                    }}
                    onError={(msg) => setActionError(msg)}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Map */}
        <div className="w-full md:w-2/3 h-1/2 md:h-full">
          <MapContainer className="h-full w-full" center={[62.6, 29.76]} zoom={13}>
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {places.map((p) => (
              <PlaceMarker
                key={p.ID}
                place={p}
                isSelected={selectedPlaceId === p.ID}
                onSelect={() => setSelectedPlaceId(p.ID)}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default App;

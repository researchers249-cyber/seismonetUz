import { useState, useEffect, useRef } from "react";

interface GeolocationState {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  supported: boolean;
}

const initialState: GeolocationState = {
  lat: null,
  lon: null,
  accuracy: null,
  error: null,
  loading: true,
  supported: typeof navigator !== "undefined" && "geolocation" in navigator,
};

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(initialState);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialState.supported) {
      setState({
        lat: null,
        lon: null,
        accuracy: null,
        error: "Geolocation is not supported by this browser.",
        loading: false,
        supported: false,
      });
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          supported: true,
        });
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return state;
}

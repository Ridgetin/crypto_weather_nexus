import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWeatherData, fetchCryptoData, fetchNewsData } from "@/store/actions";
import { io } from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";
import { createSlice, configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { Provider } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/router";

const initialState = {
  weather: { data: null, loading: true, error: null },
  crypto: { data: null, loading: true, error: null },
  news: { data: [], loading: true, error: null },
  favorites: { cities: [], cryptos: [] },
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setWeatherData: (state, action) => {
      state.weather = { data: action.payload, loading: false, error: null };
    },
    setCryptoData: (state, action) => {
      state.crypto = { data: action.payload, loading: false, error: null };
    },
    setNewsData: (state, action) => {
      state.news = { data: action.payload, loading: false, error: null };
    },
    setError: (state, action) => {
      const { key, error } = action.payload;
      state[key] = { data: null, loading: false, error };
    },
    toggleFavoriteCity: (state, action) => {
      const city = action.payload;
      state.favorites.cities.includes(city)
        ? (state.favorites.cities = state.favorites.cities.filter((c) => c !== city))
        : state.favorites.cities.push(city);
    },
    toggleFavoriteCrypto: (state, action) => {
      const crypto = action.payload;
      state.favorites.cryptos.includes(crypto)
        ? (state.favorites.cryptos = state.favorites.cryptos.filter((c) => c !== crypto))
        : state.favorites.cryptos.push(crypto);
    },
  },
});

export const { setWeatherData, setCryptoData, setNewsData, setError, toggleFavoriteCity, toggleFavoriteCrypto } = appSlice.actions;

const store = configureStore({
  reducer: appSlice.reducer,
  middleware: [thunk],
});

export default function Dashboard() {
  const dispatch = useDispatch();
  const { weather, crypto, news, favorites } = useSelector((state) => state);
  const [socket, setSocket] = useState(null);
  const [weatherSocket, setWeatherSocket] = useState(null);

  useEffect(() => {
    dispatch(fetchWeatherData());
    dispatch(fetchCryptoData());
    dispatch(fetchNewsData());
  }, [dispatch]);

  useEffect(() => {
    const newSocket = io("wss://ws.coincap.io/prices?assets=bitcoin,ethereum");
    setSocket(newSocket);

    newSocket.on("message", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.bitcoin > 50000) {
        toast.success(`Bitcoin has exceeded $50K!`);
      }
      if (parsedData.ethereum > 3000) {
        toast.success(`Ethereum has exceeded $3K!`);
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    const weatherAlertSocket = io("wss://mock-weather-alerts.com");
    setWeatherSocket(weatherAlertSocket);

    weatherAlertSocket.on("weatherAlert", (alert) => {
      toast.error(`Weather Alert: ${alert.message}`);
    });

    return () => weatherAlertSocket.close();
  }, []);

  return (
    <Provider store={store}>
      <div className="p-6">
        <Toaster />
        <h1 className="text-2xl font-bold">CryptoWeather Nexus</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <section className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">Weather</h2>
            {weather.loading ? <p>Loading...</p> : (
              <div>
                <Link href="/city/New%20York">
                  <a>{JSON.stringify(weather.data, null, 2)}</a>
                </Link>
                <button onClick={() => dispatch(toggleFavoriteCity("New York"))}>
                  {favorites.cities.includes("New York") ? "Unfavorite" : "Favorite"}
                </button>
              </div>
            )}
          </section>
          <section className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">Cryptocurrency</h2>
            {crypto.loading ? <p>Loading...</p> : (
              <div>
                <Link href="/crypto/bitcoin">
                  <a>{JSON.stringify(crypto.data, null, 2)}</a>
                </Link>
                <button onClick={() => dispatch(toggleFavoriteCrypto("bitcoin"))}>
                  {favorites.cryptos.includes("bitcoin") ? "Unfavorite" : "Favorite"}
                </button>
              </div>
            )}
          </section>
          <section className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">News</h2>
            {news.loading ? <p>Loading...</p> : <ul>{news.data.map((n, i) => <li key={i}>{n.title}</li>)}</ul>}
          </section>
        </div>
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Favorites</h2>
          <p>Cities: {favorites.cities.join(", ") || "None"}</p>
          <p>Cryptos: {favorites.cryptos.join(", ") || "None"}</p>
        </div>
      </div>
    </Provider>
  );
}

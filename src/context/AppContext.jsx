import { createContext, useContext, useEffect, useReducer } from "react";

const AppContext = createContext();

// Mock user database
const MOCK_USERS = [
  { email: "officer@campus.edu", password: "password123", name: "SSC President" },
  { email: "admin@campus.edu", password: "admin123", name: "Admin User" },
  { email: "student@campus.edu", password: "student123", name: "Diana Sofia Fajardo" },
];

const CATEGORY_OPTIONS = [
  "Seminar",
  "Workshop",
  "Student Life",
  "Sports",
  "Culture",
];

const initialState = {
  apiEvents: [],
  customEvents: [],
  removedIds: [],
  statusById: {},
  user: null,
  darkMode: false,
  loading: true,
  error: "",
  lastUpdated: "",
  authLoading: false,
};

function getCategoryFromId(id) {
  return CATEGORY_OPTIONS[(Number(id) - 1 + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length];
}

function normalizeEvent(event) {
  return {
    id: Number(event.id),
    title: event.title,
    body: event.body,
    category: event.category || getCategoryFromId(event.userId || event.id),
    location: event.location || "Not provided by API",
    schedule: event.schedule || "Not provided by API",
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: "" };
    case "SET_EVENTS":
      return {
        ...state,
        apiEvents: action.payload.map(normalizeEvent),
        loading: false,
        error: "",
        lastUpdated: action.lastUpdated,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case "ADD_EVENT":
      return {
        ...state,
        customEvents: [action.payload, ...state.customEvents],
      };
    case "DELETE_EVENT":
      return {
        ...state,
        customEvents: state.customEvents.filter((event) => event.id !== action.payload),
        removedIds: state.apiEvents.some((event) => event.id === action.payload)
          ? [...new Set([...state.removedIds, action.payload])]
          : state.removedIds,
      };
    case "TOGGLE_STATUS":
      return {
        ...state,
        statusById: {
          ...state.statusById,
          [action.payload]: !state.statusById[action.payload],
        },
      };
    case "LOGIN_START":
      return {
        ...state,
        authLoading: true,
        error: "",
      };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        authLoading: false,
        user: {
          email: action.payload.email,
          name: action.payload.name,
          role: "Event Officer",
        },
        error: "",
      };
    case "LOGIN_ERROR":
      return {
        ...state,
        authLoading: false,
        error: action.payload,
      };
    case "LOGOUT":
      return { ...state, user: null, error: "" };
    case "TOGGLE_DARK":
      return { ...state, darkMode: !state.darkMode };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    async function fetchData() {
      dispatch({ type: "FETCH_START" });

      try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts");

        if (!response.ok) {
          throw new Error("Could not load events.");
        }

        const data = await response.json();
        const curatedEvents = data.slice(0, 9).map((event) => normalizeEvent(event));

        dispatch({
          type: "SET_EVENTS",
          payload: curatedEvents,
          lastUpdated: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      } catch (error) {
        dispatch({
          type: "FETCH_ERROR",
          payload: error.message || "Could not load events.",
        });
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", state.darkMode);
  }, [state.darkMode]);

  const visibleApiEvents = state.apiEvents.filter(
    (event) => !state.removedIds.includes(event.id),
  );

  const events = [...state.customEvents, ...visibleApiEvents].map((event) => ({
    ...event,
    completed: Boolean(state.statusById[event.id]),
  }));

  const categories = ["All", ...new Set(events.map((event) => event.category))];

  function addEvent(eventData) {
    const nextId = Date.now();

    dispatch({
      type: "ADD_EVENT",
      payload: normalizeEvent({
        id: nextId,
        title: eventData.title,
        body: eventData.body,
        category: eventData.category,
        location: eventData.location,
        schedule: eventData.schedule,
      }),
    });
  }

  function authenticate(email, password) {
    dispatch({ type: "LOGIN_START" });

    // Simulate API delay
    setTimeout(() => {
      const user = MOCK_USERS.find(
        (u) => u.email === email.toLowerCase() && u.password === password,
      );

      if (user) {
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            email: user.email,
            name: user.name,
          },
        });
      } else {
        dispatch({
          type: "LOGIN_ERROR",
          payload: "Invalid email or password. Try officer@campus.edu / password123",
        });
      }
    }, 800);
  }

  return (
    <AppContext.Provider
      value={{
        state: {
          ...state,
          events,
          categories,
          categoryOptions: CATEGORY_OPTIONS,
        },
        dispatch,
        addEvent,
        authenticate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

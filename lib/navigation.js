// Simple navigation state management without React Router
export const ROUTES = {
  AUTH_SIGNUP: "auth-signup",
  AUTH_LOGIN: "auth-login",
  CALENDAR: "calendar",
}

export const createNavigationState = (initialRoute = ROUTES.AUTH_SIGNUP) => {
  return {
    currentRoute: initialRoute,
    navigate: null, // Will be set by the app
  }
}

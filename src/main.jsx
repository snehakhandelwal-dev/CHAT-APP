
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Signup from './pages/authentication/Signup.jsx';
import Login from "./pages/authentication/Login";

import { store } from './store/store.js';
import { Provider } from 'react-redux';
const router = createBrowserRouter([
    {
      path: "/",
      element: <App />
      },
    {
      path: "/login",
      element: <Login />
      },
  {
  path: "/signup",
  element: <Signup />
  },
]);
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
  <RouterProvider router={router}>
    <App />
  </RouterProvider>
  </Provider>
)

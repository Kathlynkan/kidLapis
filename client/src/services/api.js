// =============================================================
// ONE axios instance for the whole app 
// -------------------------------------------------------------
// Always import this instead of plain axios, so that:
//   - the API base URL is set in one place
//   - the login token is sent automatically
//
//   import api from '@/services/api'
//   const response = await api.get('/sessions', { params: { childId } })
//   const sessions = response.data
// =============================================================
import axios from 'axios'

// create customised axios instance
// automatically attach http://localhost:8000
// instead of axios.get('http://localhost:8000/sessions')
// can write api.get('/sessions')
const api = axios.create({
  // baseURL = url from .env file or http://localhost:8000
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Add "Authorization: Bearer <token>" to every request (Week 5: request headers)
// before every request, run this code
// checks whether token exists
// true: automatically sends token with every request, so backend can validate token
api.interceptors.request.use((config) => {
  // get token from browser storage
  const token = sessionStorage.getItem('cb_token')
  // if token exists, add Authorization header to every reqeust
  // headers are extra information attached to the request
  // 'Bearer' is standard format used for lgoin tokens
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {} // create variable holding a function
// onUnauthorized() contains setUnauthorizedHandler() function from main.js
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// after every response, run this code
api.interceptors.response.use(
  // if request succeed (response exists), return response back
  // same as:
  // function(repsonse) {
  //   return repsonse 
  // }
  (response) => response,
  (error) => { // if request fails (error exists)
    // check if error due to login request
    const isLoginCall = error.config?.url?.startsWith('/auth/login')
    // check if server returns error 401 and error is not due to login request
    // true: run onUnauthorized()
    if (error.response?.status === 401 && !isLoginCall) onUnauthorized()
    return Promise.reject(error)
  },
)

// Turn any axios error into a friendly message for the UI
// helper function
// instead of error.response?.data?.message
// can write errorMessage(error)
export function errorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong.'
}

// export customised axios instance
// can use api.get api.post etc anywhere in the app
export default api

// Unit tests for the auth store (login, sign up, log out, saved session).   Owner: Kai Sen
// Run:  pnpm test:unit
// The real API is replaced with a fake (vi.mock), so these tests need no server.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import api from '@/services/api'
import { useAuthStore } from '../auth'

vi.mock('@/services/api', () => ({
  default: { post: vi.fn() },
}))

const parent = { id: 'u_par1', name: 'Mrs Wong', role: 'parent' }

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(api.post).mockReset()
  setActivePinia(createPinia()) // a brand-new store for every test
})

describe('auth store', () => {
  it('starts logged out when nothing is saved', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.role).toBe(null)
    expect(auth.homePath).toBe('/')
  })

  it('login saves the token + user and sends each role to its home page', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: 'abc123', user: parent } })
    const auth = useAuthStore()

    await auth.login('parent@kidslapis.sg', 'password123')

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'parent@kidslapis.sg',
      password: 'password123',
    })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.role).toBe('parent')
    expect(auth.homePath).toBe('/parent')
    expect(sessionStorage.getItem('cb_token')).toBe('abc123')
    expect(JSON.parse(sessionStorage.getItem('cb_user'))).toEqual(parent)
  })

  it('a failed login leaves you logged out', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Incorrect email or password.'))
    const auth = useAuthStore()

    await expect(auth.login('parent@kidslapis.sg', 'wrong')).rejects.toThrow('Incorrect')
    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem('cb_token')).toBe(null)
  })

  it('signup logs you straight in', async () => {
    const volunteer = { id: 'u_new', name: 'New Volunteer', role: 'volunteer' }
    vi.mocked(api.post).mockResolvedValue({ data: { token: 'new-token', user: volunteer } })
    const auth = useAuthStore()

    await auth.signup({ name: 'New Volunteer', email: 'new@example.com', password: 'secret123' })

    expect(api.post).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ name: 'New Volunteer' }),
    )
    expect(auth.homePath).toBe('/volunteer')
  })

  it('remembers you after a page refresh (the saved session is read back)', () => {
    sessionStorage.setItem('cb_token', 'saved-token')
    sessionStorage.setItem('cb_user', JSON.stringify(parent))

    const auth = useAuthStore() // a new store = what happens on a page refresh
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.user.name).toBe('Mrs Wong')
  })

  it('logout clears the session, even if the server call fails', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { token: 'abc123', user: parent } })
    const auth = useAuthStore()
    await auth.login('parent@kidslapis.sg', 'password123')

    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network Error'))
    await auth.logout()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem('cb_token')).toBe(null)
    expect(sessionStorage.getItem('cb_user')).toBe(null)
  })

  it('patchUser updates the saved user (e.g. after editing your profile)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: 'abc123', user: parent } })
    const auth = useAuthStore()
    await auth.login('parent@kidslapis.sg', 'password123')

    auth.patchUser({ name: 'Mrs Wong Mei' })

    expect(auth.user.name).toBe('Mrs Wong Mei')
    expect(auth.user.role).toBe('parent') // the other fields stay
    expect(JSON.parse(sessionStorage.getItem('cb_user')).name).toBe('Mrs Wong Mei')
  })
})

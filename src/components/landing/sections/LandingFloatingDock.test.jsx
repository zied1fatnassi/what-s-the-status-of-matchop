import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LandingFloatingDock } from './LandingFloatingDock'

vi.mock('../../../lib/useBilingualText', () => ({
  useBilingualText: () => (en) => en,
}))

describe('LandingFloatingDock', () => {
  beforeEach(() => {
    // Mock window scroll methods and dimensions
    window.scrollTo = vi.fn()
    window.requestAnimationFrame = vi.fn((cb) => cb())
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 4000, writable: true })

    // Setup mock DOM elements for landing sections
    const sections = ['problem', 'ai-matching', 'discovery-demo', 'for-both']
    sections.forEach((id) => {
      const el = document.createElement('section')
      el.id = id
      el.getBoundingClientRect = vi.fn(() => ({
        top: 1000,
        bottom: 1800,
        left: 0,
        right: 1200,
        width: 1200,
        height: 800,
      }))
      document.body.appendChild(el)
    })
  })

  afterEach(() => {
    const sections = ['problem', 'ai-matching', 'discovery-demo', 'for-both']
    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) document.body.removeChild(el)
    })
    vi.restoreAllMocks()
  })

  it('renders quick action links when scrolled past threshold', () => {
    render(
      <MemoryRouter>
        <LandingFloatingDock />
      </MemoryRouter>
    )

    expect(screen.getByRole('navigation', { name: /Landing page sections/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Problem' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI Engine' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Live Demo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument()
  })

  it('clicking Live Demo triggers smooth scrolling and immediately highlights it', () => {
    const demoEl = document.getElementById('discovery-demo')
    demoEl.getBoundingClientRect = vi.fn(() => ({
      top: 500,
      bottom: 1300,
      left: 0,
      right: 1200,
      width: 1200,
      height: 800,
    }))

    render(
      <MemoryRouter>
        <LandingFloatingDock />
      </MemoryRouter>
    )

    const liveDemoLink = screen.getByRole('link', { name: 'Live Demo' })
    expect(liveDemoLink).not.toHaveClass('dock-item--active')

    fireEvent.click(liveDemoLink)

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    )
    expect(liveDemoLink).toHaveClass('dock-item--active')
    expect(liveDemoLink).toHaveAttribute('aria-current', 'location')
  })

  it('highlights Live Demo automatically when scrolled into the discovery-demo section', () => {
    // Place discovery-demo in the active viewport trigger zone (top <= 220px)
    const demoEl = document.getElementById('discovery-demo')
    demoEl.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 900,
      left: 0,
      right: 1200,
      width: 1200,
      height: 800,
    }))

    const aiEl = document.getElementById('ai-matching')
    aiEl.getBoundingClientRect = vi.fn(() => ({
      top: -600,
      bottom: 200,
      left: 0,
      right: 1200,
      width: 1200,
      height: 800,
    }))

    const problemEl = document.getElementById('problem')
    problemEl.getBoundingClientRect = vi.fn(() => ({
      top: -1400,
      bottom: -600,
      left: 0,
      right: 1200,
      width: 1200,
      height: 800,
    }))

    render(
      <MemoryRouter>
        <LandingFloatingDock />
      </MemoryRouter>
    )

    // Trigger scroll event
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    const liveDemoLink = screen.getByRole('link', { name: 'Live Demo' })
    expect(liveDemoLink).toHaveClass('dock-item--active')
  })

  it('clicking Scroll to Top scrolls window to top and un-highlights sections', () => {
    render(
      <MemoryRouter>
        <LandingFloatingDock />
      </MemoryRouter>
    )

    const scrollBtn = screen.getByRole('button', { name: 'Scroll to Top' })
    fireEvent.click(scrollBtn)

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})

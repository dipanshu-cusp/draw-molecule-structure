// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Suppress console errors and warnings in tests
const originalError = console.error
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
  // Suppress specific console.error messages
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
       args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext') ||
       args[0].includes('An update to') && args[0].includes('inside a test was not wrapped in act'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  // Suppress console.warn in tests
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Could not update KetcherLogger') ||
       args[0].includes('componentWillReceiveProps'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }

  // Suppress console.log in tests unless explicitly needed
  console.log = (...args) => {
    // Only show logs that don't match common test noise patterns
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('KetcherLogger') ||
       args[0].includes('Ketcher initialized') ||
       args[0].includes('Ketcher instance'))
    ) {
      return
    }
    originalLog.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
  console.log = originalLog
})

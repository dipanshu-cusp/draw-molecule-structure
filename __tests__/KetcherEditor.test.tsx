import { render, screen, waitFor } from '@testing-library/react'
import KetcherEditor from '../app/components/KetcherEditor'

// Mock the ketcher modules before importing
const mockEditor = jest.fn(({ onInit }: any) => {
  // Simulate editor initialization
  if (onInit) {
    setTimeout(() => {
      onInit({
        getSmiles: jest.fn().mockResolvedValue('CCO'),
        getMolfile: jest.fn().mockResolvedValue('MOLFILE'),
      })
    }, 0)
  }
  return <div data-testid="ketcher-editor">Mocked Ketcher Editor</div>
})

const mockStandaloneProvider = jest.fn().mockImplementation(() => ({
  mode: 'standalone',
}))

const mockKetcherCore = {
  KetcherLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}

// Mock modules
jest.mock('ketcher-react', () => ({
  Editor: mockEditor,
}))

jest.mock('ketcher-standalone', () => ({
  StandaloneStructServiceProvider: mockStandaloneProvider,
}))

jest.mock('ketcher-core', () => mockKetcherCore)

// Mock CSS import
jest.mock('ketcher-react/dist/index.css', () => ({}))

describe('KetcherEditor', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<KetcherEditor />)
    // Component should render
    expect(document.body).toBeTruthy()
  })

  it('should call onInit callback when Ketcher is initialized', async () => {
    const onInit = jest.fn()
    render(<KetcherEditor onInit={onInit} />)

    // Wait for the onInit to be called
    await waitFor(() => {
      expect(onInit).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Verify the ketcher instance was passed
    expect(onInit).toHaveBeenCalledWith(expect.objectContaining({
      getSmiles: expect.any(Function),
      getMolfile: expect.any(Function),
    }))
  })

  it('should display the mocked editor component', async () => {
    render(<KetcherEditor />)

    // Wait for the Editor to be rendered
    await waitFor(() => {
      const editor = screen.queryByTestId('ketcher-editor')
      expect(editor).toBeTruthy()
    })

    expect(screen.getByText('Mocked Ketcher Editor')).toBeTruthy()
  })

  it('should handle initialization without onInit callback', () => {
    // Should not throw error when onInit is not provided
    expect(() => {
      render(<KetcherEditor />)
    }).not.toThrow()
  })

  it('should render multiple instances without errors', () => {
    const { rerender } = render(<KetcherEditor />)
    
    expect(() => {
      rerender(<KetcherEditor />)
    }).not.toThrow()
  })

  it('should call Editor component from ketcher-react', async () => {
    render(<KetcherEditor />)

    await waitFor(() => {
      expect(mockEditor).toHaveBeenCalled()
    })
  })

  it('should create StandaloneStructServiceProvider', async () => {
    render(<KetcherEditor />)

    await waitFor(() => {
      expect(mockStandaloneProvider).toHaveBeenCalled()
    }, { timeout: 1000 })
  })
})

describe('KetcherEditor - Props', () => {
  it('should accept and use onInit prop', async () => {
    const mockOnInit = jest.fn()
    render(<KetcherEditor onInit={mockOnInit} />)

    await waitFor(() => {
      expect(mockOnInit).toHaveBeenCalled()
    })
  })

  it('should work without onInit prop', () => {
    expect(() => {
      render(<KetcherEditor />)
    }).not.toThrow()
  })
})

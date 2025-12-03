import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoleculeEditor from '../app/components/MoleculeEditor'

// Mock KetcherEditor component
jest.mock('../app/components/KetcherEditor', () => {
  return jest.fn(({ onInit }: { onInit?: (ketcher: unknown) => void }) => {
    // Call onInit with a mock ketcher instance
    if (onInit) {
      const mockKetcher = {
        getSmiles: jest.fn().mockResolvedValue('CCO'),
        getMolfile: jest.fn().mockResolvedValue('MOLFILE_DATA\nV2000\n...'),
        getInchi: jest.fn().mockResolvedValue('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3'),
      }
      setTimeout(() => onInit(mockKetcher), 0)
    }
    return <div data-testid="ketcher-editor">Mocked Ketcher Editor</div>
  })
})

describe('MoleculeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    })
  })

  it('should render the component', () => {
    render(<MoleculeEditor />)
    
    expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    expect(screen.getByText('Export Structure')).toBeInTheDocument()
  })

  it('should initialize with default format (SMILES)', () => {
    render(<MoleculeEditor />)
    
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('smiles')
  })

  it('should display format selection dropdown', () => {
    render(<MoleculeEditor />)
    
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    
    // Check all format options are present
    expect(screen.getByRole('option', { name: 'SMILES' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'MOL File' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'InChI' })).toBeInTheDocument()
  })

  it('should change format when user selects a different option', async () => {
    const user = userEvent.setup()
    render(<MoleculeEditor />)
    
    const select = screen.getByRole('combobox')
    
    await user.selectOptions(select, 'molfile')
    expect((select as HTMLSelectElement).value).toBe('molfile')
    
    await user.selectOptions(select, 'inchi')
    expect((select as HTMLSelectElement).value).toBe('inchi')
  })

  it('should export structure as SMILES when Get Structure button is clicked', async () => {
    render(<MoleculeEditor />)
    
    // Wait for Ketcher to initialize
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Wait for the result to appear
    await waitFor(() => {
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toBe('CCO')
    })
  })

  it('should export structure as MOL file when format is changed', async () => {
    const user = userEvent.setup()
    render(<MoleculeEditor />)
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    // Change format to molfile
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'molfile')

    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Wait for the result
    await waitFor(() => {
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toContain('MOLFILE_DATA')
    })
  })

  it('should export structure as InChI when format is changed', async () => {
    const user = userEvent.setup()
    render(<MoleculeEditor />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    // Change format to inchi
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'inchi')

    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Wait for the result
    await waitFor(() => {
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toContain('InChI=')
    })
  })

  it('should display copy to clipboard button when molecule data is present', async () => {
    render(<MoleculeEditor />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Wait for copy button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument()
    })
  })

  it('should copy molecule data to clipboard when copy button is clicked', async () => {
    render(<MoleculeEditor />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    // Get structure first
    const getButton = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(getButton)

    // Wait for copy button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: 'Copy to Clipboard' })
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CCO')
  })

  it('should not display result area initially', () => {
    render(<MoleculeEditor />)
    
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy to Clipboard' })).not.toBeInTheDocument()
  })

  it('should handle errors when getting structure fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    
    // Override the mock to reject
    const { default: KetcherEditor } = await import('../app/components/KetcherEditor')
    ;(KetcherEditor as jest.Mock).mockImplementation(({ onInit }: { onInit?: (ketcher: unknown) => void }) => {
      if (onInit) {
        const mockKetcher = {
          getSmiles: jest.fn().mockRejectedValue(new Error('Export failed')),
        }
        setTimeout(() => onInit(mockKetcher), 0)
      }
      return <div data-testid="ketcher-editor">Mocked Ketcher Editor</div>
    })

    render(<MoleculeEditor />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ketcher-editor')).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Should display error in the textarea
    await waitFor(() => {
      const textarea = screen.queryByRole('textbox') as HTMLTextAreaElement
      expect(textarea?.value).toContain('Error:')
    })

    consoleError.mockRestore()
  })

  it('should not attempt to get structure if ketcher is not initialized', async () => {
    // Mock without calling onInit
    const { default: KetcherEditor } = await import('../app/components/KetcherEditor')
    ;(KetcherEditor as jest.Mock).mockImplementation(() => {
      return <div data-testid="ketcher-editor">Mocked Ketcher Editor</div>
    })

    render(<MoleculeEditor />)
    
    const button = screen.getByRole('button', { name: 'Get Structure' })
    fireEvent.click(button)

    // Should not crash or display anything
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('should have proper CSS classes for styling', () => {
    render(<MoleculeEditor />)
    
    const button = screen.getByRole('button', { name: 'Get Structure' })
    expect(button).toHaveClass('bg-green-600')
    expect(button).toHaveClass('hover:bg-green-700')
  })

  it('should have accessible labels', () => {
    render(<MoleculeEditor />)
    
    expect(screen.getByText('Format')).toBeInTheDocument()
    expect(screen.getByText('Export Structure')).toBeInTheDocument()
  })
})

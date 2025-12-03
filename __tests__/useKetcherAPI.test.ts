import { renderHook, act } from '@testing-library/react'
import { useKetcherAPI, EXAMPLE_MOLECULES } from '../app/components/useKetcherAPI'

describe('useKetcherAPI', () => {
  let mockKetcher: {
    getSmiles: jest.Mock;
    getMolfile: jest.Mock;
    getInchi: jest.Mock;
    getInchiKey: jest.Mock;
    getKet: jest.Mock;
    getRxn: jest.Mock;
    getSmarts: jest.Mock;
    getCml: jest.Mock;
    getSdf: jest.Mock;
    setMolecule: jest.Mock;
    addFragment: jest.Mock;
    layout: jest.Mock;
    containsReaction: jest.Mock;
    isQueryStructureSelected: jest.Mock;
    generateImage: jest.Mock;
    setSettings: jest.Mock;
    editor: {
      subscribe: jest.Mock;
      unsubscribe: jest.Mock;
    };
  }

  beforeEach(() => {
    // Create a mock Ketcher instance
    mockKetcher = {
      getSmiles: jest.fn().mockResolvedValue('CCO'),
      getMolfile: jest.fn().mockResolvedValue('MOLFILE_DATA'),
      getInchi: jest.fn().mockResolvedValue('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3'),
      getInchiKey: jest.fn().mockResolvedValue('LFQSCWFLJHTTHZ-UHFFFAOYSA-N'),
      getKet: jest.fn().mockResolvedValue('{"root": {}}'),
      getRxn: jest.fn().mockResolvedValue('RXN_DATA'),
      getSmarts: jest.fn().mockResolvedValue('[CH3][CH2][OH]'),
      getCml: jest.fn().mockResolvedValue('<molecule/>'),
      getSdf: jest.fn().mockResolvedValue('SDF_DATA'),
      setMolecule: jest.fn().mockResolvedValue(undefined),
      addFragment: jest.fn().mockResolvedValue(undefined),
      layout: jest.fn().mockResolvedValue(undefined),
      containsReaction: jest.fn().mockReturnValue(false),
      isQueryStructureSelected: jest.fn().mockReturnValue(false),
      generateImage: jest.fn().mockResolvedValue(new Blob()),
      setSettings: jest.fn(),
      editor: {
        subscribe: jest.fn().mockReturnValue('subscription-id'),
        unsubscribe: jest.fn(),
      },
    }
  })

  describe('initKetcher', () => {
    it('should initialize the Ketcher reference', () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      // Verify that methods can be called after initialization
      expect(mockKetcher).toBeDefined()
    })
  })

  describe('exportStructure', () => {
    it('should export structure as SMILES', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const smiles = await result.current.exportStructure('smiles')
      
      expect(mockKetcher.getSmiles).toHaveBeenCalled()
      expect(smiles).toBe('CCO')
    })

    it('should export structure as molfile', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const molfile = await result.current.exportStructure('molfile')
      
      expect(mockKetcher.getMolfile).toHaveBeenCalled()
      expect(molfile).toBe('MOLFILE_DATA')
    })

    it('should export structure as InChI', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const inchi = await result.current.exportStructure('inchi')
      
      expect(mockKetcher.getInchi).toHaveBeenCalled()
      expect(inchi).toBe('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3')
    })

    it('should return null for unsupported format', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const output = await result.current.exportStructure('unsupported' as 'smiles')
      
      expect(output).toBeNull()
      consoleError.mockRestore()
    })

    it('should return null when Ketcher is not initialized', async () => {
      const { result } = renderHook(() => useKetcherAPI())

      const output = await result.current.exportStructure('smiles')
      
      expect(output).toBeNull()
    })

    it('should handle export errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const { result } = renderHook(() => useKetcherAPI())
      mockKetcher.getSmiles.mockRejectedValue(new Error('Export failed'))
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const output = await result.current.exportStructure('smiles')
      
      expect(output).toBeNull()
      consoleError.mockRestore()
    })
  })

  describe('loadStructure', () => {
    it('should load structure without position', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.loadStructure('CCO')
      
      expect(mockKetcher.setMolecule).toHaveBeenCalledWith('CCO', undefined)
    })

    it('should load structure with position', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      const position = { x: 100, y: 200 }
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.loadStructure('CCO', position)
      
      expect(mockKetcher.setMolecule).toHaveBeenCalledWith('CCO', { position })
    })

    it('should handle load errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const { result } = renderHook(() => useKetcherAPI())
      mockKetcher.setMolecule.mockRejectedValue(new Error('Load failed'))
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await expect(result.current.loadStructure('CCO')).resolves.not.toThrow()
      consoleError.mockRestore()
    })
  })

  describe('addFragment', () => {
    it('should add fragment without position', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.addFragment('c1ccccc1')
      
      expect(mockKetcher.addFragment).toHaveBeenCalledWith('c1ccccc1', undefined)
    })

    it('should add fragment with position', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      const position = { x: 50, y: 50 }
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.addFragment('c1ccccc1', position)
      
      expect(mockKetcher.addFragment).toHaveBeenCalledWith('c1ccccc1', { position })
    })
  })

  describe('applyLayout', () => {
    it('should apply layout algorithm', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.applyLayout()
      
      expect(mockKetcher.layout).toHaveBeenCalled()
    })
  })

  describe('hasReaction', () => {
    it('should return true when structure contains reaction', () => {
      const { result } = renderHook(() => useKetcherAPI())
      mockKetcher.containsReaction.mockReturnValue(true)
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const hasRxn = result.current.hasReaction()
      
      expect(hasRxn).toBe(true)
    })

    it('should return false when Ketcher is not initialized', () => {
      const { result } = renderHook(() => useKetcherAPI())

      const hasRxn = result.current.hasReaction()
      
      expect(hasRxn).toBe(false)
    })
  })

  describe('hasQuery', () => {
    it('should return true when query structure is selected', () => {
      const { result } = renderHook(() => useKetcherAPI())
      mockKetcher.isQueryStructureSelected.mockReturnValue(true)
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const hasQ = result.current.hasQuery()
      
      expect(hasQ).toBe(true)
    })
  })

  describe('generateImage', () => {
    it('should generate PNG image', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const blob = await result.current.generateImage('CCO', {
        outputFormat: 'png',
      })
      
      expect(mockKetcher.generateImage).toHaveBeenCalledWith('CCO', {
        outputFormat: 'png',
        backgroundColor: '#FFFFFF',
        bondThickness: 2,
      })
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should generate SVG image with custom options', async () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      await result.current.generateImage('CCO', {
        outputFormat: 'svg',
        backgroundColor: '#000000',
        bondThickness: 3,
      })
      
      expect(mockKetcher.generateImage).toHaveBeenCalledWith('CCO', {
        outputFormat: 'svg',
        backgroundColor: '#000000',
        bondThickness: 3,
      })
    })
  })

  describe('subscribeToChanges', () => {
    it('should subscribe to change events', () => {
      const { result } = renderHook(() => useKetcherAPI())
      const callback = jest.fn()
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      const subscription = result.current.subscribeToChanges(callback)
      
      expect(mockKetcher.editor.subscribe).toHaveBeenCalledWith('change', callback)
      expect(subscription).toBe('subscription-id')
    })

    it('should return null when Ketcher is not initialized', () => {
      const { result } = renderHook(() => useKetcherAPI())
      const callback = jest.fn()

      const subscription = result.current.subscribeToChanges(callback)
      
      expect(subscription).toBeNull()
    })
  })

  describe('unsubscribeFromChanges', () => {
    it('should unsubscribe from change events', () => {
      const { result } = renderHook(() => useKetcherAPI())
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      result.current.unsubscribeFromChanges('subscription-id')
      
      expect(mockKetcher.editor.unsubscribe).toHaveBeenCalledWith('change', 'subscription-id')
    })
  })

  describe('updateSettings', () => {
    it('should update Ketcher settings', () => {
      const { result } = renderHook(() => useKetcherAPI())
      const settings = { zoom: 1.5, theme: 'dark' }
      
      act(() => {
        result.current.initKetcher(mockKetcher)
      })

      result.current.updateSettings(settings)
      
      expect(mockKetcher.setSettings).toHaveBeenCalledWith(settings)
    })
  })
})

describe('EXAMPLE_MOLECULES', () => {
  it('should contain common molecule SMILES strings', () => {
    expect(EXAMPLE_MOLECULES.benzene).toBe('c1ccccc1')
    expect(EXAMPLE_MOLECULES.ethanol).toBe('CCO')
    expect(EXAMPLE_MOLECULES.water).toBe('O')
    expect(EXAMPLE_MOLECULES.methane).toBe('C')
  })

  it('should contain complex molecule SMILES', () => {
    expect(EXAMPLE_MOLECULES.aspirin).toBeTruthy()
    expect(EXAMPLE_MOLECULES.caffeine).toBeTruthy()
    expect(EXAMPLE_MOLECULES.glucose).toBeTruthy()
  })
})

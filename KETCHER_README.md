# Molecule Structure Editor

A Next.js application for drawing and editing molecular structures using [Ketcher](https://github.com/epam/ketcher), an open-source web-based chemical structure editor.

## Features

- 🎨 **Interactive Molecule Drawing** - Draw and edit molecular structures with an intuitive interface
- 📤 **Multiple Export Formats** - Export structures as SMILES, MOL files, or InChI
- 🧪 **Example Molecules** - Load pre-defined molecular structures
- 🎯 **Full Ketcher API** - Access to all Ketcher functionality
- 🌙 **Dark Mode Support** - Comfortable editing in any lighting condition

## Technologies Used

- **Next.js 16** - React framework with App Router
- **Ketcher 3.8.0** - Chemical structure editor
  - `ketcher-react` - React components
  - `ketcher-core` - Core functionality
  - `ketcher-standalone` - Standalone structure service
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm (recommended) or npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Drawing Molecules

1. Use the toolbar on the left to select tools (atoms, bonds, templates)
2. Click on the canvas to add atoms and bonds
3. Modify existing structures by clicking on them
4. Use the controls panel to:
   - Load example molecules (e.g., Benzene)
   - Clear the canvas
   - Export structures in different formats

### Exporting Structures

1. Draw or load a molecule
2. Select the desired export format (SMILES, MOL file, or InChI)
3. Click "Get Structure"
4. Copy the result to clipboard

## Ketcher API Examples

The application provides access to the full Ketcher API. Here are some common operations:

### Get Structure Data

```typescript
// Get SMILES
const smiles = await ketcher.getSmiles();

// Get MOL file
const molfile = await ketcher.getMolfile();

// Get InChI
const inchi = await ketcher.getInchi();
```

### Set/Load Structure

```typescript
// Load from SMILES
await ketcher.setMolecule('c1ccccc1'); // Benzene

// Load from MOL file
await ketcher.setMolecule(molfileString);
```

### Clear Canvas

```typescript
await ketcher.setMolecule('');
```

### Subscribe to Changes

```typescript
ketcher.editor.subscribe('change', (eventData) => {
  console.log('Structure changed:', eventData);
});
```

## Project Structure

```
molecule-search/
├── app/
│   ├── components/
│   │   ├── KetcherEditor.tsx      # Ketcher wrapper component
│   │   └── MoleculeEditor.tsx     # Main editor with controls
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── next.config.ts
├── package.json
└── README.md
```

## Configuration

### Next.js Config

The `next.config.ts` includes Turbopack configuration for optimal build performance.

### Ketcher Configuration

Ketcher is configured with:
- Standalone structure service provider (no backend required)
- Client-side only rendering (SSR disabled)
- Default toolbar and settings

## Customization

### Hiding Toolbar Buttons

You can hide specific toolbar buttons by passing the `buttons` prop:

```typescript
<Editor
  buttons={{ clear: { hidden: true } }}
  structServiceProvider={structureServiceProvider}
/>
```

### Disable Macromolecules Editor

If you only need small molecule editing:

```typescript
<Editor
  disableMacromoleculesEditor
  structServiceProvider={structureServiceProvider}
/>
```

## Known Issues

- Ketcher requires client-side rendering and won't work with SSR
- Some peer dependency warnings (React 19 vs React 18) can be safely ignored

## Resources

- [Ketcher Documentation](https://github.com/epam/ketcher)
- [Ketcher React Package](https://www.npmjs.com/package/ketcher-react)
- [Next.js Documentation](https://nextjs.org/docs)

## License

This project is open source and available under the [MIT License](LICENSE).

Ketcher is licensed under the [Apache 2.0 License](https://github.com/epam/ketcher/blob/master/LICENSE).

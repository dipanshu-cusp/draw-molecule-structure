import MoleculeEditor from './components/MoleculeEditor';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-black">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Molecule Structure Editor
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Draw and edit molecular structures using Ketcher
        </p>
      </header>
      <main className="flex-1 p-4">
        <div className="h-[calc(100vh-120px)] w-full">
          <MoleculeEditor />
        </div>
      </main>
    </div>
  );
}

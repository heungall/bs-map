import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Import README at build time via Vite's ?raw suffix
import readmeContent from '../../README.md?raw';

export default function DevNote() {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button className="devnote-trigger" onClick={() => setOpen(true)} title="개발 노트">
        ?
      </button>

      {open && (
        <div className="devnote-overlay" onClick={() => setOpen(false)}>
          <div className="devnote-modal" onClick={(e) => e.stopPropagation()}>
            <button className="devnote-close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <div className="devnote-content">
              <ReactMarkdown>{readmeContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

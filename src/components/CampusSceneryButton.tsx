import { useState, useEffect } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import CampusSceneryDialog from './CampusSceneryDialog';

export default function CampusSceneryButton() {
  const { toggleCategory, state } = useMapContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setDialogOpen(prev => {
        if (!prev) {
          // Auto-select landscape category
          if (!state.activeCategories.includes('景观')) {
            state.activeCategories.forEach(c => toggleCategory(c));
            toggleCategory('景观');
          }
        }
        return !prev;
      });
    };
    window.addEventListener('open-scenery', handler);
    return () => window.removeEventListener('open-scenery', handler);
  }, [state.activeCategories, toggleCategory]);

  return (
    <CampusSceneryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
  );
}

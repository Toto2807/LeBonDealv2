import { labelStatut } from '../utils/format.js';

const CLASSES = { DISPONIBLE: 'available', RESERVEE: 'reserved', VENDUE: 'sold' };

export default function StatusBadge({ statut }) {
  return <span className={`status-badge ${CLASSES[statut] ?? 'reserved'}`}>{labelStatut(statut)}</span>;
}


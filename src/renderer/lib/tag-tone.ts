import type { TagRow } from '../../shared/api';
import type { Tone } from '../components/ui';

/**
 * Marker kind -> semantic tone, replacing the `.tag-TODO` / `.tag-FIXME` /
 * `.tag-HACK` / `.tag-NOTE` / `.tag-XXX` colour classes. Shared by the Markers
 * list and the editor's marker chips so the two never drift.
 */
export function tagTone(kind: TagRow['kind'] | string): Tone {
  switch (kind) {
    case 'TODO':
      return 'accent';
    case 'FIXME':
      return 'warning';
    case 'NOTE':
      return 'success';
    case 'HACK':
    case 'XXX':
      return 'danger';
    default:
      return 'neutral';
  }
}

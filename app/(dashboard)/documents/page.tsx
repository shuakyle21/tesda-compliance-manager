/** Legacy unscoped route — forwards to `/t/<school>/documents` for the caller's default school. */
import { legacyRoute } from '../legacy-redirect';

export default legacyRoute('documents');

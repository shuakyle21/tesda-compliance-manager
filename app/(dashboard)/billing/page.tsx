/** Legacy unscoped route — forwards to `/t/<school>/billing` for the caller's default school. */
import { legacyRoute } from '../legacy-redirect';

export default legacyRoute('billing');

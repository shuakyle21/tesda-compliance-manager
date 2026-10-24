/** Legacy unscoped route — forwards to `/t/<school>/report` for the caller's default school. */
import { legacyRoute } from '../legacy-redirect';

export default legacyRoute('report');

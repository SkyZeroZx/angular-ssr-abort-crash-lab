// tools/baseline-handler.mjs as a Workers module, for workerd.
import { handler } from './baseline-handler.mjs';

export default { fetch: handler };

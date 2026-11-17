// Ledger's entrypoint: start the router, tick the live countdowns, and
// re-render the current page when a background refresh changes the data.

import { route } from './router.js';
import { onRefresh } from './api.js';
import { tickCountdowns } from './fmt.js';

setInterval(tickCountdowns, 1000);

onRefresh(() => route({ keepFocus: true }));

route();

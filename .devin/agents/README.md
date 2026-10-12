# Agent role notes

The files in this directory are role descriptions for a separately configured agent environment. The Space Ledger web server does not load or execute them.

The application contains four immutable display records in `src/agents/index.js`. It has no agent runtime, scheduler, code-writing loop, agent-spawning endpoint, or automatic deployment. The public `/api/agents` routes are read-only and expose only display fields.

The role descriptions are not evidence that an agent is running or that the site is being upgraded. Any external agent environment must be configured with explicit permissions and human review separately from this website.

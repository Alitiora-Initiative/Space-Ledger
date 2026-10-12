# Agent role registry

This file describes the intended roles for a possible, separately configured agent workflow. It is documentation only: the Space Ledger application does not load this registry, run these agents, assign them tasks, or grant them permissions.

## Roles shown in the visualization

- **001 - Gilga Prime:** root role and largest visual sphere.
- **002 - Survivor:** implementation and verification role.
- **003 - Contradictor:** review and risk-check role.
- **004 - Judge:** evidence and release-criteria role.

The backend serves these as immutable display records with `configured` status. There is no worker process, task queue, scheduler, agent-spawning capability, website-upgrade loop, or automatic deployment. Sphere motion is decorative and is not evidence of work. A future external agent workflow requires explicit setup, scoped permissions, human oversight, and separate documentation.

## Future additions

No additional roles are created by the application. Adding a visible role requires a reviewed source change and deployment. Any future worker design needs narrow permissions, audit logs, a human approval step for code changes, and a shutdown path. This registry alone cannot enable agents or grant authority.

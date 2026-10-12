# GILGA PRIME Agent System

## Overview

The GILGA PRIME Agent System is a backend implementation of the agent orchestration framework defined in the GILGA PRIME constitution. It provides the infrastructure for creating, coordinating, and managing specialized agents to transform the Space Ledger project into a production-ready application.

## Architecture

### Core Agents

1. **Gilga Prime (Agent 001)**: Root Architect and Project Orchestration Agent
   - Coordinates all other agents
   - Enforces the decision protocol
   - Maintains the project record
   - Spawns specialized agents when needed

2. **Survivor (Agent 002)**: Implementation and Delivery Agent
   - Identifies and resolves blockers
   - Implements fixes
   - Verifies changes with tests
   - Prevents regressions

3. **Contradictor (Agent 003)**: Risk Assessment and Challenge Agent
   - Challenges weak assumptions
   - Identifies failure modes
   - Exposes security risks
   - Proposes safer alternatives

4. **Judge (Agent 004)**: Decision Quality and Release Control Agent
   - Evaluates proposals based on evidence
   - Enforces release criteria
   - Authorizes actions within permissions
   - Records decision reasoning

### Decision Protocol

The system follows a 10-stage decision protocol:

1. **Define**: Describe problem, outcome, constraints, acceptance criteria
2. **Investigate**: Collect source code, logs, documentation, evidence
3. **Propose**: Develop concrete implementation plan
4. **Challenge**: Identify defects, unsafe assumptions, omissions
5. **Revise**: Address valid objections, document disagreements
6. **Judge**: Assess evidence and risk thresholds
7. **Authorize**: Confirm permissions and human approval
8. **Execute**: Make smallest reasonable change
9. **Verify**: Run tests, inspect results
10. **Record**: Document change, evidence, risks, rollback

## Installation

The agent system is already integrated into the Space Ledger project. No additional installation is required.

## Usage

### Starting the Server

```bash
npm start
```

The agent system API will be available at `http://localhost:3000/api/agents`

### API Endpoints

#### Get Agent Registry
```bash
GET /api/agents/registry
```

Returns all registered agents with their configurations.

#### Get Specific Agent
```bash
GET /api/agents/:agentId
```

Returns information about a specific agent.

#### Assign Task to Agent
```bash
POST /api/agents/assign
Content-Type: application/json

{
  "agentId": "002",
  "task": {
    "description": "Fix broken API endpoint",
    "priority": "high"
  }
}
```

Assigns a task to a specialized agent.

#### Execute Decision Protocol
```bash
POST /api/agents/decision-protocol
Content-Type: application/json

{
  "proposal": {
    "problem": "API endpoint returns 500 error",
    "outcome": "API endpoint returns 200 with valid data",
    "description": "Fix the /api/supply endpoint"
  }
}
```

Executes the full decision protocol for a proposal.

#### Challenge a Proposal
```bash
POST /api/agents/challenge
Content-Type: application/json

{
  "proposal": {
    "description": "Implement new feature"
  }
}
```

Has the Contradictor challenge a proposal and return risks.

#### Evaluate a Proposal
```bash
POST /api/agents/evaluate
Content-Type: application/json

{
  "proposal": {
    "description": "Implement new feature"
  },
  "contradictorFindings": {
    "failureModes": [...],
    "securityRisks": [...]
  }
}
```

Has the Judge evaluate a proposal with Contradictor's findings.

#### Make a Decision
```bash
POST /api/agents/decide
Content-Type: application/json

{
  "evaluation": {
    "authorizationCheck": { "exceedsPermissions": false },
    "humanApprovalRequired": false,
    "humanApprovalObtained": true,
    "decision": "approved",
    "reasoning": "..."
  }
}
```

Has the Judge make a final decision.

#### Get Project Record
```bash
GET /api/agents/project-record
```

Returns the current project record.

#### Trigger First Mission
```bash
POST /api/agents/first-mission
```

Triggers Gilga Prime's first mission to establish project baseline.

#### Get Decision Protocol Stages
```bash
GET /api/agents/protocol-stages
```

Returns the decision protocol stages with descriptions.

## Testing

Run the agent system tests:

```bash
npm test
```

The tests cover:
- Agent registry validation
- Agent initialization
- Permission and restriction checks
- Agent functionality (analyze, challenge, evaluate, decide)
- Decision protocol execution

## Agent Specifications

### Gilga Prime (001)
- **Type**: Project Orchestration Agent
- **Permissions**: read, write, exec, grep, code_search, run_subagent, todo_write
- **Restrictions**: no_git_config, no_force_push, no_secrets_commit, no_financial_transactions
- **Mission**: Transform project into functional, secure, legitimate, production-ready, maintainable, commercially viable product

### Survivor (002)
- **Type**: Implementation and Delivery Agent
- **Permissions**: read, write, edit, exec, grep, find_file_by_name, code_search
- **Restrictions**: no_high_risk_approval, no_destructive_ops, no_security_bypass, no_secrets_commit
- **Mission**: Maximize verified project success through implementation and delivery

### Contradictor (003)
- **Type**: Risk Assessment and Challenge Agent
- **Permissions**: read, grep, find_file_by_name, code_search, exec
- **Restrictions**: no_code_modification, no_approval_rejection, no_destructive_ops
- **Mission**: Disprove weak assumptions and expose hidden risks

### Judge (004)
- **Type**: Decision Quality and Release Control Agent
- **Permissions**: read, grep, find_file_by_name, code_search, exec
- **Restrictions**: no_permission_exceed, no_human_override, no_security_bypass, no_legal_determinations
- **Mission**: Protect decision quality and enforce release criteria

## Project Record

The project record is maintained in `.devin/PROJECT_RECORD.md` and contains:
- Current project state and baseline
- Architecture and dependencies
- Product requirements and acceptance criteria
- Agent registry and responsibilities
- Decisions and their evidence
- Implemented changes and tests
- Known defects and limitations
- Security and operational risks
- Deployment and rollback history
- Market hypotheses and results
- Outstanding human approvals
- Next prioritized actions

## Specialized Agents

Additional specialized agents can be created when demonstrated need exists:
- Software Architect
- Frontend Engineer
- Backend Engineer
- Database and Migration Engineer
- Security Auditor
- Quality Assurance Engineer
- DevOps and Reliability Engineer
- UX and Accessibility Specialist
- Product Researcher
- Market Researcher
- Growth and Marketing Strategist
- Documentation and Support Specialist
- Analytics and Experimentation Specialist

## Safety and Legitimacy

The agent system enforces:
- No secrets or private keys in repository
- No bypassing security controls
- No making financial transactions without authorization
- No disabling safety measures
- No manufacturing fake engagement or metrics
- Human approval required for critical actions
- Evidence-based decision making
- Audit trail for all important decisions

## Files

- `src/agents/index.js`: Core agent system implementation
- `src/agents/api.js`: Express API routes for agent system
- `test/agents.test.js`: Agent system tests
- `.devin/agents/gilga-prime/SKILL.md`: Gilga Prime specification
- `.devin/agents/survivor/SKILL.md`: Survivor specification
- `.devin/agents/contradictor/SKILL.md`: Contradictor specification
- `.devin/agents/judge/SKILL.md`: Judge specification
- `.devin/agents/AGENT_REGISTRY.md`: Agent registry
- `.devin/PROJECT_RECORD.md`: Project record

## Next Steps

1. Run the test suite to verify agent system functionality
2. Start the server and test API endpoints
3. Trigger Gilga Prime's first mission to establish project baseline
4. Use the decision protocol for proposed changes
5. Create specialized agents as needed
6. Maintain the project record as work progresses

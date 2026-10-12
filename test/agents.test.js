/**
 * Agent System Tests
 *
 * Tests for the GILGA PRIME agent system.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentOrchestrator, AGENT_REGISTRY, DECISION_PROTOCOL } = require('../src/agents/index.js');

test('Agent System - Agent Registry', (t) => {
  test('should have Gilga Prime registered as Agent 001', () => {
    const gilgaPrime = AGENT_REGISTRY['001'];
    assert.strictEqual(gilgaPrime.id, '001');
    assert.strictEqual(gilgaPrime.name, 'Gilga Prime');
    assert.strictEqual(gilgaPrime.type, 'Project Orchestration Agent');
    assert.strictEqual(gilgaPrime.parent, null);
    assert.strictEqual(gilgaPrime.status, 'active');
  });

  test('should have Survivor registered as Agent 002', () => {
    const survivor = AGENT_REGISTRY['002'];
    assert.strictEqual(survivor.id, '002');
    assert.strictEqual(survivor.name, 'Survivor');
    assert.strictEqual(survivor.type, 'Implementation and Delivery Agent');
    assert.strictEqual(survivor.parent, '001');
  });

  test('should have Contradictor registered as Agent 003', () => {
    const contradictor = AGENT_REGISTRY['003'];
    assert.strictEqual(contradictor.id, '003');
    assert.strictEqual(contradictor.name, 'Contradictor');
    assert.strictEqual(contradictor.type, 'Risk Assessment and Challenge Agent');
    assert.strictEqual(contradictor.parent, '001');
  });

  test('should have Judge registered as Agent 004', () => {
    const judge = AGENT_REGISTRY['004'];
    assert.strictEqual(judge.id, '004');
    assert.strictEqual(judge.name, 'Judge');
    assert.strictEqual(judge.type, 'Decision Quality and Release Control Agent');
    assert.strictEqual(judge.parent, '001');
  });
});

test('Agent System - Agent Orchestrator', (t) => {
  test('should initialize with all agents', () => {
    const orchestrator = new AgentOrchestrator();
    assert.ok(orchestrator.gilgaPrime);
    assert.ok(orchestrator.survivor);
    assert.ok(orchestrator.contradictor);
    assert.ok(orchestrator.judge);
  });

  test('should get agent by ID', () => {
    const orchestrator = new AgentOrchestrator();
    const agent = orchestrator.getAgent('001');
    assert.strictEqual(agent.id, '001');
    assert.strictEqual(agent.name, 'Gilga Prime');
  });

  test('should return null for non-existent agent', () => {
    const orchestrator = new AgentOrchestrator();
    const agent = orchestrator.getAgent('999');
    assert.strictEqual(agent, undefined);
  });
});

test('Agent System - Gilga Prime', (t) => {
  test('should have correct permissions', () => {
    const orchestrator = new AgentOrchestrator();
    const gilgaPrime = orchestrator.gilgaPrime;
    assert.ok(gilgaPrime.hasPermission('read'));
    assert.ok(gilgaPrime.hasPermission('write'));
    assert.ok(gilgaPrime.hasPermission('exec'));
    assert.ok(gilgaPrime.hasPermission('grep'));
    assert.ok(gilgaPrime.hasPermission('code_search'));
    assert.ok(gilgaPrime.hasPermission('run_subagent'));
    assert.ok(gilgaPrime.hasPermission('todo_write'));
  });

  test('should have correct restrictions', () => {
    const orchestrator = new AgentOrchestrator();
    const gilgaPrime = orchestrator.gilgaPrime;
    assert.ok(gilgaPrime.isRestricted('no_git_config'));
    assert.ok(gilgaPrime.isRestricted('no_force_push'));
    assert.ok(gilgaPrime.isRestricted('no_secrets_commit'));
    assert.ok(gilgaPrime.isRestricted('no_financial_transactions'));
  });

  test('should execute first mission', async () => {
    const orchestrator = new AgentOrchestrator();
    const mission = await orchestrator.gilgaPrime.firstMission();
    assert.ok(mission.objective);
    assert.ok(mission.steps);
    assert.ok(Array.isArray(mission.steps));
    assert.strictEqual(mission.steps.length, 12);
  });

  test('should assign task to agent', async () => {
    const orchestrator = new AgentOrchestrator();
    const task = { description: 'Test task', priority: 'high' };
    const assignment = await orchestrator.gilgaPrime.assignTask('002', task);
    assert.strictEqual(assignment.assignedTo, '002');
    assert.strictEqual(assignment.agentName, 'Survivor');
    assert.ok(assignment.task);
  });
});

test('Agent System - Survivor', (t) => {
  test('should have correct permissions', () => {
    const orchestrator = new AgentOrchestrator();
    const survivor = orchestrator.survivor;
    assert.ok(survivor.hasPermission('read'));
    assert.ok(survivor.hasPermission('write'));
    assert.ok(survivor.hasPermission('edit'));
    assert.ok(survivor.hasPermission('exec'));
    assert.ok(survivor.hasPermission('grep'));
  });

  test('should have correct restrictions', () => {
    const orchestrator = new AgentOrchestrator();
    const survivor = orchestrator.survivor;
    assert.ok(survivor.isRestricted('no_high_risk_approval'));
    assert.ok(survivor.isRestricted('no_destructive_ops'));
    assert.ok(survivor.isRestricted('no_security_bypass'));
    assert.ok(survivor.isRestricted('no_secrets_commit'));
  });

  test('should analyze blocker', async () => {
    const orchestrator = new AgentOrchestrator();
    const blocker = { description: 'Test blocker', severity: 'high' };
    const analysis = await orchestrator.survivor.analyzeBlocker(blocker);
    assert.ok(analysis.blocker);
    assert.strictEqual(analysis.status, 'in_progress');
  });

  test('should reject destructive operations without authorization', async () => {
    const orchestrator = new AgentOrchestrator();
    const plan = { description: 'Destructive operation', isDestructive: true };
    await assert.rejects(
      async () => await orchestrator.survivor.implementFix(plan),
      /Cannot implement destructive operation without authorization/
    );
  });
});

test('Agent System - Contradictor', (t) => {
  test('should have correct permissions', () => {
    const orchestrator = new AgentOrchestrator();
    const contradictor = orchestrator.contradictor;
    assert.ok(contradictor.hasPermission('read'));
    assert.ok(contradictor.hasPermission('grep'));
    assert.ok(contradictor.hasPermission('exec'));
  });

  test('should have correct restrictions', () => {
    const orchestrator = new AgentOrchestrator();
    const contradictor = orchestrator.contradictor;
    assert.ok(contradictor.isRestricted('no_code_modification'));
    assert.ok(contradictor.isRestricted('no_approval_rejection'));
    assert.ok(contradictor.isRestricted('no_destructive_ops'));
  });

  test('should challenge proposal', async () => {
    const orchestrator = new AgentOrchestrator();
    const proposal = { description: 'Test proposal' };
    const challenges = await orchestrator.contradictor.challengeProposal(proposal);
    assert.ok(challenges.proposal);
    assert.ok(Array.isArray(challenges.keyAssumptions));
    assert.ok(Array.isArray(challenges.failureModes));
    assert.ok(Array.isArray(challenges.securityRisks));
  });

  test('should ask challenge questions', async () => {
    const orchestrator = new AgentOrchestrator();
    const proposal = { description: 'Test proposal' };
    const questions = await orchestrator.contradictor.askChallengeQuestions(proposal);
    assert.ok(Array.isArray(questions));
    assert.strictEqual(questions.length, 10);
    assert.ok(questions.includes('What could make this plan fail?'));
  });
});

test('Agent System - Judge', (t) => {
  test('should have correct permissions', () => {
    const orchestrator = new AgentOrchestrator();
    const judge = orchestrator.judge;
    assert.ok(judge.hasPermission('read'));
    assert.ok(judge.hasPermission('grep'));
    assert.ok(judge.hasPermission('exec'));
  });

  test('should have correct restrictions', () => {
    const orchestrator = new AgentOrchestrator();
    const judge = orchestrator.judge;
    assert.ok(judge.isRestricted('no_permission_exceed'));
    assert.ok(judge.isRestricted('no_human_override'));
    assert.ok(judge.isRestricted('no_security_bypass'));
    assert.ok(judge.isRestricted('no_legal_determinations'));
  });

  test('should evaluate proposal', async () => {
    const orchestrator = new AgentOrchestrator();
    const proposal = { description: 'Test proposal' };
    const contradictorFindings = { failureModes: [], securityRisks: [] };
    const evaluation = await orchestrator.judge.evaluateProposal(proposal, contradictorFindings);
    assert.ok(evaluation.proposal);
    assert.ok(evaluation.opposingEvidence);
    assert.strictEqual(evaluation.decision, null);
  });

  test('should reject actions exceeding permissions', async () => {
    const orchestrator = new AgentOrchestrator();
    const evaluation = {
      authorizationCheck: { exceedsPermissions: true },
      humanApprovalRequired: false,
      humanApprovalObtained: false,
      decision: 'approved'
    };
    const decision = await orchestrator.judge.makeDecision(evaluation);
    assert.strictEqual(decision.decision, 'rejected');
    assert.ok(decision.reasoning.includes('exceeds granted permissions'));
  });

  test('should await human approval when required', async () => {
    const orchestrator = new AgentOrchestrator();
    const evaluation = {
      authorizationCheck: { exceedsPermissions: false },
      humanApprovalRequired: true,
      humanApprovalObtained: false,
      decision: 'approved'
    };
    const decision = await orchestrator.judge.makeDecision(evaluation);
    assert.strictEqual(decision.decision, 'awaiting_human_approval');
    assert.ok(decision.reasoning.includes('Human approval is required'));
  });
});

test('Agent System - Decision Protocol', (t) => {
  test('should have all stages defined', () => {
    assert.strictEqual(DECISION_PROTOCOL.DEFINE, 'define');
    assert.strictEqual(DECISION_PROTOCOL.INVESTIGATE, 'investigate');
    assert.strictEqual(DECISION_PROTOCOL.PROPOSE, 'propose');
    assert.strictEqual(DECISION_PROTOCOL.CHALLENGE, 'challenge');
    assert.strictEqual(DECISION_PROTOCOL.REVISE, 'revise');
    assert.strictEqual(DECISION_PROTOCOL.JUDGE, 'judge');
    assert.strictEqual(DECISION_PROTOCOL.AUTHORIZE, 'authorize');
    assert.strictEqual(DECISION_PROTOCOL.EXECUTE, 'execute');
    assert.strictEqual(DECISION_PROTOCOL.VERIFY, 'verify');
    assert.strictEqual(DECISION_PROTOCOL.RECORD, 'record');
  });

  test('should execute decision protocol', async () => {
    const orchestrator = new AgentOrchestrator();
    const proposal = {
      problem: 'Test problem',
      outcome: 'Test outcome',
      description: 'Test proposal'
    };
    const protocol = await orchestrator.executeDecisionProtocol(proposal);
    assert.ok(protocol.stage);
    assert.ok(protocol.proposal);
    assert.ok(Array.isArray(protocol.history));
    assert.ok(protocol.history.length > 0);
  });
});

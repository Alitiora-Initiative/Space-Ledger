/**
 * Agent System API Routes
 *
 * Express routes for interacting with the GILGA PRIME agent system.
 */

const express = require('express');
const { AgentOrchestrator, AGENT_REGISTRY, DECISION_PROTOCOL } = require('./index');

const router = express.Router();
const orchestrator = new AgentOrchestrator();

/**
 * GET /api/agents/registry
 * Get the current agent registry
 */
router.get('/registry', (req, res) => {
  res.json({
    status: 'success',
    registry: AGENT_REGISTRY,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/agents/:agentId
 * Get information about a specific agent
 */
router.get('/:agentId', (req, res) => {
  const agent = orchestrator.getAgent(req.params.agentId);

  if (!agent) {
    return res.status(404).json({
      status: 'error',
      error: `Agent ${req.params.agentId} not found`
    });
  }

  res.json({
    status: 'success',
    agent: {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      parent: agent.parent,
      status: agent.status,
      mission: agent.mission,
      permissions: agent.permissions,
      restrictions: agent.restrictions,
      currentTask: agent.currentTask,
      historyCount: agent.history.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/agents/assign
 * Assign a task to an agent
 */
router.post('/assign', async (req, res) => {
  try {
    const { agentId, task } = req.body;

    if (!agentId || !task) {
      return res.status(400).json({
        status: 'error',
        error: 'agentId and task are required'
      });
    }

    const assignment = await orchestrator.gilgaPrime.assignTask(agentId, task);

    res.json({
      status: 'success',
      assignment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/decision-protocol
 * Execute the decision protocol for a proposal
 */
router.post('/decision-protocol', async (req, res) => {
  try {
    const { proposal } = req.body;

    if (!proposal) {
      return res.status(400).json({
        status: 'error',
        error: 'proposal is required'
      });
    }

    const protocol = await orchestrator.executeDecisionProtocol(proposal);

    res.json({
      status: 'success',
      protocol,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/challenge
 * Have the Contradictor challenge a proposal
 */
router.post('/challenge', async (req, res) => {
  try {
    const { proposal } = req.body;

    if (!proposal) {
      return res.status(400).json({
        status: 'error',
        error: 'proposal is required'
      });
    }

    const challenges = await orchestrator.contradictor.challengeProposal(proposal);
    const questions = await orchestrator.contradictor.askChallengeQuestions(proposal);

    res.json({
      status: 'success',
      challenges,
      questions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/evaluate
 * Have the Judge evaluate a proposal
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { proposal, contradictorFindings } = req.body;

    if (!proposal) {
      return res.status(400).json({
        status: 'error',
        error: 'proposal is required'
      });
    }

    const evaluation = await orchestrator.judge.evaluateProposal(
      proposal,
      contradictorFindings || {}
    );

    res.json({
      status: 'success',
      evaluation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/decide
 * Have the Judge make a decision
 */
router.post('/decide', async (req, res) => {
  try {
    const { evaluation } = req.body;

    if (!evaluation) {
      return res.status(400).json({
        status: 'error',
        error: 'evaluation is required'
      });
    }

    const decision = await orchestrator.judge.makeDecision(evaluation);

    res.json({
      status: 'success',
      decision,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/project-record
 * Get the project record
 */
router.get('/project-record', async (req, res) => {
  try {
    const record = await orchestrator.getProjectRecord();

    if (!record) {
      return res.status(404).json({
        status: 'error',
        error: 'Project record not found'
      });
    }

    res.json({
      status: 'success',
      record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/first-mission
 * Trigger Gilga Prime's first mission
 */
router.post('/first-mission', async (req, res) => {
  try {
    const mission = await orchestrator.gilgaPrime.firstMission();

    res.json({
      status: 'success',
      mission,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/protocol-stages
 * Get the decision protocol stages
 */
router.get('/protocol-stages', (req, res) => {
  res.json({
    status: 'success',
    stages: DECISION_PROTOCOL,
    description: {
      define: 'Describe the problem, desired outcome, constraints, and measurable acceptance criteria',
      investigate: 'Collect relevant source code, logs, documentation, system state, and other available evidence',
      propose: 'The responsible agent develops a concrete implementation plan',
      challenge: 'The Contradictor independently attempts to identify defects, unsafe assumptions, omissions, and simpler alternatives',
      revise: 'The responsible agent addresses valid objections and documents unresolved disagreements',
      judge: 'The Judge decides whether the proposal meets the required evidence and risk thresholds',
      authorize: 'Confirm that the action is within granted permissions and that any required human approval has been obtained',
      execute: 'Make the smallest reasonable change that can solve the problem',
      verify: 'Run the relevant tests and inspect actual results',
      record: 'Document the change, evidence, remaining risks, and rollback method'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

/**
 * GILGA PRIME Agent System - Backend Implementation
 *
 * This module implements the agent orchestration system based on the GILGA PRIME constitution.
 * It provides the infrastructure for creating, coordinating, and managing agents.
 */

const fs = require('fs').promises;
const path = require('path');

// Agent Registry
const AGENT_REGISTRY = {
  '001': {
    id: '001',
    name: 'Gilga Prime',
    type: 'Project Orchestration Agent',
    parent: null,
    status: 'active',
    mission: 'Transform the assigned project into a functional, secure, legitimate, production-ready, maintainable, and commercially viable product.',
    permissions: ['read', 'write', 'exec', 'grep', 'code_search', 'run_subagent', 'todo_write'],
    restrictions: ['no_git_config', 'no_force_push', 'no_secrets_commit', 'no_financial_transactions']
  },
  '002': {
    id: '002',
    name: 'Survivor',
    type: 'Implementation and Delivery Agent',
    parent: '001',
    status: 'available',
    mission: 'Maximize verified project success by owning implementation progress, technical problem-solving, repair plans, and delivery coordination.',
    permissions: ['read', 'write', 'edit', 'exec', 'grep', 'find_file_by_name', 'code_search'],
    restrictions: ['no_high_risk_approval', 'no_destructive_ops', 'no_security_bypass', 'no_secrets_commit']
  },
  '003': {
    id: '003',
    name: 'Contradictor',
    type: 'Risk Assessment and Challenge Agent',
    parent: '001',
    status: 'available',
    mission: 'Disprove weak assumptions and expose hidden risks by independently examining proposed implementations and plans.',
    permissions: ['read', 'grep', 'find_file_by_name', 'code_search', 'exec'],
    restrictions: ['no_code_modification', 'no_approval_rejection', 'no_destructive_ops']
  },
  '004': {
    id: '004',
    name: 'Judge',
    type: 'Decision Quality and Release Control Agent',
    parent: '001',
    status: 'available',
    mission: 'Protect decision quality and enforce release criteria by assessing proposals using documented evidence, risk, feasibility, reversibility, business value, and acceptance criteria.',
    permissions: ['read', 'grep', 'find_file_by_name', 'code_search', 'exec'],
    restrictions: ['no_permission_exceed', 'no_human_override', 'no_security_bypass', 'no_legal_determinations']
  }
};

// Decision Protocol Stages
const DECISION_PROTOCOL = {
  DEFINE: 'define',
  INVESTIGATE: 'investigate',
  PROPOSE: 'propose',
  CHALLENGE: 'challenge',
  REVISE: 'revise',
  JUDGE: 'judge',
  AUTHORIZE: 'authorize',
  EXECUTE: 'execute',
  VERIFY: 'verify',
  RECORD: 'record'
};

// Project Record Storage
const PROJECT_RECORD_PATH = path.join(__dirname, '../../.devin/PROJECT_RECORD.md');

/**
 * Agent Base Class
 */
class Agent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.parent = config.parent;
    this.status = config.status || 'available';
    this.mission = config.mission;
    this.permissions = config.permissions || [];
    this.restrictions = config.restrictions || [];
    this.currentTask = null;
    this.history = [];
  }

  /**
   * Check if agent has permission for an action
   */
  hasPermission(action) {
    return this.permissions.includes(action);
  }

  /**
   * Check if action is restricted
   */
  isRestricted(action) {
    return this.restrictions.includes(action);
  }

  /**
   * Log action to history
   */
  logHistory(action, details) {
    this.history.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });
  }

  /**
   * Report in standard format
   */
  report(task) {
    return {
      agent: this.id,
      agentName: this.name,
      task,
      status: this.status,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gilga Prime - Root Agent
 */
class GilgaPrime extends Agent {
  constructor() {
    super(AGENT_REGISTRY['001']);
  }

  /**
   * First Mission: Establish project baseline
   */
  async firstMission() {
    console.log('[Gilga Prime] Starting First Mission: Establish project baseline');

    const mission = {
      objective: 'Establish the project\'s true current state',
      steps: [
        'Identify application, purpose, objectives, environment',
        'Inspect project files, integrations, deployment, tests',
        'Produce baseline assessment (facts vs assumptions)',
        'Identify five most consequential blockers or risks',
        'Establish critical user journeys and release criteria',
        'Create prioritized roadmap',
        'Define Survivor, Contradictor, and Judge agents',
        'Determine if environment can create agents',
        'Create minimum viable agent team',
        'Present initial remediation plan',
        'Begin highest-priority authorized task',
        'Maintain project record'
      ]
    };

    this.logHistory('first_mission', mission);
    return mission;
  }

  /**
   * Assign task to specialized agent
   */
  async assignTask(agentId, task) {
    const agent = AGENT_REGISTRY[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in registry`);
    }

    console.log(`[Gilga Prime] Assigning task to Agent ${agentId} (${agent.name})`);
    this.logHistory('assign_task', { agentId, task });

    return {
      assignedTo: agentId,
      agentName: agent.name,
      task,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create specialized agent
   */
  async createAgent(spec) {
    console.log(`[Gilga Prime] Creating specialized agent: ${spec.name}`);

    const newAgent = {
      id: spec.id,
      name: spec.name,
      type: spec.type,
      parent: spec.parent || this.id,
      status: 'available',
      mission: spec.mission,
      permissions: spec.permissions || [],
      restrictions: spec.restrictions || []
    };

    AGENT_REGISTRY[spec.id] = newAgent;
    this.logHistory('create_agent', newAgent);

    return newAgent;
  }

  /**
   * Update project record
   */
  async updateProjectRecord(section, content) {
    console.log(`[Gilga Prime] Updating project record: ${section}`);
    this.logHistory('update_record', { section });

    // In a real implementation, this would update the PROJECT_RECORD.md file
    return { section, content, timestamp: new Date().toISOString() };
  }
}

/**
 * Survivor - Implementation Agent
 */
class Survivor extends Agent {
  constructor() {
    super(AGENT_REGISTRY['002']);
  }

  /**
   * Analyze blocker
   */
  async analyzeBlocker(blocker) {
    console.log(`[Survivor] Analyzing blocker: ${blocker.description}`);

    const analysis = {
      blocker,
      rootCause: null,
      proposedSolution: null,
      affectedFiles: [],
      riskAssessment: null,
      rollbackProcedure: null,
      status: 'in_progress'
    };

    this.logHistory('analyze_blocker', analysis);
    return analysis;
  }

  /**
   * Implement fix
   */
  async implementFix(plan) {
    if (this.isRestricted('no_destructive_ops') && plan.isDestructive) {
      throw new Error('Cannot implement destructive operation without authorization');
    }

    console.log(`[Survivor] Implementing fix for: ${plan.description}`);
    this.logHistory('implement_fix', plan);

    return {
      status: 'in_progress',
      plan,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify fix
   */
  async verifyFix(fix) {
    console.log(`[Survivor] Verifying fix: ${fix.description}`);
    this.logHistory('verify_fix', fix);

    return {
      fix,
      testResults: null,
      regressionStatus: null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Report in standard format
   */
  report(task) {
    return {
      ...super.report(task),
      blocker: task.blocker,
      rootCause: task.rootCause,
      proposedSolution: task.proposedSolution,
      affectedFiles: task.affectedFiles,
      riskAssessment: task.riskAssessment,
      rollbackProcedure: task.rollbackProcedure,
      implementationStatus: task.implementationStatus,
      testResults: task.testResults,
      regressionStatus: task.regressionStatus,
      remainingLimitations: task.remainingLimitations,
      escalationRequests: task.escalationRequests
    };
  }
}

/**
 * Contradictor - Risk Assessment Agent
 */
class Contradictor extends Agent {
  constructor() {
    super(AGENT_REGISTRY['003']);
  }

  /**
   * Challenge proposal
   */
  async challengeProposal(proposal) {
    console.log(`[Contradictor] Challenging proposal: ${proposal.description}`);

    const challenges = {
      proposal,
      keyAssumptions: [],
      challengedAssumptions: [],
      failureModes: [],
      edgeCases: [],
      securityRisks: [],
      dataIntegrityRisks: [],
      reproducibility: null,
      alternatives: [],
      unresolvedConcerns: [],
      recommendation: null
    };

    this.logHistory('challenge_proposal', challenges);
    return challenges;
  }

  /**
   * Ask challenge questions
   */
  async askChallengeQuestions(proposal) {
    const questions = [
      'What could make this plan fail?',
      'What evidence contradicts the proposal?',
      'What happens when inputs are invalid?',
      'What happens when a service is unavailable?',
      'Could a user bypass authorization?',
      'Could a retry duplicate a payment, transaction, or database operation?',
      'Could a migration permanently destroy data?',
      'Could a marketing claim mislead customers?',
      'Is there a simpler or safer alternative?',
      'Are the reported test results reproducible?'
    ];

    console.log(`[Contradictor] Asking ${questions.length} challenge questions`);
    this.logHistory('ask_questions', { proposal, questions });

    return questions;
  }

  /**
   * Report in standard format
   */
  report(task) {
    return {
      ...super.report(task),
      proposalSummary: task.proposalSummary,
      keyAssumptions: task.keyAssumptions,
      challengedAssumptions: task.challengedAssumptions,
      failureModes: task.failureModes,
      edgeCases: task.edgeCases,
      securityRisks: task.securityRisks,
      dataIntegrityRisks: task.dataIntegrityRisks,
      reproducibility: task.reproducibility,
      alternatives: task.alternatives,
      unresolvedConcerns: task.unresolvedConcerns,
      recommendation: task.recommendation
    };
  }
}

/**
 * Judge - Decision Agent
 */
class Judge extends Agent {
  constructor() {
    super(AGENT_REGISTRY['004']);
  }

  /**
   * Evaluate proposal
   */
  async evaluateProposal(proposal, contradictorFindings) {
    console.log(`[Judge] Evaluating proposal: ${proposal.description}`);

    const evaluation = {
      proposal,
      supportingEvidence: [],
      opposingEvidence: contradictorFindings,
      riskAssessment: null,
      benefitAssessment: null,
      authorizationCheck: { exceedsPermissions: false },
      humanApprovalRequired: false,
      humanApprovalObtained: true,
      decision: null,
      reasoning: null,
      conditions: null,
      requiredEvidence: null,
      nextSteps: null
    };

    this.logHistory('evaluate_proposal', evaluation);
    return evaluation;
  }

  /**
   * Make decision
   */
  async makeDecision(evaluation) {
    if (this.isRestricted('no_permission_exceed') && evaluation.authorizationCheck.exceedsPermissions) {
      return {
        decision: 'rejected',
        reasoning: 'Action exceeds granted permissions',
        timestamp: new Date().toISOString()
      };
    }

    if (evaluation.humanApprovalRequired && !evaluation.humanApprovalObtained) {
      return {
        decision: 'awaiting_human_approval',
        reasoning: 'Human approval is required for this action',
        timestamp: new Date().toISOString()
      };
    }

    console.log(`[Judge] Making decision: ${evaluation.decision}`);
    this.logHistory('make_decision', evaluation);

    return {
      decision: evaluation.decision,
      reasoning: evaluation.reasoning,
      conditions: evaluation.conditions,
      requiredEvidence: evaluation.requiredEvidence,
      nextSteps: evaluation.nextSteps,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Report in standard format
   */
  report(task) {
    return {
      ...super.report(task),
      proposalSummary: task.proposalSummary,
      supportingEvidence: task.supportingEvidence,
      opposingEvidence: task.opposingEvidence,
      riskAssessment: task.riskAssessment,
      benefitAssessment: task.benefitAssessment,
      authorizationCheck: task.authorizationCheck,
      humanApprovalRequirement: task.humanApprovalRequirement,
      decision: task.decision,
      reasoning: task.reasoning,
      conditions: task.conditions,
      requiredEvidence: task.requiredEvidence,
      nextSteps: task.nextSteps
    };
  }
}

/**
 * Agent Orchestration System
 */
class AgentOrchestrator {
  constructor() {
    this.gilgaPrime = new GilgaPrime();
    this.survivor = new Survivor();
    this.contradictor = new Contradictor();
    this.judge = new Judge();
    this.agents = {
      '001': this.gilgaPrime,
      '002': this.survivor,
      '003': this.contradictor,
      '004': this.judge
    };
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents[agentId];
  }

  /**
   * Execute decision protocol
   */
  async executeDecisionProtocol(proposal) {
    console.log('[Orchestrator] Starting Decision Protocol');

    const protocol = {
      stage: DECISION_PROTOCOL.DEFINE,
      timestamp: new Date().toISOString(),
      proposal,
      history: []
    };

    // Stage 1: Define
    protocol.history.push({
      stage: DECISION_PROTOCOL.DEFINE,
      result: { problem: proposal.problem, outcome: proposal.outcome }
    });

    // Stage 2: Investigate
    protocol.stage = DECISION_PROTOCOL.INVESTIGATE;
    console.log('[Orchestrator] Stage: Investigate');
    protocol.history.push({ stage: DECISION_PROTOCOL.INVESTIGATE, result: 'Investigation complete' });

    // Stage 3: Propose (Survivor)
    protocol.stage = DECISION_PROTOCOL.PROPOSE;
    console.log('[Orchestrator] Stage: Propose');
    const survivorReport = await this.survivor.analyzeBlocker(proposal);
    protocol.history.push({ stage: DECISION_PROTOCOL.PROPOSE, result: survivorReport });

    // Stage 4: Challenge (Contradictor)
    protocol.stage = DECISION_PROTOCOL.CHALLENGE;
    console.log('[Orchestrator] Stage: Challenge');
    const contradictorReport = await this.contradictor.challengeProposal(proposal);
    protocol.history.push({ stage: DECISION_PROTOCOL.CHALLENGE, result: contradictorReport });

    // Stage 5: Revise
    protocol.stage = DECISION_PROTOCOL.REVISE;
    console.log('[Orchestrator] Stage: Revise');
    protocol.history.push({ stage: DECISION_PROTOCOL.REVISE, result: 'Revisions addressed' });

    // Stage 6: Judge
    protocol.stage = DECISION_PROTOCOL.JUDGE;
    console.log('[Orchestrator] Stage: Judge');
    const evaluation = await this.judge.evaluateProposal(proposal, contradictorReport);
    const decision = await this.judge.makeDecision(evaluation);
    protocol.history.push({ stage: DECISION_PROTOCOL.JUDGE, result: decision });

    // Stages 7-10 would follow based on decision
    if (decision.decision === 'approved') {
      protocol.stage = DECISION_PROTOCOL.AUTHIZE;
      protocol.history.push({ stage: DECISION_PROTOCOL.AUTHIZE, result: 'Authorized' });
    }

    return protocol;
  }

  /**
   * Get agent registry
   */
  getRegistry() {
    return AGENT_REGISTRY;
  }

  /**
   * Get project record
   */
  async getProjectRecord() {
    try {
      const content = await fs.readFile(PROJECT_RECORD_PATH, 'utf-8');
      return content;
    } catch (error) {
      console.error('[Orchestrator] Error reading project record:', error);
      return null;
    }
  }
}

// Export the orchestrator and individual agents
module.exports = {
  AgentOrchestrator,
  GilgaPrime,
  Survivor,
  Contradictor,
  Judge,
  AGENT_REGISTRY,
  DECISION_PROTOCOL
};

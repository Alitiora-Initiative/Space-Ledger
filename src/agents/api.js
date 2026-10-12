const express = require('express');
const { AGENT_REGISTRY } = require('./index');

const router = express.Router();

function publicAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    type: agent.type,
    parent: agent.parent,
    status: agent.status
  };
}

router.get('/registry', (_req, res) => {
  const registry = Object.fromEntries(Object.values(AGENT_REGISTRY).map(agent => [agent.id, publicAgent(agent)]));
  res.json({ status: 'success', registry, timestamp: new Date().toISOString() });
});

router.get('/:agentId', (req, res) => {
  const agent = AGENT_REGISTRY[req.params.agentId];
  if (!agent) return res.status(404).json({ status: 'error', error: 'Agent not found' });
  res.json({ status: 'success', agent: publicAgent(agent), timestamp: new Date().toISOString() });
});

module.exports = router;

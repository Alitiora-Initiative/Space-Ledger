const AGENT_REGISTRY = Object.freeze({
  '001': Object.freeze({
    id: '001',
    name: 'Gilga Prime',
    type: 'Project Orchestrator',
    parent: null,
    status: 'configured'
  }),
  '002': Object.freeze({
    id: '002',
    name: 'Survivor',
    type: 'Implementation Role',
    parent: '001',
    status: 'configured'
  }),
  '003': Object.freeze({
    id: '003',
    name: 'Contradictor',
    type: 'Risk Review Role',
    parent: '001',
    status: 'configured'
  }),
  '004': Object.freeze({
    id: '004',
    name: 'Judge',
    type: 'Decision Review Role',
    parent: '001',
    status: 'configured'
  })
});

module.exports = { AGENT_REGISTRY };

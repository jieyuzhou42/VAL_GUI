const NON_TASK_NODE_IDS = new Set([
  'chatbot-node',
  'create-new-method',
  'noNode',
  'add method',
  'reject',
]);

export const isControlNodeId = (nodeId = '') =>
  NON_TASK_NODE_IDS.has(nodeId) ||
  nodeId.endsWith('-edit') ||
  nodeId.endsWith('-trash') ||
  nodeId.endsWith('-add') ||
  nodeId.endsWith('-confirm') ||
  nodeId.includes('-unhide-') ||
  nodeId.includes('-select-');

export const isTaskNode = (node) => !!node && !isControlNodeId(node.id);

export const getTaskLabel = (node) => {
  if (!node) {
    return 'Untitled task';
  }

  const { data = {} } = node;

  if (data.task_name) {
    const args = Array.isArray(data.args)
      ? data.args.filter(Boolean).join(', ')
      : typeof data.args === 'string'
        ? data.args
        : '';

    return args ? `${data.task_name}(${args})` : data.task_name;
  }

  if (typeof data.label === 'string' && data.label.trim()) {
    return data.label.trim();
  }

  return node.id;
};

export function buildTaskGraph(nodes = [], edges = []) {
  const taskNodes = nodes.filter(isTaskNode);
  const taskNodeMap = new Map(taskNodes.map(node => [node.id, node]));
  const childMap = new Map(taskNodes.map(node => [node.id, []]));
  const parentMap = new Map();

  edges.forEach(edge => {
    if (edge.hidden || !taskNodeMap.has(edge.source) || !taskNodeMap.has(edge.target)) {
      return;
    }

    childMap.get(edge.source).push(edge.target);

    if (!parentMap.has(edge.target)) {
      parentMap.set(edge.target, edge.source);
    }
  });

  childMap.forEach((children, parentId) => {
    children.sort((leftId, rightId) => {
      const leftNode = taskNodeMap.get(leftId);
      const rightNode = taskNodeMap.get(rightId);
      const leftY = leftNode?.position?.y ?? 0;
      const rightY = rightNode?.position?.y ?? 0;
      const leftX = leftNode?.position?.x ?? 0;
      const rightX = rightNode?.position?.x ?? 0;

      if (leftY === rightY) {
        return leftX - rightX;
      }

      return leftY - rightY;
    });

    childMap.set(parentId, children);
  });

  const rootIds = taskNodes
    .map(node => node.id)
    .filter(nodeId => !parentMap.has(nodeId))
    .sort((leftId, rightId) => {
      const leftNode = taskNodeMap.get(leftId);
      const rightNode = taskNodeMap.get(rightId);
      const leftX = leftNode?.position?.x ?? 0;
      const rightX = rightNode?.position?.x ?? 0;
      const leftY = leftNode?.position?.y ?? 0;
      const rightY = rightNode?.position?.y ?? 0;

      if (leftX === rightX) {
        return leftY - rightY;
      }

      return leftX - rightX;
    });

  return {
    taskNodes,
    taskNodeMap,
    childMap,
    parentMap,
    rootIds,
  };
}

export function getDefaultPlannerState(graph, headHash = null) {
  const headNodeId =
    headHash && graph.taskNodeMap.has(headHash)
      ? headHash
      : graph.rootIds[0] ?? graph.taskNodes[0]?.id ?? null;

  const headChildren = headNodeId ? graph.childMap.get(headNodeId) ?? [] : [];
  const selectedNodeId = headChildren[0] ?? headNodeId;
  const focusedBranchRoot = selectedNodeId
    ? graph.parentMap.get(selectedNodeId) ?? selectedNodeId
    : null;

  return {
    selectedNodeId,
    focusedBranchRoot,
  };
}

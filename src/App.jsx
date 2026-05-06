import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { MarkerType } from '@xyflow/react';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import Display from './Display';
import DisplayAddedMethod from './DisplayAddedMethod';
import { isTaskNode } from './plannerUtils';
import './App.css';

const socket = io('http://localhost:4002', {
  transports: ['websocket', 'polling']
});

const POSITION_CONSTANTS = {
  PARENT_TO_CHATBOT_OFFSET_X: 50,
  PARENT_TO_CHATBOT_OFFSET_Y: 0,
  CHATBOT_NODE_OFFSET_X: 150,
  CHATBOT_NODE_OFFSET_Y: -200,
  CHATBOT_VISIBLE_SHIFT_X: 250,
};

const findTaskNodeByHash = (nodes, taskHash) => nodes.find(node => node.id === taskHash);
const removeChatbotEdges = (edges) =>
  edges.filter(edge => edge.source !== 'chatbot-node' && edge.target !== 'chatbot-node');
const compareExecutionOrderDescending = (left, right) => {
  const leftY = left.position?.y ?? 0;
  const rightY = right.position?.y ?? 0;
  const leftX = left.position?.x ?? 0;
  const rightX = right.position?.x ?? 0;

  if (leftY === rightY) {
    return rightX - leftX;
  }

  return rightY - leftY;
};

const findLastDecomposedTaskNodeHash = (nodes = [], edges = []) => {
  const taskNodes = nodes.filter(isTaskNode);
  const taskNodeIds = new Set(taskNodes.map(node => node.id));

  const decomposedParentIds = new Set();

  edges.forEach(edge => {
    if (edge.hidden || !taskNodeIds.has(edge.source) || !taskNodeIds.has(edge.target)) {
      return;
    }

    decomposedParentIds.add(edge.source);
  });

  const decomposedNodes = taskNodes.filter(node => decomposedParentIds.has(node.id));
  const candidates = decomposedNodes.length > 0 ? decomposedNodes : taskNodes;

  return [...candidates].sort(compareExecutionOrderDescending)[0]?.id ?? null;
};

const findLastLeafTaskNodeHash = (nodes = [], edges = [], rootHash = null) => {
  const taskNodes = nodes.filter(isTaskNode);
  const taskNodeMap = new Map(taskNodes.map(node => [node.id, node]));
  const taskNodeIds = new Set(taskNodeMap.keys());

  if (taskNodes.length === 0) {
    return null;
  }

  const childMap = new Map(taskNodes.map(node => [node.id, []]));
  edges.forEach(edge => {
    if (edge.hidden || !taskNodeIds.has(edge.source) || !taskNodeIds.has(edge.target)) {
      return;
    }

    childMap.get(edge.source).push(edge.target);
  });

  const candidateIds = new Set();
  const roots =
    rootHash && taskNodeMap.has(rootHash)
      ? [rootHash]
      : taskNodes.map(node => node.id);
  const stack = [...roots];
  const visited = new Set();

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (visited.has(nodeId) || !taskNodeMap.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    candidateIds.add(nodeId);
    childMap.get(nodeId).forEach(childId => stack.push(childId));
  }

  const candidates = [...candidateIds]
    .filter(nodeId => (childMap.get(nodeId) || []).length === 0)
    .map(nodeId => taskNodeMap.get(nodeId))
    .filter(Boolean);

  return [...candidates].sort(compareExecutionOrderDescending)[0]?.id ?? null;
};

const getChatbotAnchorHash = (message) => {
  if (!message) {
    return null;
  }

  if (message.type === 'ask_subtasks') {
    return message.task_hash || message.text?.task_hash || null;
  }

  if (message.type === 'confirm_best_match_decomposition') {
    return message.text?.head?.hash || null;
  }

  if (message.type === 'task_completed') {
    return message.task_hash || message.text?.task_hash || null;
  }

  return null;
};

function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 50, y: 50 });
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const shiftedHeadHashRef = useRef(null);
  const shiftedNodeOriginalXRef = useRef(new Map());
  const lastDecomposedHeadHashRef = useRef(null);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const anchorHash = getChatbotAnchorHash(message);
    if (anchorHash) {
      const targetNode = findTaskNodeByHash(nodesRef.current, anchorHash);

      if (targetNode) {
        const nextPosition = {
          x: targetNode.position.x + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_X,
          y: targetNode.position.y + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_Y
        };

        setChatbotPosition(prev =>
          prev.x === nextPosition.x && prev.y === nextPosition.y ? prev : nextPosition
        );
      }
    }
  }, [message, nodes, edges]);

  useEffect(() => {
    socket.on('message', (data) => {
      if (data?.type === 'confirm_best_match_decomposition') {
        lastDecomposedHeadHashRef.current = data.text?.head?.hash || null;
      }

      if (data?.type === 'task_completed' && !data.task_hash && !data.text?.task_hash) {
        const lastDecomposedHeadHash = lastDecomposedHeadHashRef.current;
        const fallbackHash =
          findLastLeafTaskNodeHash(
            nodesRef.current,
            edgesRef.current,
            lastDecomposedHeadHash
          ) ||
          findLastDecomposedTaskNodeHash(nodesRef.current, edgesRef.current);

        setMessage({
          ...data,
          task_hash: fallbackHash,
        });
        return;
      }

      setMessage(data);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  useEffect(() => {
    const nextHeadHash = showChatbot ? getChatbotAnchorHash(message) : null;

    setNodes(prevNodes => {
      let changed = false;
      let nextNodes = prevNodes;
      let activeHeadHash = shiftedHeadHashRef.current;
      let shiftedNodeOriginalX = shiftedNodeOriginalXRef.current;

      if (activeHeadHash && activeHeadHash !== nextHeadHash && shiftedNodeOriginalX.size > 0) {
        nextNodes = nextNodes.map(node => {
          if (!shiftedNodeOriginalX.has(node.id)) {
            return node;
          }

          const originalX = shiftedNodeOriginalX.get(node.id);
          if (node.position.x === originalX) {
            return node;
          }

          changed = true;
          return {
            ...node,
            position: {
              ...node.position,
              x: originalX,
            },
          };
        });

        shiftedNodeOriginalX = new Map();
        activeHeadHash = null;
      }

      if (showChatbot && nextHeadHash) {
        const targetNode = findTaskNodeByHash(nextNodes, nextHeadHash);
        if (!targetNode) {
          shiftedHeadHashRef.current = activeHeadHash;
          shiftedNodeOriginalXRef.current = shiftedNodeOriginalX;
          return changed ? nextNodes : prevNodes;
        }

        const shiftThresholdX = targetNode.position.x;
        const nextShiftedNodeOriginalX =
          activeHeadHash === nextHeadHash ? new Map(shiftedNodeOriginalX) : new Map();

        nextNodes = nextNodes.map(node => {
          if (node.id === 'chatbot-node' || node.position.x <= shiftThresholdX) {
            return node;
          }

          if (nextShiftedNodeOriginalX.has(node.id)) {
            return node;
          }

          nextShiftedNodeOriginalX.set(node.id, node.position.x);
          changed = true;

          return {
            ...node,
            position: {
              ...node.position,
              x: node.position.x + POSITION_CONSTANTS.CHATBOT_VISIBLE_SHIFT_X,
            },
          };
        });

        shiftedHeadHashRef.current = nextShiftedNodeOriginalX.size > 0 ? nextHeadHash : null;
        shiftedNodeOriginalXRef.current = nextShiftedNodeOriginalX;
      } else {
        shiftedHeadHashRef.current = activeHeadHash;
        shiftedNodeOriginalXRef.current = shiftedNodeOriginalX;
      }

      return changed ? nextNodes : prevNodes;
    });
  }, [showChatbot, message, nodes]);

  useEffect(() => {
    if (!message) return;

    const messageType = message.type;
    const showChatbotTypes = [
      'confirm_best_match_decomposition',
      'display_thinking_analysis',
      'ask_subtasks',
      'segment_confirmation',
      'confirm_task_decomposition',
      'display_decomposition_analysis',
      'display_method_creation',
      'display_edit_options',
      'ask_rephrase',
      'display_known_tasks',
      'task_completed'
    ];

    if (showChatbotTypes.includes(messageType)) {
      setShowChatbot(true);
    } else if (messageType === 'request_user_task') {
      setShowChatbot(false);
      setNodes([]);
      setEdges([]);
      shiftedHeadHashRef.current = null;
      shiftedNodeOriginalXRef.current = new Map();
      lastDecomposedHeadHashRef.current = null;
    }
  }, [message]);

  const handleConfirm = () => {
    setMessage(null);
  };

  useEffect(() => {
    if (showChatbot) {
      const anchorHash = getChatbotAnchorHash(message);

      setEdges(prev => {
        const withoutChatbotEdges = removeChatbotEdges(prev);

        if (message?.type !== 'task_completed' || !anchorHash) {
          return withoutChatbotEdges;
        }

        return [
          ...withoutChatbotEdges,
          {
            id: `e-${anchorHash}-chatbot-task-completed`,
            source: anchorHash,
            target: 'chatbot-node',
            markerEnd: {
              type: MarkerType.Arrow,
              strokeWidth: 2,
              color: 'rgb(132, 171, 249)',
            },
            style: {
              strokeWidth: 2,
              stroke: 'rgb(132, 171, 249)',
            },
          },
        ];
      });

      setNodes(prevNodes => {
        const otherNodes = prevNodes.filter(node => node.id !== 'chatbot-node');

        return [
          ...otherNodes,
          {
            id: 'chatbot-node',
            type: 'chatbot',
            position: {
              x: chatbotPosition.x + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_X,
              y: chatbotPosition.y + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_Y,
            },
            data: { socket, message },
            draggable: false,
            selectable: false,
            sourcePosition: 'right',
            targetPosition: 'left',
          }
        ];
      });
    }
  }, [showChatbot, message, chatbotPosition]);

  useEffect(() => {
    if (!showChatbot) {
      setEdges(prev => removeChatbotEdges(prev));
      setNodes(prev => prev.filter(node => node.id !== 'chatbot-node'));
    }
  }, [showChatbot]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      {message?.type === 'request_user_task' ? (
        <RequestUserTask data={message.text} />
      ) : (
        <>
          <Display
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
          />

          {message?.type === 'confirm_best_match_decomposition' && (
            <ConfirmBestMatchDecomposition
              data={message.text}
              onConfirm={handleConfirm}
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              socket={socket}
              readOnly={false}
            />
          )}

          {message?.type === 'display_added_method' && (
            <DisplayAddedMethod
              data={message.text}
              onConfirm={handleConfirm}
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              socket={socket}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;

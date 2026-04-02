import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import Display from './Display';
import DisplayAddedMethod from './DisplayAddedMethod';
import './App.css';

const socket = io('http://localhost:4002', {
  transports: ['websocket', 'polling']
});

const POSITION_CONSTANTS = {
  PARENT_TO_CHATBOT_OFFSET_X: 50,
  PARENT_TO_CHATBOT_OFFSET_Y: 0,
  CHATBOT_NODE_OFFSET_X: 150,
  CHATBOT_NODE_OFFSET_Y: -200,
  CHATBOT_VISIBLE_SHIFT_X: 400,
};

const findTaskNodeByHash = (nodes, taskHash) => nodes.find(node => node.id === taskHash);
const removeChatbotEdges = (edges) =>
  edges.filter(edge => edge.source !== 'chatbot-node' && edge.target !== 'chatbot-node');

function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 50, y: 50 });
  const nodesRef = useRef([]);
  const positionedHeadHashRef = useRef(null);
  const shiftedHeadHashesRef = useRef(new Set());
  const movedNodesRef = useRef(new Map());

  useEffect(() => {
    nodesRef.current = nodes;

    if (message?.type === 'confirm_best_match_decomposition' && message?.text?.head?.hash) {
      const headHash = message.text.head.hash;
      const targetNode = findTaskNodeByHash(nodesRef.current, headHash);

      if (targetNode) {
        const nextPosition = {
          x: targetNode.position.x + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_X,
          y: targetNode.position.y + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_Y
        };

        setChatbotPosition(prev =>
          prev.x === nextPosition.x && prev.y === nextPosition.y ? prev : nextPosition
        );
        positionedHeadHashRef.current = headHash;
      }
    }
  }, [message, nodes]);

  useEffect(() => {
    socket.on('message', (data) => {
      setMessage(data);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  useEffect(() => {
    if (showChatbot) {
      const headHash =
        message?.type === 'confirm_best_match_decomposition' ? message?.text?.head?.hash : null;
      const shouldShiftRight =
        !!headHash &&
        positionedHeadHashRef.current === headHash &&
        !shiftedHeadHashesRef.current.has(headHash);

      if (shouldShiftRight) {
        shiftedHeadHashesRef.current.add(headHash);

        setNodes(prevNodes =>
          prevNodes.map(node => {
            if (node.position.x > chatbotPosition.x - 50 && node.id !== 'chatbot-node') {
              if (!movedNodesRef.current.has(node.id)) {
                movedNodesRef.current.set(node.id, node.position.x);
              }

              return {
                ...node,
                position: {
                  ...node.position,
                  x: node.position.x + POSITION_CONSTANTS.CHATBOT_VISIBLE_SHIFT_X,
                },
              };
            }

            return node;
          })
        );
      }
    } else {
      const restoredNodes = nodes.map(node => {
        if (movedNodesRef.current.has(node.id)) {
          const originalX = movedNodesRef.current.get(node.id);
          return {
            ...node,
            position: {
              ...node.position,
              x: originalX,
            },
          };
        }

        return node;
      });

      setNodes(restoredNodes);

      setTimeout(() => {
        movedNodesRef.current.clear();
      }, 0);
    }
  }, [showChatbot, chatbotPosition, message]);

  useEffect(() => {
    if (!message) return;

    const messageType = message.type;
    const showChatbotTypes = [
      'confirm_best_match_decomposition',
      'display_thinking_analysis',
      'show_thinking_analysis_and_decomposition',
      'ask_subtasks',
      'segment_confirmation',
      'confirm_task_decomposition',
      'display_decomposition_analysis',
      'display_method_creation',
      'display_edit_options',
      'ask_rephrase',
      'display_known_tasks'
    ];

    if (showChatbotTypes.includes(messageType)) {
      setShowChatbot(true);
    } else if (messageType === 'request_user_task') {
      setShowChatbot(false);
      setNodes([]);
      setEdges([]);
      movedNodesRef.current.clear();
      shiftedHeadHashesRef.current.clear();
      positionedHeadHashRef.current = null;
    }
  }, [message]);

  const handleConfirm = () => {
    setMessage(null);
  };

  useEffect(() => {
    if (showChatbot) {
      setEdges(prev => removeChatbotEdges(prev));

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

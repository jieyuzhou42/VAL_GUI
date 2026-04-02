import { useEffect,useState,useRef } from "react";
import '@xyflow/react/dist/style.css';
import { MarkerType, SimpleBezierEdge } from '@xyflow/react';

const currentNodeColor = 'rgb(205, 221, 249)';
const currentEdgeColor = 'rgb(132, 171, 249)';
const nextNodeColor = 'rgb(222, 222, 222)';

// Use same constants as confirm_best_match_decomposition
const SUBTASK_CONSTANTS = {
  YESNODE_OFFSET_X: 500,        // Must match confirm_best_match_decomposition
  YESNODE_OFFSET_Y: 0,
  YESNODE_TO_SUBTASK_X: 150,
  SUBTASK_VERTICAL_SPACING: 150, // Must match confirm_best_match_decomposition
};

const LAYOUT_CONSTANTS = {
  YESNODE_OFFSET_X: 250,
  YESNODE_OFFSET_Y: 0,
  YESNODE_TO_SUBTASK_X: 110,
  SUBTASK_VERTICAL_SPACING: 135,
  CHATBOT_COLLAPSE_X: 150,
  SIBLING_CLEARANCE_Y: 36,
  LEVEL_GAP_X: 360,
};

const TASK_NODE_STYLE = {
  border: 'none',
  width: 170,
  minWidth: 170,
  height: 40,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '0 12px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const getTaskNodeStyle = (background, extra = {}) => ({
  ...TASK_NODE_STYLE,
  background,
  ...extra,
});

const getChildY = (parentY, index, total, spacing = LAYOUT_CONSTANTS.SUBTASK_VERTICAL_SPACING) => {
  if (total <= 1) return parentY;
  const startY = parentY - ((total - 1) * spacing) / 2;
  return startY + index * spacing;
};

const getNextColumnX = (parentX) => parentX + LAYOUT_CONSTANTS.LEVEL_GAP_X;
const findTaskNodeByHash = (nodes, taskHash) => nodes.find(node => node.id === taskHash);

const findDescendantIds = (startIds, edges) => {
  const descendants = new Set();
  const stack = [...startIds];

  while (stack.length > 0) {
    const current = stack.pop();
    edges.forEach(edge => {
      if (edge.source === current && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        stack.push(edge.target);
      }
    });
  }

  return descendants;
};

const collectShiftNodeIds = (rootIds, edges, nodes) => {
  const ids = new Set([...rootIds, ...findDescendantIds(rootIds, edges)]);
  const controlSuffixes = ['-edit', '-trash', '-add', '-confirm'];
  const taskIds = [...ids];

  taskIds.forEach(id => {
    controlSuffixes.forEach(suffix => {
      const controlId = `${id}${suffix}`;
      if (nodes.some(node => node.id === controlId)) {
        ids.add(controlId);
      }
    });
  });

  return ids;
};

const getSiblingShiftGroups = (parentNode, edges, nodes, childCount) => {
  const incomingEdge = edges.find(edge => edge.target === parentNode.id);
  if (!incomingEdge || childCount <= 1) {
    return { shiftAmount: 0, upwardIds: new Set(), downwardIds: new Set() };
  }

  const shiftAmount =
    Math.ceil(((childCount - 1) * LAYOUT_CONSTANTS.SUBTASK_VERTICAL_SPACING) / 2) +
    LAYOUT_CONSTANTS.SIBLING_CLEARANCE_Y;
  const upwardIds = new Set();
  const downwardIds = new Set();

  edges
    .filter(edge => edge.source === incomingEdge.source)
    .map(edge => edge.target)
    .filter(targetId => targetId !== parentNode.id)
    .forEach(targetId => {
      const siblingNode = nodes.find(node => node.id === targetId);
      if (!siblingNode) return;

      const subtreeIds = collectShiftNodeIds([targetId], edges, nodes);
      const bucket = siblingNode.position.y < parentNode.position.y ? upwardIds : downwardIds;
      subtreeIds.forEach(id => bucket.add(id));
    });

  return { shiftAmount, upwardIds, downwardIds };
};


function DisplayAddedMethod({ data, socket, onConfirm, nodes, edges, setNodes, setEdges}) {
    useEffect(() => {
      
      let parentNode = findTaskNodeByHash(nodes, data.head.hash);
  
      if (!parentNode) {
        // If node is empty, create the parent node
        parentNode = {
          id: data.head.hash,
          position: { x: 0, y: 0 },
          data: { label: `${data.head.name} ${data.head.V}` },
          style: getTaskNodeStyle(currentNodeColor),
          sourcePosition: 'right',
          targetPosition: 'left',
        };
  
        setNodes(prev => [...prev, parentNode]);
      } else {
        // NO LONGER HIDING NODES OR CHANGING COLORS
        // We want to show all approved decomposition trees
      }
  
      // if there is no subtask just update the highlighted path and return
      if (data.subtasks.length === 0) {
        socket.emit("message", { type: 'response_decomposition', response: 0 });
        return;
      }
  
      // User already approved via chatbot, so we don't need approve button
      // Just proceed to showing subtasks directly connected to parent
  
      const newNodes = [];
      const newEdges = [];
      const siblingShift = getSiblingShiftGroups(
        parentNode,
        edges,
        nodes,
        data.subtasks[0]?.length || 0
      );
      
      // Check which subtasks already exist (created by handleConfirm)
      const existingNodeIds = new Set(nodes.map(n => n.id));
  
      // Create child nodes for each subtask (only if they don't already exist)
      data.subtasks[0].forEach((task, subIndex) => {
        if (existingNodeIds.has(task.hash)) {
          return; // Skip creating this node
        }
        
        const taskNode = {
          id: task.hash,
          position: { 
            x: getNextColumnX(parentNode.position.x),
            y: getChildY(parentNode.position.y, subIndex, data.subtasks[0].length)
          },
          data: { 
            label: `${task.task_name} ${task.args}`,
            task_name: task.task_name,
            args: task.args,
            hash: task.hash
          },
          _style: getTaskNodeStyle(currentNodeColor),
          get style() {
            return this._style;
          },
          set style(value) {
            this._style = value;
          },
          sourcePosition: 'right',
          targetPosition: 'left',
        };
  
        newNodes.push(taskNode);
  
  
        newEdges.push({
          id: `e-${parentNode.id}-${taskNode.id}`,
          source: parentNode.id,
          target: `${taskNode.id}`,
          markerEnd: {
            type: MarkerType.Arrow,
            strokeWidth: 2,
            color: currentEdgeColor,
          },
          style: {
            strokeWidth: 2,
            stroke: currentEdgeColor,
          },
        });
      });
      
  
    // Only add nodes that don't already exist
    if (newNodes.length > 0) {
      setNodes(prev => {
        const shiftedPrev = prev.map(node => {
          if (siblingShift.upwardIds.has(node.id)) {
            return {
              ...node,
              position: {
                ...node.position,
                y: node.position.y - siblingShift.shiftAmount,
              },
            };
          }

          if (siblingShift.downwardIds.has(node.id)) {
            return {
              ...node,
              position: {
                ...node.position,
                y: node.position.y + siblingShift.shiftAmount,
              },
            };
          }

          return node;
        });

        return [...shiftedPrev, ...newNodes];
      });
    }
    
    // Filter out duplicate edges before adding
    setEdges(prev => {
      const existingEdgeIds = new Set(prev.map(e => e.id));
      const uniqueNewEdges = newEdges.filter(e => !existingEdgeIds.has(e.id));
      return [...prev, ...uniqueNewEdges];
    });
    
    // NOTE: Parent → placeholder edge is already created by handleConfirm replacement logic
    // No need to create it again here
    
    // User already approved via chatbot, automatically send response to backend
    // to continue the flow
    socket.emit("message", { type: 'response_decomposition', response: 0 });
    }, [data]);

    const updateNodesAndEdges = () => {
      setNodes(prevNodes => prevNodes.filter(node => node.id !== 'noNode' && node.id !== 'add method'));
  
      setEdges(prevEdges => {
        const newEdges = [];
        const updatedEdges = prevEdges.map(edge => {
          if (edge.source.includes('unhide')) {
            const parentNodeId = edge.id.split('-')[1];
            const newEdgeId = `e-${parentNodeId}-${edge.target}`;
    
            // Add new edge to the parent node
            if (!prevEdges.some(e => e.id === newEdgeId)) {
              newEdges.push({ 
                ...edge, 
                id: newEdgeId,
                source: parentNodeId,  
                hidden: false,
              });
            }
  
            // Hide the edges that are connected to the unhide node
            return { ...edge, hidden: true };
          } 
          return {...edge};
        });
    
    
        return [...updatedEdges, ...newEdges];
      });
    };
    
  
    // every confirsmation step has confirm, more options, add method and edit as options
    const handleConfirm = (yesNode, index, parentNode) => {
      socket.emit("message", { type: 'response_decomposition', response: index });
    
      let nodesToKeep = new Set();
      let nodesToRemove = new Set();
      let yesNodeIdsToRemove = [];
      const offsetY = index > 0
        ? (index - 1) * (LAYOUT_CONSTANTS.SUBTASK_VERTICAL_SPACING + LAYOUT_CONSTANTS.SIBLING_CLEARANCE_Y)
        : 0;
      const directTaskNodeIds = edges
      .filter(edge => edge.source === yesNode.id)
      .map(edge => edge.target);
      const shiftedSubtreeNodeIds = new Set([
        ...directTaskNodeIds,
        ...findDescendantIds(directTaskNodeIds, edges),
      ]);
    
  
      setEdges(prevEdges => {
        // Find all yesNodes connected to this parent
        const yesNodeEdges = prevEdges.filter(edge => edge.source === parentNode.id);
        const allYesNodeIds = yesNodeEdges.map(edge => edge.target);
        
    
        // Mark yesNodes other than the confirmed one for removal
        yesNodeIdsToRemove = allYesNodeIds.filter(id => id !== yesNode.id);
    
        yesNodeIdsToRemove.forEach(id => {
          nodesToRemove.add(id);
          // Mark all nodes connected to rejected yesNodes for removal
          prevEdges.forEach(edge => {
            if (edge.source === id || edge.target === id) {
              if (edge.source !== parentNode.id) nodesToRemove.add(edge.source);
              if (edge.target !== parentNode.id) nodesToRemove.add(edge.target);
            }
          });
        });
    
        // Hide the edge connected to the confirmed yesNode
        const updatedEdges = prevEdges.map(edge => {
          if (edge.target === yesNode.id) {
            return { ...edge, hidden: true };
          }
          return edge;
        });
    
        // Remove all edges connected to rejected yesNodes or their children
        return updatedEdges.filter(edge =>
          !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)
        );
      });
    
      setNodes(prevNodes => {
      
  
      return prevNodes.map(node => {
        
        if (node.id === yesNode.id) {
          return {
            ...node,
            hidden: true,
            position: {
              ...node.position,
              y: node.position.y - offsetY
            },
            data: {
              ...node.data,
              label: '···',
              onClick: () => handleUnhide(yesNode),
            }
          };
        } else if (nodesToRemove.has(node.id)) {
          return null;
        } else if (shiftedSubtreeNodeIds.has(node.id)) {
          return {
            ...node,
            position: {
              ...node.position,
              y: node.position.y - offsetY
            }
          };
        }
        return node;
      }).filter(Boolean);
    });
    
      updateNodesAndEdges();
      onConfirm();
    };

    const handleUnhide = (yesNode) => {
  
      let edgesToUnhide = [];
      let nodesToUnhide = [];
      const parentNodeId = yesNode.id.split('-')[0];
  
      setEdges(prevEdges => {
        edgesToUnhide = prevEdges.filter(edge => edge.source === yesNode.id || edge.target === yesNode.id);
        nodesToUnhide = edgesToUnhide.map(edge => edge.target);
  
        const updatedEdges = prevEdges.map(edge => {
          if (edgesToUnhide.includes(edge)) {
            return { ...edge, hidden: false };
          } else if (edge.source === parentNodeId) {
            return { ...edge, hidden: true };
          }
          return edge;
        });
        return updatedEdges;
      });
  
      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => {
          if (node.id === yesNode.id) {
            return {
              ...node,
              style: {
                ...node.style,
                background: nextNodeColor,
                border: 'none',
              },
              data: {
                ...node.data,
                onClick: () => handleHide(yesNode),
              }
            };
          } else if (nodesToUnhide.includes(node.id)) {
            return { ...node, hidden: false };
          } 
          return node;
        });
  
        return updatedNodes
      });
    };
  
    const handleHide = (yesNode) => {
  
      let edgesToHide = [];
      let nodesToHide = [];
  
      // Hide the edges that are connected to the yes node
      setEdges(prevEdges => {
        edgesToHide = prevEdges.filter(edge => edge.source === yesNode.id || edge.target === yesNode.id);
        nodesToHide = edgesToHide.map(edge => edge.target);
  
        return prevEdges.map(edge => {
          if (edgesToHide.includes(edge)) {
            return { ...edge, hidden: true };
          }
          return edge;
        }
        );
      }
      );
  
      // Hide the nodes that are connected to the yes node
      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => {
          if (node.id === yesNode.id) {
            return {
              ...node,
              style: {
                ...node.style,
                background: 'none',
                border: 'none',
              },
              data: {
                ...node.data,
                onClick: () => handleUnhide(yesNode),
              }
            };
          } else if (nodesToHide.includes(node.id)) {
            return { ...node, hidden: true };
          }
          return node;
        });
        return updatedNodes;
      });
    };
}

export default DisplayAddedMethod;

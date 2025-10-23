import { useEffect,useState,useRef } from "react";
import '@xyflow/react/dist/style.css';
import { MarkerType, SimpleBezierEdge } from '@xyflow/react';


const currentNodeColor = 'rgb(205, 221, 249)';
const currentEdgeColor = 'rgb(132, 171, 249)';
const nextNodeColor = 'rgb(222, 222, 222)';
const moreNodeColor = 'rgb(236, 243 ,254)';

//utility 
function findAllAncestors(nodeId, edges) {
  const ancestors = new Set();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const edge of edges) {
      if (edge.target === current && !ancestors.has(edge.source)) {
        ancestors.add(edge.source);
        stack.push(edge.source);
      }
    }
  }
  return ancestors;
}

function ConfirmBestMatchDecomposition({ data, socket, onConfirm,
        nodes, edges, setNodes, setEdges, readOnly = false }) {
  // console.log("nodes in ConfirmDecomp:", nodes);
  // console.log('edges in ConfirmDecomp:', edges);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0); // Track selected method
  const [isEditMode, setIsEditMode] = useState(false); // Track if in edit mode
  const edgesRef = useRef(edges);
  const nodesRef = useRef([]);

useEffect(() => {
  edgesRef.current = edges;
}, [edges]);

useEffect(() => {
  nodesRef.current = nodes;
}, [nodes]);

// Listen for create method event from chatbot
useEffect(() => {
  const handleCreateMethodFromChatbot = (event) => {
    console.log('Received start_gui_create_method event from chatbot');
    const parentNode = nodes.find(n => n.id.includes(data.head.hash));
    if (!parentNode) {
      console.warn('Parent node not found for creating new method');
      return;
    }
    
    // Create a new editable node at the position where subtasks would be
    const newTaskId = `${data.head.hash}-new-${Date.now()}`;
    const dropdownOptions1 = data.available_actions || [];
    const dropdownOptions2 = data.env_objects || [];
    const defaultTaskName = (dropdownOptions1 && dropdownOptions1[0]) || '';
    const defaultArg = '';
    
    const newNode = {
      id: newTaskId,
      position: {
        x: parentNode.position.x + 300,
        y: parentNode.position.y
      },
      data: {
        label: (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <select
              defaultValue={defaultTaskName}
              onChange={(e) => handleNodeEditChange(e, newTaskId, 'dropdown1')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              {dropdownOptions1.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              defaultValue={defaultArg}
              onChange={(e) => handleNodeEditChange(e, newTaskId, 'dropdown2')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              <option value="">No object</option>
              {dropdownOptions2.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ),
        task_name: defaultTaskName,
        args: defaultArg === "" ? [] : [defaultArg],
        dropdown1: defaultTaskName,
        dropdown2: defaultArg
      },
      style: { background: currentNodeColor, border: 'none' },
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    
    // Add confirm button
    const confirmButtonNode = {
      id: `${newTaskId}-confirm`,
      position: {
        x: newNode.position.x + 130,
        y: newNode.position.y + 30,
      },
      data: {
        label: '✓',
        onClick: () => handleConfirmEdit(newTaskId),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    // Add trash button
    const trashButtonNode = {
      id: `${newTaskId}-trash`,
      position: {
        x: newNode.position.x + 155,
        y: newNode.position.y + 30,
      },
      data: {
        label: '🗑',
        onClick: () => handleTrashClick(newTaskId),
      },
    style: { 
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    // Add + button for adding more nodes
    const addButtonNode = {
      id: `${newTaskId}-add`,
        position: { 
        x: newNode.position.x + 180,
        y: newNode.position.y + 30,
        },
        data: { 
        label: '+',
        onClick: () => handleAddNode({ hash: newTaskId }),
        },
        style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    setNodes(prev => [...prev, newNode, confirmButtonNode, trashButtonNode, addButtonNode]);
    
    // Add edge from parent to new node
    setEdges(prev => [...prev, {
      id: `e-${parentNode.id}-${newTaskId}`,
        source: parentNode.id,
      target: newTaskId,
        markerEnd: {
          type: MarkerType.Arrow,
          strokeWidth: 2,
        color: currentEdgeColor
        },
        style: {
          strokeWidth: 2,
        stroke: currentEdgeColor
      },
    }]);
  };
  
  window.addEventListener('start_gui_create_method', handleCreateMethodFromChatbot);
  
  return () => {
    window.removeEventListener('start_gui_create_method', handleCreateMethodFromChatbot);
  };
}, [nodes, data, setNodes, setEdges]);


  useEffect(() => {
    let parentNode = nodes.find(n => n.id.includes(data.head.hash));

    if (!parentNode) {
      // If node is empty, create the parent node
      // console.log("No parent node found. Creating parent node.");
      parentNode = {
        id: data.head.hash,
        position: { x: 0, y: 0 },
        data: { label: `${data.head.name} ${data.head.V}` },
        style: { 
          border: 'none',
          background: currentNodeColor,
        },
        sourcePosition: 'right',
        targetPosition: 'left',
      };

      setNodes(prev => [...prev, parentNode]);
    } else {
      // console.log("Parent node found:", parentNode);
      const parentNodeId = parentNode.id;

      // hide the nodes that are not connected to the parent node
      setNodes(prevNodes => prevNodes.map(node => {
        if (node.position.x >= (parentNode.position.x + 200)) {
          // Don't auto-unhide approve buttons - they should only appear in "More Options" mode
          if (node.id.includes('unhide')) {
            return { ...node, hidden: true }; // Keep approve buttons hidden by default
          }
          return { ...node, hidden: true };
        }
        if (edges.some(edge => edge.source === parentNodeId && edge.target === node.id)) {
          return node;
        }
        return node;
      }));

      // hide the edges that are not connected to the parent node
      setEdges(prevEdges => prevEdges.filter(edge => edge.source !== parentNode.id));
    }

    ///////set the nodes and edges color//////////

    // utils: find the ancestor nodes, instead of just parent node
    const ancestorIds = findAllAncestors(parentNode.id, edgesRef.current);
    ancestorIds.add(parentNode.id);

    // set the nodes color
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id.includes('unhide')) {
        // Hide all approve buttons by default (only show in More Options mode)
        return {
          ...node,
          hidden: true,
          style: {
            ...node.style,
            background: 'none',
            border: 'none',
          }
        };
      } else if (ancestorIds.has(node.id)) {
        // for the nodes with id data.head.hash, make the background color blue
        return {
          ...node,
          style: {
            ...node.style,
            background: currentNodeColor,
            border: 'none',
          }
        };
      } else if (!node.id.includes('unhide')) {
        // for the next nodes, make the background color gray
        return {
          ...node,
          style: {
            ...node.style,
            background: nextNodeColor,
          }
        }
      } else {
        return node;
      }
    }));

    // set the edges color
    setEdges(prevEdges => prevEdges.map(edge => {
      if (ancestorIds.has(edge.source) && ancestorIds.has(edge.target)) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: currentEdgeColor,
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.Arrow,
            strokeWidth: 2,
            color: currentEdgeColor,
          },
        };
      } else {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: nextNodeColor,
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.Arrow,
            strokeWidth: 2,
            color: nextNodeColor,
          },
        };
      }
    }));

    // if there is no subtask just update the highlighted path and return
    if (data.subtasks.length === 0) {
      if (!readOnly) {
        socket.emit("message", {type: 'response_decomposition_with_edit', response: {user_choice: 'add_method'}});
        console.log("User confirmed decomposition with no subtask");
        onConfirm(null);
      }
      return;
    }

    // No approve/reject buttons in GUI anymore - all handled by chatbot
    // yesNode position should align with chatbot-placeholder position for consistency
    // placeholder.x = chatbotPosition.x + 100 = (parent.x + 200) + 100 = parent.x + 300
    const yesNode = {
      id: `${data.head.hash}-unhide-0`,
      position: { 
        x: parentNode.position.x + 300, // Align with placeholder position
        y: parentNode.position.y + 3.5
      }
    };

    const newNodes = [];
    const newEdges = [];

    // Create child nodes for each subtask
    data.subtasks[0].forEach((task, subIndex) => {
      const taskNode = {
        id: task.hash,
        position: { 
          x: yesNode.position.x + 450, // Increased to 450 for better spacing from chatbot
          y: parentNode.position.y + subIndex * 50 // Vertical spacing between subtasks, aligned with parent
        },
        data: { 
          label: `${task.task_name} ${task.args}`,
          task_name: task.task_name,
          args: task.args,
          hash: task.hash
        },
        // debugging
        // data: {label: `${task.hash}-${task.task_name}`},
        _style: {
          background: currentNodeColor,
          border: 'none',
        },
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

      // Check if chatbot or placeholder node exists to determine edge routing
      const chatbotNode = nodes.find(n => n.id === 'chatbot-node');
      const placeholderNode = nodes.find(n => n.id === 'chatbot-placeholder');
      
      if (chatbotNode) {
        // If chatbot exists, connect from chatbot to subtasks
      newEdges.push({
          id: `e-chatbot-${taskNode.id}`,
          source: 'chatbot-node',
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
      } else if (placeholderNode) {
        // If placeholder exists, connect from placeholder to subtasks
        newEdges.push({
          id: `e-placeholder-${taskNode.id}`,
          source: 'chatbot-placeholder',
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
      } else {
        // No chatbot or placeholder: connect directly from parent to subtasks
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
      }

      // if (subIndex === 0) {
      // Add edit button next to the task node
      const editButtonNode = {
        id: `${task.hash}-edit`,
        position: {
          x: taskNode.position.x + 155, // Position next to the task node
          y: taskNode.position.y,
        },
        data: {
          label: '✎',
          onClick: () => handleEditClick(task),
        },
        style: {
          // background: '#FFFFFF',
          background: 'none',
          width: '20px',
          height: '20px',
          borderRadius: 'none',
          border: '1px solid black',
          fontSize: '10px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      };

      newNodes.push(editButtonNode);
      // }
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);
  
  // Effect 1.5: Add edge from parent to chatbot or placeholder when they appear
  useEffect(() => {
    const chatbotNode = nodes.find(n => n.id === 'chatbot-node');
    const placeholderNode = nodes.find(n => n.id === 'chatbot-placeholder');
    const parentNode = nodes.find(n => n.id.includes(data.head.hash));
    
    if (parentNode) {
      if (chatbotNode) {
        const edgeId = `e-${parentNode.id}-chatbot`;
        const edgeExists = edges.some(e => e.id === edgeId);
        
        if (!edgeExists) {
          setEdges(prev => [...prev, {
            id: edgeId,
            source: parentNode.id,
            target: 'chatbot-node',
            markerEnd: {
              type: MarkerType.Arrow,
              strokeWidth: 2,
              color: currentEdgeColor,
            },
            style: {
              strokeWidth: 2,
              stroke: currentEdgeColor,
            },
          }]);
        }
      } else if (placeholderNode) {
        const edgeId = `e-${parentNode.id}-placeholder`;
        const edgeExists = edges.some(e => e.id === edgeId);
        
        if (!edgeExists) {
          setEdges(prev => [...prev, {
            id: edgeId,
            source: parentNode.id,
            target: 'chatbot-placeholder',
            markerEnd: {
              type: MarkerType.Arrow,
              strokeWidth: 2,
              color: currentEdgeColor,
            },
            style: {
              strokeWidth: 2,
              stroke: currentEdgeColor,
            },
          }]);
        }
      }
    }
  }, [nodes.find(n => n.id === 'chatbot-node'), nodes.find(n => n.id === 'chatbot-placeholder')]); // Re-run when chatbot or placeholder appears
  
  // Effect 1.6: Listen for chatbot approve/reject and trigger handleConfirm
  useEffect(() => {
    const handleChatbotAction = (event) => {
      const { action, index } = event.detail;
      console.log('Chatbot action received:', action, 'index:', index);
      
      const parentNode = nodes.find(n => n.id.includes(data.head.hash));
      const yesNode = {
        id: `${data.head.hash}-unhide-0`,
        position: {
          x: parentNode?.position.x + 250 || 250,
          y: parentNode?.position.y + 3.5 || 3.5
        }
      };
      
      if (action === 'approve' && parentNode) {
        handleConfirm(yesNode, index || 0, parentNode);
      }
      // Reject is handled by chatbot directly (showing More Options, etc.)
    };
    
    const handleShowAllMethods = (event) => {
      console.log('Show all methods triggered');
      setShowAllOptions(true);
    };
    
    window.addEventListener('chatbot_decomposition_action', handleChatbotAction);
    window.addEventListener('chatbot_show_all_methods', handleShowAllMethods);
    
    return () => {
      window.removeEventListener('chatbot_decomposition_action', handleChatbotAction);
      window.removeEventListener('chatbot_show_all_methods', handleShowAllMethods);
    };
  }, [nodes, data, edges]);
  
  // Effect 2: render all method options when showAllOptions===true
  useEffect(() => {
    if (!showAllOptions) return;
    const parentNode = nodes.find(n => n.id === data.head.hash);
    if (!parentNode) return;
    
    console.log('Rendering all method options, total methods:', data.subtasks.length);
    
    // Find the chatbot-placeholder to align with it (same X as best match)
    const chatbotPlaceholder = nodes.find(n => n.id === 'chatbot-placeholder');
    const selectButtonX = chatbotPlaceholder ? chatbotPlaceholder.position.x : parentNode.position.x + 300;
    
    // Calculate the bottom Y position of best match subtasks
    const bestMatchSubtasks = data.subtasks[0] || [];
    const bestMatchBottomY = parentNode.position.y + (bestMatchSubtasks.length - 1) * 50;
    const startingYOffset = 100; // Gap between best match and first other method
    
    // Best match (index 0) already rendered, start from index 1
    data.subtasks.slice(1).forEach((option, idx) => {
      const realIdx = idx + 1; // Actual index in data.subtasks
      // Calculate Y position: below best match + spacing for previous other methods
      const previousMethodsHeight = idx > 0 ? data.subtasks.slice(1, realIdx - 1).reduce((sum, opt) => sum + opt.length * 50 + 50, 0) : 0;
      const baseY = bestMatchBottomY + startingYOffset + previousMethodsHeight;
      const selectNodeId = `${data.head.hash}-select-${realIdx}`;
      
      // Create Select button for this method
      const selectNode = {
        id: selectNodeId,
        position: {
          x: selectButtonX,
          y: baseY
        },
        data: { 
          label: realIdx === selectedMethodIndex ? "● Selected" : "○ Select",
          onClick: () => handleSelectMethod(realIdx, selectNode, parentNode)
        },
        style: { 
          background: realIdx === selectedMethodIndex ? '#4CAF50' : 'rgb(236, 243, 254)',
          width: '90px',
          height: '32px',
          borderRadius: '16px',
          border: 'none',
          fontSize: '10px',
          color: realIdx === selectedMethodIndex ? 'white' : '#333',
          fontWeight: realIdx === selectedMethodIndex ? 'bold' : 'normal',
        },
        sourcePosition: 'right', 
        targetPosition: 'left',
        hidden: false
      };
      
      if (!nodes.some(n => n.id === selectNodeId)) {
        setNodes(prev => [...prev, selectNode]);
      } else {
        // Update existing node
        setNodes(prev => prev.map(node => {
          if (node.id === selectNodeId) {
            return {
              ...node,
              data: {
                label: idx === selectedMethodIndex ? "● Selected" : "○ Select",
                onClick: () => handleSelectMethod(idx, selectNode, parentNode)
              },
              style: {
                ...node.style,
                background: idx === selectedMethodIndex ? '#4CAF50' : 'rgb(236, 243, 254)',
                color: idx === selectedMethodIndex ? 'white' : '#333',
                fontWeight: idx === selectedMethodIndex ? 'bold' : 'normal',
              }
            };
          }
          return node;
        }));
      }
      
      // Add edge from chatbot-placeholder (or parent) to select button
      const sourceNode = chatbotPlaceholder || parentNode;
      setEdges(prev => prev.some(e => e.id === `e-${sourceNode.id}-${selectNodeId}`)
        ? prev
        : [...prev, {
            id: `e-${sourceNode.id}-${selectNodeId}`,
            source: sourceNode.id,
            target: selectNodeId,
            markerEnd: {
              type: MarkerType.Arrow,
              strokeWidth: 2,
              color: currentEdgeColor
            },
            style: {
              strokeWidth: 2,
              stroke: currentEdgeColor
            }
          }]
      );
      
      // Render subtasks for this method
      option.forEach((task, i) => {
        const taskId = `${task.hash}-opt${realIdx}`;
        const taskNode = {
          id: taskId,
          position: {
            x: selectButtonX + 450, // Position subtasks same offset as best match (450 from select button)
            y: baseY + i * 50
          },
          data: { 
            label: `${task.task_name} ${task.args || ''}`,
            task_name: task.task_name,
            args: task.args,
            hash: task.hash
          },
          style: {
            background: realIdx === selectedMethodIndex ? currentNodeColor : nextNodeColor,
            border: 'none'
          },
          sourcePosition: 'right',
          targetPosition: 'left'
        };
        
        if (!nodes.some(n => n.id === taskId)) {
          setNodes(prev => [...prev, taskNode]);
        }
        
        setEdges(prev => prev.some(e => e.id === `e-${selectNodeId}-${taskId}`)
          ? prev
          : [...prev, {
              id: `e-${selectNodeId}-${taskId}`,
              source: selectNodeId,
              target: taskId,
              markerEnd: {
                type: MarkerType.Arrow,
                strokeWidth: 2,
                color: realIdx === selectedMethodIndex ? currentEdgeColor : nextNodeColor
              },
              style: {
                strokeWidth: 2,
                stroke: realIdx === selectedMethodIndex ? currentEdgeColor : nextNodeColor
              }
            }]
        );
      });
    });
    
    // Add "+ Create Method" button at the bottom of all options
    // Calculate Y position: below all other methods
    const totalOtherMethodsHeight = data.subtasks.slice(1).reduce((sum, opt, idx) => {
      return sum + opt.length * 50 + 50; // Each method's subtasks height + gap
    }, 0);
    const lastOptionY = bestMatchBottomY + startingYOffset + totalOtherMethodsHeight;
    
    const createMethodNode = {
      id: 'create-new-method',
      position: {
        x: selectButtonX,
        y: lastOptionY
      },
      data: {
        label: '+ Create Method',
        onClick: handleCreateNewMethod
      },
      style: {
        width: '120px',
        background: 'rgb(236, 243, 254)',
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    
    if (!nodes.some(n => n.id === 'create-new-method')) {
      setNodes(prev => [...prev, createMethodNode]);
    }
  }, [showAllOptions, selectedMethodIndex, data.subtasks]);

  // This function updates the nodes and edges when user confirms or rejects decomposition
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
  
  // Handle selecting a method
  const handleSelectMethod = (index, selectNode, parentNode) => {
    console.log('Method selected:', index);
    setSelectedMethodIndex(index);
    setIsEditMode(true);
    
    // Enable editing for the selected method's subtasks
    const selectedSubtasks = data.subtasks[index];
    selectedSubtasks.forEach((task, i) => {
      const taskId = `${task.hash}-opt${index}`;
      const taskNode = nodesRef.current.find(n => n.id === taskId);
      if (taskNode) {
        // Add edit button to each subtask
        handleEditClick({
          hash: taskId,
          task_name: task.task_name,
          args: task.args
        });
      }
    });
  };
  
  // Handle creating a new method
  const handleCreateNewMethod = () => {
    console.log('Create new method clicked');
    const parentNode = nodes.find(n => n.id.includes(data.head.hash));
    if (!parentNode) return;
    
    setSelectedMethodIndex(-1); // -1 indicates new method
    setIsEditMode(true);
    
    // Create a new editable node
    const newTaskId = `${data.head.hash}-new-${Date.now()}`;
    const dropdownOptions1 = data.available_actions || [];
    const dropdownOptions2 = data.env_objects || [];
    const defaultTaskName = (dropdownOptions1 && dropdownOptions1[0]) || '';
    const defaultArg = '';
    
    const newNode = {
      id: newTaskId,
      position: {
        x: parentNode.position.x + 400,
        y: parentNode.position.y + data.subtasks.length * 100
      },
      data: {
        label: (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <select
              defaultValue={defaultTaskName}
              onChange={(e) => handleNodeEditChange(e, newTaskId, 'dropdown1')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              {dropdownOptions1.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              defaultValue={defaultArg}
              onChange={(e) => handleNodeEditChange(e, newTaskId, 'dropdown2')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              <option value="">No object</option>
              {dropdownOptions2.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ),
        task_name: defaultTaskName,
        args: defaultArg === "" ? [] : [defaultArg],
        dropdown1: defaultTaskName,
        dropdown2: defaultArg
      },
      style: { background: currentNodeColor, border: 'none' },
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    
    // Add confirm, trash, and add buttons
    const confirmButtonNode = {
      id: `${newTaskId}-confirm`,
      position: {
        x: newNode.position.x + 130,
        y: newNode.position.y + 30,
      },
      data: {
        label: '✓',
        onClick: () => handleConfirmEdit(newTaskId),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    const trashButtonNode = {
      id: `${newTaskId}-trash`,
      position: {
        x: newNode.position.x + 155,
        y: newNode.position.y + 30,
      },
      data: {
        label: '🗑',
        onClick: () => handleTrashClick(newTaskId),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    const addButtonNode = {
      id: `${newTaskId}-add`,
      position: {
        x: newNode.position.x + 180,
        y: newNode.position.y + 30,
      },
      data: {
        label: '+',
        onClick: () => handleAddNode({ hash: newTaskId }),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    
    setNodes(prev => [...prev, newNode, confirmButtonNode, trashButtonNode, addButtonNode]);
    
    // Add edge from create-new-method button to new node
    setEdges(prev => [...prev, {
      id: `e-create-new-method-${newTaskId}`,
      source: 'create-new-method',
      target: newTaskId,
      markerEnd: {
        type: MarkerType.Arrow,
        strokeWidth: 2,
        color: currentEdgeColor
      },
      style: {
        strokeWidth: 2,
        stroke: currentEdgeColor
      },
    }]);
  };
  

  // every confirsmation step has confirm, more options, add method and edit as options
  const handleConfirm = (yesNode, index, parentNode) => {
    // Check if any subtasks have been edited
    const hasEditedSubtasks = data.subtasks[0].some(task => {
      const taskNode = nodesRef.current.find(node => node.id === task.hash);
      return taskNode && taskNode.data.isEdited === true;
    });

    // Also check if there are newly added subtasks in the UI
    const hasNewSubtasks = nodesRef.current.some(
      (node) => node.id.startsWith(`${data.head.hash}-new-`)
    );

    if (hasEditedSubtasks || hasNewSubtasks) {
      // If there are edits, call handleConfirmEdit for the first edited task
      // handleConfirmEdit will handle all edits
      const firstEditedTask = data.subtasks[0].find(task => {
        const taskNode = nodesRef.current.find(node => node.id === task.hash);
        return taskNode && taskNode.data.isEdited === true;
      });
      // If there is no edited original task, pick the first newly added one
      const firstNewTaskId = !firstEditedTask
        ? (nodesRef.current.find(n => n.id.startsWith(`${data.head.hash}-new-`))?.id)
        : undefined;
      
      if (firstEditedTask || firstNewTaskId) {
        handleConfirmEdit(firstEditedTask ? firstEditedTask.hash : firstNewTaskId);
        return; // Exit early, handleConfirmEdit will handle the rest
      }
    }

    // Original logic for no edits
    socket.emit("message", {type: 'response_decomposition_with_edit', 
                            response: {user_choice: 'approve', index: index}});
    console.log("User confirmed decomposition");

    let nodesToRemove = new Set();
    let yesNodeIdsToRemove = [];
    const currentEdges = edgesRef.current;
    const offsetY = index > 0 ? (index - 1) * 100 : 0;
    const directTaskNodeIds = currentEdges
    .filter(edge => edge.source === yesNode.id)
    .map(edge => edge.target);
  

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
  
      // Remove all edges connected to rejected yesNodes, their children, and chatbot
      return prevEdges.filter(edge =>
        !nodesToRemove.has(edge.source) && 
        !nodesToRemove.has(edge.target) &&
        edge.source !== 'chatbot-node' && // Remove edges from chatbot
        edge.target !== 'chatbot-node'   // Remove edges to chatbot
      );
    });
  
    setNodes(prevNodes => {
      return prevNodes
        .map(node => {
          if (nodesToRemove.has(node.id)) {
        return null;
      } else if (directTaskNodeIds.includes(node.id)) {
        return {
          ...node,
          position: {
            ...node.position,
            y: node.position.y - offsetY
          }
        };
      }
      return node;
    })
    .filter(Boolean)
        .filter(node => 
          !node.id.endsWith('-edit') && // Remove all edit buttons
          node.id !== 'chatbot-node' // Remove chatbot node
        );
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

  const handleRejectClick = (yesNode, parentNode, data) => {
    // Show noNode
    const noNode = {
      id: 'noNode',
      position: {
        x: yesNode.position.x - 15,
        y: yesNode.position.y + 40,
      },
      data: {
        label: 'More Options',
        onClick: () => handleMoreOptionsClick(yesNode),
      },
      style: {
        width: '100px',
        background: moreNodeColor,
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
      },
    };
  
    const addMethodNode = {
      id: 'add method',
      position: {
        x: yesNode.position.x - 15,
        y: yesNode.position.y + 80,
      },
      data: {
        label: '+ Create Method',
        onClick: handleAddMethod,
      },
      style: {
        width: '100px',
        background: moreNodeColor,
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
      },
    };
  
    setNodes(prev => [...prev, noNode, addMethodNode]);
  
    setNodes(prev => prev.filter(n => n.id !== 'reject'));
  };
  

  // when user clicks "more options" button, remove the subtask[0] related nodes
  const handleMoreOptionsClick = (yesNode) => {

      let edgesToRemove = [];
      let nodesToRemove = [];

      setEdges(prevEdges => {
        const updatedEdges = prevEdges.filter(edge => {
          const isFromOrToYesNode = edge.source === yesNode.id || edge.target === yesNode.id;
          if (isFromOrToYesNode) {
            // collect any task node connected to yesNode
            if (edge.source === yesNode.id) {
              nodesToRemove.push(edge.target);
            }
          }
          return !isFromOrToYesNode;
        });
        return updatedEdges;
      });
    
      // 2. Remove the yesNode itself + any connected task nodes
      setNodes(prevNodes =>
        prevNodes.filter(node =>
          node.id !== yesNode.id && !nodesToRemove.includes(node.id) && node.id !== 'noNode' && node.id !== 'add method'
        )
      );
      
      // Show all other options
      setShowAllOptions(true);
    };

  const handleAddMethod = () => {
  
    socket.emit("message", {type: 'response_decomposition_with_edit', 
                           response: {user_choice: 'add_method'}});
    onConfirm(null);
  };

  const dropdownOptions1 = data.available_actions || [];
  const dropdownOptions2 = data.env_objects || [];  
  
  const handleEditClick = (task) => {
    const taskNode = nodesRef.current.find((node) => node.id === task.hash);

    if (!taskNode) {
      console.warn(`Node with id ${task.hash} does not exist. Creating a new node.`);
      const newNode = {
        id: task.hash,
        position: { x: 0, y: 0 }, // Default position
        data: { 
          label: task.task_name,
          task_name: task.task_name,
          args: task.args,
          hash: task.hash,
          dropdown1: task.task_name,
          dropdown2: task.args.length > 0 ? task.args[0] : ""
        },
        style: { background: currentNodeColor, border: 'none' },
        sourcePosition: 'right',
        targetPosition: 'left',
      };
      setNodes((prevNodes) => [...prevNodes, newNode]);
      return;
    }

    const position = taskNode.position || { x: 0, y: 0 }; // Fallback position
    const currentTaskName = taskNode.data.task_name || task.task_name;
    const currentArgs = taskNode.data.args || task.args;

    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === task.hash
          ? {
              ...node,
              data: {
                ...node.data,
                label: (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <select
                      defaultValue={currentTaskName}
                      onChange={(e) => handleNodeEditChange(e, task.hash, 'dropdown1')}
                      style={{
                        width: '100px',
                        border: '1px solid black',
                        background: 'white',
                        textAlign: 'center',
                      }}
                    >
                      {dropdownOptions1.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      defaultValue={currentArgs.length > 0 ? currentArgs[0] : ""}
                      onChange={(e) => handleNodeEditChange(e, task.hash, 'dropdown2')}
                      style={{
                        width: '100px',
                        border: '1px solid black',
                        background: 'white',
                        textAlign: 'center',
                      }}
                    >
                      <option value="">No object</option>
                      {dropdownOptions2.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ),
                dropdown1: currentTaskName, // Use current task_name as default
                dropdown2: currentArgs.length > 0 ? currentArgs[0] : "", // Use current args as default
              },
            }
          : node
      )
    );
  
    // Trash button node
    const trashButtonNode = {
      id: `${task.hash}-trash`,
      position: {
        x: position.x + 155, // Position next to the edit button
        y: position.y + 30, // Same vertical alignment as the edit button
      },
      data: {
        label: '🗑',
        onClick: () => handleTrashClick(task.hash),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
  
    setNodes((prevNodes) => [...prevNodes, trashButtonNode]);

    // Add-node button next to the trash button
    const addButtonNode = {
      id: `${task.hash}-add`,
      position: {
        x: position.x + 180,
        y: position.y + 30,
      },
      data: {
        label: '+',
        onClick: () => handleAddNode(task),
      },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };

    setNodes((prevNodes) => [...prevNodes, addButtonNode]);
  };

  // Add a new editable subtask node under the given task
  const handleAddNode = (task) => {
    const anchorNode = nodesRef.current.find((node) => node.id === task.hash);
    const anchorPos = anchorNode?.position || { x: 0, y: 0 };
    const newId = `${data.head.hash}-new-${Date.now()}`;

    // Try to find the yes node that connects to this task, so we can attach the new edge
    const yesEdge = edgesRef.current.find(e => e.target === task.hash);
    const yesNodeId = yesEdge ? yesEdge.source : undefined;

    const defaultTaskName = (dropdownOptions1 && dropdownOptions1[0]) || '';
    const defaultArg = '';

    // Determine vertical placement: insert directly below the clicked node (anchor)
    const VERTICAL_SPACING = 50;
    let baseX = anchorPos.x;
    let baseY = anchorPos.y + VERTICAL_SPACING; // default: just under anchor
    let siblingIdsToShift = [];
    if (yesNodeId) {
      const childIds = edgesRef.current.filter(e => e.source === yesNodeId).map(e => e.target);
      const childNodes = childIds
        .map(id => nodesRef.current.find(n => n.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

      // Keep X aligned with anchor; baseY right below anchor
      baseX = anchorPos.x;
      baseY = anchorPos.y + VERTICAL_SPACING;

      // Determine which siblings are below or at the insertion point; shift them down to avoid overlap
      siblingIdsToShift = childNodes
        .filter(n => (n.id !== task.hash) && ((n.position?.y || 0) >= baseY - 1))
        .map(n => n.id);
    }

    const newNode = {
      id: newId,
      position: { x: baseX, y: baseY },
      data: {
        label: (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <select
              defaultValue={defaultTaskName}
              onChange={(e) => handleNodeEditChange(e, newId, 'dropdown1')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              {dropdownOptions1.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              defaultValue={defaultArg}
              onChange={(e) => handleNodeEditChange(e, newId, 'dropdown2')}
              style={{
                width: '100px',
                border: '1px solid black',
                background: 'white',
                textAlign: 'center',
              }}
            >
              <option value="">No object</option>
              {dropdownOptions2.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ),
        dropdown1: defaultTaskName,
        dropdown2: defaultArg,
        task_name: defaultTaskName,
        args: defaultArg === '' ? [] : [defaultArg],
        isEdited: true,
        isNew: true,
      },
      style: { background: currentNodeColor, border: 'none' },
      sourcePosition: 'right',
      targetPosition: 'left',
    };

    // Add the new node, and shift following siblings down by spacing if needed
    setNodes((prev) => {
      const shifted = prev.map(n => {
        if (siblingIdsToShift.includes(n.id)) {
          return { ...n, position: { x: n.position.x, y: (n.position.y || 0) + VERTICAL_SPACING } };
        }
        return n;
      });
      return [...shifted, newNode];
    });

    // Create an edge from the yes node to this new subtask, if we could infer the yes node
    if (yesNodeId) {
      const edgeId = `e-${yesNodeId}-${newId}`;
      setEdges(prev => prev.some(e => e.id === edgeId)
        ? prev
        : [
            ...prev,
            {
              id: edgeId,
              source: yesNodeId,
              target: newId,
              markerEnd: { type: MarkerType.Arrow, strokeWidth: 2, color: currentEdgeColor },
              style: { strokeWidth: 2, stroke: currentEdgeColor },
            },
          ]
      );
    }

    // Add a trash button for the new node
    const newTrashButtonNode = {
      id: `${newId}-trash`,
      position: { x: baseX + 155, y: baseY + 30 },
      data: { label: '🗑', onClick: () => handleTrashClick(newId) },
      style: {
        background: 'none',
        width: '20px',
        height: '20px',
        borderRadius: 'none',
        border: '1px solid black',
        fontSize: '10px',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    };
    setNodes((prev) => {
      const shifted = prev.map(n => {
        if (siblingIdsToShift.includes(n.id)) {
          return { ...n, position: { x: n.position.x, y: (n.position.y || 0) + VERTICAL_SPACING } };
        }
        return n;
      });
      return [...shifted, newTrashButtonNode];
    });
  };

  const handleNodeEditChange = (event, nodeId, dropdown) => {
    const newValue = event.target.value;
    console.log(`Updating ${dropdown} for node ${nodeId} to:`, newValue);
  
    setNodes((prevNodes) => {
      const nodeExists = prevNodes.some((node) => node.id === nodeId);
      if (!nodeExists) {
        console.warn(`Node with id ${nodeId} not found.`);
        return prevNodes;
      }
  
      const updatedNodes = prevNodes.map((node) => {
        if (node.id === nodeId) {
          const updatedData = {
            ...node.data,
            [dropdown]: newValue, // Update the specific dropdown value
          };
          
          // Update task_name and args based on dropdown values
          const dropdown1Value = dropdown === 'dropdown1' ? newValue : node.data.dropdown1;
          const dropdown2Value = dropdown === 'dropdown2' ? newValue : node.data.dropdown2;
          
          updatedData.task_name = dropdown1Value;
          updatedData.args = dropdown2Value === "" ? [] : [dropdown2Value];
          updatedData.label = dropdown2Value === "" ? `${dropdown1Value}` : `${dropdown1Value} ${dropdown2Value}`;
          updatedData.isEdited = true; // Mark as edited
          
          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      });
  
      // Explicitly update nodesRef
      nodesRef.current = updatedNodes;
      
      // Debug: log the updated node data
      const updatedNode = updatedNodes.find(node => node.id === nodeId);
      console.log('Updated node data:', updatedNode?.data);
      
      return updatedNodes;
    });
  };

  const handleConfirmEdit = (nodeId) => {
    
    // Remove the confirm button and the trash button
    setNodes((prevNodes) =>
      prevNodes.filter(
        (node) => node.id !== `${nodeId}-confirm` && node.id !== `${nodeId}-trash`
      )
    );
    
    // Build the complete decomposition structure from current node data
    // Determine the yes node for the edited/new node, then read all children of that yes node
    const yesEdge = edgesRef.current.find((e) => e.target === nodeId);
    const yesNodeId = yesEdge ? yesEdge.source : undefined;

    let editedSubtasks = [];
    if (yesNodeId) {
      // Collect all child node ids connected from this yes node
      const childIds = edgesRef.current
        .filter((e) => e.source === yesNodeId)
        .map((e) => e.target);

      // Map ids to actual nodes still present in UI and sort by vertical position (top -> bottom)
      const childNodes = childIds
        .map((id) => nodesRef.current.find((n) => n.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

      // Fast lookup for original backend tasks by hash
      const originalByHash = new Map(
        (data.subtasks[0] || []).map((t) => [t.hash, t])
      );

      editedSubtasks = childNodes.map((node) => {
        const isNew = node.id.startsWith(`${data.head.hash}-new-`);
        if (isNew) {
          return { task_name: node.data.task_name, args: node.data.args };
        }
        // Existing task: prefer edited values if present, otherwise fallback to original
        const orig = originalByHash.get(node.id);
        if (node.data && node.data.isEdited === true) {
          return { task_name: node.data.task_name, args: node.data.args };
        }
        if (orig) {
          return { task_name: orig.task_name, args: orig.args };
        }
        // Fallback if not found in original list
        return { task_name: node.data.task_name, args: node.data.args };
      });
    } else {
      // Fallback: preserve previous behavior when we cannot resolve yes node
      const existingTasks = data.subtasks[0]
        .filter((task) => nodesRef.current.some((node) => node.id === task.hash))
        .map((task) => {
          const taskNode = nodesRef.current.find((node) => node.id === task.hash);
          if (taskNode && taskNode.data.isEdited === true) {
            return { task_name: taskNode.data.task_name, args: taskNode.data.args };
          }
          return { task_name: task.task_name, args: task.args };
        });
      const newTasks = nodesRef.current
        .filter((node) => node.id.startsWith(`${data.head.hash}-new-`))
        .map((node) => ({ task_name: node.data.task_name, args: node.data.args }));
      editedSubtasks = [...existingTasks, ...newTasks];
    }

    // Send the complete decomposition structure
    socket.emit("message", {
      type: 'response_decomposition_with_edit',
      response: {
        user_choice: "gui_edit",
        edited_decomposition: {
          head: data.head,
          subtasks: [editedSubtasks]
        }
      }
    });

    // Reset edit state and clean up edit UI for all nodes after sending the data
    setNodes((prevNodes) =>
      prevNodes
        .filter((node) => !node.id.endsWith('-trash') && !node.id.endsWith('-add') && !node.id.endsWith('-confirm'))
        .map((node) => {
          if (node.data && node.data.label && typeof node.data.label !== 'string') {
            // Convert interactive label back to plain text
            const taskName = node.data.task_name || '';
            const argStr = node.data.args && node.data.args.length > 0 ? ` ${node.data.args[0]}` : '';
            return {
              ...node,
              data: {
                ...node.data,
                label: `${taskName}${argStr}`,
                isEdited: false,
              },
            };
          }
          // Ensure isEdited reset for others
          if (node.data && node.data.isEdited) {
            return { ...node, data: { ...node.data, isEdited: false } };
          }
          return node;
        })
    );
  };

  
  const handleTrashClick = (nodeId) => {
    // Remove the node and its associated buttons (trash, edit)
    setNodes((prevNodes) =>
      prevNodes.filter(
        (node) =>
          node.id !== nodeId && // Remove the main node
          node.id !== `${nodeId}-trash` && // Remove the trash button
          node.id !== `${nodeId}-edit` // Remove the edit button
      )
    );
    // Also remove any edges that target this node
    setEdges(prev => prev.filter(e => e.target !== nodeId && e.source !== nodeId));
  };
}

export default ConfirmBestMatchDecomposition;

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
        nodes, edges, setNodes, setEdges }) {
  // console.log("nodes in ConfirmDecomp:", nodes);
  // console.log('edges in ConfirmDecomp:', edges);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const edgesRef = useRef(edges);
  const nodesRef = useRef([]);

useEffect(() => {
  edgesRef.current = edges;
}, [edges]);

useEffect(() => {
  nodesRef.current = nodes;
}, [nodes]);


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
          if (node.id.includes('unhide')) {
            return { ...node, hidden: false };
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
        // for the yes node, make the background color none
        return {
          ...node,
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
      socket.emit("message", {type: 'response_decomposition_with_edit', response: {user_choice: 'add_method'}});
      console.log("User confirmed decomposition with no subtask");
      onConfirm(null);
      return;
    }

    // Add yes node
    const yesNode = {
      id: `${data.head.hash}-unhide-0`,
      // position: { x: parentNode.position.x + 250, y: parentNode.position.y },
      position: { 
        x: parentNode.position.x + 200, 
        y: parentNode.position.y + 3.5
      },
      data: { 
        label: "✓ Approve", 
        onClick: () => handleConfirm(yesNode,0,parentNode) 
      },
      style: {
        background: '#95B9F3', 
        width: '70px',
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
        // fontWeight: '500',
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    }

    
    if (!nodes.some(node => node.id === yesNode.id)) {
      setNodes(prev => [...prev, yesNode]);
    } else {
      setNodes(prev => prev.map(node => {
        if (node.id === yesNode.id) {
          return { ...node,  
            data: { 
              label: "✓ Approve",
              onClick: () => handleConfirm(yesNode,0,parentNode) 
            }, 
          };
        }
        return node;
      }));
    }

    // Add edge from parent node to yes nodes
    setEdges(prev => [...prev, {
      id: `e-${parentNode.id}-${yesNode.id}`,
      source: parentNode.id,
      target: yesNode.id,
      markerEnd: {
        type: MarkerType.Arrow,
        strokeWidth: 2,
        color: currentEdgeColor
      },
      style: {
        strokeWidth: 2,
        stroke: currentEdgeColor
      },
      // debugging
      // label: `e-${parentNode.id}-${yesNode.id}`,
    }]);

    // Add × Reject
    const rejectNode = {
      id: 'reject',
      position: {
        x: yesNode.position.x,
        y: yesNode.position.y + 40,
      },
      data: {
        label: '× Reject',
        onClick: () => handleRejectClick(yesNode, parentNode, data),
      },
      style: {
        background: '#D9D9D9',
        width: '70px',
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
        // fontWeight: '500',
      },
    };

    setNodes(prev => [...prev, rejectNode]);

    const newNodes = [];
    const newEdges = [];

    // Create child nodes for each subtask
    data.subtasks[0].forEach((task, subIndex) => {
      const taskNode = {
        id: task.hash,
        position: { 
          x: yesNode.position.x + 150, 
          y: parentNode.position.y + subIndex * (150 / (parentNode.position.x / 200 + 1))
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

      // Add edge from yes node to task node
      newEdges.push({
        id: `e-${parentNode.id}-unhide-${taskNode.id}`,
        source: yesNode.id,
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
        // debugging
        // label: `e-${parentNode.id}-unhide-${taskNode.id}`,
      });

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
  
  // Effect 2: render remaining options when showAllOptions===true
  useEffect(() => {
    if (!showAllOptions) return;
    // find parent
    const parentNode = nodes.find(n => n.id === data.head.hash);
    let totalMethodCount = 0;
    if (!parentNode) return;
    // render for subtasks 1..end
    data.subtasks.slice(1).forEach((option, idx) => {
      const realIndex = idx + 1;
      const baseY = parentNode.position.y + 3.5;
      const yesNodeId = `${data.head.hash}-unhide-${realIndex}`;
      const yesNode = { id: yesNodeId, 
        position: { 
          x: parentNode.position.x + 200, 
          y: baseY + idx * 100 }, 
        data: { 
          label: "✓ Approve", 
          onClick: () => handleConfirm(yesNode, realIndex,parentNode) 
        },
        style: { 
          background: '#95B9F3', 
          width: '70px',
          height: '32px',
          borderRadius: '16px',
          border: 'none',
          fontSize: '10px', }, 
        sourcePosition: 'right', 
        targetPosition: 'left' };

      if (!nodes.some(n => n.id === yesNodeId)) setNodes(prev => [...prev, yesNode]);
      setEdges(prev => prev.some
        (e => e.id === `e-${parentNode.id}-${yesNodeId}`)
        ? prev : [...prev, { id: `e-${parentNode.id}-${yesNodeId}`, source: parentNode.id, 
          target: yesNode.id, 
          markerEnd: { 
            type: MarkerType.Arrow, 
            strokeWidth: 2, 
            color: currentEdgeColor }, 
          style: { 
            strokeWidth: 2, 
            stroke: currentEdgeColor 
          } }]
      );

      // tasks
      option.forEach((task, i) => {
        const taskId = task.hash;
        const taskNode = { 
          id: taskId, 
          position: { 
            x: parentNode.position.x + 400, 
            y: parentNode.position.y + idx * 100 + i * 50 },
          data: { 
            label: task.task_name,
            task_name: task.task_name,
            args: task.args,
            hash: task.hash
          }, 
          style: { background: currentNodeColor, border: 'none' },
          sourcePosition: 'right', targetPosition: 'left' };

        if (!nodes.some(n => n.id === taskId)) setNodes(prev => [...prev, taskNode]);
        setEdges(prev => prev.some(e => e.id === `e-${yesNodeId}-${taskId}`)
          ? prev : [...prev, { id: `e-${yesNodeId}-${taskId}`, 
            source: yesNodeId, 
            target: taskId, 
            markerEnd: { type: MarkerType.Arrow, strokeWidth: 2, color: currentEdgeColor }, 
            style: { strokeWidth: 2, stroke: currentEdgeColor } }]
        );
      });
    });

    // 3. Re-add “+ Create Method” if missing
    const addMethod = {
      id: 'add method',
      position: { x: parentNode.position.x + 200, 
        y: parentNode.position.y + (data.subtasks.length-2)*100 +50},
      data: { label: '+ Create Method', onClick: handleAddMethod },
      style: {
        width: '100px',
        background: moreNodeColor,
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '10px',
      },
    };
    if (!nodes.some(n => n.id === 'add method')) {
      setNodes(prev => [...prev, addMethod]);
    }

  }, [showAllOptions]);

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
  

  // every confirsmation step has confirm, more options, add method and edit as options
  const handleConfirm = (yesNode, index, parentNode) => {
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
    .filter(node => !node.id.endsWith('-edit')); // Remove all edit buttons
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
    const addMethodNode = nodesRef.current.find(n => n.id === 'add method');
    const position = addMethodNode?.position || { x: 50, y: 50 };
  
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
  
    const confirmButtonNode = {
      id: `${task.hash}-confirm`,
      position: {
        x: position.x + 155, // Same x position as the edit button
        y: position.y + 60, // Slightly below the edit button
      },
      data: {
        label: '✔',
        onClick: () => handleConfirmEdit(task.hash),
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

    // Trash button node
    const trashButtonNode = {
      id: `${task.hash}-trash`,
      position: {
        x: position.x + 155, // Position next to the confirm button
        y: position.y + 30, // Same vertical alignment as the confirm button
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
  
    setNodes((prevNodes) => [...prevNodes, confirmButtonNode, trashButtonNode]);
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
  
      const updatedNodes = prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [dropdown]: newValue, // Update the specific dropdown value
              },
            }
          : node
      );
  
      // Explicitly update nodesRef
      nodesRef.current = updatedNodes;
      
      // Debug: log the updated node data
      const updatedNode = updatedNodes.find(node => node.id === nodeId);
      console.log('Updated node data:', updatedNode?.data);
      
      return updatedNodes;
    });
  };

  const handleConfirmEdit = (nodeId) => {
    console.log('Confirming edit for node:', nodeId);
    console.log('Available nodes in nodesRef.current:', nodesRef.current.map(n => ({ id: n.id, data: n.data })));
    
    // Remove the confirm button and the trash button
    setNodes((prevNodes) =>
      prevNodes.filter(
        (node) => node.id !== `${nodeId}-confirm` && node.id !== `${nodeId}-trash`
      )
    );
    
    // Find the updated node - use nodesRef.current which is updated by handleNodeEditChange
    const updatedNode = nodesRef.current.find((node) => node.id === nodeId);
    console.log('Found updated node:', updatedNode?.data);

    if (updatedNode) {
      const dropdown1Value = updatedNode.data.dropdown1;
      const dropdown2Value = updatedNode.data.dropdown2;

      // Build the complete decomposition structure BEFORE updating the node
      // This way we can use the current dropdown values directly
      const editedSubtasks = data.subtasks[0].map(task => {
        if (task.hash === nodeId) {
          // This is the task we just edited, use the dropdown values
          console.log(`Using edited data for ${task.hash}:`, {
            task_name: dropdown1Value,
            args: dropdown2Value === "" ? [] : [dropdown2Value]
          });
          return {
            task_name: dropdown1Value,
            args: dropdown2Value === "" ? [] : [dropdown2Value]
          };
        } else {
          // For other tasks, check if they have been edited
          const taskNode = nodesRef.current.find(node => node.id === task.hash);
          console.log(`Processing task ${task.hash}:`, {
            taskNode: taskNode?.data,
            original: { task_name: task.task_name, args: task.args }
          });
          
          if (taskNode && taskNode.data.task_name && taskNode.data.args !== undefined) {
            // This task has been edited
            console.log(`Using edited data for ${task.hash}:`, {
              task_name: taskNode.data.task_name,
              args: taskNode.data.args
            });
            return {
              task_name: taskNode.data.task_name,
              args: taskNode.data.args
            };
          } else {
            // This task hasn't been edited, use original data
            console.log(`Using original data for ${task.hash}:`, {
              task_name: task.task_name,
              args: task.args
            });
            return {
              task_name: task.task_name,
              args: task.args
            };
          }
        }
      });

      // Update the node to return to its original interface
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  task_name: dropdown1Value,
                  args: dropdown2Value === "" ? [] : [dropdown2Value],
                  label: dropdown2Value === "" ? `${dropdown1Value}` : `${dropdown1Value} ${dropdown2Value}`,
                  dropdown1: dropdown1Value,
                  dropdown2: dropdown2Value,
                },
              }
            : node
        )
      );

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
    } else {
      console.error(`Node with id ${nodeId} not found.`);
    }
  };
  const handleTrashClick = (nodeId) => {
    // Remove the node and its associated buttons (trash, confirm, edit)
    setNodes((prevNodes) =>
      prevNodes.filter(
        (node) =>
          node.id !== nodeId && // Remove the main node
          node.id !== `${nodeId}-trash` && // Remove the trash button
          node.id !== `${nodeId}-confirm` && // Remove the confirm button
          node.id !== `${nodeId}-edit` // Remove the edit button
      )
    );
    
    // Send a message to the server
    socket.emit("message", {
      type: 'response_decomposition_with_edit'
    });
  };
}

export default ConfirmBestMatchDecomposition;

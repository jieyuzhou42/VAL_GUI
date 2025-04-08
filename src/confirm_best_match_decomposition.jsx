import { useEffect } from "react";
import '@xyflow/react/dist/style.css';
import { MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const currentNodeColor = 'rgb(205, 221, 249)';
const currentEdgeColor = 'rgb(132, 171, 249)';
const nextNodeColor = 'rgb(222, 222, 222)';
const moreNodeColor = 'rgb(236, 243 ,254)'
const yesNodeLabel = (<img src='src/assets/check-circle.svg' alt='yes' style={{ width: '16px', height: '16px' }} />);

function ConfirmBestMatchDecomposition({ data, socket, onConfirm, setShowChatbot,
        nodes, edges, setNodes, setEdges }) {
  console.log("nodes in ConfirmDecomp:", nodes);
  console.log('edges in ConfirmDecomp:', edges);

  useEffect(() => {
    let parentNode = nodes.find(n => n.id.includes(data.head.hash));

    if (!parentNode) {
      // If node is empty, create the parent node
      console.log("No parent node found. Creating parent node.");
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
      console.log("Parent node found:", parentNode);
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

    // set the nodes color
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === parentNode.id ||
          edges.some(edge => edge.source === parentNode.id && edge.target === node.id) ||
          edges.some(edge => edge.target === parentNode.id && edge.source === node.id)
      ) {
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
      if (edge.source === parentNode.id || edge.target === parentNode.id) {
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

    // Add yes node
    const yesNode = {
      id: `${data.head.hash}-unhide`,
      // position: { x: parentNode.position.x + 250, y: parentNode.position.y },
      position: { 
        x: parentNode.position.x + 250, 
        y: parentNode.position.y + 20 - 9 
      },
      data: { 
        label: yesNodeLabel, 
        onClick: () => handleConfirm(yesNode) 
      },
      style: { 
        width: '18px',
        height: '18px',
        padding: '0px',
        background: 'none',
        border: 'none',},
      sourcePosition: 'right',
      targetPosition: 'left',
    }

    console.log('Current path:', `${data.head.hash}-unhide`);
    
    if (!nodes.some(node => node.id === yesNode.id)) {
      setNodes(prev => [...prev, yesNode]);
    } else {
      setNodes(prev => prev.map(node => {
        if (node.id === yesNode.id) {
          return { ...node,  
            data: { 
              label: yesNodeLabel,
              onClick: () => handleConfirm(yesNode) 
            }, 
          };
        }
        return node;
      }));
    }
    
    console.log('Parent node background:', parentNode.style?.background);

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

    // Add no node
    const noNode = {
      id: 'noNode',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * (150 / (parentNode.position.x / 200 + 1)) },
      data: { label: 'More Options', onClick: () => handleReject(yesNode) },
      style: { 
        background: moreNodeColor,
        cursor: 'pointer', 
        border: 'none',
      },
    }

    setNodes(prev => [...prev, noNode]);

    const addMethodNode = {
      id: 'add method',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * (150 / (parentNode.position.x / 200 + 1))+50 },
      data: { label: '+ Create Method', onClick: handleAddMethod },
      style: { 
        background: moreNodeColor,
        cursor: 'pointer', 
        border: 'none',
      },
    }

    setNodes(prev => [...prev, addMethodNode]);

    console.log(" Creating child node.", nodes);
    const newNodes = [];
    const newEdges = [];

    data.subtasks.forEach((task, subIndex) => {
      const taskNode = {
        id: task.hash,
        position: { 
          x: yesNode.position.x + 150, 
          y: parentNode.position.y + subIndex * (150 / (parentNode.position.x / 200 + 1))
        },
        // data: { label: task.Task },
        // debugging
        data: {label: `${task.hash}-${task.Task}`},
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

      console.log('taskNode background:', taskNode?.style?.background);

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
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);
  
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
        
        // TODO: Update the color of the edges based on the target node background
        const targetNode = nodes.find(node => node.id === edge.target);
        const targetNodeBackground = targetNode?.style?.background;
        
        console.log('Edge:', edge);
        console.log('Target node:', targetNode);
        console.log('Target node background:', targetNodeBackground);

        return {
          ...edge,
          // style: {
          //   ...edge.style,
          //   stroke: targetNodeBackground,
          // },
          // markerEnd: {
          //   type: MarkerType.Arrow,
          //   strokeWidth: 2,
          //   color: targetNodeBackground,
          // },
        };
      });
  
      console.log('Updated edges:', updatedEdges);
      console.log('New edges:', newEdges);
  
      return [...updatedEdges, ...newEdges];
    });
  };

  // every confirsmation step has confirm, more options, add method and edit as options
  const handleConfirm = (yesNode) => {
      socket.emit("message", { type: "confirm_response", response: "yes" });
      console.log("User confirmed decomposition");

      setEdges(prevEdges => prevEdges.map(edge => {
        // hide the edges that are connected to the yes node
        if (edge.target === yesNode.id) {
          return { ...edge, hidden: true };
        }

        const targetNode = nodes.find(node => node.id === edge.target);
        const targetNodeBackground = targetNode?.style?.background;
        console.log('Target node background:', targetNodeBackground);

        return {
          ...edge,
          // style: {
          //   ...edge.style,
          //   // stroke: targetNodeBackground,
          //   stroke: 'red'
          // },
          // markerEnd: {
          //   type: MarkerType.Arrow,
          //   strokeWidth: 2,
          //   // color: targetNodeBackground
          //   color: 'red'
          // },
        };
      }))

      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => {
          // hide the yes node
          if (node.id === yesNode.id) {
            return {
              ...node,
              hidden: true,
              data: {
                ...node.data,
                // add unhide option to the yes node
                label: '···',
                onClick: () => handleUnhide(yesNode),
              }
            };
          }
          return node;
        });
        return updatedNodes;
      });
  
      updateNodesAndEdges();
      onConfirm();
      // set message into null and VAL will emit new message to render
  };

  const handleUnhide = (yesNode) => {
    let edgesToUnhide = [];
    let nodesToUnhide = [];
    const parentNodeId = yesNode.id.split('-')[0];

    setEdges(prevEdges => {
      console.log('All edges before unhide:', prevEdges);
      edgesToUnhide = prevEdges.filter(edge => edge.source === yesNode.id || edge.target === yesNode.id);
      nodesToUnhide = edgesToUnhide.map(edge => edge.target);
      console.log('Edges to unhide:', edgesToUnhide);
      console.log('Nodes to unhide:', nodesToUnhide);

      const updatedEdges = prevEdges.map(edge => {
        if (edgesToUnhide.includes(edge)) {
          return { ...edge, hidden: false };
        } else if (edge.source === parentNodeId) {
          return { ...edge, hidden: true };
        }
        return edge;
      });

      console.log('Edges after unhide:', updatedEdges);

      return updatedEdges;
    });

    setNodes(prevNodes => {
      console.log('All nodes before unhide:', prevNodes);
      console.log('Yes node:', yesNode);

      const updatedNodes = prevNodes.map(node => {
        if (nodesToUnhide.includes(node.id)) {
          return { ...node, hidden: false };
        } else if (node.id === yesNode.id) {
          console.log('Setting node to unhide:', node);

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
        }
        return node; 
      })
      console.log('Nodes after unhide:', updatedNodes);
      return updatedNodes
    });
  };

  const handleHide = (yesNode) => {
    console.log("hide clicked");

    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(node => {
        if (node.id === yesNode.id) {
          return {
            ...node,
            style: {
              ...node.style,
              background: 'white',
              border: 'none',
            },
            data: {
              ...node.data,
              onClick: () => handleUnhide(yesNode),
            }
          };
        }
        return node;
      });
      return updatedNodes;
    });
  };

  const handleReject = (yesNode) => {
      socket.emit("message", { type: "confirm_response", response: "more options" });
      console.log("User rejected decomposition");

      let edgesToRemove = [];
      let nodesToRemove = [];

      setEdges(prevEdges => {
        edgesToRemove = prevEdges.filter(edge => edge.source === yesNode.id);
        nodesToRemove = edgesToRemove.map(edge => edge.target);
        return prevEdges.filter(edge => edge.source !== yesNode.id);
      });

      setNodes(prevNodes => {
        const updatedNodes = prevNodes.filter(node => !nodesToRemove.includes(node.id));
        return updatedNodes;
      });

      updateNodesAndEdges();
      onConfirm(null);
  };

  const handleAddMethod = () => {
    socket.emit("message", { type: "confirm_response", response: "add method" });
    setShowChatbot(true);
    updateNodesAndEdges();
    onConfirm(null);
  };
 }


export default ConfirmBestMatchDecomposition;
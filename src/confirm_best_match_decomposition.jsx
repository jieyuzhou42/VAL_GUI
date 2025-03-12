import { useEffect } from "react";
import io from "socket.io-client";
import '@xyflow/react/dist/style.css';

const current_color = 'rgb(205, 221, 249)';

function ConfirmBestMatchDecomposition({ data, socket, onConfirm, setShowChatbot,
        nodes, edges, setNodes, setEdges }) {
  console.log("nodes in ConfirmDecomp:", nodes);
  console.log('edges in ConfirmDecomp:', edges);

  useEffect(() => {
    // If node is empty, create the parent node
    let parentNode = nodes.find(n => n.id.includes(data.head.hash));

    if (!parentNode) {
      console.log("No parent node found. Creating parent node.");
      parentNode = {
        id: data.head.hash,
        position: { x: 0, y: 0 },
        data: { label: `${data.head.name} ${data.head.V}` },
        style: { color: 'black' },
        sourcePosition: 'right',
        targetPosition: 'left',
      };

      setNodes(prev => [...prev, parentNode]);
    } else {
      console.log("Parent node found:", parentNode);
      const parentNodeId = parentNode.id;

      setNodes(prevNodes => prevNodes.map(node => {
        // hide the nodes
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
      setEdges(prevEdges => prevEdges.filter(edge => edge.source !== parentNode.id));
    }

    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === parentNode.id ||
          edges.some(edge => edge.source === parentNode.id && edge.target === node.id) ||
          edges.some(edge => edge.target === parentNode.id && edge.source === node.id)
      ) {
        console.log('Setting node to blue:', node);
        return {
          ...node,
          style: {
            ...node.style,
            background: current_color,
          }
        };
      } else if (!node.id.includes('unhide')) {
        return {
          ...node,
          style: {
            ...node.style,
            background: 'white',
          }
        }
      } else {
        return node;
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
      data: { label: "✅", onClick: () => handleConfirm(yesNode) },
      style: { 
        color: 'black', 
        cursor: 'pointer',
        width: '18px',
        height: '18px',
        padding: '0px',
        background: 'none',
        border: 'none',},
      sourcePosition: 'right',
      targetPosition: 'left',
    }

    console.log('Current path:', `${data.head.hash}-unhide`);
    // for the nodes with id data.head.hash, make the background color blue
    
    if (!nodes.some(node => node.id === yesNode.id)) {
      setNodes(prev => [...prev, yesNode]);
    }
    setEdges(prev => [...prev, {
      id: `e-${parentNode.id}-${yesNode.id}`,
      source: parentNode.id,
      target: yesNode.id,
      // debugging
      label: `e-${parentNode.id}-${yesNode.id}`,
    }]);

    // Add no node
    const noNode = {
      id: 'noNode',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * (150 / (parentNode.position.x / 200 + 1)) },
      data: { label: 'More Options', onClick: () => handleReject(yesNode) },
      style: { color: 'black', cursor: 'pointer' },
    }

    setNodes(prev => [...prev, noNode]);

    const addMethodNode = {
      id: 'add method',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * (150 / (parentNode.position.x / 200 + 1))+50 },
      data: { label: '+ Create Method', onClick: handleAddMethod },
      style: { color: 'black', cursor: 'pointer' },
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
        data: { label: task.Task },
        style: { color: 'black', background: current_color },
        sourcePosition: 'right',
        targetPosition: 'left',
      };

      newNodes.push(taskNode);
      newEdges.push({
        id: `e-${parentNode.id}-unhide-${taskNode.id}`,
        source: yesNode.id,
        target: `${taskNode.id}`,
        // debugging
        label: `e-${parentNode.id}-unhide-${taskNode.id}`,
      });
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);
  
  // This function updates the nodes and edges when user confirms or rejects decomposition
  const updateNodesAndEdges = () => {
    // removes the yes and no nodes
    setNodes(prevNodes => prevNodes.filter(node => node.id !== 'yesNode' && node.id !== 'noNode' && node.id !== 'add method'));
    setEdges(prevEdges => {
      const newEdges = [];
      const updatedEdges = prevEdges.filter(edge => !edge.target.includes('unhide')).map(edge => {
        if (edge.source.includes('unhide')) {
          const parentNodeId = edge.id.split('-')[1];
          const newEdgeId = `e-${parentNodeId}-${edge.target}`;
          
          if (!prevEdges.some(e => e.id === newEdgeId)) {
            newEdges.push({ 
              ...edge, 
              id: newEdgeId,
              source: parentNodeId,  
              hidden: false 
            });
          }
          return { ...edge, hidden: true };
        }
        return edge;
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

      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => {
          if (node.id === yesNode.id) {
            return {
              ...node,
              hidden: true,
              data: {
                ...node.data,
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
    const hashValue = yesNode.id.split('-')[0];
    let edgesToUnhide = [];

    setEdges(prevEdges => {
      edgesToUnhide = prevEdges.filter(edge => edge.source === hashValue);
      return prevEdges;
    });

    setNodes(prevNodes => {
      console.log('All nodes before unhide:', prevNodes);
      const updatedNodes = prevNodes.map(node => {
        if (edgesToUnhide.some(edge => edge.target === node.id)) {
          return { ...node, hidden: false };
        }
        if (node.id === yesNode.id) {
          return { 
            ...node, 
            style: {
              ...node.style,
              background: 'rgb(222, 222, 222)',
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

      // const hashValue = yesNode.id.split('-')[0];
      let edgesToRemove = [];
      let nodesToRemove = [];

      setEdges(prevEdges => {
        console.log('All edges:', prevEdges);

        edgesToRemove = prevEdges.filter(edge => edge.source === yesNode.id);
        nodesToRemove = edgesToRemove.map(edge => edge.target);
        return prevEdges.filter(edge => edge.source !== yesNode.id);
      });

      console.log('Edges to remove:', edgesToRemove);

      setNodes(prevNodes => {
        console.log('All nodes:', prevNodes);
        console.log('Nodes to remove:', nodesToRemove);

        const updatedNodes = prevNodes.filter(node => !nodesToRemove.includes(node.id));
        console.log('Nodes after removal:', updatedNodes);

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
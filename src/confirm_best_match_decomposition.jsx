import { useEffect } from "react";
import io from "socket.io-client";
import '@xyflow/react/dist/style.css';


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
      // need to be modified, current logic is first time there is no node and edge->more options
      // but the real logic is when there is no other more options/ OR create method is always there
      // if (edges.some(edge => edge.source === parentNodeId)) {
      //   noNodeLabel = '+ Create Method';
      // } else {
      //   noNodeLabel = 'More Options';
      // }

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

    // Add yes node
    const yesNode = {
      id: `${data.head.hash}-unhide`,
      position: { x: parentNode.position.x + 200, y: parentNode.position.y },
      data: {  label: "V", onClick: () => handleConfirm(yesNode) },
      style: { color: 'black', cursor: 'pointer' },
      sourcePosition: 'right',
      targetPosition: 'left',
    }

    setNodes(prev => [...prev, yesNode]);
    setEdges(prev => [...prev, {
      id: `e-${parentNode.id}-${yesNode.id}`,
      source: parentNode.id,
      target: yesNode.id,
      label: `e-${parentNode.id}-${yesNode.id}`,
    }]);

    // Add no node
    const noNode = {
      id: 'noNode',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * (150 / (parentNode.position.x / 200 + 1)) },
      data: { label: 'More Options', onClick: handleReject },
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
          x: yesNode.position.x + 200, 
          y: yesNode.position.y + subIndex * (150 / (parentNode.position.x / 200 + 1))
        },
        data: { label: task.Task },
        style: { color: 'black' },
        sourcePosition: 'right',
        targetPosition: 'left',
      };

      newNodes.push(taskNode);
      newEdges.push({
        id: `e-${parentNode.id}-${taskNode.id}`,
        source: yesNode.id,
        target: `${taskNode.id}`,
        label: `e-${parentNode.id}-${taskNode.id}`,
      });
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);
  
  // This function updates the nodes and edges when user confirms or rejects decomposition
  const updateNodesAndEdges = () => {
    // removes the yes and no nodes
    setNodes(prevNodes => prevNodes.filter(node => node.id !== 'yesNode' && node.id !== 'noNode'));
    setEdges(prevEdges => prevEdges.filter(edge => !edge.target.includes('unhide')).map(edge => {
      if (edge.source.includes('unhide')) {
        const parentNodeId = edge.id.split('-')[1];
        return { ...edge, source: parentNodeId }; 
      }
      return edge;
    }));
  };

// every confirmation step has confirm, more options, add method and edit as options

  const handleConfirm = (yesNode) => {
    if (yesNode.data.label === 'V'){
      socket.emit("message", { type: "confirm_response", response: "yes" });
      console.log("User confirmed decomposition");
      console.log('Yes node', yesNode);
  
      yesNode.hidden = true;
      yesNode.data.label = '...';
  
      console.log('Updated yes node', yesNode);
      
      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => 
            node.id === yesNode.id ? yesNode : node
        );
        console.log('Nodes after update:', updatedNodes);
        return updatedNodes;
      });
  
      updateNodesAndEdges();
      onConfirm();
      // set message into null and VAL will emit new message to render
    } else if (yesNode.data.label === '...') {
      console.log("Unhide clicked");
      
      const hashValue = yesNode.id.split('-')[0];
      console.log("Hash value", hashValue);

      let edgesToUnhide = [];

      setEdges(prevEdges => {
        console.log('All edges before unhide:', prevEdges);
        edgesToUnhide = prevEdges.filter(edge => edge.source === hashValue);
        console.log('Edges to unhide:', edgesToUnhide);
        return prevEdges;
      })

      setNodes(prevNodes => {
        console.log('All nodes before unhide:', prevNodes);
        const updatedNodes = prevNodes.map(node => {
          if (edgesToUnhide.some(edge => edge.target === node.id)) {
            return { ...node, hidden: false };
          }
          if (node.id === yesNode.id) {
            return { ...node, hidden: true };
          }
          return node; 
        })
        console.log('Nodes after unhide:', updatedNodes);
        return updatedNodes;
      });
    }
  };

  const handleReject = () => {
      socket.emit("message", { type: "confirm_response", response: "more options" });
      console.log("User rejected decomposition");
      // TODO: need to be modified, remove the previously added nodes. 
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
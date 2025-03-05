import { useEffect } from "react";
import io from "socket.io-client";
import '@xyflow/react/dist/style.css';

const socket = io("http://localhost:4002");

function ConfirmBestMatchDecomposition({ data, onConfirm, nodes, edges, setNodes, setEdges }) {
  console.log("nodes in ConfirmDecomp:", nodes);

  useEffect(() => {
    // If node is empty, create the parent node
    let parentNode = nodes.find(n => n.id.includes(data.head.hash));
    let noNodeLabel = 'More Options';

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

      if (edges.some(edge => edge.source === parentNodeId)) {
        noNodeLabel = '+ Create Method';
      } else {
        noNodeLabel = 'More Options';
      }

      setNodes(prevNodes => prevNodes.map(node => {
        if (node.position.x >= (parentNode.position.x + 400)) {
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
      id: 'yesNode',
      position: { x: parentNode.position.x + 200, y: parentNode.position.y },
      data: { label: "V", onClick: () => handleConfirm(data) },
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
      data: { label: noNodeLabel, onClick: handleReject },
      style: { color: 'black', cursor: 'pointer' },
    }

    setNodes(prev => [...prev, noNode]);

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
  setEdges(prevEdges => prevEdges.filter(edge => edge.target !== 'yesNode').map(edge => {
    if (edge.source === 'yesNode') {
      const parentNodeId = edge.id.split('-')[1];
      return { ...edge, source: parentNodeId }; 
    }
    return edge;
  }));
}

  const handleConfirm = (data) => {
    socket.emit("message", { type: "confirm_response", response: "yes" });
    console.log("User confirmed decomposition");

    updateNodesAndEdges();
    onConfirm();
    // set message into null and VAL will emit new message to render
};

  const handleReject = () => {
      socket.emit("message", { type: "confirm_response", response: "more options" });
      console.log("User rejected decomposition");
      // TODO: need to be modified, remove the previously added nodes. 
      updateNodesAndEdges();
      onConfirm(null);
  };
}

export default ConfirmBestMatchDecomposition;
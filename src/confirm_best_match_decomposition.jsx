import { useEffect } from "react";
import io from "socket.io-client";
import '@xyflow/react/dist/style.css';

const socket = io("http://localhost:4002");

function ConfirmBestMatchDecomposition({ data, onConfirm, nodes, edges, setNodes, setEdges }) {
  console.log("nodes in ConfirmDecomp:", nodes);
  console.log("edges in ConfirmDecomp:", edges);

  useEffect(() => {
    // If node is empty, create the parent node
    let parentNode = nodes.find(n => n.data.label.includes(data.head.name));
    if (!parentNode) {
      console.log("No parent node found. Creating parent node.");
      parentNode = {
        id: "1",
        position: { x: 0, y: 0 },
        data: { label: `${data.head.name} ${data.head.V}` },
        style: { color: 'black' },
        sourcePosition: 'right',
        targetPosition: 'left',
      };
      setNodes(prev => [...prev, parentNode]);
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
    const noNodeId = nodes.length + 3;
    const noNode = {
      id: 'noNode',
      position: { x: parentNode.position.x + 400, y: parentNode.position.y + data.subtasks.length * 100 },
      data: { label: "More Options", onClick: handleReject },
      style: { color: 'black', cursor: 'pointer' },
    }

    setNodes(prev => [...prev, noNode]);

    console.log(" Creating child node.", nodes);
    const newNodes = [];
    const newEdges = [];
    let nodeId = nodes.length + 2; // maybe need to revised to hash value

    data.subtasks.forEach((task, subIndex) => {
      const taskNode = {
        id: `${nodeId}`,
        position: { 
          x: yesNode.position.x + 200, 
          y: yesNode.position.y + subIndex * 100 
        },
        data: { label: task.Task },
        style: { color: 'black' },
        sourcePosition: 'right',
        targetPosition: 'left',
      };

      newNodes.push(taskNode);
      newEdges.push({
        id: `e-${parentNode.id}-${nodeId}`,
        source: yesNode.id,
        target: `${nodeId}`,
        label: `e-${parentNode.id}-${nodeId}`,
      });

      nodeId++;
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);

//click yes button
  const handleConfirm = (data) => {
    socket.emit("message", { type: "confirm_response", response: "yes" });

    setNodes(prevNodes => prevNodes.filter(node => node.id !== 'yesNode' && node.id !== 'noNode'));
    setEdges(prevEdges => prevEdges.filter(edge => edge.target !== 'yesNode').map(edge => {
      if (edge.source === 'yesNode') {
        const parentNodeId = edge.id.split('-')[1];
        return { ...edge, source: parentNodeId }; 
      }
      return edge;
    }));
    
    onConfirm();
};

  const handleReject = () => {
      socket.emit("message", { type: "confirm_response", response: "no" });
      console.log("User rejected decomposition");
      onConfirm(null);
  };
}

export default ConfirmBestMatchDecomposition;
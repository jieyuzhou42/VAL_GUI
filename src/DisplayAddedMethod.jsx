import { useEffect } from "react";
import '@xyflow/react/dist/style.css';

function DisplayAddedMethod({ data, nodes, setNodes, setEdges }) {
  useEffect(() => {
    // Try to find the parent node by matching its id with data.head.hash
    let parentNode = nodes.find(n => n.id.includes(data.head.hash));

    if (!parentNode) {
      // Parent node doesn't exist; create it
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
      // Parent node exists; update nodes to hide those positioned to the right
      setNodes(prevNodes =>
        prevNodes.map(node => {
          if (node.position.x >= (parentNode.position.x + 200)) {
            if (node.id.includes('unhide')) {
              return { ...node, hidden: false };
            }
            return { ...node, hidden: true };
          }
          return node;
        })
      );
      // Remove any edges originating from the parent node
      setEdges(prevEdges => prevEdges.filter(edge => edge.source !== parentNode.id));
    }

    // Create nodes for each subtask positioned relative to the parent node
    //use a for loop map, task is subtask, subindex is i
    const subtaskNodes = data.subtasks.map((task, subIndex) => ({
      id: task.hash,
      position: {
        x: parentNode.position.x + 200,
        y: parentNode.position.y + subIndex * (150 / (parentNode.position.x / 200 + 1))
      },
      data: { label: task.Task },
      style: { color: 'black' },
      sourcePosition: 'right',
      targetPosition: 'left',
    }));

    // Append the new subtask nodes to the current nodes
    setNodes(prev => [...prev, ...subtaskNodes]);

    // Create edges from the parent node to each subtask node
    const subtaskEdges = subtaskNodes.map(subtask => ({
      id: `e-${parentNode.id}-${subtask.id}`,
      source: parentNode.id,
      target: subtask.id,
      label: `Edge from ${parentNode.id} to ${subtask.id}`,
    }));

    // Append the new edges to the current edges
    setEdges(prev => [...prev, ...subtaskEdges]);
  }, [data]);

  return null;
}

export default DisplayAddedMethod;

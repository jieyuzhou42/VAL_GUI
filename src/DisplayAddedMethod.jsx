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


function DisplayAddedMethod({ data, socket, onConfirm, nodes, edges, setNodes, setEdges}) {
    useEffect(() => {
      console.log("=== DisplayAddedMethod component mounted ===");
      console.log("Current nodes:", nodes.map(n => n.id));
      console.log("Looking for chatbot-node:", nodes.some(n => n.id === 'chatbot-node'));
      console.log("Looking for chatbot-placeholder:", nodes.some(n => n.id === 'chatbot-placeholder'));
      
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
        console.log("=== Skipping hide/show and color logic in DisplayAddedMethod ===");
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
  
      console.log(" Checking if subtasks need to be created.", nodes);
      const newNodes = [];
      const newEdges = [];
      
      // Use same yesNode position logic as confirm_best_match_decomposition
      const yesNodeX = parentNode.position.x + SUBTASK_CONSTANTS.YESNODE_OFFSET_X;
      
      // Find the specific placeholder for this parent node (unique ID: placeholder-{parentHash})
      const placeholderId = `placeholder-${parentNode.id}`;
      const chatbotPlaceholder = nodes.find(n => n.id === placeholderId);
      console.log('Looking for placeholder:', placeholderId);
      console.log('Found placeholder:', chatbotPlaceholder);
      
      // Check which subtasks already exist (created by handleConfirm)
      const existingNodeIds = new Set(nodes.map(n => n.id));
  
      // Create child nodes for each subtask (only if they don't already exist)
      data.subtasks[0].forEach((task, subIndex) => {
        if (existingNodeIds.has(task.hash)) {
          console.log('Subtask node already exists:', task.hash);
          return; // Skip creating this node
        }
        
        console.log('Creating new subtask node:', task.hash);
        const taskNode = {
          id: task.hash,
          position: { 
            x: yesNodeX + SUBTASK_CONSTANTS.YESNODE_TO_SUBTASK_X,
            y: parentNode.position.y + subIndex * SUBTASK_CONSTANTS.SUBTASK_VERTICAL_SPACING
          },
          data: { 
            label: `${task.task_name} ${task.args}`,
            task_name: task.task_name,
            args: task.args,
            hash: task.hash
          },
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
  
        // Add edge from placeholder (if exists) or parent to task node
        const sourceNode = chatbotPlaceholder || parentNode;
        newEdges.push({
          id: `e-${sourceNode.id}-${taskNode.id}`,
          source: sourceNode.id,
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
      
      console.log('New nodes to create:', newNodes.length);
      console.log('New edges to create:', newEdges.length);
  
    // Only add nodes that don't already exist
    if (newNodes.length > 0) {
      setNodes(prev => [...prev, ...newNodes]);
    }
    
    // Filter out duplicate edges before adding
    setEdges(prev => {
      const existingEdgeIds = new Set(prev.map(e => e.id));
      const uniqueNewEdges = newEdges.filter(e => !existingEdgeIds.has(e.id));
      console.log('Adding edges:', uniqueNewEdges.length, 'out of', newEdges.length, 'new edges');
      return [...prev, ...uniqueNewEdges];
    });
    
    // NOTE: Parent → placeholder edge is already created by handleConfirm replacement logic
    // No need to create it again here
    
    // User already approved via chatbot, automatically send response to backend
    // to continue the flow
    console.log("Automatically sending response_decomposition to continue flow...");
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
    
        console.log('Updated edges:', updatedEdges);
        console.log('New edges:', newEdges);
    
        return [...updatedEdges, ...newEdges];
      });
    };
    
  
    // every confirsmation step has confirm, more options, add method and edit as options
    const handleConfirm = (yesNode, index, parentNode) => {
      socket.emit("message", { type: 'response_decomposition', response: index });
      console.log("User confirmed decomposition");
    
      let nodesToKeep = new Set();
      let nodesToRemove = new Set();
      let yesNodeIdsToRemove = [];
      const offsetY = index > 0 ? (index - 1) * 100 : 0;
      const directTaskNodeIds = edges
      .filter(edge => edge.source === yesNode.id)
      .map(edge => edge.target);
      console.log("Direct task node ids:", directTaskNodeIds);
    
  
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
          console.log("Moving yesNode:", node.id, "from", node.position.y, "to", node.position.y - offsetY);
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
          console.log("Moving task node:", node.id, "from", node.position.y, "to", node.position.y - offsetY);
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
      console.log("unhide clicked");
  
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
            console.log('Setting yes node to unhide:', node);
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
            console.log('Setting node to unhide:', node);
            return { ...node, hidden: false };
          } 
          return node;
        });
  
        return updatedNodes
      });
    };
  
    const handleHide = (yesNode) => {
      console.log("hide clicked");
  
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

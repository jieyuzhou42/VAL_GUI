import React, { useEffect } from 'react';
import './chat.css';
import userPic from './assets/user_pic.jpg';
import valPic from './assets/val_pic.jpg';

function Chatbot({ socket, message }) {
  useEffect(() => {
    console.log('Chatbot component mounted!');

    const msgerForm = document.getElementsByClassName("msger-inputarea")[0];
    const msgerInput = document.getElementsByClassName("msger-input")[0];

    if (!socket) {
      console.warn("socket.io not found. Make sure you loaded it or installed it properly");
      return;
    }

    // 添加socket错误监听
    socket.on('error', (error) => {
      console.error('Socket error in chatbot:', error);
    });

    if (msgerForm) {
      msgerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        let userInput = msgerInput.value.trim();
        if (!userInput) return;

        if (socket) {
          try {
            socket.emit('message', {type:"confirm_response", response: userInput });
          } catch (error) {
            console.error('Error sending message:', error);
          }
        }
        appendMessage("Me", userPic, "right", userInput);
        msgerInput.value = "";
      });
    }

    return () => {
      console.log("Chatbot component unmounted!");
      if (msgerForm) {
        msgerForm.removeEventListener('submit', () => {});
      }
    };
  }, [socket]);

  useEffect(() => {
    if (message) {
      console.log('Chatbot received new message =>', message);
      console.log('Message type:', message['type']);

      if (
        message['type'] === 'display_known_tasks' ||
        message['type'] === 'request_user_task' ||
        message['type'] === 'ask_subtasks' ||
        message['type'] === 'ask_rephrase' ||
        message['type'] === 'display_method_creation' ||
        message['type'] === 'display_edit_options'
      ) {
        buildDialog(message);
      } else if (
        message['type'] === 'segment_confirmation' ||
        message['type'] === 'confirm_task_decomposition' 
      ) {
        confirmation(message);
      } 
      else if (message['type'] === 'correct_grounding') {
        correctGrounding(message);
      }
      else if (message['type'] === 'display_thinking_analysis') {
        console.log('About to call displayThinkingAnalysis');
        displayThinkingAnalysis(message);
        console.log('displayThinkingAnalysis called');
      }
      else if (message['type'] === 'show_thinking_analysis_and_decomposition') {
        console.log('About to call showThinkingAnalysisAndDecomposition');
        showThinkingAnalysisAndDecomposition(message);
        console.log('showThinkingAnalysisAndDecomposition called');
      }
      else if (message['type'] === 'confirm_best_match_decomposition') {
        console.log('About to call displayDecompositionConfirmationFromTree');
        displayDecompositionConfirmationFromTree(message);
        console.log('displayDecompositionConfirmationFromTree called');
      }
      else if (message['type'] === 'display_decomposition_analysis') {
        console.log('About to call displayDecompositionAnalysis');
        displayDecompositionAnalysis(message);
        console.log('displayDecompositionAnalysis called');
      }
    }
  }, [message]);

  function appendMessage(name, img, side, text, buttons = null, options = null) {
    const container = document.getElementById('prompt-message');
    
    if (!container) {
      console.error('prompt-message container not found! Chatbot may not be mounted.');
      return;
    }

    const msgHTML = `
      <div class="chatbot-container-msg msg ${side}-msg">
        <div class="msg-img" style="background-image: url(${img})"></div>
        <div class="msg-bubble">
          <div class="msg-text">${text}</div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", msgHTML);
    container.scrollTop += 500;

    const lastMsgBubble = container.lastElementChild.querySelector(".msg-bubble");

    if (buttons) {
      lastMsgBubble.appendChild(buttons);
    }

    if (options) {
      lastMsgBubble.appendChild(options);
    }

    if (socket) {
      socket.emit('on log', msgHTML);
    }
  }

  function buildDialog(data) {
    console.log('=== buildDialog CALLED ===');
    console.log('Message type:', data['type']);
    console.log('Message text:', data['text']);
    
    let displayText = data['text'];
    
    // Enhanced formatting for different message types
    if (data['type'] === 'display_decomposition_analysis') {
      displayText = formatAnalysisText(data['text']);
    } else if (data['type'] === 'display_method_creation') {
      displayText = formatMethodCreationText(data['text']);
    } else if (data['type'] === 'display_edit_options') {
      displayText = formatEditOptionsText(data['text']);
    }
    
    console.log('About to append message with text:', displayText);
    appendMessage("VAL", valPic, "left", displayText);
    console.log('Message appended successfully');
  }

  function formatAnalysisTextSimple(text) {
    // Simple formatting for thinking analysis
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function formatMethodCreationText(text) {
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background: #e8f4f8; padding: 2px 4px; border-radius: 3px;">$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function formatEditOptionsText(text) {
    // Format edit options with better structure
    return text
      .replace(/Option \d+:/g, '<br><strong>$&</strong>')
      .replace(/\n/g, '<br>');
  }

  function displayThinkingAnalysis(message) {
    console.log('displayThinkingAnalysis called with message:', message);
    const data = message.text;
    const userTask = data.user_task;
    const taskName = data.task_name;
    const taskArgs = data.task_args;
    const analysisText = data.analysis_text;
    
    console.log('Thinking analysis data:', { userTask, taskName, taskArgs, analysisText });
    
    // Format the analysis text
    const formattedText = formatAnalysisTextSimple(analysisText);
    
    // Create approve/reject buttons for grounding confirmation
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      console.log('Grounding approve button clicked, sending response...');
      socket.emit('message', {
        type: 'confirm_response',
        response: 'yes'
      });
      // Disable buttons after clicking
      approveButton.disabled = true;
      rejectButton.disabled = true;
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
      console.log('Grounding reject button clicked, sending response...');
      socket.emit('message', {
        type: 'confirm_response',
        response: 'no'
      });
      // Disable buttons after clicking
      approveButton.disabled = true;
      rejectButton.disabled = true;
    };

    buttonsDiv.appendChild(approveButton);
    buttonsDiv.appendChild(rejectButton);
    
    // Display the thinking analysis with buttons
    appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
  }

  function showThinkingAnalysisAndDecomposition(message) {
    console.log('=== showThinkingAnalysisAndDecomposition CALLED ===');
    console.log('showThinkingAnalysisAndDecomposition called with message:', message);
    
    try {
      const data = message.text;
      const userTask = data.user_task;
      const taskName = data.task_name;
      const taskArgs = data.task_args;
      const analysisText = data.analysis_text;
      
      console.log('Thinking analysis and decomposition data:', { userTask, taskName, taskArgs, analysisText });
      
      // Format the analysis text (use the one from backend if available)
      console.log('About to format text...');
      const formattedText = formatAnalysisTextSimple(analysisText || `Thinking...

Based on your input "${userTask}", I understood this as the action: ${taskName}(${taskArgs ? taskArgs.join(', ') : ''}).

Is it correct?`);
      console.log('Text formatted successfully');
    
    // Create approve/reject buttons for grounding confirmation
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      console.log('===========================================');
      console.log('=== CHATBOT APPROVE BUTTON CLICKED!!! ===');
      console.log('===========================================');
      console.log('Triggering chatbot_decomposition_action event...');
      console.trace('Button click stack trace');
      
      // Trigger the tree component's handleConfirm via custom event
      // The tree component will send the socket message
      const event = new CustomEvent('chatbot_decomposition_action', {
        detail: { action: 'approve', index: 0 }
      });
      window.dispatchEvent(event);
      console.log('Event dispatched:', event);
      
      // Disable and fade out buttons after clicking
      approveButton.disabled = true;
      rejectButton.disabled = true;
      approveButton.style.opacity = '0.3';
      rejectButton.style.opacity = '0.3';
      approveButton.style.cursor = 'not-allowed';
      rejectButton.style.cursor = 'not-allowed';
      console.log('Buttons disabled and faded');
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
      console.log('Decomposition reject button clicked');
      // Disable and fade out the approve/reject buttons
      approveButton.disabled = true;
      rejectButton.disabled = true;
      approveButton.style.opacity = '0.3';
      rejectButton.style.opacity = '0.3';
      approveButton.style.cursor = 'not-allowed';
      rejectButton.style.cursor = 'not-allowed';
      
      // Trigger showing all method options in the tree
      const event = new CustomEvent('chatbot_show_all_methods', {
        detail: { action: 'show_all' }
      });
      window.dispatchEvent(event);
    };

    buttonsDiv.appendChild(approveButton);
    buttonsDiv.appendChild(rejectButton);
    
    console.log('=== BUTTONS CREATED ===');
    console.log('Approve button:', approveButton);
    console.log('Reject button:', rejectButton);
    console.log('Buttons div:', buttonsDiv);
    
      // Display the thinking analysis with buttons
      console.log('About to append message...');
      appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
      console.log('=== MESSAGE APPENDED ===');
      
      // Also trigger decomposition tree display (this should be handled by the backend)
      // For now, we'll emit a message to show the decomposition tree
      console.log('Triggering decomposition tree display...');
    } catch (error) {
      console.error('Error in showThinkingAnalysisAndDecomposition:', error);
      console.error('Error stack:', error.stack);
    }
  }

  function displayDecompositionAnalysis(message) {
    console.log('displayDecompositionAnalysis called with message:', message);
    const data = message.text;
    const taskName = data.task_name;
    const analysisText = data.analysis_text;
    const subtaskNames = data.subtask_names;
    const preconditionNames = data.precondition_names;
    
    console.log('Analysis data:', { taskName, analysisText, subtaskNames, preconditionNames });
    
    // Format the analysis text
    const formattedText = formatAnalysisText(analysisText);
    
    // Create decomposition action buttons (similar to GUI logic)
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    // Approve button (equivalent to handleConfirm)
    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      console.log('Decomposition approve button clicked, sending response...');
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'approve', index: 0 }
      });
      // Disable buttons after clicking
      approveButton.disabled = true;
      rejectButton.disabled = true;
      moreOptionsButton.disabled = true;
      addMethodButton.disabled = true;
    };

    // Reject button (equivalent to handleRejectClick)
    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
      console.log('Decomposition reject button clicked, showing more options...');
      // Show more options (equivalent to handleRejectClick logic)
      showMoreOptionsButtons(buttonsDiv, approveButton, rejectButton);
    };

    // More Options button (placeholder for handleMoreOptionsClick)
    const moreOptionsButton = document.createElement('button');
    moreOptionsButton.className = 'more-options';
    moreOptionsButton.innerHTML = 'More Options';
    moreOptionsButton.style.marginRight = '10px';
    moreOptionsButton.style.display = 'none'; // Initially hidden
    moreOptionsButton.style.backgroundColor = '#95B9F3';
    moreOptionsButton.style.color = 'white';
    moreOptionsButton.style.border = 'none';
    moreOptionsButton.style.borderRadius = '16px';
    moreOptionsButton.style.padding = '8px 16px';
    moreOptionsButton.style.cursor = 'pointer';
    moreOptionsButton.onclick = () => {
      console.log('More options button clicked - placeholder');
      // TODO: Implement handleMoreOptionsClick logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'show_more_options' }
      });
    };

    // Add Method button (placeholder for handleAddMethod)
    const addMethodButton = document.createElement('button');
    addMethodButton.className = 'add-method';
    addMethodButton.innerHTML = '+ Create Method';
    addMethodButton.style.display = 'none'; // Initially hidden
    addMethodButton.style.backgroundColor = '#95B9F3';
    addMethodButton.style.color = 'white';
    addMethodButton.style.border = 'none';
    addMethodButton.style.borderRadius = '16px';
    addMethodButton.style.padding = '8px 16px';
    addMethodButton.style.cursor = 'pointer';
    addMethodButton.onclick = () => {
      console.log('Add method button clicked - placeholder');
      // TODO: Implement handleAddMethod logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'add_method' }
      });
    };

    // Edit button (placeholder for handleEditClick)
    const editButton = document.createElement('button');
    editButton.className = 'edit';
    editButton.innerHTML = '✎ Edit';
    editButton.style.marginRight = '10px';
    editButton.style.display = 'none'; // Initially hidden
    editButton.style.backgroundColor = '#FFA500';
    editButton.style.color = 'white';
    editButton.style.border = 'none';
    editButton.style.borderRadius = '16px';
    editButton.style.padding = '8px 16px';
    editButton.style.cursor = 'pointer';
    editButton.onclick = () => {
      console.log('Edit button clicked - placeholder');
      // TODO: Implement handleEditClick logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'gui_edit', task_to_edit: 'placeholder' }
      });
    };

    // Confirm Edit button (placeholder for handleConfirmEdit)
    const confirmEditButton = document.createElement('button');
    confirmEditButton.className = 'confirm-edit';
    confirmEditButton.innerHTML = '✓ Confirm Edit';
    confirmEditButton.style.marginRight = '10px';
    confirmEditButton.style.display = 'none'; // Initially hidden
    confirmEditButton.onclick = () => {
      console.log('Confirm edit button clicked - placeholder');
      // TODO: Implement handleConfirmEdit logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'confirm_edit' }
      });
    };

    // Trash button (placeholder for handleTrashClick)
    const trashButton = document.createElement('button');
    trashButton.className = 'trash';
    trashButton.innerHTML = '🗑 Delete';
    trashButton.style.marginRight = '10px';
    trashButton.style.display = 'none'; // Initially hidden
    trashButton.onclick = () => {
      console.log('Trash button clicked - placeholder');
      // TODO: Implement handleTrashClick logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'delete_task', task_to_delete: 'placeholder' }
      });
    };

    // Add Node button (placeholder for handleAddNode)
    const addNodeButton = document.createElement('button');
    addNodeButton.className = 'add-node';
    addNodeButton.innerHTML = '+ Add Node';
    addNodeButton.style.display = 'none'; // Initially hidden
    addNodeButton.onclick = () => {
      console.log('Add node button clicked - placeholder');
      // TODO: Implement handleAddNode logic
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'add_node', parent_task: 'placeholder' }
      });
    };

    // Store buttons for later use
    buttonsDiv._approveButton = approveButton;
    buttonsDiv._rejectButton = rejectButton;
    buttonsDiv._moreOptionsButton = moreOptionsButton;
    buttonsDiv._addMethodButton = addMethodButton;
    buttonsDiv._editButton = editButton;
    buttonsDiv._confirmEditButton = confirmEditButton;
    buttonsDiv._trashButton = trashButton;
    buttonsDiv._addNodeButton = addNodeButton;

    buttonsDiv.appendChild(approveButton);
    buttonsDiv.appendChild(rejectButton);
    buttonsDiv.appendChild(moreOptionsButton);
    buttonsDiv.appendChild(addMethodButton);
    buttonsDiv.appendChild(editButton);
    buttonsDiv.appendChild(confirmEditButton);
    buttonsDiv.appendChild(trashButton);
    buttonsDiv.appendChild(addNodeButton);
    
    // Display the analysis with buttons
    appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
  }

  // Helper function to show more options (equivalent to handleRejectClick)
  function showMoreOptionsButtons(buttonsDiv, approveButton, rejectButton) {
    const moreOptionsButton = buttonsDiv._moreOptionsButton;
    const addMethodButton = buttonsDiv._addMethodButton;
    const editButton = buttonsDiv._editButton;
    const confirmEditButton = buttonsDiv._confirmEditButton;
    const trashButton = buttonsDiv._trashButton;
    const addNodeButton = buttonsDiv._addNodeButton;
    
    // Hide reject button
    rejectButton.style.display = 'none';
    
    // Show more options
    moreOptionsButton.style.display = 'inline-block';
    addMethodButton.style.display = 'inline-block';
    editButton.style.display = 'inline-block';
    confirmEditButton.style.display = 'none'; // Keep hidden initially
    trashButton.style.display = 'none'; // Keep hidden initially
    addNodeButton.style.display = 'none'; // Keep hidden initially
  }

  function displayDecompositionAnalysisFromTree(message) {
    console.log('displayDecompositionAnalysisFromTree called with message:', message);
    const treeData = message.text;
    const taskName = treeData.head.name;
    const subtasks = treeData.subtasks[0] || [];
    
    // Create analysis text from tree data
    const subtaskNames = subtasks.map(task => `${task.task_name}(${task.args.join(', ')})`);
    const analysisText = `**Decomposition Analysis:**

**Task:** ${taskName}
**Proposed Decomposition:** ${subtaskNames.join(', ')}

**Reasoning:** This decomposition breaks down the task into manageable subtasks that can be executed in sequence.

**Preconditions:** None specified
`;
    
    console.log('Analysis data:', { taskName, analysisText, subtaskNames });
    
    // Format the analysis text
    const formattedText = formatAnalysisText(analysisText);
    
    // Create approve/reject buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      console.log('Approve button clicked, sending response...');
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'approve', index: 0 }
      });
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
      console.log('Reject button clicked, sending response...');
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'reject', index: 0 }
      });
    };

    buttonsDiv.appendChild(approveButton);
    buttonsDiv.appendChild(rejectButton);
    
    // Display the analysis with buttons
    appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
  }

  function displayDecompositionConfirmationFromTree(message) {
    console.log('displayDecompositionConfirmationFromTree called with message:', message);
    const container = document.getElementById('prompt-message');
    if (container && container.children.length > 0) {
      console.log('Skipping fallback confirmation message because the chatbot already has content');
      return;
    }

    const treeData = message.text;
    const taskName = treeData?.head?.name || 'task';
    const taskArg = treeData?.head?.V || '';
    const subtasks = treeData?.subtasks?.[0] || [];
    const subtaskNames = subtasks.map(task => `${task.task_name}(${(task.args || []).join(', ')})`);
    const analysisText = `Thinking...

Based on my knowledge and the condition, I will decompose ${taskName} to ${subtaskNames.join(', ')}.

Is it correct?`;

    const formattedText = formatAnalysisTextSimple(analysisText);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      const event = new CustomEvent('chatbot_decomposition_action', {
        detail: { action: 'approve', index: 0 }
      });
      window.dispatchEvent(event);
      approveButton.disabled = true;
      rejectButton.disabled = true;
      approveButton.style.opacity = '0.3';
      rejectButton.style.opacity = '0.3';
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
      const event = new CustomEvent('chatbot_show_all_methods', {
        detail: { action: 'show_all' }
      });
      window.dispatchEvent(event);
      approveButton.disabled = true;
      rejectButton.disabled = true;
      approveButton.style.opacity = '0.3';
      rejectButton.style.opacity = '0.3';
    };

    buttonsDiv.appendChild(approveButton);
    buttonsDiv.appendChild(rejectButton);

    appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
  }

  function confirmation(data) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';

    const yesButton = document.createElement('button');
    yesButton.className = 'yes';
    yesButton.textContent = 'Yes';
    yesButton.onclick = () => {
      socket.emit('message', {type:"confirm_response", response: 'yes' });
      appendMessage("Me", userPic, "right", 'yes');
    };

    const noButton = document.createElement('button');
    noButton.className = 'no';
    noButton.textContent = 'No';
    noButton.onclick = () => {
      socket.emit('message', {type:"confirm_response", response: 'no' });
      appendMessage("Me", userPic, "right", 'no');
    };

    buttonsDiv.appendChild(yesButton);
    buttonsDiv.appendChild(noButton);

    appendMessage("VAL", valPic, "left", data['text'], buttonsDiv);
  }


  function correctGrounding(data) {
    const dialog = document.createElement('div');
    dialog.className = 'chatbot-container val-output';

    const form = document.createElement('form');
    form.className = 'grounding-correction-form';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
    });

    // Create action selection
    const actionLabel = document.createElement('label');
    actionLabel.textContent = 'Action:';
    actionLabel.style.display = 'block';
    actionLabel.style.marginBottom = '5px';
    actionLabel.style.fontWeight = 'bold';

    const actionSelect = document.createElement('select');
    actionSelect.name = 'action-select';
    actionSelect.style.width = '100%';
    actionSelect.style.padding = '8px';
    actionSelect.style.marginBottom = '15px';
    actionSelect.style.border = '1px solid #ccc';
    actionSelect.style.borderRadius = '4px';

    // Add current action as default option
    const currentActionOption = document.createElement('option');
    currentActionOption.value = data['current_action'];
    currentActionOption.textContent = data['current_action'] + ' (current)';
    currentActionOption.selected = true;
    actionSelect.appendChild(currentActionOption);

    // Add other common actions
    const commonActions = ['pick', 'place', 'cook', 'cut', 'pour', 'mix', 'serve', 'open', 'close'];
    commonActions.forEach(action => {
      if (action !== data['current_action']) {
        const option = document.createElement('option');
        option.value = action;
        option.textContent = action;
        actionSelect.appendChild(option);
      }
    });

    // Create objects selection
    const objectsLabel = document.createElement('label');
    objectsLabel.textContent = 'Objects (select multiple):';
    objectsLabel.style.display = 'block';
    objectsLabel.style.marginBottom = '5px';
    objectsLabel.style.fontWeight = 'bold';

    const objectsSelect = document.createElement('select');
    objectsSelect.name = 'objects-select';
    objectsSelect.multiple = true;
    objectsSelect.style.width = '100%';
    objectsSelect.style.padding = '8px';
    objectsSelect.style.marginBottom = '15px';
    objectsSelect.style.border = '1px solid #ccc';
    objectsSelect.style.borderRadius = '4px';
    objectsSelect.style.height = '120px';

    // Add available objects
    data['available_objects'].forEach((obj, index) => {
      const option = document.createElement('option');
      option.value = obj;
      option.textContent = obj;
      
      // Pre-select current objects
      if (data['current_objects'].includes(obj)) {
        option.selected = true;
      }
      
      objectsSelect.appendChild(option);
    });

    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.className = 'chatbot-container buttons';
    submitButton.textContent = 'Submit Correction';
    submitButton.style.width = '100%';
    submitButton.style.padding = '10px';
    submitButton.style.backgroundColor = '#007bff';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    
    submitButton.onclick = () => {
      const selectedAction = actionSelect.value;
      const selectedObjects = Array.from(objectsSelect.selectedOptions).map(option => option.value);
      
      // Format response as "action:object1,object2"
      const response = `${selectedAction}:${selectedObjects.join(',')}`;
      
      socket.emit('message', {
        type: "correct_grounding_response", 
        response: response 
      });
      
      // Show user's selection in chat
      appendMessage("Me", userPic, "right", `Corrected to: ${selectedAction} -> ${selectedObjects.join(', ')}`);
    };

    // Assemble form
    form.appendChild(actionLabel);
    form.appendChild(actionSelect);
    form.appendChild(objectsLabel);
    form.appendChild(objectsSelect);
    form.appendChild(submitButton);
    dialog.appendChild(form);
    
    appendMessage("VAL", valPic, "left", data['text'], null, dialog);
  }

  return (
    <div className="chatbot-container">
      <section className="msger">
        <header className="msger-header">
          <div className="msger-header-title">
            <i className="fas fa-comment-alt"></i> Val
          </div>
          <div className="msger-header-options">
            <span><i className="fas fa-cog"></i></span>
          </div>
        </header>

        <main className="msger-chat">
          <div id="prompt-message"></div>
        </main>

        <form className="msger-inputarea">
          <input type="text" className="msger-input" placeholder="Enter your message..." />
          <button type="submit" className="msger-send-btn">Send</button>
        </form>
      </section>
    </div>
  );
}

export default Chatbot;



import React, { useEffect } from 'react';
import './chat.css';
import userPic from './assets/user_pic.jpg';
import valPic from './assets/val_pic.jpg';

function Chatbot({ socket, message }) {
  const emitMessage = (payload) => {
    try {
      socket?.emit?.('message', payload);
    } catch (e) {
      console.error('[chatbot] emit failed:', e, 'payload:', payload);
    }
  };

  useEffect(() => {

    const msgerForm = document.getElementsByClassName("msger-inputarea")[0];
    const msgerInput = document.getElementsByClassName("msger-input")[0];

    if (!socket) {
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
            emitMessage({ type: "confirm_response", response: userInput });
          } catch (error) {
            console.error('Error sending message:', error);
          }
        }
        appendMessage("Me", userPic, "right", userInput);
        msgerInput.value = "";
      });
    }

    return () => {
      if (msgerForm) {
        msgerForm.removeEventListener('submit', () => {});
      }
    };
  }, [socket]);

  useEffect(() => {
    if (message) {

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
        displayThinkingAnalysis(message);
      }
      else if (message['type'] === 'show_thinking_analysis_and_decomposition') {
        showThinkingAnalysisAndDecomposition(message);
      }
      else if (message['type'] === 'display_decomposition_analysis') {
        displayDecompositionAnalysis(message);
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
    const msgTextElement = container.lastElementChild.querySelector(".msg-text");

    if (buttons) {
      lastMsgBubble.appendChild(buttons);
    }

    if (options) {
      lastMsgBubble.appendChild(options);
    }

    return { lastMsgBubble, msgTextElement };
  }

  function buildDialog(data) {
    
    let displayText = data['text'];
    
    // Enhanced formatting for different message types
    if (data['type'] === 'display_decomposition_analysis') {
      displayText = formatAnalysisText(data['text']);
    } else if (data['type'] === 'display_method_creation') {
      displayText = formatMethodCreationText(data['text']);
    } else if (data['type'] === 'display_edit_options') {
      displayText = formatEditOptionsText(data['text']);
    }
    
    appendMessage("VAL", valPic, "left", displayText);
  }

  function formatAnalysisTextSimple(text) {
    // Simple formatting for thinking analysis
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function formatAnalysisText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function formatCollapsedThinkingPrompt(thinkingText) {
    const detailText = (thinkingText || '').trim();

    if (!detailText) {
      return '<div class="decomposition-prompt-text">The task expands into the subtasks on the right→.</div>';
    }

    return `
      <div class="decomposition-prompt-text">The task expands into the subtasks on the right→.</div>
      <details class="thinking-collapse">
        <summary>Thinking</summary>
        <div class="thinking-collapse-content">${formatAnalysisTextSimple(detailText)}</div>
      </details>
    `;
  }

  function mountDecompositionChoicePrompt({
    taskName,
    initialText,
    decompositionMethods = [],
  }) {
    let currentDecompositionMethods = decompositionMethods;
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const appended = appendMessage(
      "VAL",
      valPic,
      "left",
      formatCollapsedThinkingPrompt(initialText),
      buttonsDiv
    );

    const msgTextElement = appended?.msgTextElement;

    const setMessageText = (text) => {
      if (msgTextElement) {
        msgTextElement.innerHTML = formatCollapsedThinkingPrompt(text);
      }
    };

    const setButtonDisabled = (button, disabled = true) => {
      if (!button) return;
      button.disabled = disabled;
      button.style.opacity = disabled ? '0.3' : '1';
      button.style.cursor = disabled ? 'not-allowed' : 'pointer';
    };

    const styleOptionButton = (button) => {
      button.style.backgroundColor = '#95B9F3';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '16px';
      button.style.padding = '8px 16px';
    };

    const createActionButton = (label, className, onClick) => {
      const button = document.createElement('button');
      button.className = className;
      button.innerHTML = label;
      button.style.marginRight = '10px';
      button.onclick = onClick;
      return button;
    };

    const syncMethodsFromEvent = (event) => {
      const detail = event?.detail || {};
      const nextTaskName = detail.taskName;
      const nextMethods = detail.decompositionMethods;

      if (nextTaskName && nextTaskName !== taskName) {
        return;
      }

      if (Array.isArray(nextMethods) && nextMethods.length > 0) {
        currentDecompositionMethods = nextMethods;
      }
    };

    window.addEventListener('chatbot_set_decomposition_methods', syncMethodsFromEvent);

    const getMethodText = (methodIndex, isAlternative = false) => {
      const subtasks = currentDecompositionMethods?.[methodIndex] || [];
      if (subtasks.length === 0) {
        return isAlternative
          ? `I can try another decomposition for ${taskName}.\n\nIs it correct?`
          : initialText;
      }

      const subtaskNames = subtasks.map(task => {
        const args = Array.isArray(task.args) ? task.args.filter(Boolean) : [];
        return args.length > 0
          ? `${task.task_name}(${args.join(', ')})`
          : task.task_name;
      });

      if (isAlternative) {
        return `I can also try another decomposition for ${taskName}:\n\n${subtaskNames.join(', ')}.\n\nIs this one correct?`;
      }

      return `Is this decomposition correct?`;
    };

    const renderApproveReject = (methodIndex, isAlternative = false) => {
      setMessageText(
        methodIndex === 0 && !isAlternative
          ? initialText
          : getMethodText(methodIndex, isAlternative)
      );

      buttonsDiv.innerHTML = '';

      const approveButton = createActionButton('Approve', 'yes', () => {
        window.dispatchEvent(new CustomEvent('chatbot_decomposition_action', {
          detail: { action: 'approve', index: methodIndex }
        }));
        setButtonDisabled(approveButton);
        setButtonDisabled(rejectButton);
      });

      const rejectButton = createActionButton('Reject', 'no', () => {
        renderRejectOptions(methodIndex, approveButton);
      });

      buttonsDiv.appendChild(approveButton);
      buttonsDiv.appendChild(rejectButton);
    };

    const renderRejectOptions = (methodIndex, approveButton) => {
      buttonsDiv.innerHTML = '';
      buttonsDiv.appendChild(approveButton);

      const optionContainer = document.createElement('div');
      optionContainer.style.display = 'inline-flex';
      optionContainer.style.flexDirection = 'column';
      optionContainer.style.gap = '8px';
      optionContainer.style.verticalAlign = 'top';

      const addMethodButton = createActionButton('+ Add Method', 'more-options', () => {
        setButtonDisabled(addMethodButton);
        setButtonDisabled(moreOptionsButton);
        window.dispatchEvent(new CustomEvent('chatbot_add_method', {
          detail: { action: 'add_method', index: methodIndex }
        }));
      });
      addMethodButton.style.marginRight = '0';
      styleOptionButton(addMethodButton);

      const hasNextMethod = methodIndex + 1 < currentDecompositionMethods.length;
      const moreOptionsButton = createActionButton('More Options', 'more-options', () => {
        if (!hasNextMethod) {
          return;
        }

        const nextMethodIndex = methodIndex + 1;
        window.dispatchEvent(new CustomEvent('chatbot_preview_method', {
          detail: { index: nextMethodIndex }
        }));
        renderApproveReject(nextMethodIndex, true);
      });
      moreOptionsButton.style.marginRight = '0';
      styleOptionButton(moreOptionsButton);

      if (!hasNextMethod) {
        setButtonDisabled(moreOptionsButton);
      }

      optionContainer.appendChild(addMethodButton);
      optionContainer.appendChild(moreOptionsButton);
      buttonsDiv.appendChild(optionContainer);
    };

    renderApproveReject(0, false);
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
    const data = message.text;
    const userTask = data.user_task;
    const taskName = data.task_name;
    const taskArgs = data.task_args;
    const analysisText = data.analysis_text;
    
    
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
    
    try {
      const data = message.text;
      const userTask = data.user_task;
      const taskName = data.task_name;
      const taskArgs = data.task_args;
      const analysisText = data.analysis_text;
      
      
      const promptText = analysisText || 'Is this decomposition correct?';

      mountDecompositionChoicePrompt({
        taskName,
        initialText: promptText,
        decompositionMethods: data.subtasks || [],
      });
      return;
    
    // Create approve/reject buttons for grounding confirmation
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-container buttons';
    buttonsDiv.style.marginTop = '10px';

    const approveButton = document.createElement('button');
    approveButton.className = 'yes';
    approveButton.innerHTML = '✓ Approve';
    approveButton.style.marginRight = '10px';
    approveButton.onclick = () => {
      console.trace('Button click stack trace');

      emitMessage({
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'approve', index: 0 },
      });
      
      // Trigger the tree component's handleConfirm via custom event
      // The tree component will send the socket message
      const event = new CustomEvent('chatbot_decomposition_action', {
        detail: { action: 'approve', index: 0 }
      });
      window.dispatchEvent(event);
      
      // Disable and fade out buttons after clicking
      approveButton.disabled = true;
      rejectButton.disabled = true;
      approveButton.style.opacity = '0.3';
      rejectButton.style.opacity = '0.3';
      approveButton.style.cursor = 'not-allowed';
      rejectButton.style.cursor = 'not-allowed';
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
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
    
    
      // Display the thinking analysis with buttons
      appendMessage("VAL", valPic, "left", formattedText, buttonsDiv);
      
      // Also trigger decomposition tree display (this should be handled by the backend)
      // For now, we'll emit a message to show the decomposition tree
    } catch (error) {
      console.error('Error in showThinkingAnalysisAndDecomposition:', error);
      console.error('Error stack:', error.stack);
    }
  }

  function displayDecompositionAnalysis(message) {
    const data = message.text;
    const taskName = data.task_name;
    const analysisText = data.analysis_text;
    const subtaskNames = data.subtask_names;
    const preconditionNames = data.precondition_names;
    
    
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
      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: { user_choice: 'approve', index: 0 }
      });
    };

    const rejectButton = document.createElement('button');
    rejectButton.className = 'no';
    rejectButton.innerHTML = '× Reject';
    rejectButton.onclick = () => {
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
    const currentObjects = Array.isArray(data['current_objects']) ? data['current_objects'] : [];
    const availableActions = Array.isArray(data['available_actions']) ? data['available_actions'] : [];
    const availableObjects = Array.isArray(data['available_objects']) ? data['available_objects'] : [];

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

    // Add other available actions from the backend
    availableActions.forEach(action => {
      if (action !== data['current_action']) {
        const option = document.createElement('option');
        option.value = action;
        option.textContent = action;
        actionSelect.appendChild(option);
      }
    });

    // Create objects selection
    const objectsLabel = document.createElement('label');
    objectsLabel.textContent = 'Objects (optional, select multiple):';
    objectsLabel.style.display = 'block';
    objectsLabel.style.marginBottom = '5px';
    objectsLabel.style.fontWeight = 'bold';

    const noObjectWrapper = document.createElement('label');
    noObjectWrapper.style.display = 'flex';
    noObjectWrapper.style.alignItems = 'center';
    noObjectWrapper.style.gap = '8px';
    noObjectWrapper.style.marginBottom = '10px';

    const noObjectCheckbox = document.createElement('input');
    noObjectCheckbox.type = 'checkbox';
    noObjectCheckbox.name = 'no-object-checkbox';
    noObjectCheckbox.checked = currentObjects.length === 0;

    const noObjectText = document.createElement('span');
    noObjectText.textContent = 'None / No object';

    noObjectWrapper.appendChild(noObjectCheckbox);
    noObjectWrapper.appendChild(noObjectText);

    const objectsSelect = document.createElement('select');
    objectsSelect.name = 'objects-select';
    objectsSelect.multiple = true;
    objectsSelect.style.width = '100%';
    objectsSelect.style.padding = '8px';
    objectsSelect.style.marginBottom = '15px';
    objectsSelect.style.border = '1px solid #ccc';
    objectsSelect.style.borderRadius = '4px';
    objectsSelect.style.height = '120px';
    objectsSelect.disabled = noObjectCheckbox.checked;

    // Add available objects
    availableObjects.forEach((obj, index) => {
      const option = document.createElement('option');
      option.value = obj;
      option.textContent = obj;
      
      // Pre-select current objects
      if (currentObjects.includes(obj)) {
        option.selected = true;
      }
      
      objectsSelect.appendChild(option);
    });

    noObjectCheckbox.addEventListener('change', () => {
      const useNoObject = noObjectCheckbox.checked;
      objectsSelect.disabled = useNoObject;
      if (useNoObject) {
        Array.from(objectsSelect.options).forEach((option) => {
          option.selected = false;
        });
      }
    });

    objectsSelect.addEventListener('change', () => {
      const hasSelectedObject = Array.from(objectsSelect.selectedOptions).length > 0;
      if (hasSelectedObject && noObjectCheckbox.checked) {
        noObjectCheckbox.checked = false;
        objectsSelect.disabled = false;
      }
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
      const selectedObjects = noObjectCheckbox.checked
        ? []
        : Array.from(objectsSelect.selectedOptions).map(option => option.value);
      
      // Format response as "action:object1,object2"
      const response = `${selectedAction}:${selectedObjects.join(',')}`;
      
      socket.emit('message', {
        type: "correct_grounding_response", 
        response: response 
      });
      
      // Show user's selection in chat
      const objectSummary = selectedObjects.length > 0 ? selectedObjects.join(', ') : 'no object';
      appendMessage("Me", userPic, "right", `Corrected to: ${selectedAction} -> ${objectSummary}`);
    };

    // Assemble form
    form.appendChild(actionLabel);
    form.appendChild(actionSelect);
    form.appendChild(objectsLabel);
    form.appendChild(noObjectWrapper);
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



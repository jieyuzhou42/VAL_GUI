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
    }

    if (msgerForm) {
      msgerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        let userInput = msgerInput.value.trim();
        if (!userInput) return;

        if (socket) {
          socket.emit('message', {type:"confirm_response", response: userInput });
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

      if (
        message['type'] === 'display_known_tasks' ||
        message['type'] === 'request_user_task' ||
        message['type'] === 'ask_subtasks' ||
        message['type'] === 'ask_rephrase' ||
        message['type'] === 'display_decomposition_analysis' ||
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
      else if (message['type'] === 'chatbot_edit_mode') {
        buildChatEditUI(message);
      }
    }
  }, [message]);

  function appendMessage(name, img, side, text, buttons = null, options = null) {
    const container = document.getElementById('prompt-message');

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
    let displayText = data['text'];
    
    // Enhanced formatting for different message types
    if (data['type'] === 'display_decomposition_analysis') {
      buildDecompositionAnalysisUI(data);
      return;
    } else if (data['type'] === 'display_method_creation') {
      displayText = formatMethodCreationText(data['text']);
    } else if (data['type'] === 'display_edit_options') {
      displayText = formatEditOptionsText(data['text']);
    }
    
    appendMessage("VAL", valPic, "left", displayText);
  }

  function formatAnalysisText(text) {
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">$1</code>')
      .replace(/\n\n/g, '<br><br>')
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

  function buildDecompositionAnalysisUI(data) {
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'decomposition-analysis';
    analysisContainer.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
    `;

    // Parse the analysis text to extract components
    const text = data['text'];
    
    // Create header
    const header = document.createElement('div');
    header.innerHTML = '<strong>🔍 Decomposition Analysis</strong>';
    header.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #2c3e50;
    `;
    analysisContainer.appendChild(header);

    // Create content sections
    const content = document.createElement('div');
    content.innerHTML = formatAnalysisText(text);
    content.style.cssText = `
      font-size: 13px;
      line-height: 1.4;
      color: #495057;
    `;
    analysisContainer.appendChild(content);

    // Add to chat
    const container = document.getElementById('prompt-message');
    const msgHTML = `
      <div class="chatbot-container-msg msg left-msg">
        <div class="msg-img" style="background-image: url(${valPic})"></div>
        <div class="msg-bubble">
          <div class="msg-text"></div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", msgHTML);
    
    const lastMsgBubble = container.lastElementChild.querySelector(".msg-bubble");
    lastMsgBubble.appendChild(analysisContainer);
    container.scrollTop += 500;
  }

  function buildChatEditUI(data) {
    const editContainer = document.createElement('div');
    editContainer.className = 'chat-edit-form';
    editContainer.style.cssText = `
      background: #fff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
    `;

    // Header
    const header = document.createElement('div');
    header.innerHTML = '<strong>✏️ Chat Edit Mode</strong>';
    header.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #2c3e50;
    `;
    editContainer.appendChild(header);

    // Instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = 'Describe how you want to decompose this task:';
    instructions.style.cssText = `
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 8px;
    `;
    editContainer.appendChild(instructions);

    // Textarea for user input
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Example: First check if I have enough ingredients, then get missing ones, prepare them separately, cook meat and vegetables in parallel...';
    textarea.style.cssText = `
      width: 100%;
      height: 80px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 8px;
      font-size: 12px;
      font-family: inherit;
      color: #2A2F3A;
      background: #fff;
      resize: vertical;
      margin-bottom: 8px;
    `;
    editContainer.appendChild(textarea);

    // Preconditions input
    const preconditionsLabel = document.createElement('div');
    preconditionsLabel.innerHTML = 'Preconditions (optional):';
    preconditionsLabel.style.cssText = `
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 4px;
    `;
    editContainer.appendChild(preconditionsLabel);

    const preconditionsInput = document.createElement('input');
    preconditionsInput.type = 'text';
    preconditionsInput.placeholder = 'e.g., ingredients_available, stove_free';
    preconditionsInput.style.cssText = `
      width: 100%;
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 6px;
      font-size: 12px;
      font-family: inherit;
      color: #2A2F3A;
      background: #fff;
      margin-bottom: 10px;
    `;
    editContainer.appendChild(preconditionsInput);

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit Edit';
    submitButton.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    submitButton.onclick = (e) => {
      e.preventDefault();
      const chatbotResponse = textarea.value.trim();
      const preconditionsText = preconditionsInput.value.trim();
      const preconditions = preconditionsText ? 
        preconditionsText.split(',').map(s => s.trim()).filter(s => s) : [];

      if (!chatbotResponse) {
        alert('Please describe how you want to decompose the task.');
        return;
      }

      socket.emit('message', {
        type: 'response_decomposition_with_edit',
        response: {
          user_choice: 'chatbot_edit',
          chatbot_response: chatbotResponse,
          preconditions: preconditions
        }
      });

      // Show user's input in chat
      appendMessage("Me", userPic, "right", `Chat Edit: ${chatbotResponse}`);
      
      // Hide the edit form
      editContainer.style.display = 'none';
    };

    submitButton.onmouseover = () => submitButton.style.backgroundColor = '#0056b3';
    submitButton.onmouseout = () => submitButton.style.backgroundColor = '#007bff';

    editContainer.appendChild(submitButton);

    // Add to chat
    const container = document.getElementById('prompt-message');
    const msgHTML = `
      <div class="chatbot-container-msg msg left-msg">
        <div class="msg-img" style="background-image: url(${valPic})"></div>
        <div class="msg-bubble">
          <div class="msg-text"></div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", msgHTML);
    
    const lastMsgBubble = container.lastElementChild.querySelector(".msg-bubble");
    lastMsgBubble.appendChild(editContainer);
    container.scrollTop += 500;

    // Focus on textarea
    textarea.focus();
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

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    `;

    // Create submit correction button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit Correction';
    submitButton.style.cssText = `
      width: 100%;
      padding: 10px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
    
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

    // Create edit decomposition button
    const editButton = document.createElement('button');
    editButton.textContent = '✏️ Edit Decomposition';
    editButton.style.cssText = `
      width: 100%;
      padding: 10px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
    
    editButton.onclick = () => {
      // Send edit request
      socket.emit('message', {
        type: "correct_grounding_response", 
        response: "EDIT_DECOMPOSITION"
      });
      
      appendMessage("Me", userPic, "right", "I want to edit the decomposition instead");
    };

    // Create add new method button
    const addMethodButton = document.createElement('button');
    addMethodButton.textContent = '+ Add New Method';
    addMethodButton.style.cssText = `
      width: 100%;
      padding: 10px;
      background-color: #ffc107;
      color: #212529;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
    
    addMethodButton.onclick = () => {
      // Send add method request
      socket.emit('message', {
        type: "correct_grounding_response", 
        response: "ADD_NEW_METHOD"
      });
      
      appendMessage("Me", userPic, "right", "I want to add a new method instead");
    };

    // Add buttons to container
    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(addMethodButton);

    // Assemble form
    form.appendChild(actionLabel);
    form.appendChild(actionSelect);
    form.appendChild(objectsLabel);
    form.appendChild(objectsSelect);
    form.appendChild(buttonContainer);
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



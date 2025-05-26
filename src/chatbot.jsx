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
        message['type'] === 'ask_rephrase'
      ) {
        buildDialog(message);
      } else if (
        message['type'] === 'segment_confirmation' ||
        message['type'] === 'map_confirmation' ||
        message['type'] === 'map_new_method_confirmation' ||
        message['type'] === 'ground_confirmation' ||
        message['type'] === 'gen_confirmation' ||
        message['type'] === 'confirm_task_decomposition' ||
        message['type'] === 'confirm_task_execution'
      ) {
        confirmation(message);
      } 
      else if (message['type'] === 'map_correction'){correction(message,'map');}
      else if (message['type'] === 'ground_correction'){correction(message,'ground');}
      else if (message['type'] === 'gen_correction') {correction(message, 'ground');}
    }
  }, [message]);

  function appendMessage(name, img, side, text, buttons = null, options = null) {
    const container = document.getElementById('prompt-message');

    const msgHTML = `
      <div class="chatbot-container-msg msg ${side}-msg">
        <div class="msg-img" style="background-image: url(${img})"></div>
        <div class="msg-bubble">
          <div class="msg-info">
            <div class="msg-info-name">${name}</div>
            <div class="msg-info-time">${formatDate(new Date())}</div>
          </div>
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
    appendMessage("VAL", valPic, "left", data['text']);
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

  function correction(data,type) {
    const container = document.getElementById('prompt-message');
    let known_tasks = [];
    if (type === 'map') {known_tasks = data['known_tasks'];}
    if (type === 'ground') {known_tasks = data['env_objects'];}

    const dialog = document.createElement('div');
    dialog.className = 'chatbot-container val-output';

    const form = document.createElement('form');
    form.className = 'options-form';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
    });

    const select = document.createElement('select');
    select.name = 'task-options';

    known_tasks.forEach((task, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = task;
      select.appendChild(option);
    });

    form.appendChild(select);

    const submitButton = document.createElement('button');
    submitButton.className = 'chatbot-container buttons';
    submitButton.textContent = 'Submit';
    submitButton.onclick = () => {
      const selectedOption = select.value;
      socket.emit('message', {type:"confirm_response", response: selectedOption });
    };

    form.appendChild(submitButton);
    dialog.appendChild(form);
    appendMessage("VAL", valPic, "left", data['text'], null, dialog);
  }

  function formatDate(date) {
    const h = "0" + date.getHours();
    const m = "0" + date.getMinutes();
    return `${h.slice(-2)}:${m.slice(-2)}`;
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



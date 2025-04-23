import React, { useEffect } from 'react';
import './chat.css';
import userPic from './assets/user_pic.jpg';
import valPic from './assets/val_pic.jpg';

function Chatbot({ socket }) {
  useEffect(() => {
    console.log('Chatbot component mounted!');

    const msgerForm = document.getElementsByClassName("msger-inputarea")[0];
    const msgerInput = document.getElementsByClassName("msger-input")[0];
    const container = document.getElementById('prompt-message');

    if (!socket) {
      console.warn("socket.io not found. Make sure you loaded it or installed it properly");
    }

    if (msgerForm) {
      msgerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        let message = msgerInput.value.trim();
        if (!message) return;

        if (socket) {
          socket.emit('message', { response: message });
        }
        appendMessage("Me", userPic, "right", message);
        msgerInput.value = "";
      });
    }

    if (socket) {
      socket.on('message', function (data) {
        console.log('socket.on message => ', data);

        if (
          data['type'] === 'display_known_tasks' ||
          data['type'] === 'request_user_task' ||
          data['type'] === 'ask_subtasks' ||
          data['type'] === 'ask_rephrase'
        ) {
          buildDialog(data);
        } else if (
          data['type'] === 'segment_confirmation' ||
          data['type'] === 'map_confirmation' ||
          data['type'] === 'map_new_method_confirmation' ||
          data['type'] === 'ground_confirmation' ||
          data['type'] === 'gen_confirmation' ||
          data['type'] === 'confirm_task_decomposition' ||
          data['type'] === 'confirm_task_execution'
        ) {
          confirmation(data);
        } else if (
          data['type'] === 'map_correction' ||
          data['type'] === 'ground_correction' ||
          data['type'] === 'gen_correction'
        ) {
          correction(data);
        }
      });
    }

    function appendMessage(name, img, side, text, buttons = null, options = null) {
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

    function formatDate(date) {
      const h = "0" + date.getHours();
      const m = "0" + date.getMinutes();
      return `${h.slice(-2)}:${m.slice(-2)}`;
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
        socket.emit('message', { response: 'yes' });
        appendMessage("Me", userPic, "right", 'yes');
      };

      const noButton = document.createElement('button');
      noButton.className = 'no';
      noButton.textContent = 'No';
      noButton.onclick = () => {
        socket.emit('message', { response: 'no' });
        appendMessage("Me", userPic, "right", 'no');
      };

      buttonsDiv.appendChild(yesButton);
      buttonsDiv.appendChild(noButton);

      appendMessage("VAL", valPic, "left", data['text'], buttonsDiv);
    }

    function correction(data) {
      const container = document.getElementById('prompt-message');
      var known_tasks = data['known_tasks'];

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
        socket.emit('message', { response: selectedOption });
      };

      form.appendChild(submitButton);
      dialog.appendChild(form);
      appendMessage("VAL", valPic, "left", data['text'], null, dialog);
    }

    return () => {
      console.log("Chatbot component unmounted!");
      if (socket) {
        socket.off('message');
      }
      if (msgerForm) {
        msgerForm.removeEventListener('submit', () => {});
      }
    };
  }, []);

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


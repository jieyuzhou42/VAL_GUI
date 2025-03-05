import React, { useEffect } from 'react';
// 下面假设你把 chat.css 放在同级目录下
import './chat.css';

// 如果你想继续使用 jQuery，可以在public/index.html里引入
// <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
// 或者你在这个组件里用window.$ = require("jquery");（这比较hack，还是建议直接改成纯JS或用React方法）
//
// 同理，对于Socket.io，你可以在public/index.html里也加入：
// <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
// 然后在组件里通过 window.io 拿到 socket.io。
// 也可以用 npm 包: npm install socket.io-client，并 import { io } from 'socket.io-client'; 然后写自己的连接逻辑。

function Chatbot() {
  useEffect(() => {
    // -------------------------------
    // 这里就是你原来的 chat.js 主逻辑
    // -------------------------------
    console.log('Chatbot component mounted!');

    // 下面演示如何用纯JS的方式来找到这些元素
    // 注意 getElementsByClassName 返回的是HTMLCollection，需要 [0] 取第一个
    const msgerForm = document.getElementsByClassName("msger-inputarea")[0];
    const msgerInput = document.getElementsByClassName("msger-input")[0];
    const msgerChat = document.getElementsByClassName("msger-chat")[0];
    const container = document.getElementById('prompt-message');

    // 你可以改成：import { io } from 'socket.io-client' 再写:
    // const socket = io("http://你的后端端口");
    // 如果你想沿用全局 <script> 引入的socket.io，就写:
    const socket = window.io ? window.io() : null;

    if (!socket) {
      console.warn("socket.io not found. Make sure you loaded it or installed it properly");
    }

    // 原来的 $('form').submit(...) 可以改成原生JS事件监听
    // 或者继续用 jQuery，如果你在 public/index.html 里导入了 jQuery
    if (msgerForm) {
      msgerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let message = msgerInput.value.trim();
        if (!message) return;

        if (socket) {
          socket.emit('message', { response: message });
        }
        appendMessage("Me", "../static/images/user.pic.jpg", "right", message);
        msgerInput.value = "";
      });
    }

    // 原来的 socket.on('message', callback) 放到 useEffect 里
    if (socket) {
      socket.on('message', function(data) {
        console.log('socket.on message => ', data);

        // 根据不同的type，调用不同函数
        if (data['type'] === 'display_known_tasks'
          || data['type'] === 'request_user_task'
          || data['type'] === 'ask_subtasks'
          || data['type'] === 'ask_rephrase'
        ) {
          buildDialog(data);
        } else if (data['type'] === 'segment_confirmation'
          || data['type'] === 'map_confirmation'
          || data['type'] === 'map_new_method_confirmation'
          || data['type'] === 'ground_confirmation'
          || data['type'] === 'gen_confirmation'
          || data['type'] === 'confirm_task_decomposition'
          || data['type'] === 'confirm_task_execution'
        ) {
          confirmation(data);
        } else if (data['type'] === 'map_correction') {
          map_correction(data);
        } else if (data['type'] === 'ground_correction') {
          ground_correction(data);
        } else if (data['type'] === 'gen_correction') {
          gen_correction(data);
        }
      });
    }

    function appendMessage(name, img, side, text, buttons = null, options = null) {
      const msgHTML = `
        <div class="msg ${side}-msg">
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

      if (socket) {
        socket.emit('on log', msgHTML);
      }
      // TODO: 如果要把buttons/options插入，需要再找出刚才插入的那个DOM，追加子节点
      // ...
    }

    function formatDate(date) {
      const h = "0" + date.getHours();
      const m = "0" + date.getMinutes();
      return `${h.slice(-2)}:${m.slice(-2)}`;
    }

    function buildDialog(data) {
      appendMessage("VAL", "../static/images/val.pic.jpg", "left", data['text']);
    }

    function confirmation(data) {
      // 演示做个简单的Yes/No
      // 实际你可以像之前一样，appendMessage 之后再动态创建 buttons
      appendMessage("VAL", "../static/images/val.pic.jpg", "left", data['text']);
    }

    function map_correction(data) {
      // ...
      appendMessage("VAL", "../static/images/val.pic.jpg", "left", data['text']);
    }

    function ground_correction(data) {
      // ...
      appendMessage("VAL", "../static/images/val.pic.jpg", "left", data['text']);
    }

    function gen_correction(data) {
      // ...
      appendMessage("VAL", "../static/images/val.pic.jpg", "left", data['text']);
    }

    // -------------------------------
    // return的清理函数 => 卸载组件时清理 socket 监听
    // -------------------------------
    return () => {
      console.log("Chatbot component unmounted!");
      if (socket) {
        socket.off('message'); // 取消监听
      }
      if (msgerForm) {
        msgerForm.removeEventListener('submit', () => {});
      }
    };
  }, []);

  return (
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
  );
}

export default Chatbot;

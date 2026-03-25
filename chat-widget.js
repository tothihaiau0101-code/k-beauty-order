/**
 * BeaPop Live Chat Widget
 * Features:
 * - Floating chat button (bottom-right corner)
 * - Chat popup with header, messages, input
 * - Light theme matching website
 * - Auto-fill user info from localStorage
 * - Real-time message polling (3s interval)
 */

(function() {
  'use strict';

  const _API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : (document.querySelector('meta[name="api-url"]')?.content || 'https://beapop-api.kbeautyorder.workers.dev');
  const CHAT_API = _API_BASE + '/api/chat';
  const STORAGE_KEY = 'beapop_chat_session';
  const USER_KEY = 'beapop_user';

  // Generate or get session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
  }

  // Get user info from localStorage
  function getUserInfo() {
    let user = null;
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        user = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse user info:', e);
    }
    return user;
  }

  // State
  let sessionId = getSessionId();
  let isChatOpen = false;
  let pollInterval = null;
  let lastMessageCount = 0;
  let userName = '';
  let userPhone = '';
  let isWaitingForReply = false;
  let hasShownWelcome = false;

  // Create chat widget HTML
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'beapop-chat-widget';
    widget.innerHTML = `
      <style>
        #beapop-chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
          font-family: 'Inter', sans-serif;
        }

        /* Floating button */
        .chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 20px rgba(168,85,247,0.4);
          transition: all 0.3s ease;
          animation: chatPulse 2s infinite;
        }

        .chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 24px rgba(168,85,247,0.5);
        }

        @keyframes chatPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(168,85,247,0.4); }
          50% { box-shadow: 0 4px 30px rgba(168,85,247,0.6); }
        }

        /* Chat popup */
        .chat-popup {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 360px;
          max-height: 500px;
          background: #f8f8f8;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.15);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: chatSlideIn 0.3s ease;
        }

        .chat-popup.open {
          display: flex;
        }

        @keyframes chatSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Header */
        .chat-header {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chat-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .chat-title {
          font-size: 1rem;
          font-weight: 700;
        }

        .chat-subtitle {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        .chat-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .chat-close:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Name input form */
        .chat-name-form {
          padding: 16px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          display: none;
        }

        .chat-name-form.show {
          display: block;
        }

        .chat-name-form input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
        }

        .chat-name-form input:focus {
          outline: none;
          border-color: #a855f7;
        }

        .chat-name-form button {
          margin-top: 8px;
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        /* Messages area */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-message {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 0.9rem;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .chat-message.customer {
          align-self: flex-end;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-message.support {
          align-self: flex-start;
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
          border-bottom-left-radius: 4px;
        }

        .chat-message-time {
          font-size: 0.7rem;
          opacity: 0.7;
          margin-top: 4px;
        }

        /* Typing indicator */
        .typing-indicator {
          display: none;
          align-self: flex-start;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 16px;
          padding: 10px 14px;
        }

        .typing-indicator.show {
          display: flex;
          gap: 4px;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #a855f7;
          animation: typingBounce 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        /* Input area */
        .chat-input-wrap {
          padding: 12px 16px;
          background: white;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 8px;
        }

        .chat-input-wrap input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 0.9rem;
          font-family: 'Inter', sans-serif;
          outline: none;
        }

        .chat-input-wrap input:focus {
          border-color: #a855f7;
        }

        .chat-input-wrap button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .chat-input-wrap button:hover {
          transform: scale(1.05);
        }

        .chat-input-wrap button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Welcome message */
        .chat-welcome {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 0.85rem;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .chat-popup {
            width: calc(100vw - 40px);
            bottom: 70px;
            right: -10px;
          }
        }
      </style>

      <button class="chat-button" id="chatButton" title="Chat với BeaPop">💬</button>

      <div class="chat-popup" id="chatPopup">
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="chat-avatar">💬</div>
            <div>
              <div class="chat-title">BeaPop Support</div>
              <div class="chat-subtitle">Hỗ trợ trực tuyến</div>
            </div>
          </div>
          <button class="chat-close" id="chatClose">&times;</button>
        </div>

        <div class="chat-name-form" id="chatNameForm">
          <input type="text" id="chatNameInput" placeholder="Nhập tên của bạn...">
          <input type="tel" id="chatPhoneInput" placeholder="Số điện thoại (tùy chọn)" style="margin-top: 8px;">
          <button id="chatNameSubmit">Bắt đầu chat</button>
        </div>

        <div class="chat-messages" id="chatMessages">
          <div class="chat-welcome">
            👋 Chào bạn! BeaPop có thể giúp gì cho bạn hôm nay?
          </div>
        </div>

        <div class="typing-indicator" id="typingIndicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>

        <div class="chat-input-wrap">
          <input type="text" id="chatInput" placeholder="Nhập tin nhắn..." maxlength="500">
          <button id="chatSend" disabled>➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Initialize event listeners
    initEventListeners();
  }

  function initEventListeners() {
    const chatButton = document.getElementById('chatButton');
    const chatPopup = document.getElementById('chatPopup');
    const chatClose = document.getElementById('chatClose');
    const chatNameForm = document.getElementById('chatNameForm');
    const chatNameInput = document.getElementById('chatNameInput');
    const chatPhoneInput = document.getElementById('chatPhoneInput');
    const chatNameSubmit = document.getElementById('chatNameSubmit');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const typingIndicator = document.getElementById('typingIndicator');

    // Toggle chat popup
    chatButton.addEventListener('click', () => {
      isChatOpen = !isChatOpen;
      chatPopup.classList.toggle('open', isChatOpen);

      if (isChatOpen) {
        // Show auto-welcome message on first open
        if (!hasShownWelcome) {
          showAutoWelcome();
          hasShownWelcome = true;
        }

        // Check if user needs to enter name
        const user = getUserInfo();
        if (user && user.name) {
          userName = user.name;
          userPhone = user.phone || '';
          chatNameForm.classList.remove('show');
          chatInput.disabled = false;
          chatSend.disabled = false;
        } else {
          chatNameForm.classList.add('show');
          chatNameInput.focus();
        }
        startPolling();
      } else {
        stopPolling();
      }
    });

    // Close button
    chatClose.addEventListener('click', () => {
      isChatOpen = false;
      chatPopup.classList.remove('open');
      stopPolling();
    });

    // Name submit
    chatNameSubmit.addEventListener('click', () => {
      const name = chatNameInput.value.trim();
      const phone = chatPhoneInput.value.trim();
      if (name) {
        userName = name;
        userPhone = phone;
        chatNameForm.classList.remove('show');
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
      }
    });

    chatNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') chatNameSubmit.click();
    });

    chatPhoneInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') chatNameSubmit.click();
    });

    // Send message
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    function sendMessage() {
      const message = chatInput.value.trim();
      if (!message || !userName) return;

      // Add message to UI
      addMessageToUI(message, 'customer');

      // Clear input
      chatInput.value = '';
      chatSend.disabled = true;

      // Send to API
      fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          name: userName,
          phone: userPhone,
          message: message
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          // Show typing indicator
          showTyping(true);
        }
      })
      .catch(err => {
        console.error('Chat send error:', err);
        addMessageToUI('⚠️ Gửi tin nhắn thất bại. Vui lòng thử lại.', 'support');
      });
    }
  }

  function addMessageToUI(text, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const welcome = messagesContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${type}`;

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    msgDiv.innerHTML = `${escapeHtml(text)}<div class="chat-message-time">${time}</div>`;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    lastMessageCount++;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    const messagesContainer = document.getElementById('chatMessages');

    if (show) {
      isWaitingForReply = true;
      // Move indicator to before the end of messages
      messagesContainer.appendChild(indicator);
      indicator.classList.add('show');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      isWaitingForReply = false;
      indicator.classList.remove('show');
    }
  }

  function startPolling() {
    if (pollInterval) return;

    // Initial poll
    pollMessages();

    // Poll every 3 seconds
    pollInterval = setInterval(pollMessages, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function pollMessages() {
    if (!userName) return; // Don't poll if user hasn't entered name

    fetch(`${CHAT_API}/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        const messages = data.messages || [];

        // Hide typing if we have new messages from support
        const supportMessages = messages.filter(m => m.role === 'support');
        if (supportMessages.length > 0 && isWaitingForReply) {
          showTyping(false);
        }

        // Add new messages
        if (messages.length > lastMessageCount) {
          for (let i = lastMessageCount; i < messages.length; i++) {
            const msg = messages[i];
            addMessageToUI(msg.message, msg.role === 'support' ? 'support' : 'customer');
          }
        }
      })
      .catch(err => {
        console.warn('Chat poll error:', err);
      });
  }

  // Show auto-welcome message when user opens chat for the first time
  function showAutoWelcome() {
    const welcomeMessage = "Xin chào! 👋 Chào mừng bạn đến với BeaPop — Shop mỹ phẩm & album K-Pop chính hãng từ Hàn Quốc 🇰🇷\n\nCảm ơn bạn đã ghé thăm! Shop sẽ phản hồi tin nhắn của bạn sớm nhất có thể. Trong thời gian chờ, bạn có thể xem thêm sản phẩm tại mục Catalog nhé! 💜";

    // Remove existing welcome message if any
    const messagesContainer = document.getElementById('chatMessages');
    const existingWelcome = messagesContainer.querySelector('.chat-welcome');
    if (existingWelcome) {
      existingWelcome.remove();
    }

    // Create and insert the auto-welcome message as a support-style message (left bubble)
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message support';
    msgDiv.innerHTML = `${escapeHtml(welcomeMessage)}<div class="chat-message-time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>`;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    lastMessageCount++;
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();

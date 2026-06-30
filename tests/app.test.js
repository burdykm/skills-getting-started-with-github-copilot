const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createAppHarness() {
  const fetchCalls = [];
  const elements = {};

  class FakeClassList {
    constructor(element) {
      this.element = element;
      this.classes = new Set();
    }

    add(...classNames) {
      classNames.forEach((className) => this.classes.add(className));
      this.element.className = Array.from(this.classes).join(' ');
    }

    remove(...classNames) {
      classNames.forEach((className) => this.classes.delete(className));
      this.element.className = Array.from(this.classes).join(' ');
    }
  }

  class FakeElement {
    constructor(id = '') {
      this.id = id;
      this.innerHTML = '';
      this.textContent = '';
      this.value = '';
      this.className = '';
      this.dataset = {};
      this.children = [];
      this.listeners = {};
      this.classList = new FakeClassList(this);
    }

    appendChild(child) {
      this.children.push(child);
      return child;
    }

    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    }

    reset() {
      this.value = '';
    }

    closest() {
      return null;
    }
  }

  const document = {
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    listeners: {},
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = new FakeElement(id);
      }
      return elements[id];
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };

  const activitySelect = document.getElementById('activity');
  const activitiesList = document.getElementById('activities-list');
  const signupForm = document.getElementById('signup-form');
  const messageDiv = document.getElementById('message');
  const emailInput = document.getElementById('email');

  elements['activity'] = activitySelect;
  elements['activities-list'] = activitiesList;
  elements['signup-form'] = signupForm;
  elements['message'] = messageDiv;
  elements['email'] = emailInput;

  const context = {
    document,
    fetch: async (url, options) => {
      fetchCalls.push({ url, options });

      if (url === '/activities') {
        return {
          ok: true,
          json: async () => ({
            'Chess Club': {
              description: 'Chess club',
              schedule: 'Fridays',
              max_participants: 12,
              participants: ['existing@example.com'],
            },
          }),
        };
      }

      if (url.includes('/signup')) {
        return {
          ok: true,
          json: async () => ({ message: 'Signed up successfully' }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    },
    console,
    setTimeout: () => 1,
    URLSearchParams,
  };

  return { context, document, fetchCalls, elements };
}

test('successful signup refreshes the activity list', async () => {
  const { context, document, fetchCalls, elements } = createAppHarness();
  const scriptPath = path.join(__dirname, '..', 'src', 'static', 'app.js');
  const scriptSource = fs.readFileSync(scriptPath, 'utf8');

  vm.createContext(context);
  vm.runInContext(scriptSource, context);
  document.listeners['DOMContentLoaded']();

  const submitHandler = elements['signup-form'].listeners.submit;
  await submitHandler({ preventDefault() {} });

  assert.equal(fetchCalls.filter(({ url }) => url === '/activities').length, 2);
});

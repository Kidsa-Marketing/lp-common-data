/**
 * phone-validation.js — Validação e máscara de telefone
 *
 * Expõe três funções globais usadas pelo form-submit.js:
 *   window.__phoneValidation(value)     → true/false
 *   window.__applyPhoneMask(event)      → aplica máscara no keyup
 *   window.__addValidationMessage(el)   → insere mensagem de erro abaixo do campo
 *
 * Como usar: carregue este script ANTES do form-submit.js no BODY da LP.
 */
(function () {
  'use strict';

  window.__phoneValidation = function (value) {
    return /^\(\d{2}\)\d{5}-\d{4}$/.test(value);
  };

  window.__addValidationMessage = function (element) {
    var msg           = document.createElement('div');
    msg.innerText     = 'Por favor, digite um telefone válido.';
    msg.style.color      = 'red';
    msg.style.display    = 'none';
    msg.style.fontSize   = '14px';
    msg.style.paddingLeft = '0.7rem';
    msg.classList.add('validation-message');
    element.parentNode.appendChild(msg);
  };

  window.__applyPhoneMask = function (event) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      return;
    }

    var tel = event.target.value.replace(/\D/g, '');

    if (tel.length > 6) {
      tel = tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
    } else if (tel.length > 2) {
      tel = tel.replace(/^(\d{2})(\d{5})$/, '($1)$2');
    } else if (tel.length > 0) {
      tel = tel.replace(/^(\d{2})$/, '($1');
    }

    event.target.value = tel;

    if (window.__phoneValidation(tel)) {
      var msg = document.querySelector('.validation-message');
      if (msg) msg.style.display = 'none';
    }
  };
})();

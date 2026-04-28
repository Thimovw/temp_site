/* main.js — CineStore */
(function () {
  'use strict';

  var cart = JSON.parse(sessionStorage.getItem('vs_cart') || '[]');

  function updateCartCount() {
    var el = document.getElementById('cart-count');
    if (el) el.textContent = cart.length;
  }

  window.addToCart = function (name, price) {
    cart.push({ name: name, price: price });
    sessionStorage.setItem('vs_cart', JSON.stringify(cart));
    updateCartCount();
    showToast(name + ' toegevoegd aan winkelwagen \u2713');
  };

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  updateCartCount();
}());

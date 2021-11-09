const { expect } = require('chai');

describe('firebase-admin/app', () => {
  it('should load initializeApp', () => {
    const { initializeApp } = require('./main');
    expect(initializeApp).to.be.ok;
  });
});

describe('firebase-admin/firestore', () => {
  it('should load getFirestore', () => {
    const { getFirestore } = require('./main');
    expect(getFirestore).to.be.ok;
  });
});

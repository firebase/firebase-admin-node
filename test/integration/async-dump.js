'use strict';

const {createHook} = require('async_hooks');
const {stackTraceFilter} = require('mocha/lib/utils');
const allResources = new Map();

// this will pull Mocha internals out of the stacks
const filterStack = stackTraceFilter();

const hook = createHook({
  init(asyncId, type, triggerAsyncId) {
    allResources.set(asyncId, {type, triggerAsyncId, stack: (new Error()).stack});
  },
  destroy(asyncId) {
    allResources.delete(asyncId);
  }
}).enable();

module.exports.debug = () => {
  hook.disable();
  console.error(`
STUFF STILL IN THE EVENT LOOP:`)
  allResources.forEach(value=> {
    console.error(`Type: ${value.type}`);
    console.error(filterStack(value.stack));
    console.error('\n');
  });
};
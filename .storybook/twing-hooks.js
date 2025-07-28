import { createSynchronousFunction } from "twing"

/**
 * Simple test function.
 */
function testFunction() {
  return "IT WORKS!"
}

export function initEnvironment(twingEnvironment, config = {}) {
  const func = createSynchronousFunction('testFunction', testFunction, []);
  twingEnvironment.addFunction(func);
}
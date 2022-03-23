'use strict'

var curFib = 0

this.postMessage('Hello from webworker')

this.onmessage = onMessage

// **********************************

function onMessage(event) {
  getNextFib()
}

function getNextFib() {
  var fibNum = fib(curFib)
  self.postMessage({index: curFib, num: fibNum})
  ++curFib
  setTimeout(getNextFib)
}

function fib(n) {
  if (n < 2) {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}

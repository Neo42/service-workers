;(function Blog() {
  'use strict'

  var offlineIcon
  var isOnline = 'onLine' in navigator ? navigator.onLine : true
  var isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || '')
  var isUsingSW = 'serviceWorker' in navigator
  var swRegistration
  var serviceWorker

  document.addEventListener('DOMContentLoaded', ready, false)

  initServiceWorker().catch(console.error)

  // **********************************

  function ready() {
    offlineIcon = document.getElementById('connectivity-status')

    if (!isOnline) {
      offlineIcon.classList.remove('hidden')
    }

    window.addEventListener('online', function online() {
      offlineIcon.classList.add('hidden')
      isOnline = true
      sendStatusUpdate()
    })

    window.addEventListener('offline', function offline() {
      offlineIcon.classList.remove('hidden')
      isOnline = false
      sendStatusUpdate()
    })
  }

  async function initServiceWorker() {
    // URL rewrite might be needed for sw scoping
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    })

    // default sw lifecycle: installed => waiting (optional) => active
    // only one sw can be active at the time
    // a sw is active until the user navigates to a new page
    serviceWorker =
      swRegistration.installing ||
      swRegistration.waiting ||
      swRegistration.active
    sendStatusUpdate(serviceWorker)

    // when a new worker takes control of the page
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      function onControllerChange() {
        serviceWorker = navigator.serviceWorker.controller
        sendStatusUpdate(serviceWorker)
      },
    )

    navigator.serviceWorker.addEventListener('message', onSWMessage)
  }

  function onSWMessage(event) {
    var {data} = event
    // ask the page for request status change for sw
    if (data.requestStatusUpdate) {
      console.log(
        `Received status update request from service worker, responding...`,
      )
      sendStatusUpdate(event.ports && event.ports[0]) // send to the message channel port that the service worker is listening on
    }
  }

  function sendStatusUpdate(target) {
    sendSWMessage({statusUpdate: {isOnline, isLoggedIn}}, target)
  }

  function sendSWMessage(message, target) {
    if (target) {
      target.postMessage(message)
    } else if (serviceWorker) {
      serviceWorker.postMessage(message)
    } else {
      navigator.serviceWorker.controller.postMessage(message)
    }
  }
})()

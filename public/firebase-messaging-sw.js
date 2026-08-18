importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyADyi-9N9ewNhUE3xTPo78r9Yu1U2-UW-4",
  authDomain: "smart-gold-2.firebaseapp.com",
  projectId: "smart-gold-2",
  storageBucket: "smart-gold-2.firebasestorage.app",
  messagingSenderId: "909106359671",
  appId: "1:909106359671:web:d7573b84fd7d5a5586c572",
  databaseURL: "https://smart-gold-2-default-rtdb.europe-west1.firebasedatabase.app/"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Smart Gold Staking';
  const notificationOptions = {
    body: payload.notification?.body || 'New update from Smart Gold Staking.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

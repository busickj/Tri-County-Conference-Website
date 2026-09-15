// Fill these in from Firebase Console > Project Settings > General > Your apps > SDK setup and config
// This file is loaded by every page.
const firebaseConfig = {
  apiKey: "AIzaSyAdfGwRe4_QDvWT9XB-yFYScdASypZOBCo",
  authDomain: "tccmid-mo.firebaseapp.com",
  databaseURL: "https://tccmid-mo-default-rtdb.firebaseio.com",
  projectId: "tccmid-mo",
  storageBucket: "tccmid-mo.firebasestorage.app",
  messagingSenderId: "458967408195",
  appId: "1:458967408195:web:09c27526046a9ea51e7ef6"
};

firebase.initializeApp(firebaseConfig);

// firebase.auth() is only needed on admin.html (which loads the Auth SDK
// separately and calls it itself) - initializing it on every page pulls in
// Google's gapi iframe helper, which this site's CSP blocks and which was
// slowing down the initial database read on public pages that never touch
// auth at all.
const db = firebase.database();

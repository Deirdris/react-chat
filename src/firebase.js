import firebase from "firebase";

if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyA8_SJZL1kMwHHB13UeF53bazPN51zZ91M",
        authDomain: "chat-f656f.firebaseapp.com",
        projectId: "chat-f656f",
        storageBucket: "chat-f656f.appspot.com",
        messagingSenderId: "1080190915480",
        appId: "1:1080190915480:web:9e50947ad99dab397b51ed",
        measurementId: "G-9K2F1RLECK"
    });
}

export const auth = firebase.auth();
export const firestore = firebase.firestore();
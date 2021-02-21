import React, {useEffect, useState} from 'react';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import './App.css';

import firebase from "firebase";
import 'firebase/firestore';
import 'firebase/auth';

import {useAuthState} from "react-firebase-hooks/auth";
import {useCollection, useCollectionData, useDocumentDataOnce} from "react-firebase-hooks/firestore";

import {
    BrowserRouter as Router,
    Route,
    Link,
    useHistory,
} from "react-router-dom";
import {ChatRoom} from "./ChatRoom";
import {auth, firestore} from "./firebase";

function App() {
    const [user] = useAuthState(auth);
    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <Link to="/" className="home"><h1>React Chat</h1></Link>
                    <SignOut/>
                </header>
                <section>
                    {user ? <Main/> : <SignIn/>}
                </section>
            </div>
        </Router>
    );
}

function Main() {

    return (
        <>
            <Route exact path="/">
                <FriendList/>
            </Route>
            <Route path="/chat/:uid">
                <ChatRoom/>
            </Route>
        </>
    )
}


function SignIn() {

    const signInWithGoogle = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        const authResult = await auth.signInWithPopup(provider);
        console.log(authResult.user);
        console.log(authResult.additionalUserInfo);
        const userRef = firestore.collection("users").doc(authResult.user.uid);
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            await userRef.set({
                displayName: authResult.user.displayName,
                photoURL: authResult.user.photoURL,
            });
        }
    }

    return (
        <>
            <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
        </>
    )

}

function SignOut() {

    const history = useHistory();

    return auth.currentUser && (
        <button className="sign-out" onClick={() => auth.signOut() && history.push("/")}>
            <span
                className="material-icons">logout
            </span>
        </button>
    )
}


// function FriendList() {
//     const {uid} = auth.currentUser;
//     const query = firestore.collection("users").where(firebase.firestore.FieldPath.documentId(), "!=", uid).limit(10);
//     const [friends] = useCollectionData(query, {idField: 'id'});
//
//     return (
//         <main>
//             {friends && friends.map(friend => <Link className="friend-link" key={friend.id} to={`/chat/${friend.id}`}>
//                 <span className="friend-span">
//                     <img className="main-screen-img" src={friend.photoURL}/>
//                     {friend.displayName}
//                 </span>
//             </Link>)}
//         </main>
//     )
// }

function FriendList() {
    const {uid} = auth.currentUser;
    const chatQuery = firestore
        .collection("chats")
        .where(`users`, "array-contains", uid)
        .orderBy("lastMessage.createdAt", "desc")
        .limit(10);
    const [chats] = useCollectionData(chatQuery, {idField: 'id'});

    return (
        <main>
            {chats && chats.map(chat => <FriendElement key={chat.id} chat={chat}></FriendElement>)}
        </main>
    )
}

function FriendElement(props) {
    let {chat} = props;

    const friendId = chat.users.find(element => element !== auth.currentUser.uid);

    const friendQuery = firestore.collection("users").doc(friendId);
    const [friend] = useDocumentDataOnce(friendQuery, {idField: 'id'});

    return (
        <>
            {friend &&
            <Link className="friend-link" key={friend.id} to={`/chat/${friend.id}`}>
                <span className="friend-span">
                    <img className="main-screen-img" src={friend.photoURL}/>
                    {friend.displayName}
                </span>
            </Link>}
        </>
    )
}

export default App;

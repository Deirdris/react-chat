import React, {useEffect, useState} from 'react';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import './App.scss';

import firebase from "firebase";
import 'firebase/firestore';
import 'firebase/auth';

import {useAuthState} from "react-firebase-hooks/auth";
import {useCollection, useCollectionData, useDocumentDataOnce} from "react-firebase-hooks/firestore";

import {useDebounce, useDebounceCallback} from '@react-hook/debounce';

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
                    {user && <SearchBar></SearchBar>}
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

function SearchBar() {

    const [results, setResults] = useState([]);
    const [value, setValue] = useDebounce('', 300);

    const [isActive, setIsActive] = useState(false);

    function hideResults() {
        setIsActive(false);
    }

    useEffect(() => {
        document.body.addEventListener("click", hideResults);
        return () => {
            document.body.removeEventListener("click", hideResults);
        }
    }, [])

    useEffect(
        () => {
            async function search(e) {
                // let value = e.target.value.toLowerCase();
                let users = {};
                let searchSNRef = await firestore.collection("users")
                    .where("nameSN", ">=", value)
                    .where("nameSN", "<", value + "\uf8ff")
                    .limit(5)
                    .get();

                let searchNSRef = await firestore.collection("users")
                    .where("nameNS", ">=", value)
                    .where("nameNS", "<", value + "\uf8ff")
                    .limit(5)
                    .get();

                searchSNRef.docs.forEach(doc => users[doc.ref.id] = {
                    ...doc.data(),
                    id: doc.ref.id,
                })

                searchNSRef.docs.forEach(doc => users[doc.ref.id] = {
                    ...doc.data(),
                    id: doc.ref.id,
                })

                setResults(Object.values(users));

                console.log(searchSNRef.docs);
                setIsActive(true);
            }

            if (value !== '') {
                search(value);
            } else {
                setResults([]);
            }
        }, [value]
    )

    return (
        <div className="search-div" onClick={(e) => e.stopPropagation()}>
            <input type="text" className="search-bar" placeholder="Imię, nazwisko"
                   onChange={(e) => setValue(e.target.value.toLowerCase())}/>
            <span className="material-icons search-icon">search</span>
            {isActive && <div className="results-div">
                {results && results.map(result => <div className="result" key={"search" + result.id}><img
                    src={result.photoURL}/>{result.displayName}</div>)}
            </div>}

        </div>
    )
}

function SignIn() {

    const signInWithGoogle = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        const authResult = await auth.signInWithPopup(provider);
        const userRef = firestore.collection("users").doc(authResult.user.uid);
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            const nameParts = authResult.user.displayName.split(' ');

            let nameSN;
            let nameNS;

            if (nameParts.length === 2) {
                nameSN = nameParts[1] + " " + nameParts[0];
                nameNS = nameParts[0] + " " + nameParts[1];
            } else {
                nameSN = "";
                nameNS = authResult.user.displayName;
            }
            await userRef.set({
                displayName: authResult.user.displayName,
                photoURL: authResult.user.photoURL,
                nameSN: nameSN.toLocaleLowerCase(),
                nameNS: nameNS.toLocaleLowerCase(),
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
                <img className="main-screen-img" src={friend.photoURL}/>
                <div className="message-content">
                    <div className="friend-span">
                        {friend.displayName}
                    </div>

                    <div className="last-message">
                        Ostatnia wysłana wiadomość: {chat.lastMessage.text}
                    </div>
                </div>
            </Link>}
        </>
    )
}

export default App;

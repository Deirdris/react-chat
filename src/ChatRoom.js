import {useParams} from "react-router-dom";
import {useCollection, useCollectionDataOnce, useDocumentDataOnce} from "react-firebase-hooks/firestore";
import React, {useEffect, useRef, useState} from "react";
import firebase from "firebase";
import Loader from "react-loader-spinner";
import {auth, firestore} from "./firebase";

export function ChatRoom() {
    let {uid} = useParams();
    const {uid: cuid} = auth.currentUser;

    const chatQuery = firestore.collection("chats").where(`usersMap.${uid}`, `==`, true).where(`usersMap.${cuid}`, `==`, true).limit(1);
    const [chat] = useCollection(chatQuery, {idField: 'id'});
    const friendQuery = firestore.collection("users").doc(uid);
    const [friend] = useDocumentDataOnce(friendQuery, {idField: 'id'});


    const [formValue, setFormValue] = useState('');


    const sendMessage = async (e) => {
        e.preventDefault();
        let text = formValue.trim();
        if (text === '') {
            return;
        }
        let batch = firestore.batch();
        let messagesRef = chat.docs[0].ref.collection("messages").doc();

        let messageObject = {
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            uid: cuid,
        };

        batch.set(messagesRef, messageObject);

        batch.update(chat.docs[0].ref, {
            lastMessage: messageObject,
        });

        await batch.commit();

        // await chat.docs[0].ref.collection('messages').add({
        //     text: text,
        //     createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        //     uid: cuid,
        // })

        setFormValue('');
    }

    return (<>
        {friend &&
        <div className="displayName"><img src={friend.photoURL}/><span className="name">{friend.displayName}</span>
        </div>}
        {chat ? <ChatMessageList chat={chat.docs[0]}/> :
            <main><Loader type="ThreeDots" color="#00BFFF" height={80} width={80}/></main>}


        <form onSubmit={sendMessage}>

            <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Aa"/>

            <button type="submit" className="sendMessage">
                <span className="material-icons arrow">
                    send
                </span>
            </button>

        </form>
    </>)
}

function ChatMessageList(props) {
    let {uid} = useParams();
    const {uid: cuid} = auth.currentUser;
    const dummy = useRef();
    const {chat} = props;
    const messagesRef = chat.ref.collection('messages');
    const query = messagesRef.orderBy('createdAt', 'desc').limit(20);

    const [messages, setMessages] = useState([]);
    const [lastMessagesFetched, setLast] = useState(false);
    const [lastMessages] = useCollectionDataOnce(query, {idField: 'id'});
    const [newMessagesSubscriber, setNewMessagesSubscriber] = useState(null);
    const [canLoadMore, setCanLoadMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const onScroll = async (e) => {
        if (e.target.scrollTop === 0 && canLoadMore) {
            setIsLoading(true);
            const querySnapshot = await messagesRef.where('createdAt', '<', messages[messages.length - 1].createdAt.toDate()).orderBy('createdAt', 'desc').limit(10).get();

            setCanLoadMore(querySnapshot.docs.length === 10);

            const loadingMessages = [];
            querySnapshot.docs.forEach(doc => {
                let message = {id: doc.id, ...doc.data()};
                loadingMessages.push(message);
            })

            setMessages((messages) => [...messages, ...loadingMessages]);
            setIsLoading(false);
            e.target.scrollTop = 80;
        }
    }
    useEffect(() => {
        if (!lastMessagesFetched && lastMessages) {
            // messages.concat(lastMessages);
            setMessages((messages) => [...lastMessages]);
            setLast(true);
            if (lastMessages.length) {
                chat.ref.update({
                    [`lastRead.${cuid}`]: lastMessages[0].id,
                });
            }
        }
    }, [lastMessagesFetched, lastMessages])
    useEffect(() => {
        if (lastMessagesFetched && !newMessagesSubscriber) {
            let subscriber = messagesRef.where('createdAt', '>', lastMessages[0].createdAt.toDate()).orderBy('createdAt', 'desc').onSnapshot((querySnapshot) => {
                const newMessages = [];
                querySnapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        let message = {id: change.doc.id, ...change.doc.data()};
                        newMessages.push(message);
                    }
                });
                setMessages((messages) => [...newMessages, ...messages]);
                if (newMessages.length) {
                    chat.ref.update({
                        [`lastRead.${cuid}`]: newMessages[0].id,
                    });
                }
                dummy.current.scrollIntoView({behavior: 'smooth'});
            });

            setNewMessagesSubscriber(() => subscriber);
        }
        return () => {
            if (newMessagesSubscriber) {
                newMessagesSubscriber();
            }
        }
    }, [lastMessagesFetched, newMessagesSubscriber]);

    const parseMessages = () => {
        const elements = [];
        let options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        const isSameDay = (a, b) => {
            if (!a || !b) {
                return false;
            }
            return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        }
        for (let i = messages.length - 1; i >= 0; i--) {
            if (i === messages.length - 1 || !isSameDay(messages[i].createdAt?.toDate(), messages[i + 1].createdAt?.toDate())) {
                elements.push(<div
                    key={messages[i].id + messages[i].createdAt?.seconds}
                    className="date">{messages[i].createdAt?.toDate()?.toLocaleString('pl-PL', options)}</div>);
            }

            const showTime = i === messages.length - 1 || Math.abs(messages[i].createdAt?.toDate().getMinutes() - messages[i + 1].createdAt?.toDate().getMinutes()) >= 5;

            const showRead = chat.data().lastRead[uid] === messages[i].id && cuid === messages[i].uid;

            elements.push(<ChatMessage key={messages[i].id} message={messages[i]} forceShowTime={showTime}
                                       showRead={showRead}/>);
        }
        return elements;
    };
    return (
        <main onScroll={onScroll}>
            {isLoading ? <Loader type="ThreeDots" color="#00BFFF" height={80} width={80}/> : (canLoadMore &&
                <div style={{paddingTop: 80}}></div>)}
            {lastMessagesFetched ? parseMessages() :
                <Loader type="ThreeDots" color="#00BFFF" height={80} width={80}/>}
            <span ref={dummy}></span>
        </main>
    );

}

function ChatMessage(props) {
    const {text, uid, createdAt} = props.message;
    let options2 = {hour: 'numeric', minute: 'numeric'};
    const [showTime, setShowTime] = useState(false);

    const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

    return (<>
        {(props.forceShowTime || showTime) &&
        <div className={`when ${messageClass}`}>{createdAt?.toDate()?.toLocaleString('pl-PL', options2)}</div>}
        <div className={`message ${messageClass} ${props.showRead ? "has-read-icon" : ""}`} onClick={() => setShowTime(!showTime)}>
            {props.showRead && <span className="material-icons read">visibility</span>}
            <p>{text}</p>
        </div>
    </>)
}
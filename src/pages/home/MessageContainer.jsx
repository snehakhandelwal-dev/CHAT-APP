import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { IoMdSend } from "react-icons/io";
import { FaVideo, FaPhoneAlt } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const MessageContainer = ({ selectedUser, socket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingPreview, setTypingPreview] = useState("");
  const bottomRef = useRef(null);

  const [isCalling, setIsCalling] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const senderData = JSON.parse(localStorage.getItem("userData") || "{}");
  const senderId = senderData?.user?._id;

  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `${API_URL}getMessage/${senderId}/${selectedUser._id}`
        );
        setMessages(response.data.responseData);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleReceive = (msg) => {
      if (
        msg.senderId === selectedUser._id ||
        msg.receiverId === selectedUser._id
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive-message", handleReceive);
    return () => socket.off("receive-message", handleReceive);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleTyping = ({ from, content }) => {
      if (from === selectedUser._id) {
        setTypingPreview(content);
      }
    };

    socket.on("typing", handleTyping);
    return () => socket.off("typing", handleTyping);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!typingPreview) return;

    const timeout = setTimeout(() => {
      setTypingPreview("");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [typingPreview]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `${API_URL}sendMessage/${senderId}/${selectedUser._id}`,
        { message: newMessage }
      );

      const newMsg = response.data.responseData.newMessage;
      setMessages((prev) => [...prev, newMsg]);
      socket.emit("send-message", {
        ...newMsg,
        receiverId: selectedUser._id,
        fullName: selectedUser.fullName,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const startCall = async (isVideo) => {
    setIsVideoCall(isVideo);
    setIsCalling(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true,
    });

    setLocalStream(stream);
    if (videoRef.current) videoRef.current.srcObject = stream;

    peerConnection.current = createPeerConnection();
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: selectedUser._id,
      from: senderId,
      isVideo,
      offer,
    });
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });
    
  
    const incomingStream = new MediaStream();
    setRemoteStream(incomingStream); // Set only once
  
    pc.ontrack = (event) => {
      incomingStream.addTrack(event.track); // Add track to same stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = incomingStream;
      }
    };
  
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: selectedUser._id,
          from: senderId,
          candidate: event.candidate,
        });
      }
    };
  
    return pc;
  };
  

  const handleCallAnswer = async (offer) => {
    setIsCalling(true);
  
    const stream = await navigator.mediaDevices.getUserMedia({
      video: offer.isVideo,
      audio: true,
    });
    setLocalStream(stream);
    if (videoRef.current) videoRef.current.srcObject = stream;
  
    peerConnection.current = createPeerConnection(); // sets up `ontrack` handler
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });
  
    await peerConnection.current.setRemoteDescription(offer.offer);
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
  
    socket.emit("make-answer", {
      to: offer.from,
      from: senderId,
      answer,
    });
  };
  


  const handleDisconnect = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    if (videoRef.current) videoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    peerConnection.current?.close();
    peerConnection.current = null;

    setIsCalling(false);
    setIsVideoCall(false);

    socket.emit("end-call", { to: selectedUser._id });
  };

  // Signaling
  useEffect(() => {
    socket.on("incoming-call", (data) => {
      const accept = window.confirm(
        `Incoming ${data.isVideo ? "video" : "voice"} call from ${data.fromName}`
      );
      if (accept) {
        handleCallAnswer(data);
      }
    });

    socket.on("call-answer", async (data) => {
      await peerConnection.current.setRemoteDescription(data.answer);
    });

    socket.on("ice-candidate", async (data) => {
      try {
        await peerConnection.current.addIceCandidate(data.candidate);
      } catch (error) {
        console.error("Error adding received ice candidate", error);
      }
    });

    socket.on("call-ended", () => {
      handleDisconnect();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answer");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket]);

  if (!selectedUser) {
    return (
      <div className="h-screen w-3/4 flex items-center justify-center text-gray-500 text-lg font-semibold">
        Select a user to chat
      </div>
    );
  }

  return (
    <div className="h-screen w-3/4 flex flex-col">
      {/* Header */}
      <div className="px-3 border-b bg-[#2980B9] flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img
                src={selectedUser.avatar || "https://via.placeholder.com/50"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>
          <h2 className="text-white font-semibold">{selectedUser.fullName}</h2>
        </div>
        <div className="flex gap-3 items-center">
          <button
            className="text-white p-2 rounded-full hover:bg-blue-600"
            onClick={() => startCall(true)}
          >
            <FaVideo />
          </button>
          <button
            className="text-white p-2 rounded-full hover:bg-blue-600"
            onClick={() => startCall(false)}
          >
            <FaPhoneAlt />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-full overflow-y-auto p-3">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`chat ${msg.senderId === senderId ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-header">
                {msg.senderId === senderId ? "You" : selectedUser.fullName}
                <time className="text-xs opacity-50 ml-2">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </time>
              </div>
              <div className="chat-bubble">{msg.message}</div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">No messages yet.</p>
        )}
        {typingPreview && (
          <div className="chat chat-start">
            <div className="chat-header">{selectedUser.fullName}</div>
            <div className="chat-bubble text-gray-400 italic">{typingPreview}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="w-full p-3 flex gap-2">
        <input
          type="text"
          placeholder="Type here..."
          className="input input-bordered input-primary w-full"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            socket.emit("typing", {
              to: selectedUser._id,
              from: senderId,
              content: e.target.value,
            });
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="btn btn-square btn-outline btn-primary"
          onClick={sendMessage}
        >
          <IoMdSend />
        </button>
      </div>

      {/* Call UI */}
      {isCalling && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
    <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center space-y-3">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-72 h-40 rounded-lg border border-blue-500"
      />
      {isVideoCall && (
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-72 h-40 rounded-lg border border-green-500"
        />
      )}
      <button onClick={handleDisconnect} className="btn btn-error mt-4">
        End Call
      </button>
    </div>
  </div>
)}

    </div>
  );
};

export default MessageContainer;

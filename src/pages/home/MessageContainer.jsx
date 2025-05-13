import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { IoMdSend } from "react-icons/io";
import { FaVideo, FaPhoneAlt } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const MessageContainer = ({ selectedUser, socket }) => {
  console.log("Component Rendered");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingPreview, setTypingPreview] = useState("");
  const bottomRef = useRef(null);

  const [isCalling, setIsCalling] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const senderData = JSON.parse(localStorage.getItem("userData") || "{}");
  const senderId = senderData?.user?._id;

  console.log("Selected User:", selectedUser);
  console.log("Sender ID:", senderId);

  useEffect(() => {
    if (!selectedUser) return;
    console.log("Fetching previous messages...");

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}getMessage/${senderId}/${selectedUser._id}`);
        console.log("Fetched Messages:", response.data.responseData);
        setMessages(response.data.responseData);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    console.log("Setting up receive-message socket listener");

    const handleReceive = (msg) => {
      console.log("Received Message:", msg);
      if (msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive-message", handleReceive);
    return () => socket.off("receive-message", handleReceive);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    console.log("Setting up typing socket listener");

    const handleTyping = ({ from, content }) => {
      console.log("Typing from:", from, "Content:", content);
      if (from === selectedUser._id) {
        setTypingPreview(content);
      }
    };

    socket.on("typing", handleTyping);
    return () => socket.off("typing", handleTyping);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!typingPreview) return;

    console.log("Typing Preview Set:", typingPreview);

    const timeout = setTimeout(() => {
      console.log("Clearing typing preview");
      setTypingPreview("");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [typingPreview]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    console.log("Sending message:", newMessage);

    try {
      const response = await axios.post(
        `${API_URL}sendMessage/${senderId}/${selectedUser._id}`,
        { message: newMessage }
      );
      const newMsg = response.data.responseData.newMessage;
      console.log("Message sent:", newMsg);
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

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  
    const incomingStream = new MediaStream();
    setRemoteStream(incomingStream);
    remoteVideoRef.current.srcObject = incomingStream;
  
    pc.ontrack = (event) => {
      console.log("Adding remote track", event.track);
      incomingStream.addTrack(event.track);
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
  

  const startCall = async (isVideo) => {
    console.log("Starting call, isVideo:", isVideo);
    setIsVideoCall(isVideo);
    setIsCalling(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true,
    });

    console.log("Got local stream:", stream);
    setLocalStream(stream);
    videoRef.current.srcObject = stream;

    peerConnection.current = createPeerConnection();

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const offer = await peerConnection.current.createOffer();
    console.log("Created offer:", offer);

    await peerConnection.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: selectedUser._id,
      from: senderId,
      isVideo,
      offer,
      fromName: senderData.user?.fullName,
    });
  };

  const handleCallAnswer = async (data) => {
    console.log("Answering call:", data);
    setIsCalling(true);
    setIsVideoCall(data.isVideo);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: data.isVideo,
      audio: true,
    });

    setLocalStream(stream);
    videoRef.current.srcObject = stream;

    peerConnection.current = createPeerConnection();
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    await peerConnection.current.setRemoteDescription(data.offer);
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("make-answer", {
      to: data.from,
      from: senderId,
      answer,
    });
  };

  const handleDisconnect = () => {
    console.log("Disconnecting call...");
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());

    videoRef.current.srcObject = null;
    remoteVideoRef.current.srcObject = null;

    peerConnection.current?.close();
    peerConnection.current = null;

    setIsCalling(false);
    setIsVideoCall(false);

    socket.emit("end-call", { to: selectedUser._id });
  };

  useEffect(() => {
    console.log("Setting up signaling listeners");

    socket.on("incoming-call", (data) => {
      console.log("Incoming call:", data);
      const accept = window.confirm(
        `Incoming ${data.isVideo ? "video" : "voice"} call from ${data.fromName}`
      );
      if (accept) handleCallAnswer(data);
    });

    socket.on("call-answer", async (data) => {
      console.log("Received call answer:", data);
      await peerConnection.current?.setRemoteDescription(data.answer);
    });

    socket.on("ice-candidate", async (data) => {
      console.log("Received ICE candidate:", data);
      try {
        await peerConnection.current?.addIceCandidate(data.candidate);
      } catch (err) {
        console.error("ICE candidate error", err);
      }
    });

    socket.on("call-ended", () => {
      console.log("Call ended by other user");
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
            <button
              onClick={handleDisconnect}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;

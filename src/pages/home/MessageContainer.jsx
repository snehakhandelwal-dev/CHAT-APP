import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { IoMdSend } from "react-icons/io";
import { FaVideo, FaPhoneAlt } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const MessageContainer = ({ selectedUser, socket }) => {
  console.log("📦 Component Rendered");

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

  useEffect(() => {
    if (!selectedUser) return;
    console.log("📨 Fetching previous messages...");

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}getMessage/${senderId}/${selectedUser._id}`);
        console.log("✅ Messages fetched:", res.data.responseData);
        setMessages(res.data.responseData);
      } catch (err) {
        console.error("❌ Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;
    console.log("🟢 Setting up receive-message listener");

    const handleReceive = (msg) => {
      console.log("📥 New message received:", msg);
      if (msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive-message", handleReceive);
    return () => socket.off("receive-message", handleReceive);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser) return;
    console.log("🟣 Setting up typing listener");

    const handleTyping = ({ from, content }) => {
      if (from === selectedUser._id) {
        console.log("✍️ Typing from:", from);
        setTypingPreview(content);
      }
    };

    socket.on("typing", handleTyping);
    return () => socket.off("typing", handleTyping);
  }, [socket, selectedUser]);

  useEffect(() => {
    if (!typingPreview) return;
    const timeout = setTimeout(() => setTypingPreview(""), 2000);
    return () => clearTimeout(timeout);
  }, [typingPreview]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log("🎥 Attaching local stream to local video");
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("📡 Attaching remote stream to remote video");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await axios.post(`${API_URL}sendMessage/${senderId}/${selectedUser._id}`, {
        message: newMessage,
      });
      const newMsg = res.data.responseData.newMessage;
      setMessages((prev) => [...prev, newMsg]);
      socket.emit("send-message", {
        ...newMsg,
        receiverId: selectedUser._id,
        fullName: selectedUser.fullName,
      });
      setNewMessage("");
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    pc.ontrack = (event) => {
      console.log("🎧 Remote track received:", event.track);
      remoteMediaStream.addTrack(event.track);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");
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
    setIsVideoCall(isVideo);
    setIsCalling(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    console.log("🎙️ Got local stream");
    setLocalStream(stream);

    peerConnection.current = createPeerConnection();
    stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: selectedUser._id,
      from: senderId,
      isVideo,
      offer,
    });
  };

  const handleCallAnswer = async (data) => {
    console.log("📞 Answering incoming call");
    setIsCalling(true);
    setIsVideoCall(data.isVideo);
    const stream = await navigator.mediaDevices.getUserMedia({ video: data.isVideo, audio: true });
    setLocalStream(stream);

    peerConnection.current = createPeerConnection();
    stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

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
    console.log("🔌 Ending call");
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
    socket.on("incoming-call", (data) => {
      const accept = window.confirm(`Incoming ${data.isVideo ? "video" : "voice"} call`);
      if (accept) handleCallAnswer(data);
    });

    socket.on("call-answer", async (data) => {
      console.log("🔁 Received call answer");
      await peerConnection.current?.setRemoteDescription(data.answer);
    });

    socket.on("ice-candidate", async (data) => {
      try {
        console.log("📨 ICE candidate received");
        await peerConnection.current?.addIceCandidate(data.candidate);
      } catch (err) {
        console.error("❌ ICE error:", err);
      }
    });

    socket.on("call-ended", () => {
      console.log("📴 Call ended by other user");
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
    return <div className="h-screen w-3/4 flex items-center justify-center text-gray-500">Select a user to chat</div>;
  }

  return (
    <div className="h-screen w-3/4 flex flex-col">
      {/* Header */}
      <div className="px-3 border-b bg-blue-600 flex items-center justify-between p-3 text-white">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src={selectedUser.avatar || "https://via.placeholder.com/50"} alt={selectedUser.fullName} />
            </div>
          </div>
          <h2 className="font-semibold">{selectedUser.fullName}</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={() => startCall(true)}><FaVideo /></button>
          <button onClick={() => startCall(false)}><FaPhoneAlt /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-full overflow-y-auto p-3">
        {messages.map((msg) => (
          <div key={msg._id} className={`chat ${msg.senderId === senderId ? "chat-end" : "chat-start"}`}>
            <div className="chat-header">{msg.senderId === senderId ? "You" : selectedUser.fullName}</div>
            <div className="chat-bubble">{msg.message}</div>
          </div>
        ))}
        {typingPreview && <div className="chat chat-start"><div className="chat-bubble italic text-gray-400">{typingPreview}</div></div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2">
        <input
          type="text"
          className="input input-bordered w-full"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            socket.emit("typing", { to: selectedUser._id, from: senderId, content: e.target.value });
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} className="btn btn-primary"><IoMdSend /></button>
      </div>

      {/* Call UI */}
      {isCalling && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          <video ref={videoRef} autoPlay muted className="w-72 h-40 rounded border border-blue-500 mb-2" />
          {isVideoCall && <video ref={remoteVideoRef} autoPlay className="w-72 h-40 rounded border border-green-500" />}
          <button onClick={handleDisconnect} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">End Call</button>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;

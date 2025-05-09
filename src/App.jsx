// import React, {useState} from "react";
// import UserSidebar from "./pages/home/UserSidebar";
// import MessageContainer from "./pages/home/MessageContainer";
// const App = () => {
//     const [selectedUser, setSelectedUser] = useState(null);

//     return (
//       <div className="flex">
//         {/* Users List Sidebar */}
//         <UserSidebar setSelectedUser={setSelectedUser} />
  
//         {/* Messages Section */}
//         <MessageContainer selectedUser={selectedUser} />
//       </div>
//     );
//   };
//   <script src = "/socket.io/socket.io.js">  </script>
// export default App
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import UserSidebar from "./pages/home/UserSidebar";
import MessageContainer from "./pages/home/MessageContainer";

// ✅ Connect to your backend
const socket = io("https://firefly-api.onrender.com", {
  transports: ["websocket"], 
});

const App = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to socket server:", socket.id);

      // ✅ Emit event to join user-specific room (optional but useful)
      const userData = JSON.parse(localStorage.getItem("userData"));
      if (userData?.user?._id) {
        socket.emit("join-room", userData.user._id);
      }
    });

    // 🔁 Optional: handle disconnects
    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from socket server");
    });

    // 🔄 Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex">
      <UserSidebar setSelectedUser={setSelectedUser} socket={socket} />
      <MessageContainer selectedUser={selectedUser} socket={socket} />
    </div>
  );
};

export default App;

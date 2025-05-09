import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { User } from "./User";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const UserSidebar = ({ setSelectedUser, socket }) => {
  const navigate=useNavigate();
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  // Fetch user data from local storage
  useEffect(() => {
    const userdata = JSON.parse(localStorage.getItem("userData") || "{}");
    console.log('1', userdata.user);
    setUserData(userdata.user);
  }, []);
   // 2️⃣ Join user room
  useEffect(() => {
    if (userData?._id && socket) {
      socket.emit("join", userData._id); 
    }
  }, [userData, socket]);
    // 3️⃣ Listen to notification event
    useEffect(() => {
      if (!socket) return;
  
      const handleNotification = (data) => {
        console.log("📩 Notification received:", data);
        setNotifications((prev) => [...prev, data]);
      };
  
      socket.on("notification", handleNotification);
      return () => socket.off("notification", handleNotification);
    }, [socket]);
  
    // 4️⃣ Auto-remove notifications after 5 sec
    useEffect(() => {
      if (notifications.length === 0) return;
  
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 5000);
  
      return () => clearTimeout(timer);
    }, [notifications]);
   // Logout function
   const handleLogout = async () => {
    try {
      await axios.post("https://firefly-api.onrender.com/users/logout"); // Adjust API URL
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
    return (
        <div className="max-w-[20rem] w-full h-screen flex flex-col border-r border-r-[#6DD5FA]]">
       

<h1 className="bg-[#2980B9]  px-3 py-3    text-[#6DD5FA] font-semibold text-xl">Firefly</h1>

<div className="p-3">
<label class="input input-bordered flex items-center gap-2">
  <input type="text" class="grow" placeholder="Search" />
  <FaSearch />
</label>
</div>

<div className="h-full overflow-y-scroll px-3 flex flex-col gap-2">
    <User setSelectedUser={setSelectedUser}/>
</div>

<div className="bg-[#2980B9] flex items-center justify-between p-3">
<div class="avatar">
  <div class="ring-primary ring-offset-base-100 w-10 rounded-full ring ring-offset-2">
  <img
              src={userData?.avatar || "https://via.placeholder.com/50"}
              alt="Profile"
            />
  </div>
  <p className="text-white font-semibold m-2">{userData?.fullName || "User"}</p>
</div>
<button class="btn btn-active btn-primary btn-xs px-4" onClick={handleLogout}>LogOut</button>
</div>

      {/* 🔔 Notifications */}
      <div className="absolute top-4 right-4 z-50">
  {notifications.map((notif, index) => {
    console.log("notif", notif); // Good debugging
    return (
      <div
        key={index}
        className="toast toast-top toast-end"
      >
        <div className="alert alert-info shadow-lg flex flex-col items-start">
          <span>
            <strong>{notif.fullName}</strong>: {notif.message}
          </span>
          <button
            className="btn btn-xs btn-primary mt-2"
            onClick={() =>
              setSelectedUser({
                _id: notif.senderId,
                fullName: notif.fullName,
              })
            }
          >
            Reply
          </button>
        </div>
      </div>
    );
  })}
</div>

        </div>
    )
}
export default UserSidebar


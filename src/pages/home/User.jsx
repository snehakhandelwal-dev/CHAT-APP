// import React, { useState, useEffect } from 'react';
// import axios from "axios";

// const API_URL = import.meta.env.VITE_API_URL;

// export const User = () => {
//   const [users, setUsers] = useState([]);
//   const [selectedUser, setSelectedUser] = useState(null);

//   useEffect(() => {
//     const userdata = JSON.parse(localStorage.getItem("userData") || "{}");
//     const userId = userdata?.user?._id; 

//     if (!userId) return;

//     const fetchUsers = async () => {
//       try {
//         const response = await axios.get(`${API_URL}getOtherUsers/${userId}`);
//         setUsers(response.data.data);
//       } catch (error) {
//         console.error("Error fetching users:", error);
//       }
//     };

//     fetchUsers();
//   }, []); // 👈 Empty dependency array to prevent re-renders

//   // ✅ Handle user click
//   const handleUserClick = (id) => {
//     if (selectedUser !== id) {
//       setSelectedUser(id); // 👈 Only update if different user selected
//     }
//   };

//   return (
//     <div>
//       {users.length > 0 ? (
//         users.map((user) => (
//           <div 
//             key={user._id} 
//             onClick={() => handleUserClick(user._id)} // ✅ Pass user ID
//             className={`flex gap-5 items-center py-2 px-3 cursor-pointer rounded-lg 
//                         ${selectedUser === user._id ? "bg-blue-300" : "hover:bg-blue-100"}`}
//           >
//             <div className="avatar online">
//               <div className="w-12 rounded-full">
//                 <img src={user.avatar || "https://via.placeholder.com/50"} alt={user.fullName} />
//               </div>
//             </div>

//             <div>
//               <h2 className="line-clamp-1 font-semibold">{user.fullName}</h2>
//               <p className="text-sm text-gray-500">@{user.userName}</p>
//             </div>
//           </div>
//         ))
//       ) : (
//         <p className="text-center text-gray-500">No users found</p>
//       )}
//     </div>
//   );
// };
import React, { useState, useEffect } from 'react';
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const User = ({ setSelectedUser }) => {  // ✅ Accept setSelectedUser from parent
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const userdata = JSON.parse(localStorage.getItem("userData") || "{}");
    const userId = userdata?.user?._id; 

    if (!userId) return;

    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}getOtherUsers/${userId}`);
        setUsers(response.data.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);


  return (
    <div>
      {users.length > 0 ? (
        users.map((user) => (
          <div
            key={user._id}
            onClick={() => setSelectedUser(user)} // ✅ Select User
            className="flex gap-5 items-center py-2 px-3 cursor-pointer hover:bg-blue-100 rounded-lg"
          >
            <div className="avatar online">
              <div className="w-12 rounded-full">
                <img src={user.avatar || "https://via.placeholder.com/50"} alt={user.fullName} />
              </div>
            </div>

            <div>
              <h2 className="line-clamp-1 font-semibold">{user.fullName}</h2>
              <p className="text-sm text-gray-500">@{user.userName}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500">No users found</p>
      )}
    </div>
  );
};

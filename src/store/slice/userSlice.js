import { createSlice } from '@reduxjs/toolkit'


export const userSlice = createSlice({
  name: 'user',
  initialState:{
    isAuthenticated:false,
  },
  reducers: {
    Login: () => {
        // console.log("hello login");
    }
    
  },
})

// Action creators are generated for each case reducer function
export const {Login} = userSlice.actions

export default userSlice.reducer
import React, { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { auth } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import {
  getUserProfile,
  createUserProfile,
  updateUserLastLogin
} from '../services/firestoreService';
import logger from '../utils/logger';




export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user profile from Firestore when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user profile from Firestore
        const profileResult = await getUserProfile(user.uid);
        if (profileResult.success) {
          setUserProfile(profileResult.data);
          // Update last login
          await updateUserLastLogin(user.uid);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up new user
  const signup = async (email, password, displayName, role = 'On-Site Manager') => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Create Firestore profile
      await createUserProfile(user.uid, email, displayName, role);

      return { success: true, user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Sign in existing user
  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUserProfile(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!userProfile) return false;
    if (Array.isArray(role)) {
      return role.includes(userProfile.role);
    }
    return userProfile.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'admin';
  };

  // Refresh user profile data from Firestore
  const refreshUserProfile = async () => {
    if (!currentUser) return;

    try {
      const profileResult = await getUserProfile(currentUser.uid);
      if (profileResult.success) {
        setUserProfile(profileResult.data);
        return { success: true };
      } else {
        return { success: false, error: profileResult.error };
      }
    } catch (err) {
      logger.error('Error refreshing user profile:', err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signup,
    login,
    logout,
    resetPassword,
    hasRole,
    isAdmin,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

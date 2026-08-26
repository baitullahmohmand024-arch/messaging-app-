import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  limit,
  Timestamp,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, Invitation, Connection, Message, MessageType } from '../types';

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

export type { ConfirmationResult };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable = errMsg.includes('unavailable') || errMsg.includes('offline') || errMsg.includes('Failed to get document');
  
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isOfflineOrUnavailable) {
    console.warn('Firestore temporarily offline/reconnecting:', errInfo);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot (non-blocking)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Expected when offline or when test document doesn't exist
  }
}
testConnection();

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  await syncUserProfile(result.user);
  return result.user;
};

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(result.user, { displayName: name });
  await syncUserProfile(result.user, name);
  return result.user;
};

export const signInAsGuest = async (customName?: string) => {
  const result = await signInAnonymously(auth);
  const name = customName || `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
  await updateProfile(result.user, { displayName: name });
  await syncUserProfile(result.user, name);
  return result.user;
};

// Phone Authentication
let appRecaptchaVerifier: RecaptchaVerifier | null = null;

export const clearRecaptcha = (containerId: string = 'recaptcha-container') => {
  if (appRecaptchaVerifier) {
    try {
      appRecaptchaVerifier.clear();
    } catch {
      // ignore
    }
    appRecaptchaVerifier = null;
  }
  if (typeof document !== 'undefined') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
};

export const setupRecaptcha = (containerId: string = 'recaptcha-container') => {
  if (typeof window === 'undefined') return null;
  
  clearRecaptcha(containerId);

  const container = document.getElementById(containerId);
  if (!container) return null;

  try {
    appRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired, clearing verifier.');
        clearRecaptcha(containerId);
      }
    });
    return appRecaptchaVerifier;
  } catch (err) {
    console.warn('Error creating RecaptchaVerifier:', err);
    clearRecaptcha(containerId);
    return null;
  }
};

export const sendPhoneVerificationCode = async (phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<ConfirmationResult> => {
  const verifier = setupRecaptcha(containerId);
  if (!verifier) {
    throw new Error('reCAPTCHA verification container is not ready. Please try again.');
  }
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmationResult;
  } catch (error) {
    // If sending fails, clear the verifier to allow fresh retry without collision
    clearRecaptcha(containerId);
    throw error;
  }
};

export const confirmPhoneCode = async (
  confirmationResult: ConfirmationResult, 
  verificationCode: string, 
  displayName?: string
) => {
  const userCredential = await confirmationResult.confirm(verificationCode);
  const user = userCredential.user;
  if (displayName && (!user.displayName || user.displayName.startsWith('User '))) {
    try {
      await updateProfile(user, { displayName });
    } catch {
      // ignore
    }
  }
  try {
    await syncUserProfile(user, displayName);
  } catch (err) {
    console.warn('Deferred profile sync after phone verification:', err);
  }
  return user;
};

export const logOut = async () => {
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline: false,
        lastSeen: Date.now()
      });
    } catch (e) {
      // ignore
    }
  }
  return fbSignOut(auth);
};

// User Profile Sync with Offline Resilience
export const syncUserProfile = async (user: User, customName?: string, photoUrl?: string): Promise<UserProfile> => {
  const now = Date.now();
  const displayName = customName || user.displayName || user.phoneNumber || `User ${user.uid.slice(0, 5)}`;
  const photo = photoUrl !== undefined ? photoUrl : (user.photoURL || null);

  const fallbackProfile: UserProfile = {
    uid: user.uid,
    displayName,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    photoURL: photo,
    createdAt: now,
    lastSeen: now,
    isOnline: true,
    activeConnectionId: null
  };

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      await setDoc(userRef, fallbackProfile, { merge: true });
      return fallbackProfile;
    } else {
      const existing = snap.data() as UserProfile;
      const updates: Partial<UserProfile> = {
        lastSeen: now,
        isOnline: true
      };
      if (user.email && user.email !== existing.email) {
        updates.email = user.email;
      }
      if (user.phoneNumber && user.phoneNumber !== existing.phoneNumber) {
        updates.phoneNumber = user.phoneNumber;
      }
      if (customName && customName !== existing.displayName) {
        updates.displayName = customName;
      } else if (!existing.displayName && user.displayName) {
        updates.displayName = user.displayName;
      }
      if (photoUrl !== undefined && photoUrl !== existing.photoURL) {
        updates.photoURL = photoUrl;
      } else if (!existing.photoURL && user.photoURL) {
        updates.photoURL = user.photoURL;
      }
      await updateDoc(userRef, updates).catch(() => {});
      return { ...existing, ...updates };
    }
  } catch (err: any) {
    console.warn('Profile sync handled gracefully during offline/initializing:', err?.message || err);
    return fallbackProfile;
  }
};

export const updateUserProfileData = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
  if (auth.currentUser && data.displayName) {
    await updateProfile(auth.currentUser, { displayName: data.displayName });
  }
};

// Secure Random Token Generator for Invitations
export const generateSecureToken = (length = 24): string => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += charset[randomValues[i] % charset.length];
  }
  return token;
};

// Invitation System
export const createPrivateInvitation = async (user: UserProfile): Promise<Invitation> => {
  const token = generateSecureToken(16);
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days expiration

  const invRef = doc(collection(db, 'invitations'));
  const invitation: Invitation = {
    id: invRef.id,
    token,
    createdBy: user.uid,
    creatorName: user.displayName,
    creatorPhoto: user.photoURL,
    createdAt: now,
    expiresAt,
    status: 'pending'
  };

  await setDoc(invRef, invitation);
  return invitation;
};

export const getInvitationByToken = async (token: string): Promise<Invitation | null> => {
  const q = query(
    collection(db, 'invitations'), 
    where('token', '==', token.trim()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docData = snap.docs[0].data() as Invitation;
  return { ...docData, id: snap.docs[0].id };
};

// Connection System
export const acceptPrivateInvitation = async (
  invitation: Invitation,
  currentUser: UserProfile
): Promise<Connection> => {
  if (invitation.createdBy === currentUser.uid) {
    throw new Error('You cannot accept your own invitation.');
  }
  if (invitation.status !== 'pending') {
    throw new Error('This invitation has already been used or expired.');
  }
  if (Date.now() > invitation.expiresAt) {
    throw new Error('This invitation link has expired.');
  }

  // Retrieve creator user details
  const creatorSnap = await getDoc(doc(db, 'users', invitation.createdBy));
  const creatorData = creatorSnap.exists() ? (creatorSnap.data() as UserProfile) : null;
  
  const creatorName = creatorData?.displayName || invitation.creatorName || 'Partner';
  const creatorPhoto = creatorData?.photoURL || invitation.creatorPhoto || null;

  // Create Connection doc
  const connRef = doc(collection(db, 'connections'));
  const now = Date.now();

  const connectionData: Connection = {
    id: connRef.id,
    members: [invitation.createdBy, currentUser.uid],
    memberDetails: {
      [invitation.createdBy]: {
        uid: invitation.createdBy,
        displayName: creatorName,
        photoURL: creatorPhoto,
        lastSeen: creatorData?.lastSeen || now,
        isOnline: creatorData?.isOnline || false
      },
      [currentUser.uid]: {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        lastSeen: now,
        isOnline: true
      }
    },
    createdAt: now,
    status: 'active'
  };

  const batch = writeBatch(db);
  batch.set(connRef, connectionData);
  
  // Mark invitation as accepted
  batch.update(doc(db, 'invitations', invitation.id), {
    status: 'accepted',
    acceptedBy: currentUser.uid,
    acceptedAt: now
  });

  // Update both users activeConnectionId
  batch.update(doc(db, 'users', currentUser.uid), {
    activeConnectionId: connRef.id
  });
  batch.update(doc(db, 'users', invitation.createdBy), {
    activeConnectionId: connRef.id
  });

  await batch.commit();
  return connectionData;
};

// Disconnect
export const disconnectPartner = async (connectionId: string, userId: string) => {
  const connRef = doc(db, 'connections', connectionId);
  const connSnap = await getDoc(connRef);
  if (!connSnap.exists()) return;

  const data = connSnap.data() as Connection;
  const batch = writeBatch(db);
  
  batch.update(connRef, {
    status: 'disconnected',
    disconnectedBy: userId,
    disconnectedAt: Date.now()
  });

  for (const memberId of data.members) {
    batch.update(doc(db, 'users', memberId), {
      activeConnectionId: null
    });
  }

  await batch.commit();
};

// Messaging
export const sendMessage = async (
  connectionId: string,
  sender: UserProfile,
  messageData: {
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    fileName?: string;
    fileSize?: number;
    replyTo?: Message['replyTo'];
  }
): Promise<string> => {
  const msgRef = doc(collection(db, 'connections', connectionId, 'messages'));
  const now = Date.now();

  const newMsg: Message = {
    id: msgRef.id,
    conversationId: connectionId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    type: messageData.type,
    text: messageData.text || '',
    mediaUrl: messageData.mediaUrl,
    thumbnailUrl: messageData.thumbnailUrl,
    duration: messageData.duration,
    fileName: messageData.fileName,
    fileSize: messageData.fileSize,
    createdAt: now,
    deliveredAt: now,
    replyTo: messageData.replyTo,
    reactions: {}
  };

  const batch = writeBatch(db);
  batch.set(msgRef, newMsg);

  // Update connection lastMessage
  let previewText = messageData.text || '';
  if (messageData.type === 'image') previewText = '📷 Photo';
  else if (messageData.type === 'video') previewText = '📹 Video';
  else if (messageData.type === 'audio') previewText = '🎤 Voice note';

  batch.update(doc(db, 'connections', connectionId), {
    lastMessage: {
      text: previewText,
      senderId: sender.uid,
      timestamp: now,
      type: messageData.type
    }
  });

  await batch.commit();
  return msgRef.id;
};

// Mark Messages as Read
export const markMessagesAsRead = async (
  connectionId: string,
  messages: Message[],
  currentUserId: string
) => {
  const unread = messages.filter(
    m => m.senderId !== currentUserId && !m.readAt && !m.isDeleted
  );
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  const now = Date.now();
  unread.forEach(m => {
    batch.update(doc(db, 'connections', connectionId, 'messages', m.id), {
      readAt: now
    });
  });
  await batch.commit();
};

// Toggle Reaction
export const toggleMessageReaction = async (
  connectionId: string,
  messageId: string,
  emoji: string,
  userId: string
) => {
  const msgRef = doc(db, 'connections', connectionId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as Message;
  const reactions = { ...(data.reactions || {}) };
  const currentUsers = reactions[emoji] || [];

  if (currentUsers.includes(userId)) {
    // Remove reaction
    reactions[emoji] = currentUsers.filter(id => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  } else {
    // Add reaction
    reactions[emoji] = [...currentUsers, userId];
  }

  await updateDoc(msgRef, { reactions });
};

// Delete Message
export const deleteMessage = async (
  connectionId: string,
  messageId: string,
  forEveryone = true
) => {
  const msgRef = doc(db, 'connections', connectionId, 'messages', messageId);
  if (forEveryone) {
    await updateDoc(msgRef, {
      isDeleted: true,
      text: 'This message was deleted.',
      mediaUrl: null,
      thumbnailUrl: null
    });
  } else {
    await deleteDoc(msgRef);
  }
};

// Typing Presence
export const setTypingState = async (
  connectionId: string,
  userId: string,
  isTyping: boolean
) => {
  const presenceRef = doc(db, 'connections', connectionId, 'presence', userId);
  await setDoc(presenceRef, {
    isTyping,
    lastActive: Date.now()
  }, { merge: true });
};

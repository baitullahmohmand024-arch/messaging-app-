import React, { useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy,
  updateDoc
} from 'firebase/firestore';

import { 
  auth, 
  db, 
  syncUserProfile, 
  signInWithGoogle, 
  logOut, 
  sendMessage, 
  setTypingState, 
  toggleMessageReaction, 
  deleteMessage, 
  disconnectPartner,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { 
  UserProfile, 
  Connection, 
  Message, 
  ReplyContext, 
  AppSettings, 
  MessageType,
  ConnectionMemberInfo
} from './types';

import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { AuthModal } from './components/AuthModal';
import { CreateInviteModal } from './components/CreateInviteModal';
import { JoinInviteModal } from './components/JoinInviteModal';
import { PartnerProfileModal } from './components/PartnerProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { MediaLightbox } from './components/MediaLightbox';
import { CameraModal } from './components/CameraModal';
import { OpeningAnimation } from './components/OpeningAnimation';
import { playReceiveSound } from './lib/audio';
import { showPushNotification } from './lib/notifications';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  pushNotificationsEnabled: true,
  hideNotificationPreview: false,
  themeAmbiance: 'obsidian',
  hapticFeedback: true
};

export default function App() {
  // Authentication & User State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Connection & Chat State
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<ConnectionMemberInfo | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mylove_app_settings') || localStorage.getItem('two_app_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Modal Visibility States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [joinInviteOpen, setJoinInviteOpen] = useState(false);
  const [partnerProfileOpen, setPartnerProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Lightbox Media Viewer
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    type: 'image' | 'video';
    senderName?: string;
    timestamp?: number;
  } | null>(null);

  // Signature App Opening Animation State
  const [showOpeningAnimation, setShowOpeningAnimation] = useState(true);
  const [isReplayAnimation, setIsReplayAnimation] = useState(false);

  // Initial invitation token from URL query params
  const [urlInviteToken, setUrlInviteToken] = useState<string>('');

  // Persist Settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('mylove_app_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 1. Detect URL Invite Token on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('connect');
      if (token) {
        setUrlInviteToken(token);
        setJoinInviteOpen(true);
      }
    }
  }, []);

  // 2. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setCurrentUser(profile);
        } catch (e) {
          console.error('Profile sync error:', e);
        }
      } else {
        setCurrentUser(null);
        setConnection(null);
        setMessages([]);
        setPartner(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // 3. User Profile Real-Time Listener (tracks activeConnectionId)
  useEffect(() => {
    if (!authUser) return;
    const pathForUser = `users/${authUser.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', authUser.uid), 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setCurrentUser(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathForUser);
      }
    );
    return () => unsub();
  }, [authUser]);

  // 4. Online Presence & Activity Tracking
  useEffect(() => {
    if (!authUser) return;

    const setPresence = async (isOnline: boolean) => {
      try {
        await updateDoc(doc(db, 'users', authUser.uid), {
          isOnline,
          lastSeen: Date.now()
        });
      } catch (e) {
        // ignore presence heartbeat offline errors gracefully
      }
    };

    setPresence(true);

    const handleFocus = () => setPresence(true);
    const handleBlur = () => setPresence(false);
    const handleBeforeUnload = () => setPresence(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setPresence(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      setPresence(false);
    };
  }, [authUser]);

  // 5. Active Connection Listener
  useEffect(() => {
    const connectionId = currentUser?.activeConnectionId;
    if (!connectionId) {
      setConnection(null);
      setPartner(null);
      return;
    }

    const pathForConn = `connections/${connectionId}`;
    const unsub = onSnapshot(
      doc(db, 'connections', connectionId), 
      (snap) => {
        if (snap.exists()) {
          const connData = snap.data() as Connection;
          if (connData.status === 'active') {
            setConnection(connData);
            
            // Determine partner
            const partnerId = connData.members.find((id) => id !== currentUser?.uid);
            if (partnerId && connData.memberDetails[partnerId]) {
              setPartner(connData.memberDetails[partnerId]);
            }
          } else {
            // Disconnected
            setConnection(null);
            setPartner(null);
          }
        } else {
          setConnection(null);
          setPartner(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathForConn);
      }
    );

    return () => unsub();
  }, [currentUser?.activeConnectionId, currentUser?.uid]);

  // 6. Messages Real-Time Subscription
  useEffect(() => {
    if (!connection?.id) {
      setMessages([]);
      return;
    }

    const pathForMessages = `connections/${connection.id}/messages`;
    const messagesRef = collection(db, 'connections', connection.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q, 
      (snap) => {
        const msgs: Message[] = [];
        snap.forEach((d) => {
          msgs.push(d.data() as Message);
        });

        // Detect new incoming message for audio & push notification
        setMessages((prev) => {
          if (prev.length > 0 && msgs.length > prev.length) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.senderId !== currentUser?.uid) {
              playReceiveSound(settings.soundEnabled);
              if (settings.pushNotificationsEnabled) {
                const preview = lastMsg.type === 'text' ? lastMsg.text || '' : `Sent a ${lastMsg.type}`;
                showPushNotification(
                  lastMsg.senderName,
                  preview,
                  settings.hideNotificationPreview,
                  lastMsg.senderPhoto
                );
              }
            }
          }
          return msgs;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathForMessages);
      }
    );

    return () => unsub();
  }, [connection?.id, currentUser?.uid, settings.soundEnabled, settings.pushNotificationsEnabled, settings.hideNotificationPreview]);

  // 7. Partner Typing & Presence Listener
  useEffect(() => {
    if (!connection?.id || !partner?.uid) return;

    const pathForPresence = `connections/${connection.id}/presence/${partner.uid}`;
    const unsub = onSnapshot(
      doc(db, 'connections', connection.id, 'presence', partner.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isRecent = Date.now() - (data.lastActive || 0) < 5000;
          setIsPartnerTyping(Boolean(data.isTyping && isRecent));
        } else {
          setIsPartnerTyping(false);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathForPresence);
      }
    );

    return () => unsub();
  }, [connection?.id, partner?.uid]);

  // 8. Handler: Send Message
  const handleSendMessage = async (msgData: {
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    fileName?: string;
    fileSize?: number;
  }) => {
    if (!connection?.id || !currentUser) return;

    await sendMessage(connection.id, currentUser, {
      ...msgData,
      replyTo: replyTo || undefined
    });
    setReplyTo(null);
  };

  // 9. Handler: Typing Presence
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!connection?.id || !currentUser?.uid) return;
      setTypingState(connection.id, currentUser.uid, isTyping);
    },
    [connection?.id, currentUser?.uid]
  );

  // 10. Handler: Reactions
  const handleReact = async (messageId: string, emoji: string) => {
    if (!connection?.id || !currentUser?.uid) return;
    await toggleMessageReaction(connection.id, messageId, emoji, currentUser.uid);
  };

  // 11. Handler: Delete Message
  const handleDelete = async (messageId: string) => {
    if (!connection?.id) return;
    await deleteMessage(connection.id, messageId, true);
  };

  // 12. Handler: Disconnect Partner
  const handleDisconnect = async () => {
    if (!connection?.id || !currentUser?.uid) return;
    await disconnectPartner(connection.id, currentUser.uid);
    setPartnerProfileOpen(false);
    setSettingsOpen(false);
  };

  // 13. Handler: Sign Out
  const handleSignOut = async () => {
    await logOut();
    setSettingsOpen(false);
  };

  // Theme ambiance class mapping
  const ambianceBgClass = 
    settings.themeAmbiance === 'champagne'
      ? 'bg-[#0E0C09]'
      : settings.themeAmbiance === 'midnight'
      ? 'bg-[#080B10]'
      : 'bg-[#090A0C]';

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#090A0C] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl border border-[#D4AF37]/30 bg-white/5 flex items-center justify-center animate-pulse mb-3">
          <span className="font-serif text-[#D4AF37] text-lg font-bold">II</span>
        </div>
        <span className="text-xs uppercase tracking-widest text-white/40 font-light">Loading Sanctuary...</span>
      </div>
    );
  }

  // If user is not authenticated OR user does not have an active connection, show the Luxury Welcome Screen
  const showWelcome = !currentUser || !connection;

  return (
    <div className={`min-h-screen w-full flex flex-col ${ambianceBgClass} text-white selection:bg-[#D4AF37]/30`}>
      {showWelcome ? (
        <WelcomeScreen
          currentUser={currentUser}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onGoogleSignIn={async () => {
            try {
              await signInWithGoogle();
            } catch (e) {
              setAuthModalMode('signin');
              setAuthModalOpen(true);
            }
          }}
          onCreateLink={() => {
            if (!currentUser) {
              setAuthModalMode('guest');
              setAuthModalOpen(true);
            } else {
              setCreateInviteOpen(true);
            }
          }}
          onJoinLink={() => {
            if (!currentUser) {
              setAuthModalMode('guest');
              setAuthModalOpen(true);
            } else {
              setJoinInviteOpen(true);
            }
          }}
          onSignOut={handleSignOut}
        />
      ) : (
        /* Main Two-Person Conversation Screen */
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto h-screen overflow-hidden border-x border-white/5 shadow-2xl relative">
          {/* Header */}
          <ChatHeader
            partner={partner}
            isPartnerTyping={isPartnerTyping}
            onOpenPartnerProfile={() => setPartnerProfileOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {/* Messages */}
          <MessageList
            messages={messages}
            currentUser={currentUser}
            connectionId={connection.id}
            partnerName={partner?.displayName}
            onOpenMedia={(url, type) => {
              setLightboxData({ url, type });
            }}
            onReply={(msg) => {
              setReplyTo({
                id: msg.id,
                text: msg.text,
                senderName: msg.senderName,
                type: msg.type,
                mediaUrl: msg.mediaUrl
              });
            }}
            onReact={handleReact}
            onDelete={handleDelete}
          />

          {/* Input Bar */}
          <ChatInput
            onSendMessage={handleSendMessage}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onTyping={handleTyping}
            onOpenCamera={() => setCameraModalOpen(true)}
            soundEnabled={settings.soundEnabled}
          />
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={() => {
          if (urlInviteToken) {
            setJoinInviteOpen(true);
          }
        }}
      />

      {/* Create Invite Modal */}
      {currentUser && (
        <CreateInviteModal
          isOpen={createInviteOpen}
          onClose={() => setCreateInviteOpen(false)}
          currentUser={currentUser}
          onConnected={() => setCreateInviteOpen(false)}
          soundEnabled={settings.soundEnabled}
        />
      )}

      {/* Join Invite Modal */}
      {currentUser && (
        <JoinInviteModal
          isOpen={joinInviteOpen}
          onClose={() => setJoinInviteOpen(false)}
          currentUser={currentUser}
          initialToken={urlInviteToken}
          onConnected={() => setJoinInviteOpen(false)}
          soundEnabled={settings.soundEnabled}
        />
      )}

      {/* Partner Profile Modal */}
      {connection && (
        <PartnerProfileModal
          isOpen={partnerProfileOpen}
          onClose={() => setPartnerProfileOpen(false)}
          partner={partner}
          connectionCreatedAt={connection.createdAt}
          messages={messages}
          onOpenMedia={(url, type) => setLightboxData({ url, type })}
          onDisconnect={handleDisconnect}
        />
      )}

      {/* Settings Modal */}
      {currentUser && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={updateSettings}
          onReplayIntro={() => {
            setIsReplayAnimation(true);
            setShowOpeningAnimation(true);
          }}
          onDisconnectPartner={connection ? handleDisconnect : undefined}
          onSignOut={handleSignOut}
        />
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={async (dataUrl, thumbnailUrl) => {
          await handleSendMessage({
            type: 'image',
            mediaUrl: dataUrl,
            thumbnailUrl
          });
        }}
      />

      {/* Fullscreen Media Lightbox */}
      <MediaLightbox
        mediaUrl={lightboxData?.url || null}
        type={lightboxData?.type}
        onClose={() => setLightboxData(null)}
        senderName={lightboxData?.senderName}
        timestamp={lightboxData?.timestamp}
      />

      {/* Signature App Opening Animation */}
      {showOpeningAnimation && (
        <OpeningAnimation
          onComplete={() => {
            setShowOpeningAnimation(false);
            setIsReplayAnimation(false);
          }}
          soundEnabled={settings.soundEnabled}
          isReplay={isReplayAnimation}
        />
      )}
    </div>
  );
}

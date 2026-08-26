import React, { useState } from 'react';
import { 
  X, 
  User, 
  Bell, 
  Volume2, 
  EyeOff, 
  Palette, 
  ShieldCheck, 
  LogOut, 
  Info, 
  Check, 
  UserX,
  Sparkles,
  Mail,
  CheckCircle2,
  Key
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { updateUserProfileData, logOut } from '../lib/firebase';
import { AvatarPicker } from './AvatarPicker';
import { requestNotificationPermission } from '../lib/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onReplayIntro?: () => void;
  onDisconnectPartner?: () => void;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateSettings,
  onReplayIntro,
  onDisconnectPartner,
  onSignOut
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [photoURL, setPhotoURL] = useState<string | null>(currentUser.photoURL);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfileData(currentUser.uid, {
        displayName: displayName.trim() || 'Private Member',
        photoURL
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!settings.pushNotificationsEnabled) {
      const granted = await requestNotificationPermission();
      onUpdateSettings({ pushNotificationsEnabled: granted });
    } else {
      onUpdateSettings({ pushNotificationsEnabled: false });
    }
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        id="settings-modal-card"
        className="w-full max-w-md bg-[#121418] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          id="btn-close-settings"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center pb-4 border-b border-white/5">
          <h2 className="text-xl font-light tracking-wide text-white font-serif">
            Settings
          </h2>
          <p className="text-xs text-white/40 mt-0.5 font-light">
            Private preferences and account settings
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
          {/* Section 1: Account Profile */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Account Profile</span>
            </h3>

            {/* Account Credentials / Identity Card */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50 font-light">Account Connection</span>
                {currentUser.email ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-medium">
                    Guest Pass
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Google / Registered Email</div>
                  <div className="text-xs text-white font-mono truncate">
                    {currentUser.email || 'No email associated (Instant Guest Session)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-white/40">
                <span>Account ID</span>
                <span className="font-mono text-white/60">{currentUser.uid.slice(0, 10)}...</span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <AvatarPicker
                currentPhoto={photoURL}
                onSelectPhoto={(url) => setPhotoURL(url)}
              />

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Display Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="input-settings-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]/60"
                  />
                  <button
                    type="submit"
                    id="btn-save-settings-name"
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-medium transition-colors shrink-0 flex items-center gap-1"
                  >
                    {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                    <span>{savedSuccess ? 'Saved' : isSaving ? 'Saving...' : 'Update'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section 2: Notifications & Sound */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-medium flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications & Audio</span>
            </h3>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-white/60" />
                <div>
                  <div className="text-xs text-white font-medium">Sound Effects</div>
                  <div className="text-[11px] text-white/40 font-light">Subtle chimes on send and receive</div>
                </div>
              </div>
              <button
                type="button"
                id="toggle-sound"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  settings.soundEnabled ? 'bg-[#D4AF37]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    settings.soundEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-white/60" />
                <div>
                  <div className="text-xs text-white font-medium">Push Notifications</div>
                  <div className="text-[11px] text-white/40 font-light">Alerts when you receive a message</div>
                </div>
              </div>
              <button
                type="button"
                id="toggle-push"
                onClick={handleToggleNotifications}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  settings.pushNotificationsEnabled ? 'bg-[#D4AF37]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    settings.pushNotificationsEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Hide Preview Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <EyeOff className="w-4 h-4 text-white/60" />
                <div>
                  <div className="text-xs text-white font-medium">Privacy Preview</div>
                  <div className="text-[11px] text-white/40 font-light">Hide message content on lock screen</div>
                </div>
              </div>
              <button
                type="button"
                id="toggle-privacy-preview"
                onClick={() => onUpdateSettings({ hideNotificationPreview: !settings.hideNotificationPreview })}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  settings.hideNotificationPreview ? 'bg-[#D4AF37]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    settings.hideNotificationPreview ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Appearance Ambiance */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-medium flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Theme Ambiance</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'obsidian', label: 'Obsidian', color: '#090A0C' },
                { id: 'champagne', label: 'Luxe Gold', color: '#14120D' },
                { id: 'midnight', label: 'Midnight', color: '#0D1117' }
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  id={`theme-btn-${theme.id}`}
                  onClick={() => onUpdateSettings({ themeAmbiance: theme.id as any })}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    settings.themeAmbiance === theme.id
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="text-[11px] font-medium">{theme.label}</span>
                </button>
              ))}
            </div>

            {/* Replay Opening Animation Trigger */}
            {onReplayIntro && (
              <button
                type="button"
                id="btn-replay-signature-intro"
                onClick={() => {
                  onClose();
                  onReplayIntro();
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 hover:text-[#D4AF37] flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Play Signature Opening Ritual</span>
              </button>
            )}
          </div>

          {/* Section 4: About & Privacy Manifesto */}
          <div className="pt-2 border-t border-white/5 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-white/50 font-light">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>End-to-End Privacy Protected</span>
            </div>
            <p className="text-[11px] text-white/30 font-light max-w-xs mx-auto leading-relaxed">
              MY LOVE IS HERE is engineered exclusively for two people. No public feed, no third-party tracking, and zero advertising.
            </p>
            <div className="text-[10px] text-white/20 font-mono pt-1">
              MY LOVE IS HERE • Signature Edition
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <button
            type="button"
            id="btn-signout"
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          {onDisconnectPartner && (
            <button
              type="button"
              id="btn-settings-disconnect"
              onClick={onDisconnectPartner}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/20 transition-colors"
            >
              <UserX className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

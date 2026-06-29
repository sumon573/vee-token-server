import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useRoom } from "@/contexts/RoomContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { VoiceSeat } from "@/components/VoiceSeat";
import { UserAvatar } from "@/components/UserAvatar";
import { GiftPanel } from "@/components/GiftPanel";
import { GiftAnimationOverlay } from "@/components/GiftAnimationOverlay";
import { EmojiReactionBar } from "@/components/EmojiReactionBar";
import { HandRaisePanel } from "@/components/HandRaisePanel";
import { RoomPollPanel } from "@/components/RoomPollPanel";
import { WelcomeModal } from "@/components/WelcomeModal";
import { firebaseService } from "@/services/firebase";
import { ROOM_THEMES } from "@/types";
import { Seat, VeeUser } from "@/types";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type PanelType = "settings" | "topic" | "pk" | "theme" | "welcome" | null;

export default function RoomScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    currentRoom, messages, isMicEnabled, isInSeat, mySeatIndex, myRoomRole, pkTimeLeft,
    handRaiseRequests, activePolls, reactions, isHandRaised, liveMembers,
    joinRoom, leaveRoom, takeSeat, leaveSeat, toggleMic, sendMessage,
    lockSeat, kickFromSeat, muteSeat, unmuteSeat, forceMicDown,
    promoteToRoomAdmin, demoteFromRoomAdmin,
    lockRoom, updateRoomTopic, setMinimized, closeRoom, endPKBattle,
    sendEmojiReaction, createPoll, votePoll, closePoll,
    raiseHand, lowerHand, acceptHandRaise, rejectHandRaise,
    setRoomTheme, setWelcomeMessage,
  } = useRoom();
  const { activeAnimations, dismissAnimation } = useEconomy();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const bottomPad = insets.bottom;

  const [msgText, setMsgText] = useState("");
  const [giftPanelVisible, setGiftPanelVisible] = useState(false);
  const [giftReceiver, setGiftReceiver] = useState<VeeUser | null>(null);
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const [newTopic, setNewTopic] = useState("");
  const [pkTargetRoomId, setPkTargetRoomId] = useState("");
  const [handPanelVisible, setHandPanelVisible] = useState(false);
  const [pollPanelVisible, setPollPanelVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);

  // Seat / profile / report / room-info sheets
  const [seatSheet, setSeatSheet] = useState<{ index: number; locked: boolean } | null>(null);
  const [mySeatSheet, setMySeatSheet] = useState(false);
  const [profileSeat, setProfileSeat] = useState<Seat | null>(null);
  const [profileUser, setProfileUser] = useState<VeeUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [roomInfoVisible, setRoomInfoVisible] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const hasShownWelcome = useRef(false);

  const canManage = myRoomRole === "owner" || myRoomRole === "admin";
  const isOwner = myRoomRole === "owner";

  const activePoll = activePolls[0] ?? null;
  const myVoteOnPoll = activePoll ? (activePoll.votes[user?.uid ?? ""] ?? null) : null;

  const activeTheme = ROOM_THEMES.find((t) => t.id === currentRoom?.theme) ?? ROOM_THEMES[0];

  useEffect(() => {
    if (!id) return;
    joinRoom(id);
  }, [id]);

  useEffect(() => {
    if (currentRoom && !hasShownWelcome.current) {
      hasShownWelcome.current = true;
      if (currentRoom.welcomeMessageEnabled && currentRoom.welcomeMessage) {
        setWelcomeVisible(true);
      }
    }
  }, [currentRoom?.id]);

  useEffect(() => {
    if (currentRoom?.welcomeMessage) setWelcomeMsg(currentRoom.welcomeMessage);
    if (currentRoom?.welcomeMessageEnabled !== undefined) setWelcomeEnabled(currentRoom.welcomeMessageEnabled);
  }, [currentRoom?.welcomeMessage, currentRoom?.welcomeMessageEnabled]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleBack = async () => {
    await leaveRoom();
    router.back();
  };

  const handleMinimize = () => {
    setMinimized(true);
    router.back();
  };

  const handleSend = async () => {
    const t = msgText.trim();
    if (!t) return;
    setMsgText("");
    await sendMessage(t);
  };

  const attemptTakeSeat = async (index: number) => {
    const res = await takeSeat(index);
    if (res === "occupied") Alert.alert("Seat taken", "Someone just grabbed that seat.");
    else if (res === "locked") Alert.alert("Seat locked", "This seat is locked.");
    else if (res === "reserved") Alert.alert("Reserved seat", "The top seat is for the host and admins only.");
  };

  const handleSeatPress = (index: number) => {
    if (!currentRoom || !user) return;
    const seat = currentRoom.seats[index];
    if (!seat) return;
    // Empty seat
    if (!seat.userId) {
      if (canManage) { setSeatSheet({ index, locked: seat.isLocked }); return; }
      if (seat.isLocked) return;
      void attemptTakeSeat(index);
      return;
    }
    // My own seat
    if (seat.userId === user.uid) { setMySeatSheet(true); return; }
    // Someone else's seat → profile card
    openProfileCard(seat);
  };

  const openProfileCard = (seat: Seat) => {
    if (!seat.userId) return;
    setProfileSeat(seat);
    setProfileUser(null);
    setProfileLoading(true);
    firebaseService
      .getUserProfile(seat.userId)
      .then((u) => setProfileUser(u))
      .finally(() => setProfileLoading(false));
  };

  const closeProfileCard = () => {
    setProfileSeat(null);
    setProfileUser(null);
    setProfileLoading(false);
  };

  const submitReport = async () => {
    if (!user || !reportTarget || !reportReason || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await firebaseService.sendReport(
        user.uid,
        user.displayName,
        reportTarget.uid,
        reportTarget.name,
        reportReason,
        reportDesc.trim()
      );
      setReportTarget(null);
      setReportReason("");
      setReportDesc("");
      Alert.alert("Report sent", "Thanks — our moderators will review this.");
    } catch {
      Alert.alert("Couldn't send report", "Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleShareRoom = async () => {
    if (!currentRoom) return;
    await Share.share({ message: `Join my voice room "${currentRoom.name}" on Vee! Room ID: ${currentRoom.id}`, title: currentRoom.name });
  };

  const pkBar = currentRoom?.pkBattle;
  const pkTotal = pkBar ? Math.max(1, pkBar.challengerScore + pkBar.targetScore) : 1;
  const challengerPct = pkBar ? pkBar.challengerScore / pkTotal : 0.5;

  if (!currentRoom) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="radio" size={40} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Joining room…</Text>
      </View>
    );
  }

  const hostSeat = currentRoom.seats[0];
  const participantSeats = currentRoom.seats.slice(1);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={activeTheme.gradient as [string, string]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Gift animations overlay */}
      <GiftAnimationOverlay animations={activeAnimations} onDismiss={dismissAnimation} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <Feather name="chevron-down" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7} onPress={() => setRoomInfoVisible(true)}>
          <View style={styles.roomNameRow}>
            <Text style={styles.roomName} numberOfLines={1}>{currentRoom.name}</Text>
            <Feather name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.roomMeta}>
            <Feather name="hash" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={styles.roomSub}>{currentRoom.id}</Text>
            <Feather name="users" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={styles.roomSub}>{liveMembers.length}</Text>
            {currentRoom.topic ? (
              <Text style={styles.roomTopic} numberOfLines={1}>· {currentRoom.topic}</Text>
            ) : null}
            {currentRoom.isLocked && <Feather name="lock" size={10} color="rgba(255,255,255,0.6)" />}
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleMinimize}>
            <Feather name="minus" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setOpenPanel("settings")}>
            <Feather name="more-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PK Battle Bar */}
      {pkBar?.isActive && (
        <View style={[styles.pkBar, { backgroundColor: "rgba(0,0,0,0.5)", borderColor: activeTheme.accent + "44" }]}>
          <View style={styles.pkSide}>
            <Text style={[styles.pkName, { color: "#fff" }]} numberOfLines={1}>{pkBar.challengerHostName}</Text>
            <Text style={[styles.pkScore, { color: colors.gold }]}>{pkBar.challengerScore}</Text>
          </View>
          <View style={styles.pkCenter}>
            <Text style={[styles.pkTimer, { color: activeTheme.accent }]}>{formatTime(pkTimeLeft)}</Text>
            <Text style={styles.pkVs}>VS</Text>
            <View style={[styles.pkProgressOuter, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <View style={[styles.pkProgressFill, { backgroundColor: activeTheme.accent, width: `${Math.round(challengerPct * 100)}%` as `${number}%` }]} />
            </View>
          </View>
          <View style={[styles.pkSide, { alignItems: "flex-end" }]}>
            <Text style={[styles.pkName, { color: "#fff" }]} numberOfLines={1}>{pkBar.targetHostName}</Text>
            <Text style={[styles.pkScore, { color: colors.gold }]}>{pkBar.targetScore}</Text>
          </View>
          {isOwner && (
            <TouchableOpacity style={styles.pkEndBtn} onPress={() => Alert.alert("End PK?", "End the battle now?", [
              { text: "End", style: "destructive", onPress: () => endPKBattle() },
              { text: "Cancel", style: "cancel" },
            ])}>
              <Feather name="x-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Host Seat */}
        <View style={styles.hostSeatRow}>
          <VoiceSeat
            seat={hostSeat}
            isHost
            isMe={hostSeat.userId === user?.uid}
            canManage={canManage && hostSeat.userId !== user?.uid}
            onPress={() => handleSeatPress(0)}
          />
        </View>

        {/* Participant Seats */}
        <View style={styles.participantsGrid}>
          {participantSeats.map((seat) => (
            <VoiceSeat
              key={seat.index}
              seat={seat}
              isMe={seat.userId === user?.uid}
              canManage={canManage}
              onPress={() => handleSeatPress(seat.index)}
            />
          ))}
        </View>

        {/* Active Poll inline preview */}
        {activePoll && (
          <TouchableOpacity
            style={[styles.pollTeaser, { backgroundColor: "rgba(0,0,0,0.5)", borderColor: activeTheme.accent + "55" }]}
            onPress={() => setPollPanelVisible(true)}
            activeOpacity={0.85}
          >
            <Feather name="bar-chart-2" size={14} color={activeTheme.accent} />
            <Text style={styles.pollTeaserText} numberOfLines={1}>{activePoll.question}</Text>
            <Text style={styles.pollTeaserVote}>{myVoteOnPoll != null ? "Voted" : "Vote"} →</Text>
          </TouchableOpacity>
        )}

        {/* Chat Messages */}
        <View style={[styles.chatArea, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            scrollEnabled={false}
            renderItem={({ item: msg }) => (
              <View style={styles.msgRow}>
                {msg.type === "system" || msg.type === "join" || msg.type === "leave" ? (
                  <Text style={styles.msgSystem}>{msg.text}</Text>
                ) : msg.type === "gift" ? (
                  <Text style={styles.msgGift}>
                    🎁 <Text style={{ fontWeight: "800" }}>{msg.userName}</Text> sent a gift!
                  </Text>
                ) : (
                  <>
                    <Text style={styles.msgUser}>{msg.userName} </Text>
                    <Text style={styles.msgText}>{msg.text}</Text>
                  </>
                )}
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* Emoji floating reactions (above bottom bar) */}
      <View style={styles.emojiBarWrapper}>
        <EmojiReactionBar
          onReact={sendEmojiReaction}
          incomingReactions={reactions}
        />
      </View>

      {/* Bottom Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8 }]}>
          <View style={styles.controls}>
            {/* Mic / Take Seat */}
            {isInSeat ? (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: isMicEnabled ? activeTheme.accent : "rgba(255,255,255,0.15)" }]}
                onPress={toggleMic}
              >
                <Feather name={isMicEnabled ? "mic" : "mic-off"} size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={() => {
                  const empty = currentRoom.seats.findIndex((s) => !s.userId && !s.isLocked && s.index !== 0);
                  if (empty >= 0) void attemptTakeSeat(empty);
                  else Alert.alert("Stage Full", "No open seats available.");
                }}
              >
                <Feather name="mic" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}

            {/* Gift */}
            <TouchableOpacity
              style={[styles.ctrlBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              onPress={() => {
                const host = currentRoom.seats[0];
                if (host?.userId) {
                  firebaseService.getUserProfile(host.userId).then((u) => {
                    if (u) { setGiftReceiver(u); setGiftPanelVisible(true); }
                  });
                }
              }}
            >
              <Feather name="gift" size={20} color={colors.gold} />
            </TouchableOpacity>

            {/* Poll */}
            <TouchableOpacity
              style={[styles.ctrlBtn, { backgroundColor: activePoll ? activeTheme.accent + "55" : "rgba(255,255,255,0.15)" }]}
              onPress={() => setPollPanelVisible(true)}
            >
              <Feather name="bar-chart-2" size={20} color={activePoll ? activeTheme.accent : "rgba(255,255,255,0.7)"} />
            </TouchableOpacity>

            {/* Hand Raise / Lower */}
            {!isInSeat && (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: isHandRaised ? colors.gold + "55" : "rgba(255,255,255,0.15)" }]}
                onPress={isHandRaised ? lowerHand : raiseHand}
              >
                <Text style={{ fontSize: 18 }}>{isHandRaised ? "🤚" : "✋"}</Text>
              </TouchableOpacity>
            )}

            {/* Hand raise queue badge (owner/admin) */}
            {canManage && handRaiseRequests.length > 0 && (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: colors.gold + "33", position: "relative" }]}
                onPress={() => setHandPanelVisible(true)}
              >
                <Feather name="users" size={20} color={colors.gold} />
                <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                  <Text style={styles.badgeText}>{handRaiseRequests.length}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* PK Battle (owner) */}
            {isOwner && !pkBar?.isActive && (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={() => setOpenPanel("pk")}
              >
                <Text style={{ fontWeight: "900", color: activeTheme.accent, fontSize: 13 }}>PK</Text>
              </TouchableOpacity>
            )}

            {/* Share */}
            <TouchableOpacity
              style={[styles.ctrlBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              onPress={handleShareRoom}
            >
              <Feather name="share-2" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Leave Seat */}
            {isInSeat && (
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: "rgba(255,80,80,0.3)" }]}
                onPress={leaveSeat}
              >
                <Feather name="log-out" size={18} color="#FF5050" />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.inputRow, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.18)" }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={msgText}
              onChangeText={setMsgText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSend} disabled={!msgText.trim()}>
              <Feather name="send" size={20} color={msgText.trim() ? activeTheme.accent : "rgba(255,255,255,0.3)"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Gift Panel */}
      {giftReceiver && (
        <GiftPanel
          visible={giftPanelVisible}
          onClose={() => setGiftPanelVisible(false)}
          receiver={giftReceiver}
          roomId={currentRoom.id}
        />
      )}

      {/* Welcome Modal */}
      {welcomeVisible && (
        <WelcomeModal
          visible={welcomeVisible}
          room={currentRoom}
          onClose={() => setWelcomeVisible(false)}
        />
      )}

      {/* Hand Raise Panel */}
      <HandRaisePanel
        visible={handPanelVisible}
        requests={handRaiseRequests}
        onClose={() => setHandPanelVisible(false)}
        onAccept={async (req) => { await acceptHandRaise(req); setHandPanelVisible(false); }}
        onReject={rejectHandRaise}
      />

      {/* Poll Panel */}
      {pollPanelVisible && (
        <RoomPollPanel
          poll={activePoll}
          myVote={myVoteOnPoll != null ? myVoteOnPoll : null}
          canCreate={canManage}
          onVote={(idx) => activePoll && votePoll(activePoll.id, idx)}
          onCreate={(q, opts) => { createPoll(q, opts); setPollPanelVisible(false); }}
          onClose={() => setPollPanelVisible(false)}
        />
      )}

      {/* Change Topic Modal */}
      <Modal visible={openPanel === "topic"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Room Topic</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              value={newTopic}
              onChangeText={setNewTopic}
              placeholder="Enter topic…"
              placeholderTextColor={colors.mutedForeground}
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setOpenPanel(null)} style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { await updateRoomTopic(newTopic.trim()); setOpenPanel(null); }}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PK Battle Modal */}
      <Modal visible={openPanel === "pk"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Start PK Battle</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>Enter the target room ID to challenge:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              value={pkTargetRoomId}
              onChangeText={setPkTargetRoomId}
              placeholder="Target Room ID…"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setOpenPanel(null)} style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!pkTargetRoomId.trim()) return;
                  await firebaseService.startPKBattle(currentRoom.id, user!.uid, user!.displayName, pkTargetRoomId.trim(), "unknown", "Challenger", 180);
                  setOpenPanel(null);
                  setPkTargetRoomId("");
                }}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Start PK!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Room Theme Modal */}
      <Modal visible={openPanel === "theme"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, gap: 16 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Room Theme</Text>
            <View style={styles.themeGrid}>
              {ROOM_THEMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeChip, { borderColor: t.id === (currentRoom.theme ?? "purple") ? "#fff" : "transparent", borderWidth: 2 }]}
                  onPress={async () => { await setRoomTheme(t.id); setOpenPanel(null); }}
                >
                  <LinearGradient colors={t.gradient as [string, string]} style={styles.themeGradPreview} />
                  <Text style={styles.themeName}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setOpenPanel(null)} style={[styles.modalBtn, { backgroundColor: colors.secondary, flex: 0, width: "100%" }]}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Welcome Message Modal */}
      <Modal visible={openPanel === "welcome"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Welcome Message</Text>
            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Show on join</Text>
              <Switch
                value={welcomeEnabled}
                onValueChange={setWelcomeEnabled}
                trackColor={{ false: colors.secondary, true: colors.primary }}
              />
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border, height: 80 }]}
              value={welcomeMsg}
              onChangeText={setWelcomeMsg}
              placeholder="Welcome message for new joiners…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setOpenPanel(null)} style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { await setWelcomeMessage(welcomeMsg.trim(), welcomeEnabled); setOpenPanel(null); }}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Panel */}
      <Modal visible={openPanel === "settings"} transparent animationType="slide">
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setOpenPanel(null)} />
        <View style={[styles.settingsPanel, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Room Settings</Text>

          {canManage && (
            <>
              <SettingsRow icon="edit-2" label="Change Topic" onPress={() => { setOpenPanel("topic"); setNewTopic(currentRoom.topic ?? ""); }} colors={colors} />
              <SettingsRow icon="image" label="Room Theme" onPress={() => setOpenPanel("theme")} colors={colors} accent={activeTheme.accent} />
              <SettingsRow icon="message-circle" label="Welcome Message" onPress={() => setOpenPanel("welcome")} colors={colors} />
            </>
          )}
          {isOwner && (
            <>
              <SettingsRow icon={currentRoom.isLocked ? "unlock" : "lock"} label={currentRoom.isLocked ? "Unlock Room" : "Lock Room"} onPress={() => { lockRoom(!currentRoom.isLocked); setOpenPanel(null); }} colors={colors} />
              {!pkBar?.isActive && (
                <SettingsRow icon="zap" label="Start PK Battle" onPress={() => setOpenPanel("pk")} colors={colors} accent={colors.gold} />
              )}
              {pkBar?.isActive && (
                <SettingsRow icon="x-circle" label="End PK Battle" onPress={() => { firebaseService.endPKBattle(currentRoom.id); setOpenPanel(null); }} colors={colors} />
              )}
              <SettingsRow icon="x-octagon" label="Close Room" onPress={() => Alert.alert("Close Room?", "This will end the room for everyone.", [
                { text: "Close Room", style: "destructive", onPress: () => { closeRoom(); setOpenPanel(null); } },
                { text: "Cancel", style: "cancel" },
              ])} colors={colors} danger />
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow icon="info" label="Room Info" onPress={() => { setOpenPanel(null); setRoomInfoVisible(true); }} colors={colors} />
          <SettingsRow icon="share-2" label="Share Room" onPress={() => { handleShareRoom(); setOpenPanel(null); }} colors={colors} />
          <SettingsRow icon="log-out" label="Leave Room" onPress={() => { setOpenPanel(null); handleBack(); }} colors={colors} danger />
        </View>
      </Modal>

      {/* Empty-seat admin sheet (Invite / Lock / Unlock / Take) */}
      <Modal visible={seatSheet !== null} transparent animationType="slide" onRequestClose={() => setSeatSheet(null)}>
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setSeatSheet(null)} />
        <View style={[styles.settingsPanel, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Seat {(seatSheet?.index ?? 0) + 1}</Text>
          {!isInSeat && (
            <SettingsRow
              icon="mic"
              label="Take this Seat"
              colors={colors}
              accent={activeTheme.accent}
              onPress={() => { const i = seatSheet?.index; setSeatSheet(null); if (i != null) void attemptTakeSeat(i); }}
            />
          )}
          <SettingsRow
            icon="user-plus"
            label="Invite from Queue"
            colors={colors}
            onPress={() => { setSeatSheet(null); setHandPanelVisible(true); }}
          />
          <SettingsRow
            icon={seatSheet?.locked ? "unlock" : "lock"}
            label={seatSheet?.locked ? "Unlock Seat" : "Lock Seat"}
            colors={colors}
            onPress={() => { const s = seatSheet; setSeatSheet(null); if (s) lockSeat(s.index, !s.locked); }}
          />
        </View>
      </Modal>

      {/* My-seat sheet */}
      <Modal visible={mySeatSheet} transparent animationType="slide" onRequestClose={() => setMySeatSheet(false)}>
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setMySeatSheet(false)} />
        <View style={[styles.settingsPanel, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Your Seat</Text>
          <SettingsRow
            icon={isMicEnabled ? "mic-off" : "mic"}
            label={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
            colors={colors}
            accent={activeTheme.accent}
            onPress={() => { setMySeatSheet(false); toggleMic(); }}
          />
          <SettingsRow
            icon="log-out"
            label="Leave Stage"
            colors={colors}
            danger
            onPress={() => { setMySeatSheet(false); leaveSeat(); }}
          />
        </View>
      </Modal>

      {/* Profile card for a seated user */}
      <Modal visible={profileSeat !== null} transparent animationType="fade" onRequestClose={closeProfileCard}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeProfileCard}>
          <TouchableOpacity activeOpacity={1} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <UserAvatar uri={profileSeat?.userAvatar ?? profileUser?.avatar} size={72} />
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {profileUser?.displayName ?? profileSeat?.userName ?? "User"}
            </Text>
            {profileUser?.veeId ? (
              <Text style={[styles.profileVeeId, { color: colors.primary }]}>{profileUser.veeId}</Text>
            ) : profileLoading ? (
              <Text style={[styles.profileVeeId, { color: colors.mutedForeground }]}>Loading…</Text>
            ) : null}

            <View style={styles.profileActions}>
              <TouchableOpacity
                style={[styles.profileAction, { backgroundColor: activeTheme.accent }]}
                onPress={() => {
                  const u = profileUser;
                  closeProfileCard();
                  if (u) { setGiftReceiver(u); setGiftPanelVisible(true); }
                }}
              >
                <Feather name="gift" size={16} color="#fff" />
                <Text style={styles.profileActionText}>Gift</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileAction, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  const uid = profileSeat?.userId;
                  closeProfileCard();
                  if (uid) router.push(`/profile/${uid}`);
                }}
              >
                <Feather name="user" size={16} color={colors.text} />
                <Text style={[styles.profileActionText, { color: colors.text }]}>Profile</Text>
              </TouchableOpacity>
            </View>

            {canManage && profileSeat && profileSeat.userId !== currentRoom.hostId && (
              <View style={[styles.profileModRow, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.modBtn}
                  onPress={() => {
                    const s = profileSeat;
                    closeProfileCard();
                    if (!s?.userId) return;
                    if (s.roomRole === "admin") demoteFromRoomAdmin(s.userId);
                    else promoteToRoomAdmin(s.userId);
                  }}
                >
                  <Feather name="shield" size={16} color={colors.teal} />
                  <Text style={[styles.modBtnText, { color: colors.mutedForeground }]}>
                    {profileSeat.roomRole === "admin" ? "Unmod" : "Mod"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modBtn}
                  onPress={() => {
                    const s = profileSeat;
                    closeProfileCard();
                    if (!s) return;
                    if (s.isAdminMuted) unmuteSeat(s.index);
                    else muteSeat(s.index);
                  }}
                >
                  <Feather
                    name={profileSeat?.isAdminMuted ? "mic" : "mic-off"}
                    size={16}
                    color={colors.gold}
                  />
                  <Text style={[styles.modBtnText, { color: colors.mutedForeground }]}>
                    {profileSeat?.isAdminMuted ? "Unmute" : "Mute"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modBtn}
                  onPress={() => { const s = profileSeat; closeProfileCard(); if (s) kickFromSeat(s.index); }}
                >
                  <Feather name="user-x" size={16} color={colors.destructive} />
                  <Text style={[styles.modBtnText, { color: colors.mutedForeground }]}>Kick</Text>
                </TouchableOpacity>
              </View>
            )}

            {profileSeat && profileSeat.userId !== user?.uid && (
              <TouchableOpacity
                style={styles.reportLink}
                onPress={() => {
                  const s = profileSeat;
                  const name = profileUser?.displayName ?? s?.userName ?? "User";
                  closeProfileCard();
                  if (s?.userId) setReportTarget({ uid: s.userId, name });
                }}
              >
                <Feather name="flag" size={13} color={colors.destructive} />
                <Text style={[styles.reportLinkText, { color: colors.destructive }]}>Report user</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Report modal */}
      <Modal visible={reportTarget !== null} transparent animationType="fade" onRequestClose={() => setReportTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report {reportTarget?.name}</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>Why are you reporting this user?</Text>
            <View style={styles.reasonWrap}>
              {["Harassment", "Hate speech", "Spam", "Inappropriate", "Scam", "Other"].map((r) => {
                const sel = reportReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReportReason(r)}
                    style={[styles.reasonChip, { backgroundColor: sel ? colors.primary : colors.secondary, borderColor: sel ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: sel ? "#fff" : colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border, height: 70 }]}
              value={reportDesc}
              onChangeText={setReportDesc}
              placeholder="Add details (optional)…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={300}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setReportTarget(null); setReportReason(""); setReportDesc(""); }} style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReport}
                disabled={!reportReason || reportSubmitting}
                style={[styles.modalBtn, { backgroundColor: colors.destructive, opacity: !reportReason || reportSubmitting ? 0.5 : 1 }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{reportSubmitting ? "Sending…" : "Submit"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Room info sheet */}
      <Modal visible={roomInfoVisible} transparent animationType="slide" onRequestClose={() => setRoomInfoVisible(false)}>
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setRoomInfoVisible(false)} />
        <View style={[styles.settingsPanel, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.roomInfoHead}>
            <UserAvatar uri={currentRoom.coverImage || currentRoom.hostAvatar} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.roomInfoName, { color: colors.text }]} numberOfLines={1}>{currentRoom.name}</Text>
              <Text style={[styles.roomInfoHost, { color: colors.mutedForeground }]} numberOfLines={1}>Hosted by {currentRoom.hostName}</Text>
            </View>
          </View>
          <InfoRow label="Room number" value={`#${currentRoom.id}`} colors={colors} />
          {currentRoom.topic ? <InfoRow label="Topic" value={currentRoom.topic} colors={colors} /> : null}
          <InfoRow label="Listeners" value={String(liveMembers.length)} colors={colors} />
          {currentRoom.tags.length > 0 ? <InfoRow label="Tags" value={currentRoom.tags.join(", ")} colors={colors} /> : null}

          {/* Seated Members List */}
          {currentRoom.seats.some((s) => s.userId) && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.membersTitle, { color: colors.mutedForeground }]}>On Stage</Text>
              {currentRoom.seats.filter((s) => s.userId).map((seat) => {
                const roleLabel = seat.userId === currentRoom.hostId ? "Owner" : seat.roomRole === "admin" ? "Admin" : "Member";
                const roleColor = seat.userId === currentRoom.hostId ? colors.gold : seat.roomRole === "admin" ? colors.teal : colors.mutedForeground;
                return (
                  <View key={seat.index} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <UserAvatar uri={seat.userAvatar ?? undefined} size={36} />
                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{seat.userName ?? "User"}</Text>
                    <View style={[styles.roleTag, { backgroundColor: roleColor + "22", borderColor: roleColor + "44" }]}>
                      <Text style={[styles.roleTagText, { color: roleColor }]}>{roleLabel}</Text>
                    </View>
                    {seat.isMuted && <Feather name="mic-off" size={14} color={colors.mutedForeground} />}
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.roomInfoShareBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setRoomInfoVisible(false); handleShareRoom(); }}
          >
            <Feather name="share-2" size={16} color="#fff" />
            <Text style={styles.roomInfoShareText}>Share Room</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

interface IRProps { label: string; value: string; colors: any }
function InfoRow({ label, value, colors }: IRProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

interface SRProps { icon: string; label: string; onPress: () => void; colors: any; accent?: string; danger?: boolean }
function SettingsRow({ icon, label, onPress, colors, accent, danger }: SRProps) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
      <View style={[styles.settingsRowIcon, { backgroundColor: danger ? "#FF4D6A22" : accent ? accent + "22" : colors.secondary }]}>
        <Feather name={icon as any} size={18} color={danger ? "#FF4D6A" : accent ?? colors.mutedForeground} />
      </View>
      <Text style={[styles.settingsRowLabel, { color: danger ? "#FF4D6A" : colors.text }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 16, fontWeight: "500" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 4,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerRight: { flexDirection: "row", gap: 2 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  roomNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  roomName: { fontSize: 16, fontWeight: "800", color: "#fff" },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  roomSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  roomTopic: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", maxWidth: 120 },
  pkBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
    position: "relative",
    gap: 8,
  },
  pkSide: { flex: 1 },
  pkCenter: { alignItems: "center", width: 80, gap: 2 },
  pkTimer: { fontSize: 16, fontWeight: "900" },
  pkVs: { fontSize: 9, fontWeight: "900", color: "rgba(255,255,255,0.5)", letterSpacing: 1 },
  pkProgressOuter: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  pkProgressFill: { height: 6, borderRadius: 3 },
  pkName: { fontSize: 12, fontWeight: "700" },
  pkScore: { fontSize: 20, fontWeight: "900" },
  pkEndBtn: { position: "absolute", top: 6, right: 6 },
  scroll: { flex: 1 },
  hostSeatRow: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  participantsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 4,
    marginBottom: 8,
  },
  pollTeaser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pollTeaserText: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "600" },
  pollTeaserVote: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  chatArea: {
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
    minHeight: 80,
    maxHeight: 160,
  },
  msgRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  msgSystem: { fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.5)" },
  msgGift: { fontSize: 12, color: "#F5A623" },
  msgUser: { fontSize: 13, fontWeight: "700", color: "#fff" },
  msgText: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
  emojiBarWrapper: { backgroundColor: "rgba(0,0,0,0.25)" },
  bottomBar: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  controls: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#000", fontSize: 9, fontWeight: "900" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  chatInput: { flex: 1, fontSize: 14, color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center" },
  modalCard: { width: "88%", borderRadius: 18, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  modalDesc: { fontSize: 13 },
  modalInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, paddingBottom: 10 },
  switchLabel: { fontSize: 15, fontWeight: "600" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  themeChip: { alignItems: "center", gap: 4, borderRadius: 12, padding: 6, width: 72 },
  themeGradPreview: { width: 56, height: 36, borderRadius: 8 },
  themeName: { color: "#fff", fontSize: 11, fontWeight: "600" },
  settingsOverlay: { flex: 1, backgroundColor: "#00000060" },
  settingsPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  settingsTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  settingsRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsRowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  divider: { height: 1, marginVertical: 4 },
  profileCard: { width: "82%", borderRadius: 20, borderWidth: 1, padding: 22, alignItems: "center", gap: 6 },
  profileName: { fontSize: 18, fontWeight: "800", marginTop: 10, maxWidth: "100%" },
  profileVeeId: { fontSize: 13, fontWeight: "600" },
  profileActions: { flexDirection: "row", gap: 10, marginTop: 16, width: "100%" },
  profileAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12 },
  profileActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  profileModRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
  modBtn: { alignItems: "center", gap: 4 },
  modBtnText: { fontSize: 11, fontWeight: "600" },
  reportLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  reportLinkText: { fontSize: 13, fontWeight: "600" },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  roomInfoHead: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  roomInfoName: { fontSize: 17, fontWeight: "800" },
  roomInfoHost: { fontSize: 13, marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, gap: 12 },
  infoLabel: { fontSize: 13, fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  roomInfoShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, marginTop: 16 },
  roomInfoShareText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  membersTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  memberName: { flex: 1, fontSize: 14, fontWeight: "600" },
  roleTag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  roleTagText: { fontSize: 11, fontWeight: "700" },
});

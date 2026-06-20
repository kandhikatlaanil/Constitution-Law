import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { Screen, AppText } from "@/src/components/primitives";
import { getAuthToken } from "@/src/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantScreen() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your AI Legal Assistant. You can ask me questions about the Indian Constitution, BNS/BNSS/BSA criminal codes, judgments, and legal learning pathways.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Clean up any active request on unmount
  useEffect(() => {
    return () => {
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input.trim(),
    };

    const assistantPlaceholder: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
    };

    const updatedMessages = [...messages, userMessage, assistantPlaceholder];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    const token = getAuthToken();
    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";
    xhr.open("POST", `${backendUrl}/api/ai/chat`);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Format all messages to fit backend requirement, omitting the final empty assistant placeholder
    const payloadMessages = updatedMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        // xhr.responseText gets the accumulated response text streamed so far
        setMessages((prev) => {
          const list = [...prev];
          const last = list[list.length - 1];
          if (last && last.role === "assistant" && last.id === assistantPlaceholder.id) {
            last.content = xhr.responseText;
          }
          return list;
        });
      }

      if (xhr.readyState === 4) {
        setStreaming(false);
        activeXhrRef.current = null;
        if (xhr.status !== 200) {
          Alert.alert(
            "Service Error",
            "Failed to receive response from the AI Legal Assistant. Please try again."
          );
          setMessages((prev) => {
            const list = [...prev];
            const last = list[list.length - 1];
            if (last && last.id === assistantPlaceholder.id) {
              last.content = "Error retrieving answer. Please check your connection.";
            }
            return list;
          });
        }
      }
    };

    xhr.onerror = () => {
      setStreaming(false);
      activeXhrRef.current = null;
      Alert.alert("Network Error", "Unable to connect to the backend server.");
      setMessages((prev) => {
        const list = [...prev];
        const last = list[list.length - 1];
        if (last && last.id === assistantPlaceholder.id) {
          last.content = "Network connection failed. Make sure the backend server is running.";
        }
        return list;
      });
    };

    xhr.send(JSON.stringify({ messages: payloadMessages }));
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userContainer : styles.assistantContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary }
              : {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
          ]}
        >
          <AppText
            variant="ui"
            color={isUser ? "#FFFFFF" : colors.textPrimary}
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            {item.content || (streaming && item.id.endsWith("-assistant") ? "Thinking..." : "")}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <Screen style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" color={colors.textPrimary}>
            AI Legal Assistant
          </AppText>
          <AppText variant="small" style={{ fontSize: 11, marginTop: 1 }}>
            Constitution, BNS Laws & Education
          </AppText>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          streaming && !messages[messages.length - 1].content ? (
            <View style={styles.thinkingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText variant="small" style={{ marginLeft: 8 }}>
                AI is searching & formulating response...
              </AppText>
            </View>
          ) : null
        }
      />

      {/* Input Tray */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 50 : 0}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 12,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                fontFamily: fonts.uiRegular,
              },
            ]}
            placeholder="Ask your legal or constitution question..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!streaming}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !streaming ? colors.primary : colors.surfaceElevated,
              },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || streaming}
          >
            <Ionicons
              name="send"
              size={18}
              color={input.trim() && !streaming ? "#FFFFFF" : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginVertical: 6,
    width: "100%",
    flexDirection: "row",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  thinkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});

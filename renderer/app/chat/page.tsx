import ChatView from "@/components/chat/ChatView";
import { fetchChrome } from "@/lib/api";

export default async function ChatPage() {
  return <ChatView chrome={await fetchChrome()} />;
}

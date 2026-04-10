import { supabase } from './supabase';

const MESSAGES_TABLE = 'app_messages';

export const sendMessage = async (senderId, receiverId, content) => {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from(MESSAGES_TABLE)
            .insert([{
                sender_id: String(senderId).toLowerCase(),
                receiver_id: String(receiverId).toLowerCase(),
                content: content,
                is_read: false
            }])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error("Error sending message:", error);
    }
};

export const getMessagesBetween = async (id1, id2) => {
    if (!supabase) return [];
    const id1Lower = String(id1).toLowerCase();
    const id2Lower = String(id2).toLowerCase();
    try {
        const { data, error } = await supabase
            .from(MESSAGES_TABLE)
            .select('*')
            .or(`and(sender_id.eq."${id1Lower}",receiver_id.eq."${id2Lower}"),and(sender_id.eq."${id2Lower}",receiver_id.eq."${id1Lower}")`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
};

export const markAsRead = async (senderId, receiverId) => {
    if (!supabase || !senderId || !receiverId) return;
    try {
        await supabase
            .from(MESSAGES_TABLE)
            .update({ is_read: true })
            .eq('sender_id', String(senderId).toLowerCase())
            .eq('receiver_id', String(receiverId).toLowerCase())
            .eq('is_read', false); // Only update if unread
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
};

export const subscribeToMessages = (callback, channelName = 'any_message') => {
    if (!supabase) return;
    return supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: MESSAGES_TABLE }, payload => {
            callback(payload.new);
        })
        .subscribe();
};

export const getRecentConversations = async (myId) => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from(MESSAGES_TABLE)
            .select('*')
            .or(`sender_id.eq."${myId}",receiver_id.eq."${myId}"`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const threadsMap = new Map();
        data.forEach(msg => {
            const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
            if (!threadsMap.has(otherId)) {
                threadsMap.set(otherId, {
                    otherId,
                    lastMessage: msg,
                    unreadCount: (msg.receiver_id === myId && !msg.is_read) ? 1 : 0
                });
            } else if (msg.receiver_id === myId && !msg.is_read) {
                threadsMap.get(otherId).unreadCount++;
            }
        });
        return Array.from(threadsMap.values());
    } catch (error) {
        console.error("Error fetching threads:", error);
        return [];
    }
};

export const getSessionByMac = async (mac) => {
    if (!supabase || !mac || mac === 'DYR') return null;
    try {
        const { data, error } = await supabase
            .from('app_sessions')
            .select('*')
            .ilike('mac_address', mac)
            .single();
        if (error) return null;
        return data;
    } catch (e) {
        return null;
    }
};

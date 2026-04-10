import { supabase } from './supabase';

const USERS_TABLE = 'app_users';

export const getUsers = async () => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from(USERS_TABLE)
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

export const addUser = async (userData) => {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from(USERS_TABLE)
            .insert([userData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
};

export const updateUser = async (id, userData) => {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from(USERS_TABLE)
            .update(userData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
};

export const deleteUser = async (id) => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from(USERS_TABLE)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};

export const updateUserSession = async (userId, sessionId) => {
    if (!supabase || !userId) return;
    try {
        const { error } = await supabase
            .from(USERS_TABLE)
            .update({ current_session_id: sessionId })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating user session:", error);
    }
};

export const getUserSession = async (userId) => {
    if (!supabase || !userId) return null;
    try {
        const { data, error } = await supabase
            .from(USERS_TABLE)
            .select('current_session_id')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.current_session_id;
    } catch (error) {
        console.error("Error fetching user session:", error);
        return null;
    }
};

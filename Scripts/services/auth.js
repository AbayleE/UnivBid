import {
    auth,
    db,
    signOut,
    deleteUser,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setDoc,
    deleteDoc,
    doc,
    getDoc,
    addDoc,
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    onSnapshot,
    setPersistence,
    browserLocalPersistence
} from "../../firebase.js";

export const getCurrentuserdata = async () => {
    if (!auth.currentUser) return null;

    const doc_ref = doc(db, "users", auth.currentUser.uid);
    const doc_snap = await getDoc(doc_ref);
    return doc_snap.exists() ? doc_snap.data() : null;
};

export const logoutuser = async () => {
    try {
        await signOut(auth);
        return { sucess: true };
    } catch (error) {
        return { error: error.message };
    }
};


export const registerUser = async (
    First_name,
    Last_name,
    email,
    password,
    phone = "",
    university = "",
    avatar = "",
    contact_choice = {
        contact_email: true,
        contact_phone: false,
    }
) => {
    const full_name = `${(First_name || '').trim()} ${(Last_name || '').trim()}`.trim();
    const url_avatar = avatar || `https://robohash.org/${encodeURIComponent(full_name || email)}.png?size=200x200`;

    let user = null;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
        const userData = {
            email,
            firstName: First_name.trim(),
            lastName: Last_name.trim(),
            UserID: user.uid,
            phone,
            university,
            avatar: url_avatar,
            contact_choice,
        };

        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, userData);
        return { success: true, user };
    } catch (error) {
        console.error("Error creating user:", error.message);
        if (user) await rollbackRegistration(user);
        return { success: false, error: error.code };
    }
};

// Removes the Auth account when its profile could not be saved, so the email
// can be registered again.
const rollbackRegistration = async (user) => {
    try {
        await deleteUser(user);
    } catch (error) {
        console.error("Error rolling back user:", error.message);
        await signOut(auth).catch((signOutError) => {
            console.error("Error signing out user:", signOutError.message);
        });
    }
};

export const signinUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user};

    } catch (error) {
        console.error("Error Signing in user:", error.message);
        return { success: false, error: error.code };
    }
};


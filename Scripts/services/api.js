import {
  auth,
  db,
  signOut,
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

import { getCurrentuserdata } from "./auth.js";

/* Update Users Profile*/
export const updateuserProfile = async (updatedDOC) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const docref = doc(db, 'users', user.uid);
    await updateDoc(docref, updatedDOC);
    return { success: true, user_val: user };
  } catch (error) {
    console.error("Error updating user:", error.message);
    return { success: false, error: error.message };
  }
};

/* Fetching product details*/
export const getproductDetail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const listings_ref = collection(db, "products");
    const listing_query = query(listings_ref, where("soldBy", "==", user.uid));
    const listings_snapshot = await getDocs(listing_query);
    const products = [];

    if (listings_snapshot.empty) {
      return { success: true, products: null };
    }

    listings_snapshot.forEach((docs) => {
      products.push({
        id: docs.id,
        ...docs.data(),
      });
    });

    return { success: true, products };
  } catch (error) {
    console.error("Error loading products:", error.message);
    return { success: false, error: error.message };
  }
};


/**
 Adding new products
 */
export const addNewProduct = async (productDetail) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const productref = doc(collection(db, "products"));
    const currentUserdata = await getCurrentuserdata();
    const productPayload = {
      pid: productref.id,
      status: "Available",
      soldBy: user.uid,
      soldBy_name: currentUserdata?.firstName || "Unknown seller",
      dateListed: new Date(),
      ...productDetail,
    };

    await setDoc(productref, productPayload);
    return { success: true, product: productPayload };
  } catch (error) {
    console.error("Failed to add product:", error.message);
    return { success: false, error: error.message };
  }
};

export const updateProductDetail = async (productDetail, pid) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const productref = doc(db, "products", pid);
    await updateDoc(productref, productDetail);
    return { success: true };
  } catch (error) {
    console.error("Failed to update product:", error.message);
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (pid) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const productRef = doc(db, "products", pid);
    await deleteDoc(productRef);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete product:", error.message);
    return { success: false, error: error.message };
  }
};

export const fetchProducts = async (UserID) => {
  try {
    const listings_list = collection(db, "products");
    const listing_query = query(
      listings_list,
      where("status", "==", "Available"),
      where("soldBy", "!=", UserID)
    );

    const listings_snapshot = await getDocs(listing_query);
    const products = [];

    if (listings_snapshot.empty) {
      return { success: true, products: null };
    }

    listings_snapshot.forEach((docs) => {
      products.push({
        id: docs.id,
        ...docs.data(),
      });
    });

    return { success: true, products };
  } catch (error) {
    console.error("Failed to fetch products from the db:", error.message);
    return { success: false, error: error.message };
  }
};

export const fetchuser_profile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userdata = docSnap.data();
      const userProfile = userdata.avatar || "Images/11.png";
      return { success: true, profile_pic: userProfile };
    }

    return { success: true, profile_pic: "Images/11.png" };
  } catch (error) {
    console.error("Failed to fetch product profile:", error.message);
    return { success: false, error: error.message };
  }
};
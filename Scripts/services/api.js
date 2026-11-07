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
  orderBy,
  limit,
  startAfter,
  getAggregateFromServer,
  sum,
  count,
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

export const PRODUCTS_PAGE_SIZE = 12;

// Loads one page of available listings, newest first. Pass the returned cursor
// to get the next page. The viewer's own listings are filtered out here rather
// than in the query, because a "!=" filter prevents ordering by date.
export const fetchProducts = async (UserID, cursor = null) => {
  try {
    const constraints = [
      where("status", "==", "Available"),
      orderBy("dateListed", "desc"),
      limit(PRODUCTS_PAGE_SIZE),
    ];
    if (cursor) constraints.push(startAfter(cursor));

    const listings_snapshot = await getDocs(query(collection(db, "products"), ...constraints));
    const products = listings_snapshot.docs
      .filter((listing) => listing.data().soldBy !== UserID)
      .map((listing) => ({ id: listing.id, ...listing.data() }));

    return {
      success: true,
      products,
      cursor: listings_snapshot.docs.at(-1) ?? cursor,
      hasMore: listings_snapshot.size === PRODUCTS_PAGE_SIZE,
    };
  } catch (error) {
    console.error("Failed to fetch products from the db:", error.message);
    return { success: false, error: error.message };
  }
};

// Totals are computed by Firestore, so no order documents are downloaded.
export const fetchSellerSales = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const orders_query = query(
      collection(db, "orders"),
      where("sellerUid", "==", user.uid),
      where("status", "==", "paid")
    );
    const totals = (await getAggregateFromServer(orders_query, {
      soldCount: count(),
      grossCents: sum("amountCents"),
      feeCents: sum("platformFeeCents"),
    })).data();

    return {
      success: true,
      soldCount: totals.soldCount,
      earningsCents: totals.grossCents - totals.feeCents,
    };
  } catch (error) {
    console.error("Failed to load sales:", error.message);
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
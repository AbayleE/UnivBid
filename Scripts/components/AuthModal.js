import { auth, onAuthStateChanged } from '../../firebase.js';
import { getCurrentuserdata, logoutuser, registerUser, signinUser } from '../services/auth.js';
import { updateuserProfile } from '../services/api.js';
import { showNotification } from '../services/notifications.js';
import { fetchuser_profile } from '../services/api.js';

export class AuthButton {
    constructor(btnElement, searchBtn, loginBtn) {
        this.button = btnElement;
        this.searchBtn = searchBtn;
        this.loginBtn = loginBtn;
        this.setup();
    }

    setup() {
        this.button.innerText = "Sign Up";
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await this.showlogout();
                this.setSearchBtn(true);
            } else {
                this.showLogin();
                this.showSignup();
                this.setSearchBtn(false);
            }
        });
    }

    setSearchBtn(isloggedin) {
        if (!this.searchBtn) return;

        this.searchBtn.onclick = () => {
            if (isloggedin) {
                window.location.href = "sales_page.html";
            } else {
                window.location.href = "sign_in.html";
            }
        }
    }

    async showlogout() {
        this.loginBtn.style.visibility = "hidden";
        this.loginBtn.remove();
        const userdata = await getCurrentuserdata();
        if (userdata) {
            this.button.innerText = `Logout, ${userdata.firstName || 'User'}`;
            this.button.onclick = async () => {
                await logoutuser();
                window.location.reload();
            };
        }

    }

    async showSignup() {
        this.button.classList.add();
        this.button.innerText = "Sign Up";

        this.button.onclick = () => {
            window.location.href = 'sign_up.html';
        }
    }

    async showLogin() {
        this.loginBtn.innerText = "Sign In"
        // setInterval(() => {
        //     this.button.classList.add("fadeout");
        //     setTimeout(() => {
        //         this.button.innerText = this.button.innerText === 'Sign Up' ? 'Login' : 'Sign Up';
        //         this.button.classList.remove("fadeout");
        //     }, 500);
        // }, 10000);

        this.loginBtn.onclick = () => {
            window.location.href = 'sign_in.html';
        }

    }
}

export class AddnewUser {
    constructor(First_name, Last_name, email, password,university, addBtn) {
        this.firstname = First_name;
        this.lastname = Last_name;
        this.email = email;
        this.password = password;
        this.university = university
        this.registerUser();
    }

    async registerUser() {
        const newUser = await registerUser(this.firstname, this.lastname, this.email, this.password, "", this.university);
        if (newUser.success) {
            showNotification("User created successfully!", 'success');
            window.location.href = "sign_in.html";
        } else {
            const errorCode = newUser.error;
            if (errorCode == 'auth/email-already-in-use') {
                showNotification("Email Address Already Exists...");
                window.location.href = "sign_in.html";
            } else {
                showNotification(`User creation failed: ${newUser.error} `, 'error');
            }

        }
    }
};


export class SigninUser {
    constructor(email, password, submitBtn) {
        this.email = email;
        this.password = password;
        this.submitBtn = submitBtn;
        this.signinuser();
    }

    async signinuser() {
        try {
            if (this.submitBtn) {
                this.submitBtn.disabled = true;
            }
            const signedUser = await signinUser(this.email, this.password);

            if (signedUser.success) {
                if (auth.currentUser) {
                    showNotification("User successfully logged in!", 'success');
                    window.location.href = "profile.html";
                } else {
                    throw new Error("Authentication state not updated");
                }

            } else {
                const errorCode = signedUser.error;
                if (errorCode === 'auth/invalid-credential') {
                    showNotification(`Incorrect Password or Email `, 'error');
                } else {
                    showNotification(`Sign-infailed: ${signedUser.error} `, 'error');
                }
            }

        } catch (error) {
            console.error("Sign-in error:", error);
            showNotification("Sign-in failed: " + error.message);
        } finally {
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
            }
        }
    }

};


export class profileLoad {
    constructor(firstname, lastname, phone, email, university, check_box_email, check_box_phone, submitBtn, container) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.phone = phone;
        this.email = email;
        this.university = university;
        this.check_box_email = check_box_email;
        this.check_box_phone = check_box_phone;
        this.button = submitBtn;
        this.container = container;
        this.checkAuthstate();
        this.setup();
    }

    checkAuthstate() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadProfileData();
            } else {
                showNotification(`Please Login first! `, 'error');
                window.location.href = "signin.html";
            }
        });
    }

    async setup() {
        this.button.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.updateProfile();
        });
    }

    async loadProfileData() {
        if (!auth.currentUser) return;
        try {
            const Userdata = await getCurrentuserdata();
            if (Userdata) {
                this.populateform(Userdata);
            } else {
                console.error("User Not found");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }

    };

    populateform(user_data) {
        this.firstname.value = user_data.firstName || '';
        this.lastname.value = user_data.lastName || '';
        this.phone.value = user_data.phone || '';
        this.email.value = user_data.email || '';
        this.container.style.backgroundImage = `url(${user_data.avatar})`;
        this.university.value = user_data.university || '';
        this.check_box_email.checked = user_data.contact_email || true;
        this.check_box_phone.checked = user_data.contact_phone || false;
    }

    async updateProfile() {
        if (!auth.currentUser) return;
        try {
            const contact_choice = {
                contact_email: this.check_box_email.checked,
                contact_phone: this.check_box_phone.checked
            };
            const updatedDoc = {
                firstName: this.firstname.value.trim(),
                lastName: this.lastname.value.trim(),
                email: this.email.value.trim(),
                phone: this.phone.value.trim(),
                university: this.university.value.trim(),
                contact_choice: contact_choice,
            };
            const update_profile = await updateuserProfile(updatedDoc);
            if (update_profile.success) {
                showNotification("Updated Profile Successfully", 'success');
            } else {
                showNotification(`Profile Update Failed: ${update_profile.error} `, 'error');
            }

        } catch (error) {
            console.error("Failed to Update profile:", error);
            showNotification("Profile update failed: " + error.message);
        }

    }
}

export class ProfilePicture {
    constructor(ProfilePicture) {
        this.ProfilePicture = ProfilePicture;
        this.checkAuthstate()
    }

    checkAuthstate() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.addProfilePicture();
            } else {
                showNotification(`Please Login first! `, 'error');
                window.location.href = "signin.html";
            }
        });

    }

    
    async addProfilePicture() {
        if (!auth.currentUser) return;
        try {
            const Userdata = await fetchuser_profile();
            if (Userdata) {
                this.ProfilePicture= Userdata.profile_pic;
            } else {
                console.error("User Not found");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }

    };

}